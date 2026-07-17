import { createSupabaseAdminClient } from "@/lib/server/supabase";
import type { VerificationDecision, VerificationResult } from "@/lib/server/candidates/document-identity-verification";

export type CandidateDocumentType = "cv" | "diploma" | "certificate" | "supporting_document" | "additional_evidence";

export type CandidateVerificationCaseStatus =
  | "pending_ai_analysis"
  | "auto_approved"
  | "pending_manual_review"
  | "additional_evidence_requested"
  | "replacement_requested"
  | "live_verification_required"
  | "escalated"
  | "verified"
  | "rejected"
  | "superseded";

export type CandidateVerificationCaseAction =
  | "verified"
  | "rejected"
  | "request_new_document"
  | "schedule_live_verification"
  | "request_additional_evidence"
  | "escalate_to_supervisor";

export function resolveDocumentType(input: { fileName: string; mimeType: string; explicitType?: string | null }): CandidateDocumentType {
  const explicit = (input.explicitType ?? "").trim().toLowerCase();
  if (
    explicit === "cv" ||
    explicit === "diploma" ||
    explicit === "certificate" ||
    explicit === "supporting_document" ||
    explicit === "additional_evidence"
  ) {
    return explicit as CandidateDocumentType;
  }

  const name = input.fileName.toLowerCase();
  if (/\bcv\b|resume/.test(name)) return "cv";
  if (/diploma|degree/.test(name)) return "diploma";
  if (/certificate|cert/.test(name)) return "certificate";
  return "supporting_document";
}

export function mapVerificationDecisionToCaseStatus(input: {
  decision: VerificationDecision;
  fraudRiskScore: number;
  highFraudOverrideApplied: boolean;
}): CandidateVerificationCaseStatus {
  if (input.decision === "rejected") return "rejected";
  if (input.highFraudOverrideApplied || input.fraudRiskScore >= 75) return "escalated";
  if (input.decision === "pending_verification" || input.fraudRiskScore >= 50) return "pending_manual_review";
  if (input.decision === "automatic_approval" || input.decision === "accepted") return "auto_approved";
  return "pending_manual_review";
}

export function mapVerificationDecisionToDocumentStatus(input: {
  decision: VerificationDecision;
  fraudRiskScore: number;
  highFraudOverrideApplied: boolean;
}): CandidateVerificationCaseStatus {
  return mapVerificationDecisionToCaseStatus(input);
}

export async function insertCandidateDocumentVersion(input: {
  candidateId: string;
  documentType: CandidateDocumentType;
  originalFilename: string;
  storagePath: string;
  sourceBucket: string;
  mimeType: string;
  sizeBytes: number;
  contentHash: string;
  uploadedByAuthUserId: string;
  verificationId: string;
  verificationResult: VerificationResult;
  isActive: boolean;
  isPrimary: boolean;
}) {
  const supabase = createSupabaseAdminClient();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: latestVersion } = await supabase
      .from("candidate_document_versions")
      .select("version_number")
      .eq("candidate_id", input.candidateId)
      .eq("document_type", input.documentType)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = Number(latestVersion?.version_number ?? 0) + 1;

    const { data, error } = await supabase
      .from("candidate_document_versions")
      .insert({
        candidate_id: input.candidateId,
        document_type: input.documentType,
        version_number: nextVersion,
        original_filename: input.originalFilename,
        storage_path: input.storagePath,
        source_bucket: input.sourceBucket,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        content_hash: input.contentHash,
        uploaded_by_auth_user_id: input.uploadedByAuthUserId,
        verification_id: input.verificationId,
        verification_status: mapVerificationDecisionToDocumentStatus({
          decision: input.verificationResult.decision,
          fraudRiskScore: input.verificationResult.fraudRiskScore,
          highFraudOverrideApplied: input.verificationResult.highFraudOverrideApplied,
        }),
        reviewer_decision: input.verificationResult.decision,
        identity_confidence_score: input.verificationResult.identityConfidenceScore,
        fraud_risk_score: input.verificationResult.fraudRiskScore,
        verification_provider: input.verificationResult.provider,
        verification_model: input.verificationResult.model,
        external_verification_status: input.verificationResult.externalVerificationStatus,
        is_active: input.isActive,
        is_primary: input.isPrimary,
      })
      .select("id, version_number")
      .single();

    if (!error && data) {
      return {
        versionId: String(data.id),
        versionNumber: Number(data.version_number),
      };
    }

    if (error?.code !== "23505" || attempt === 2) {
      throw new Error(`Failed to create document version: ${error?.message ?? "unknown error"}`);
    }
  }

  throw new Error("Failed to create document version after retries");
}

