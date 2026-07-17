import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import {
  buildCandidateIdentitySnapshot,
  calculateDocumentContentHash,
  CANDIDATE_VERIFICATION_PENDING_MESSAGE,
  CANDIDATE_VERIFICATION_REJECTED_MESSAGE,
  notifyPrimeGlobalStaffForManualReview,
  persistIdentityVerificationDecision,
  verifyCandidateDocumentIdentity,
} from "@/lib/server/candidates/document-identity-verification";
import {
  activateCandidateDocumentVersion,
  createVerificationCase,
  insertCandidateDocumentVersion,
  mapVerificationDecisionToCaseStatus,
  safeSetPrimaryResume,
  supersedeActiveCandidateDocuments,
} from "@/lib/server/candidates/document-verification-workflow";

const CANDIDATE_RESUMES_BUCKET = process.env.SUPABASE_CANDIDATE_RESUMES_BUCKET ?? "candidate-resumes";

const setPrimarySchema = z.object({
  resumeId: z.string().uuid(),
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function inferExtension(fileName: string, mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/msword") return "doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (fileName.toLowerCase().endsWith(".pdf")) return "pdf";
  if (fileName.toLowerCase().endsWith(".doc")) return "doc";
  return "docx";
}

async function getCandidateProfileBundle(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id, full_name, email, phone_number, country, city")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data) {
    return null;
  }

  const { data: professionalProfile } = await supabase
    .from("candidate_professional_profiles")
    .select("nationality, education_entries, experiences, skills, languages")
    .eq("candidate_id", data.id)
    .maybeSingle();

  return {
    candidate: data,
    professional: professionalProfile,
  };
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-resumes-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const profileBundle = await getCandidateProfileBundle(auth.userId);
  if (!profileBundle?.candidate?.id) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }
  const candidateId = String(profileBundle.candidate.id);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_resumes")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "RESUMES_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  const { data: versions } = await supabase
    .from("candidate_document_versions")
    .select("id, document_type, version_number, original_filename, verification_status, reviewer_decision, identity_confidence_score, fraud_risk_score, is_active, is_primary, created_at, superseded_at")
    .eq("candidate_id", candidateId)
    .eq("document_type", "cv")
    .order("version_number", { ascending: false });

  const { data: cases } = await supabase
    .from("candidate_document_verification_cases")
    .select("id, status, priority, candidate_message, created_at, updated_at, resolved_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({
    success: true,
    data,
    documentVersions: versions ?? [],
    verificationCases: cases ?? [],
  });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-resumes-post", 50);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const profileBundle = await getCandidateProfileBundle(auth.userId);
  if (!profileBundle?.candidate?.id) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }
  const candidateId = String(profileBundle.candidate.id);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_REQUIRED", message: "Resume file is required" } },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported resume format" } },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_TOO_LARGE", message: "Resume exceeds 5 MB" } },
      { status: 400 }
    );
  }

  const extension = inferExtension(file.name, file.type);
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "resume";
  const storagePath = `${auth.userId}/${candidateId}/${Date.now()}-${safeName}.${extension}`;

  const supabase = createSupabaseAdminClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(CANDIDATE_RESUMES_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_FAILED", message: uploadError.message } },
      { status: 500 }
    );
  }

  const { data: privateProfile } = await supabase
    .from("candidate_private_profiles")
    .select("candidate_id, original_documents_paths")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (!privateProfile?.candidate_id) {
    await supabase.from("candidate_private_profiles").insert({
      candidate_id: candidateId,
      full_name: String(profileBundle.candidate.full_name ?? "Candidate"),
      email: String(profileBundle.candidate.email ?? auth.email),
      phone: String(profileBundle.candidate.phone_number ?? "+000000000"),
      address: [profileBundle.candidate.country, profileBundle.candidate.city].filter(Boolean).join(", ") || null,
      original_cv_path: "pending",
      original_documents_paths: [],
      restricted_to_prime_global: true,
    });
  }

  const snapshot = buildCandidateIdentitySnapshot({
    fullName: String(profileBundle.candidate.full_name ?? ""),
    nationality:
      typeof profileBundle.professional?.nationality === "string"
        ? profileBundle.professional.nationality
        : null,
    email: String(profileBundle.candidate.email ?? auth.email),
    phone:
      typeof profileBundle.candidate.phone_number === "string" ? profileBundle.candidate.phone_number : null,
    location: [profileBundle.candidate.country, profileBundle.candidate.city].filter(Boolean).join(", "),
    education: profileBundle.professional?.education_entries,
    degreeTitles: profileBundle.professional?.education_entries,
    workHistory: profileBundle.professional?.experiences,
    skills: profileBundle.professional?.skills,
    languages: profileBundle.professional?.languages,
  });

  const verificationResult = await verifyCandidateDocumentIdentity({
    candidateId,
    snapshot,
    documents: [
      {
        storagePath,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        buffer: fileBuffer,
      },
    ],
  });

  const contentHash = calculateDocumentContentHash(fileBuffer);

  const verificationId = await persistIdentityVerificationDecision({
    candidateId,
    source: "resume_upload",
    snapshot,
    documents: [
      {
        storagePath,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        buffer: fileBuffer,
      },
    ],
    result: verificationResult,
  });

  const acceptedAndLowRisk =
    (verificationResult.decision === "automatic_approval" || verificationResult.decision === "accepted") &&
    verificationResult.fraudRiskScore < 50 &&
    !verificationResult.highFraudOverrideApplied;

  const version = await insertCandidateDocumentVersion({
    candidateId,
    documentType: "cv",
    originalFilename: file.name,
    storagePath,
    sourceBucket: CANDIDATE_RESUMES_BUCKET,
    mimeType: file.type,
    sizeBytes: file.size,
    contentHash,
    uploadedByAuthUserId: auth.userId,
    verificationId,
    verificationResult,
    // Insert inactive first to avoid transient unique-index conflicts on current active primary CV.
    isActive: false,
    isPrimary: false,
  });

  if (acceptedAndLowRisk) {
    await supersedeActiveCandidateDocuments({
      candidateId,
      documentType: "cv",
      exceptVersionId: version.versionId,
    });

    await activateCandidateDocumentVersion({
      versionId: version.versionId,
      isPrimary: true,
    });
  }

  const caseStatus = mapVerificationDecisionToCaseStatus({
    decision: verificationResult.decision,
    fraudRiskScore: verificationResult.fraudRiskScore,
    highFraudOverrideApplied: verificationResult.highFraudOverrideApplied,
  });

  const verificationCaseId = await createVerificationCase({
    candidateId,
    documentVersionId: version.versionId,
    verificationId,
    status: caseStatus,
    priority:
      verificationResult.fraudRiskScore >= 75
        ? "critical"
        : verificationResult.fraudRiskScore >= 50
          ? "high"
          : verificationResult.fraudRiskScore >= 25
            ? "normal"
            : "low",
    candidateMessage:
      verificationResult.decision === "pending_verification"
        ? CANDIDATE_VERIFICATION_PENDING_MESSAGE
        : verificationResult.decision === "rejected"
          ? CANDIDATE_VERIFICATION_REJECTED_MESSAGE
          : "Document received and verified.",
    internalNotes: verificationResult.highFraudOverrideApplied
      ? "High fraud risk override blocked automatic approval."
      : null,
    escalationReason: verificationResult.highFraudOverrideApplied
      ? "high_fraud_override"
      : null,
  });

  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "candidate.document_identity_verification.evaluated",
    targetType: "candidate_document_identity_verification",
    targetId: verificationId,
    metadata: {
      source: "resume_upload",
      candidateId,
      confidenceScore: verificationResult.confidenceScore,
      fraudRiskScore: verificationResult.fraudRiskScore,
      decision: verificationResult.decision,
      provider: verificationResult.provider,
      model: verificationResult.model,
      verificationCaseId,
      versionId: version.versionId,
    },
  });

  if (verificationResult.decision === "pending_verification") {
    const recipients = await notifyPrimeGlobalStaffForManualReview({
      candidateId,
      candidateName: String(profileBundle.candidate.full_name ?? "Candidate"),
      confidenceScore: verificationResult.confidenceScore,
      fraudRiskScore: verificationResult.fraudRiskScore,
      verificationId,
    });

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.document_identity_verification.manual_review_queued",
      targetType: "candidate_document_identity_verification",
      targetId: verificationId,
      metadata: { recipients },
    });
  }

  if (verificationResult.decision === "rejected") {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DOCUMENT_VERIFICATION_REJECTED",
          message: CANDIDATE_VERIFICATION_REJECTED_MESSAGE,
        },
        data: {
          verificationId,
          verificationCaseId,
          versionId: version.versionId,
          confidenceScore: verificationResult.confidenceScore,
          fraudRiskScore: verificationResult.fraudRiskScore,
          decision: verificationResult.decision,
        },
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from("candidate_resumes")
    .insert({
      candidate_id: candidateId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      is_primary: false,
    })
    .select("*")
    .single();

  if (error) {
    const isPrimaryConstraintError =
      error.code === "23505" ||
      error.message.toLowerCase().includes("candidate_primary_resume_uq");

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RESUME_SAVE_FAILED",
          message: isPrimaryConstraintError
            ? "Unable to set a new primary CV at this time. Please retry."
            : "Unable to save the uploaded CV at this time.",
        },
      },
      { status: 500 }
    );
  }

  if (acceptedAndLowRisk) {
    await safeSetPrimaryResume({
      candidateId,
      resumeId: String(data.id),
    });
  }

  if (privateProfile?.candidate_id && acceptedAndLowRisk) {
    await supabase
      .from("candidate_private_profiles")
      .update({ original_cv_path: storagePath })
      .eq("candidate_id", candidateId);
  } else if (!privateProfile?.candidate_id) {
    await supabase.from("candidate_private_profiles").insert({
      candidate_id: candidateId,
      full_name: String(profileBundle.candidate.full_name ?? "Candidate"),
      email: String(profileBundle.candidate.email ?? auth.email),
      phone: String(profileBundle.candidate.phone_number ?? "+000000000"),
      address: [profileBundle.candidate.country, profileBundle.candidate.city].filter(Boolean).join(", ") || null,
      original_cv_path: storagePath,
      original_documents_paths: [],
      restricted_to_prime_global: true,
    });
  }

  return NextResponse.json(
    {
      success: true,
      data,
      verification: {
        verificationId,
        verificationCaseId,
        versionId: version.versionId,
        confidenceScore: verificationResult.confidenceScore,
        fraudRiskScore: verificationResult.fraudRiskScore,
        provider: verificationResult.provider,
        model: verificationResult.model,
        externalVerificationStatus: verificationResult.externalVerificationStatus,
        decision: verificationResult.decision,
        message:
          verificationResult.decision === "pending_verification"
            ? CANDIDATE_VERIFICATION_PENDING_MESSAGE
            : null,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-resumes-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const profileBundle = await getCandidateProfileBundle(auth.userId);
  if (!profileBundle?.candidate?.id) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }
  const candidateId = String(profileBundle.candidate.id);

  const payload = await request.json().catch(() => null);
  const parsed = setPrimarySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "resumeId is required" } },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  try {
    await safeSetPrimaryResume({
      candidateId,
      resumeId: parsed.data.resumeId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to set primary resume";
    return NextResponse.json(
      { success: false, error: { code: "PRIMARY_RESUME_UPDATE_FAILED", message } },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("candidate_resumes")
    .select("*")
    .eq("candidate_id", candidateId)
    .eq("id", parsed.data.resumeId)
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PRIMARY_RESUME_LOAD_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
