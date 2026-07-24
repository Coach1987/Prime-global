import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import {
  buildCandidateIdentitySnapshot,
  calculateDocumentContentHash,
} from "@/lib/server/candidates/document-identity-verification";
import {
  createVerificationCase,
  insertCandidateDocumentVersion,
  resolveDocumentType,
} from "@/lib/server/candidates/document-verification-workflow";
import { runCandidateOnboardingVerificationWorkflow } from "@/lib/server/candidates/onboarding-verification-workflow";

const PRIVATE_BUCKET = "candidate-private-documents";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

async function getCandidateProfile(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id, full_name, email, phone_number, country, city")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: professional } = await supabase
    .from("candidate_professional_profiles")
    .select("nationality, education_entries, experiences, skills, languages")
    .eq("candidate_id", data.id)
    .maybeSingle();

  return {
    candidate: data,
    professional,
  };
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-private-documents-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const profile = await getCandidateProfile(auth.userId);
  if (!profile?.candidate?.id) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_private_profiles")
    .select("original_documents_paths")
    .eq("candidate_id", profile.candidate.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PRIVATE_DOCUMENTS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }


  const { data: versions } = await supabase
    .from("candidate_document_versions")
    .select("id, document_type, version_number, original_filename, verification_status, reviewer_decision, identity_confidence_score, fraud_risk_score, is_active, is_primary, created_at, superseded_at")
    .eq("candidate_id", profile.candidate.id)
    .in("document_type", ["diploma", "certificate", "supporting_document", "additional_evidence"])
    .order("version_number", { ascending: false });

  const { data: cases } = await supabase
    .from("candidate_document_verification_cases")
    .select("id, status, priority, candidate_message, created_at, updated_at, resolved_at")
    .eq("candidate_id", profile.candidate.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const documents = Array.isArray(data?.original_documents_paths) ? data.original_documents_paths : [];
  return NextResponse.json({
    success: true,
    data: documents,
    documentVersions: versions ?? [],
    verificationCases: cases ?? [],
  });
}

export async function POST(request: Request) {
  try {
    const rateLimitResult = enforceRateLimit(request, "candidate-private-documents-post", 60);
    if (rateLimitResult) return rateLimitResult;

    const csrfResult = enforceCsrf(request);
    if (csrfResult) return csrfResult;

    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) return auth;
    const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
    if (roleCheck) return roleCheck;

    const profile = await getCandidateProfile(auth.userId);
    if (!profile?.candidate?.id) {
      return NextResponse.json(
        { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
    const explicitDocumentType =
      typeof formData.get("documentType") === "string" ? String(formData.get("documentType")) : null;

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_REQUIRED", message: "At least one document is required" } },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_FILES",
            message: `Maximum ${MAX_FILES_PER_UPLOAD} documents per upload request`,
          },
        },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();
    const uploadedDocuments: Array<{
      storagePath: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      buffer: Buffer;
      documentType: ReturnType<typeof resolveDocumentType>;
    }> = [];

    for (const file of files) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { success: false, error: { code: "INVALID_FILE_TYPE", message: `Unsupported file type: ${file.type}` } },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: { code: "FILE_TOO_LARGE", message: `${file.name} exceeds 10 MB` } },
          { status: 400 }
        );
      }

      const safeName = sanitizeFileName(file.name) || "document";
      const path = `${auth.userId}/${profile.candidate.id}/document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

      if (uploadError) {
        return NextResponse.json(
          { success: false, error: { code: "UPLOAD_FAILED", message: uploadError.message } },
          { status: 500 }
        );
      }

      uploadedDocuments.push({
        storagePath: path,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        buffer,
        documentType: resolveDocumentType({
          fileName: file.name,
          mimeType: file.type,
          explicitType: explicitDocumentType,
        }),
      });
    }

    const { data: existingPrivate, error: privateLoadError } = await supabase
      .from("candidate_private_profiles")
      .select("candidate_id, original_cv_path, original_documents_paths")
      .eq("candidate_id", profile.candidate.id)
      .maybeSingle();

    if (privateLoadError) {
      return NextResponse.json(
        { success: false, error: { code: "PRIVATE_PROFILE_LOAD_FAILED", message: privateLoadError.message } },
        { status: 500 }
      );
    }

    const existingPaths = Array.isArray(existingPrivate?.original_documents_paths)
      ? (existingPrivate?.original_documents_paths as string[])
      : [];
    const nextPaths = [...existingPaths, ...uploadedDocuments.map((document) => document.storagePath)];

    const { error: profileUpsertError } = await supabase.from("candidate_private_profiles").upsert(
      {
        candidate_id: profile.candidate.id,
        full_name: profile.candidate.full_name ?? "Candidate",
        email: profile.candidate.email ?? auth.email,
        phone: profile.candidate.phone_number ?? "+000000000",
        address: [profile.candidate.country, profile.candidate.city].filter(Boolean).join(", ") || null,
        original_cv_path: existingPrivate?.original_cv_path ?? "pending",
        original_documents_paths: nextPaths,
        restricted_to_prime_global: true,
        identity_verification_status: "pending_verification",
        identity_staff_review_status: "pending",
        identity_verification_reasoning: "Your documents were uploaded successfully and are waiting for AI verification.",
        identity_verification_updated_at: new Date().toISOString(),
      },
      { onConflict: "candidate_id" }
    );

    if (profileUpsertError) {
      return NextResponse.json(
        { success: false, error: { code: "PRIVATE_PROFILE_SAVE_FAILED", message: profileUpsertError.message } },
        { status: 500 }
      );
    }

    const snapshot = buildCandidateIdentitySnapshot({
      fullName: String(profile.candidate.full_name ?? ""),
      nationality: typeof profile.professional?.nationality === "string" ? profile.professional.nationality : null,
      email: String(profile.candidate.email ?? auth.email),
      phone: typeof profile.candidate.phone_number === "string" ? profile.candidate.phone_number : null,
      location: [profile.candidate.country, profile.candidate.city].filter(Boolean).join(", "),
      education: profile.professional?.education_entries,
      degreeTitles: profile.professional?.education_entries,
      workHistory: profile.professional?.experiences,
      skills: profile.professional?.skills,
      languages: profile.professional?.languages,
    });

    const versionResults: Array<{ versionId: string; documentType: ReturnType<typeof resolveDocumentType> }> = [];
    const verificationCaseIds: string[] = [];

    for (const document of uploadedDocuments) {
      const version = await insertCandidateDocumentVersion({
        candidateId: profile.candidate.id,
        documentType: document.documentType,
        originalFilename: document.fileName,
        storagePath: document.storagePath,
        sourceBucket: PRIVATE_BUCKET,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        contentHash: calculateDocumentContentHash(document.buffer),
        uploadedByAuthUserId: auth.userId,
        verificationId: null,
        verificationResult: null,
        isActive: false,
        isPrimary: false,
      });

      const caseId = await createVerificationCase({
        candidateId: profile.candidate.id,
        documentVersionId: version.versionId,
        verificationId: null,
        status: "pending_ai_analysis",
        priority: "normal",
        candidateMessage: "Your documents were uploaded successfully and are being reviewed.",
        internalNotes: null,
      });

      versionResults.push({ versionId: version.versionId, documentType: document.documentType });
      verificationCaseIds.push(caseId);
    }

    await createAuditLog({
      actorAuthUserId: auth.userId,
      actorRole: auth.role,
      action: "candidate.documents.uploaded",
      targetType: "candidate_private_profile",
      targetId: String(profile.candidate.id),
      metadata: {
        candidateId: profile.candidate.id,
        documentCount: uploadedDocuments.length,
        versionIds: versionResults.map((entry) => entry.versionId),
        verificationCaseIds,
      },
    });

    void runCandidateOnboardingVerificationWorkflow({
      candidateId: String(profile.candidate.id),
      authUserId: auth.userId,
      candidateName: String(profile.candidate.full_name ?? "Candidate"),
      candidateEmail: String(profile.candidate.email ?? auth.email),
      snapshot,
      documents: uploadedDocuments.map((document, index) => ({
        ...document,
        versionId: versionResults[index]?.versionId ?? "",
        caseId: verificationCaseIds[index] ?? "",
      })),
    }).catch((error) => {
      console.error("[candidate:private-documents] background verification failed", {
        candidateId: profile.candidate.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return NextResponse.json(
      {
        success: true,
        data: nextPaths,
        verification: {
          verificationId: null,
          verificationCaseIds,
          versionIds: versionResults.map((entry) => entry.versionId),
          confidenceScore: null,
          fraudRiskScore: null,
          provider: null,
          model: null,
          externalVerificationStatus: "pending",
          decision: "pending_ai_analysis",
          message: "Your documents were uploaded successfully and are being reviewed.",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PRIVATE_DOCUMENT_UPLOAD_FAILED",
          message: error instanceof Error ? error.message : "Unable to upload documents at this time.",
        },
      },
      { status: 500 }
    );
  }
}
