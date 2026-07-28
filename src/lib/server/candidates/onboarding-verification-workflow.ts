import { serverEnv } from "@/lib/server/config/env";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { insertCandidateNotification, transitionVerificationCase } from "@/lib/server/candidates/document-verification-workflow";
import {
  notifyPrimeGlobalStaffForManualReview,
  persistIdentityVerificationDecision,
  verifyCandidateDocumentIdentity,
  type CandidateIdentitySnapshot,
  type VerificationDocumentInput,
} from "@/lib/server/candidates/document-identity-verification";
import {
  type CandidateDocumentType,
} from "@/lib/server/candidates/document-verification-workflow";
import { syncCandidatePortalAiWorkflow } from "@/lib/server/candidates/portal-ai-workflow";

interface PendingDocumentRecord extends VerificationDocumentInput {
  versionId: string;
  caseId: string;
  documentType: CandidateDocumentType;
}

async function sendCandidateVerificationEmail(input: {
  recipientEmail: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!serverEnv.RESEND_API_KEY) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: serverEnv.EMAIL_FROM ?? "Prime Global <no-reply@primeglobal.pro>",
      to: [input.recipientEmail],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("[candidate:onboarding-verification] email delivery failed", {
      status: response.status,
      details,
    });
  }
}

function buildEmailPayload(input: {
  decision: string;
  candidateName: string;
  candidateEmail: string;
  message: string;
}) {
  const subject =
    input.decision === "rejected"
      ? "Prime Global could not verify your documents"
      : input.decision === "pending_verification"
        ? "Prime Global is reviewing your documents"
        : "Prime Global verified your documents";

  const text = `Hello ${input.candidateName},\n\n${input.message}\n\nOpen your candidate dashboard to review the latest status.`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
      <p>Hello ${input.candidateName},</p>
      <p>${input.message}</p>
      <p>Open your candidate dashboard to review the latest status.</p>
    </div>
  `;

  return { subject, text, html, recipientEmail: input.candidateEmail };
}

export async function runCandidateOnboardingVerificationWorkflow(input: {
  candidateId: string;
  authUserId: string;
  candidateName: string;
  candidateEmail: string;
  snapshot: CandidateIdentitySnapshot;
  documents: PendingDocumentRecord[];
  resumeId?: string | null;
}) {
  if (input.documents.length === 0) return;

  try {
    const verificationResult = await verifyCandidateDocumentIdentity({
      candidateId: input.candidateId,
      snapshot: input.snapshot,
      documents: input.documents,
    });

    const verificationId = await persistIdentityVerificationDecision({
      candidateId: input.candidateId,
      source: input.documents.some((document) => document.documentType === "cv") ? "resume_upload" : "private_document_upload",
      snapshot: input.snapshot,
      documents: input.documents,
      result: verificationResult,
    });

    const caseStatus = "pending_ai_analysis";
    const candidateMessage = "Your documents have been uploaded successfully and are now under review.";

    for (const document of input.documents) {
      await transitionVerificationCase({
        caseId: document.caseId,
        newStatus: caseStatus,
        candidateMessage,
        internalNotes: null,
        escalationReason: null,
        resolution: null,
      });

      const { error: versionUpdateError } = await createSupabaseAdminClient()
        .from("candidate_document_versions")
        .update({
          verification_id: verificationId,
          verification_status: caseStatus,
          reviewer_decision: verificationResult.decision,
          identity_confidence_score: verificationResult.identityConfidenceScore,
          fraud_risk_score: verificationResult.fraudRiskScore,
          verification_provider: verificationResult.provider,
          verification_model: verificationResult.model,
          external_verification_status: verificationResult.externalVerificationStatus,
          is_active: false,
          is_primary: false,
        })
        .eq("id", document.versionId);

      if (versionUpdateError) {
        console.error("[candidate:onboarding-verification] failed to update document version", {
          candidateId: input.candidateId,
          versionId: document.versionId,
          error: versionUpdateError.message,
        });
      }

    }

    if (verificationResult.decision === "pending_verification") {
      await notifyPrimeGlobalStaffForManualReview({
        candidateId: input.candidateId,
        candidateName: input.candidateName,
        confidenceScore: verificationResult.confidenceScore,
        fraudRiskScore: verificationResult.fraudRiskScore,
        verificationId,
      });
    }

    if (verificationResult.decision !== "automatic_approval" && verificationResult.decision !== "accepted") {
      await insertCandidateNotification({
        authUserId: input.authUserId,
        title: "Your documents are under review",
        body: candidateMessage,
        entityType: "candidate_document_identity_verification",
        entityId: verificationId,
      });

      const emailPayload = buildEmailPayload({
        decision: verificationResult.decision,
        candidateName: input.candidateName,
        candidateEmail: input.candidateEmail,
        message: candidateMessage,
      });

      await sendCandidateVerificationEmail(emailPayload);
    }

    await syncCandidatePortalAiWorkflow({
      candidateId: input.candidateId,
      authUserId: input.authUserId,
      trigger: "document_upload",
    }).catch((error) => {
      console.error("[candidate:onboarding-verification] portal AI workflow failed", {
        candidateId: input.candidateId,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  } catch (error) {
    console.error("[candidate:onboarding-verification] verification workflow failed", {
      candidateId: input.candidateId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
