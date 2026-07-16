import type { ProtectionFinding, ProtectionPlan, ProtectionPlanStatus, ProtectionReviewStatus } from "./types.ts";
import { createDisclosureManifest } from "./disclosure-manifest.ts";

export function mapFindingsToPlanStatus(findings: ProtectionFinding[]): {
  protectionStatus: ProtectionPlanStatus;
  reviewStatus: ProtectionReviewStatus;
} {
  if (findings.length === 0) {
    return { protectionStatus: "analysis_complete", reviewStatus: "not_required" };
  }

  const reviewRequired = findings.some((finding) => finding.humanReviewRequired);
  if (reviewRequired) {
    return { protectionStatus: "review_required", reviewStatus: "required" };
  }

  return { protectionStatus: "protection_planned", reviewStatus: "not_required" };
}

export function createProtectionPlan(input: {
  planId: string;
  organizationScope?: string;
  candidateScope?: string;
  originalObjectReference: string;
  protectedCopyTargetReference: string;
  publicProfileTargetReference: string;
  findings: ProtectionFinding[];
}): ProtectionPlan {
  const mapping = mapFindingsToPlanStatus(input.findings);
  const currentDisclosureManifest = createDisclosureManifest("strict_private");

  const maskingOperations = input.findings
    .filter((finding) => ["text_redact", "mask_qr", "mask_barcode", "image_region_redact"].includes(finding.suggestedProtectionAction))
    .map((finding) => ({
      findingId: finding.findingId,
      type:
        finding.suggestedProtectionAction === "mask_qr"
          ? "qr"
          : finding.suggestedProtectionAction === "mask_barcode"
            ? "barcode"
            : finding.region
              ? "image_region"
              : "text",
      replacement: "[protected]",
    })) satisfies ProtectionPlan["maskingOperations"];

  const removalOperations = input.findings
    .filter((finding) => ["metadata_strip", "link_neutralize"].includes(finding.suggestedProtectionAction))
    .map((finding) => ({
      findingId: finding.findingId,
      type: finding.suggestedProtectionAction === "metadata_strip" ? "metadata" : "external_link",
      strategy: finding.suggestedProtectionAction === "metadata_strip" ? "strip" : "neutralize",
    })) satisfies ProtectionPlan["removalOperations"];

  return {
    planId: input.planId,
    organizationScope: input.organizationScope ?? "unknown",
    candidateScope: input.candidateScope ?? "unknown",
    originalObjectReference: input.originalObjectReference,
    originalImmutableReference: input.originalObjectReference,
    protectedCopyTargetReference: input.protectedCopyTargetReference,
    publicProfileTargetReference: input.publicProfileTargetReference,
    findingsIncluded: input.findings.map((finding) => finding.findingId),
    maskingOperations,
    removalOperations,
    replacementPlaceholders: ["[protected]", "[link-protected]"],
    metadataStripping: input.findings.some((finding) => finding.suggestedProtectionAction === "metadata_strip"),
    qrMasking: input.findings.some((finding) => finding.suggestedProtectionAction === "mask_qr"),
    barcodeMasking: input.findings.some((finding) => finding.suggestedProtectionAction === "mask_barcode"),
    linkNeutralization: input.findings.some((finding) => finding.suggestedProtectionAction === "link_neutralize"),
    textRedaction: input.findings.some((finding) => finding.suggestedProtectionAction === "text_redact"),
    imageRegionRedaction: input.findings.some((finding) => finding.suggestedProtectionAction === "image_region_redact"),
    protectionStatus: mapping.protectionStatus,
    reviewStatus: mapping.reviewStatus,
    currentDisclosureManifest,
    allowedFutureDisclosureTransitions: [
      {
        fieldCategory: "professional_name",
        from: "protected_placeholder",
        to: "revealed",
        allowed: true,
        policyRequired: true,
        staffApprovalRequired: true,
        reasonCode: "PG-CONTRACT-REVEAL-001",
      },
      {
        fieldCategory: "portfolio",
        from: "protected_placeholder",
        to: "revealed",
        allowed: true,
        policyRequired: true,
        staffApprovalRequired: true,
        reasonCode: "PG-CONTRACT-REVEAL-001",
      },
    ],
    deniedTransitions: [
      {
        fieldCategory: "original_cv",
        from: "staff_only",
        to: "revealed",
        allowed: false,
        policyRequired: true,
        staffApprovalRequired: true,
        reasonCode: "PG-CV-PRIVATE-001",
      },
      {
        fieldCategory: "private_documents",
        from: "staff_only",
        to: "revealed",
        allowed: false,
        policyRequired: true,
        staffApprovalRequired: true,
        reasonCode: "PG-ID-DOCUMENT-001",
      },
    ],
    transitionPrerequisites: ["policy_approval", "workflow_stage_match", "consent_version_match"],
    policyVersion: "phase10.stage8_5.v1",
    workflowStageRequirement: "intake",
    consentRequirement: "v1",
    staffApprovalRequirement: true,
    paymentRequirement: "not_required",
    contractStateRequirement: "not_required",
    activeFreezeRestriction: true,
    criticalViolationRestriction: true,
    transitionHistory: [],
    rollbackTarget: null,
    irreversibleFields: ["original_cv", "private_documents", "passport_number", "national_id"],
    expiryTimestamp: null,
    revocationTimestamp: null,
    generatedTimestamp: new Date().toISOString(),
    protectionVersion: "stage8_5.plan.v1",
  };
}

export function createFailedSafePlan(input: {
  planId: string;
  organizationScope?: string;
  candidateScope?: string;
  originalObjectReference: string;
  protectedCopyTargetReference: string;
  publicProfileTargetReference: string;
}): ProtectionPlan {
  return {
    planId: input.planId,
    organizationScope: input.organizationScope ?? "unknown",
    candidateScope: input.candidateScope ?? "unknown",
    originalObjectReference: input.originalObjectReference,
    originalImmutableReference: input.originalObjectReference,
    protectedCopyTargetReference: input.protectedCopyTargetReference,
    publicProfileTargetReference: input.publicProfileTargetReference,
    findingsIncluded: [],
    maskingOperations: [],
    removalOperations: [],
    replacementPlaceholders: [],
    metadataStripping: false,
    qrMasking: false,
    barcodeMasking: false,
    linkNeutralization: false,
    textRedaction: false,
    imageRegionRedaction: false,
    protectionStatus: "failed_safe",
    reviewStatus: "required",
    currentDisclosureManifest: createDisclosureManifest("strict_private"),
    allowedFutureDisclosureTransitions: [],
    deniedTransitions: [],
    transitionPrerequisites: ["policy_approval"],
    policyVersion: "phase10.stage8_5.v1",
    workflowStageRequirement: "any",
    consentRequirement: null,
    staffApprovalRequirement: true,
    paymentRequirement: "not_required",
    contractStateRequirement: "not_required",
    activeFreezeRestriction: true,
    criticalViolationRestriction: true,
    transitionHistory: [],
    rollbackTarget: null,
    irreversibleFields: ["original_cv", "private_documents", "passport_number", "national_id"],
    expiryTimestamp: null,
    revocationTimestamp: null,
    generatedTimestamp: new Date().toISOString(),
    protectionVersion: "stage8_5.plan.v1",
  };
}