export async function activateCandidateDocumentVersion(input: {
  versionId: string;
  isPrimary: boolean;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("candidate_document_versions")
    .update({
      is_active: true,
      is_primary: input.isPrimary,
    })
    .eq("id", input.versionId);

  if (error) {
    throw new Error(`Failed to activate document version: ${error.message}`);
  }
}

export async function supersedeActiveCandidateDocuments(input: {
  candidateId: string;
  documentType: CandidateDocumentType;
  exceptVersionId?: string;
}) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("candidate_document_versions")
    .update({
      is_active: false,
      is_primary: false,
      verification_status: "superseded",
      superseded_at: new Date().toISOString(),
    })
    .eq("candidate_id", input.candidateId)
    .eq("document_type", input.documentType)
    .eq("is_active", true);

  if (input.exceptVersionId) {
    query = query.neq("id", input.exceptVersionId);
  }

  await query;
}

export async function createVerificationCase(input: {
  candidateId: string;
  documentVersionId: string;
  verificationId: string;
  status: CandidateVerificationCaseStatus;
  priority: "low" | "normal" | "high" | "critical";
  candidateMessage: string | null;
  internalNotes: string | null;
  requestedEvidence?: unknown;
  escalationReason?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_document_verification_cases")
    .insert({
      candidate_id: input.candidateId,
      document_version_id: input.documentVersionId,
      verification_id: input.verificationId,
      status: input.status,
      priority: input.priority,
      requested_evidence: input.requestedEvidence ?? null,
      candidate_message: input.candidateMessage,
      internal_notes: input.internalNotes,
      escalation_reason: input.escalationReason ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create verification case: ${error?.message ?? "unknown error"}`);
  }

  return String(data.id);
}

export async function appendVerificationCaseAction(input: {
  caseId: string;
  verificationId: string;
  documentVersionId: string;
  action: CandidateVerificationCaseAction;
  actorAuthUserId: string;
  previousStatus: CandidateVerificationCaseStatus;
  newStatus: CandidateVerificationCaseStatus;
  note: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("candidate_document_verification_case_actions").insert({
    case_id: input.caseId,
    verification_id: input.verificationId,
    document_version_id: input.documentVersionId,
    action: input.action,
    actor_auth_user_id: input.actorAuthUserId,
    previous_status: input.previousStatus,
    new_status: input.newStatus,
    note: input.note,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to append verification case action: ${error.message}`);
  }
}

export async function transitionVerificationCase(input: {
  caseId: string;
  newStatus: CandidateVerificationCaseStatus;
  assignedReviewerId?: string | null;
  assignedSupervisorId?: string | null;
  requestedEvidence?: unknown;
  candidateMessage?: string | null;
  internalNotes?: string | null;
  resolution?: string | null;
  escalationReason?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const resolveNow = input.newStatus === "verified" || input.newStatus === "rejected" || input.newStatus === "superseded";

  const { error } = await supabase
    .from("candidate_document_verification_cases")
    .update({
      status: input.newStatus,
      assigned_reviewer_id: input.assignedReviewerId ?? undefined,
      assigned_supervisor_id: input.assignedSupervisorId ?? undefined,
      requested_evidence: input.requestedEvidence ?? undefined,
      candidate_message: input.candidateMessage ?? undefined,
      internal_notes: input.internalNotes ?? undefined,
      resolution: input.resolution ?? undefined,
      escalation_reason: input.escalationReason ?? undefined,
      updated_at: now,
      resolved_at: resolveNow ? now : null,
    })
    .eq("id", input.caseId);

  if (error) {
    throw new Error(`Failed to transition verification case: ${error.message}`);
  }
}

export async function getVerificationCaseById(caseId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_document_verification_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load verification case: ${error.message}`);
  }

  return data;
}

export async function insertCandidateNotification(input: {
  authUserId: string;
  title: string;
  body: string;
  entityType: string;
  entityId?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const dedupeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: duplicateCandidate } = await supabase
    .from("notification_events")
    .select("id")
    .eq("auth_user_id", input.authUserId)
    .eq("category", "status_change")
    .eq("title", input.title)
    .eq("body", input.body)
    .eq("entity_type", input.entityType)
    .eq("entity_id", input.entityId ?? null)
    .gte("created_at", dedupeSince)
    .limit(1)
    .maybeSingle();

  if (duplicateCandidate?.id) {
    return;
  }

  await supabase.from("notification_events").insert({
    auth_user_id: input.authUserId,
    category: "status_change",
    title: input.title,
    body: input.body,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    delivery_channels: ["dashboard", "realtime"],
  });
}

export async function safeSetPrimaryResume(input: {
  candidateId: string;
  resumeId: string;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.rpc("set_candidate_primary_resume", {
    p_candidate_id: input.candidateId,
    p_resume_id: input.resumeId,
  });

  if (error) {
    if (error.code === "P0002" || /resume_not_found/i.test(error.message)) {
      throw new Error("Selected resume was not found for this candidate");
    }
    throw new Error("Unable to set primary CV at this time. Please retry.");
  }
}
