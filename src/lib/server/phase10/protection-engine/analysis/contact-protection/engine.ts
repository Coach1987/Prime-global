import { createHash, randomUUID } from "node:crypto";
import { detectCrossMessageLinks } from "./cross-message.ts";
import { normalizeContactText } from "./normalization.ts";
import type {
  ContactCategory,
  ContactDetectorFinding,
  ContactProtectionDependencies,
  ContactProtectionAction,
  ContactSourceCategory,
  MessageProtectionRequest,
  MessageProtectionResult,
  ProfileProtectionPlan,
} from "./types.ts";

export interface ContactProtectionFeatureFlags {
  CONTACT_PROTECTION_ENABLED: boolean;
  EMAIL_PROTECTION_ENABLED: boolean;
  PHONE_PROTECTION_ENABLED: boolean;
  SOCIAL_CONTACT_PROTECTION_ENABLED: boolean;
  EXTERNAL_LINK_PROTECTION_ENABLED: boolean;
  MEETING_LINK_PROTECTION_ENABLED: boolean;
  SHORT_URL_PROTECTION_ENABLED: boolean;
  OBFUSCATION_PROTECTION_ENABLED: boolean;
  UNICODE_HOMOGLYPH_PROTECTION_ENABLED: boolean;
  ENCODED_CONTENT_PROTECTION_ENABLED: boolean;
  CROSS_MESSAGE_PROTECTION_ENABLED: boolean;
  MESSAGE_PROTECTED_PROJECTION_ENABLED: boolean;
  JOB_AD_CONTACT_PROTECTION_ENABLED: boolean;
  PROFILE_CONTACT_PROTECTION_ENABLED: boolean;
}

const ALL_CONTACT_FLAGS_ENABLED: ContactProtectionFeatureFlags = {
  CONTACT_PROTECTION_ENABLED: true,
  EMAIL_PROTECTION_ENABLED: true,
  PHONE_PROTECTION_ENABLED: true,
  SOCIAL_CONTACT_PROTECTION_ENABLED: true,
  EXTERNAL_LINK_PROTECTION_ENABLED: true,
  MEETING_LINK_PROTECTION_ENABLED: true,
  SHORT_URL_PROTECTION_ENABLED: true,
  OBFUSCATION_PROTECTION_ENABLED: true,
  UNICODE_HOMOGLYPH_PROTECTION_ENABLED: true,
  ENCODED_CONTENT_PROTECTION_ENABLED: true,
  CROSS_MESSAGE_PROTECTION_ENABLED: true,
  MESSAGE_PROTECTED_PROJECTION_ENABLED: true,
  JOB_AD_CONTACT_PROTECTION_ENABLED: true,
  PROFILE_CONTACT_PROTECTION_ENABLED: true,
};

function mergeFlags(flags?: Partial<ContactProtectionFeatureFlags>): ContactProtectionFeatureFlags {
  return {
    ...ALL_CONTACT_FLAGS_ENABLED,
    ...(flags ?? {}),
  };
}

function isFindingAllowedByFlags(finding: ContactDetectorFinding, flags: ContactProtectionFeatureFlags): boolean {
  if (!flags.CONTACT_PROTECTION_ENABLED) return false;

  if (finding.findingType === "email") return flags.EMAIL_PROTECTION_ENABLED;
  if (finding.findingType === "phone") return flags.PHONE_PROTECTION_ENABLED;

  if (["social_handle", "linkedin", "facebook", "instagram", "discord"].includes(finding.findingType)) {
    return flags.SOCIAL_CONTACT_PROTECTION_ENABLED;
  }

  if (finding.findingType === "external_meeting_link") return flags.MEETING_LINK_PROTECTION_ENABLED;
  if (finding.findingType === "shortened_url") return flags.SHORT_URL_PROTECTION_ENABLED;
  if (finding.findingType === "external_url") return flags.EXTERNAL_LINK_PROTECTION_ENABLED;

  if (finding.findingType === "unknown_bypass_pattern") {
    return flags.OBFUSCATION_PROTECTION_ENABLED || flags.UNICODE_HOMOGLYPH_PROTECTION_ENABLED || flags.ENCODED_CONTENT_PROTECTION_ENABLED;
  }

  return true;
}

function applyFindingMasking(text: string, findings: ContactDetectorFinding[]): string {
  let output = text;
  const types = new Set(findings.map((finding) => finding.findingType));

  if (types.has("email")) {
    output = output.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[protected-email]");
  }

  if (types.has("phone")) {
    output = output.replace(/(?:\+?\d[\d\s-]{7,}\d)/g, "[protected-phone]");
  }

  if (types.has("social_handle")) {
    output = output.replace(/(^|\s)@[a-zA-Z0-9_]{3,30}\b/g, "$1[protected-social]");
    output = output.replace(/linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi, "[protected-social]");
  }

  if (types.has("external_meeting_link")) {
    output = output.replace(/https?:\/\/(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com)\/[^\s)]+/gi, "[protected-meeting-link]");
  }

  if (types.has("shortened_url")) {
    output = output.replace(/https?:\/\/(?:bit\.ly|t\.co|tinyurl\.com|rb\.gy)\/[^\s)]+/gi, "[protected-link]");
  }

  if (types.has("external_url")) {
    output = output.replace(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?/gi, "[protected-link]");
  }

  if (types.has("unknown_bypass_pattern")) {
    output = output.replace(/[A-Za-z0-9+/=]{20,}/g, "[protected-encoded-content]");
  }

  return output;
}

function actionPriority(action: ContactProtectionAction): number {
  if (action === "block_external_meeting_link") return 100;
  if (action === "neutralize_link") return 80;
  if (action === "mask_email" || action === "mask_phone") return 70;
  if (action === "hide_social_handle") return 60;
  if (action === "protected_copy_only") return 50;
  if (action === "internal_review") return 40;
  if (action === "observe_only") return 10;
  return 30;
}

function toResolverFindingType(category: ContactCategory):
  | "email"
  | "phone"
  | "url"
  | "shortened_url"
  | "social_handle"
  | "qr_code"
  | "barcode"
  | "external_meeting_link"
  | "unknown_sensitive_pattern" {
  if (category === "email") return "email";
  if (category === "phone") return "phone";
  if (category === "shortened_url") return "shortened_url";
  if (category === "social_handle") return "social_handle";
  if (category === "external_meeting_link") return "external_meeting_link";
  if (category === "qr_extracted_contact") return "qr_code";
  if (category === "barcode_extracted_contact") return "barcode";
  if (category === "unknown_bypass_pattern") return "unknown_sensitive_pattern";
  return "url";
}

function toResolverFieldCategory(sourceCategory: ContactSourceCategory): "personal_email" | "personal_phone" | "portfolio" | "private_documents" {
  if (sourceCategory === "metadata" || sourceCategory === "extracted_document_text" || sourceCategory === "ocr_output") {
    return "private_documents";
  }
  if (sourceCategory === "messages") return "portfolio";
  return "portfolio";
}

function summarizeCandidateExplanation(findings: ContactDetectorFinding[]): string {
  if (findings.length === 0) {
    return "No contact information needed protection in this message.";
  }

  const hasEmail = findings.some((finding) => finding.findingType === "email");
  const hasPhone = findings.some((finding) => finding.findingType === "phone");
  const hasLink = findings.some((finding) => ["external_url", "shortened_url", "external_meeting_link"].includes(finding.findingType));

  const parts: string[] = [];
  if (hasEmail) parts.push("email details");
  if (hasPhone) parts.push("phone details");
  if (hasLink) parts.push("external links");

  if (parts.length === 0) return "Contact details were protected to keep recruitment secure.";
  return `To keep recruitment safe, Prime Global protected ${parts.join(", ")} before employer sharing.`;
}

function metadataHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function shouldReview(findings: ContactDetectorFinding[]): boolean {
  return findings.some((finding) => finding.humanReviewRequirement || finding.falsePositivePossible || finding.crossMessageReferences.length > 0);
}

function extractCrossMessageTokens(messageText: string): string[] {
  const lower = messageText.toLowerCase();
  const tokens = new Set<string>();

  for (const match of lower.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g)) {
    if (match[0]) tokens.add(match[0]);
  }

  for (const match of lower.matchAll(/(?:\+?\d[\d\s-]{7,}\d)/g)) {
    if (match[0]) tokens.add(match[0].replace(/\D+/g, ""));
  }

  for (const match of lower.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?/g)) {
    if (match[0]) tokens.add(match[0]);
  }

  const normalized = normalizeContactText(messageText);
  for (const token of normalized.tokens) {
    if (token.length >= 4) tokens.add(token);
  }

  return Array.from(tokens);
}

function createSourceReference(messageId: string): string {
  return `message:${messageId}`;
}

function sanitizeFindingForMetadata(finding: ContactDetectorFinding): Record<string, unknown> {
  return {
    detectorId: finding.detectorId,
    detectorVersion: finding.detectorVersion,
    ruleId: finding.ruleId,
    findingType: finding.findingType,
    normalizedValueHash: finding.normalizedValueHash,
    confidenceLevel: finding.confidenceLevel,
    confidenceScore: finding.confidenceScore,
    suggestedProtectionAction: finding.suggestedProtectionAction,
    crossMessageReferenceCount: finding.crossMessageReferences.length,
  };
}

export async function protectMessageContactInformation(
  request: MessageProtectionRequest,
  dependencies: ContactProtectionDependencies,
  options?: {
    featureFlags?: Partial<ContactProtectionFeatureFlags>;
    crossMessageWindowSize?: number;
  }
): Promise<MessageProtectionResult> {
  const featureFlags = mergeFlags(options?.featureFlags);

  if (!featureFlags.CONTACT_PROTECTION_ENABLED) {
    return {
      originalMessageReference: createSourceReference(request.messageId),
      protectedMessageText: request.messageText,
      findings: [],
      appliedRules: [],
      protectionActions: [],
      candidateFriendlyExplanation: "Message sent without additional contact protection because the feature is disabled.",
      employerSafeText: request.messageText,
      evidenceReferences: [],
      timelineEntry: "Your message was shared securely for the recruitment process.",
      auditMetadata: [],
      reviewRequirement: false,
      continuationStatus: "continued",
      policyEvaluated: false,
      projection: null,
    };
  }

  await dependencies.emitEvent("ContactProtectionAnalysisStarted", {
    conversationId: request.context.conversationId,
    messageId: request.messageId,
    sourceCategory: request.sourceCategory,
  });

  const rawFindings = dependencies.detectors.flatMap((detector) =>
    detector.detect({
      sourceText: request.messageText,
      sourceCategory: request.sourceCategory,
      conversationId: request.context.conversationId,
      workflowStage: request.context.workflowStage,
    })
  );

  const findings = rawFindings.filter((finding) => isFindingAllowedByFlags(finding, featureFlags));

  if (featureFlags.CROSS_MESSAGE_PROTECTION_ENABLED && findings.length > 0) {
    const references = await detectCrossMessageLinks({
      tokens: extractCrossMessageTokens(request.messageText),
      messageId: request.messageId,
      context: request.context,
      repository: dependencies.crossMessageRepository,
      historyWindow: options?.crossMessageWindowSize ?? 20,
    });

    for (const finding of findings) {
      finding.crossMessageReferences = references;
    }
  }

  const appliedRules = findings.map((finding) =>
    dependencies.resolveRule({
      findingType: toResolverFindingType(finding.findingType),
      fieldCategory: toResolverFieldCategory(request.sourceCategory),
      workflowStage: request.context.workflowStage,
      actorRole: request.context.actor.role,
      organizationId: request.context.organizationId,
      tenantId: request.context.tenantId,
      policyVersion: request.context.policyVersion,
      consentVersion: request.context.consentVersion,
    })
  );

  const protectionActions = Array.from(new Set(findings.map((finding) => finding.suggestedProtectionAction))).sort(
    (left, right) => actionPriority(right) - actionPriority(left)
  );

  const protectedMessageText = applyFindingMasking(request.messageText, findings);
  const employerSafeText = protectedMessageText;
  const candidateFriendlyExplanation = summarizeCandidateExplanation(findings);
  const reviewRequirement = shouldReview(findings);
  const continuationStatus = reviewRequirement ? "continued_with_review" : "continued";

  const evidenceReferences: string[] = [];
  const auditMetadata = [];

  for (const finding of findings) {
    await dependencies.emitEvent("ContactProtectionFindingCreated", {
      conversationId: request.context.conversationId,
      messageId: request.messageId,
      findingType: finding.findingType,
      confidenceLevel: finding.confidenceLevel,
    });

    const metadata = sanitizeFindingForMetadata(finding);
    const hash = metadataHash(metadata);
    evidenceReferences.push(`evidence:${hash}`);

    await dependencies.appendEvidence(hash, metadata);
    await dependencies.appendAudit("contact_protection_finding_created", {
      messageId: request.messageId,
      findingHash: finding.normalizedValueHash,
      metadataHash: hash,
      findingType: finding.findingType,
    });

    auditMetadata.push({
      event: "contact_protection_finding_created",
      metadata: {
        findingHash: finding.normalizedValueHash,
        metadataHash: hash,
      },
      createdAt: new Date().toISOString(),
    });
  }

  if (findings.some((finding) => finding.findingType === "external_meeting_link")) {
    await dependencies.emitEvent("MeetingLinkProtected", {
      messageId: request.messageId,
      conversationId: request.context.conversationId,
    });
  }

  if (findings.some((finding) => finding.findingType === "social_handle")) {
    await dependencies.emitEvent("SocialHandleProtected", {
      messageId: request.messageId,
      conversationId: request.context.conversationId,
    });
  }

  if (findings.some((finding) => ["external_url", "shortened_url"].includes(finding.findingType))) {
    await dependencies.emitEvent("ExternalLinkNeutralized", {
      messageId: request.messageId,
      conversationId: request.context.conversationId,
    });
  }

  let projection: MessageProtectionResult["projection"] = null;

  if (featureFlags.MESSAGE_PROTECTED_PROJECTION_ENABLED && findings.length > 0) {
    projection = {
      projectionId: `projection:${randomUUID()}`,
      messageId: request.messageId,
      conversationId: request.context.conversationId,
      organizationId: request.context.organizationId,
      originalMessageReference: createSourceReference(request.messageId),
      protectedMessageText,
      candidateSafeText: candidateFriendlyExplanation,
      employerSafeText,
      createdAt: new Date().toISOString(),
    };

    await dependencies.projectionRepository.save(projection);

    await dependencies.emitEvent("ProtectedMessageProjectionCreated", {
      projectionId: projection.projectionId,
      messageId: request.messageId,
      conversationId: request.context.conversationId,
    });
  }

  if (reviewRequirement) {
    await dependencies.emitEvent("ContactProtectionReviewRequested", {
      messageId: request.messageId,
      conversationId: request.context.conversationId,
      findingCount: findings.length,
    });
  }

  await dependencies.emitEvent("ContactInformationProtected", {
    messageId: request.messageId,
    conversationId: request.context.conversationId,
    findingCount: findings.length,
  });

  return {
    originalMessageReference: createSourceReference(request.messageId),
    protectedMessageText,
    findings,
    appliedRules,
    protectionActions,
    candidateFriendlyExplanation,
    employerSafeText,
    evidenceReferences,
    timelineEntry: "Your message was safely prepared for the recruitment process.",
    auditMetadata,
    reviewRequirement,
    continuationStatus,
    policyEvaluated: true,
    projection,
  };
}

export async function createProfileProtectionPlan(input: {
  sourceText: string;
  sourceCategory: "profile_text" | "job_advertisements";
  requestContext: MessageProtectionRequest["context"];
  dependencies: ContactProtectionDependencies;
  featureFlags?: Partial<ContactProtectionFeatureFlags>;
}): Promise<ProfileProtectionPlan> {
  const flags = mergeFlags(input.featureFlags);

  if (input.sourceCategory === "profile_text" && !flags.PROFILE_CONTACT_PROTECTION_ENABLED) {
    return {
      sourceCategory: input.sourceCategory,
      protectedText: input.sourceText,
      findings: [],
      reviewRequired: false,
      continuationStatus: "continued",
    };
  }

  if (input.sourceCategory === "job_advertisements" && !flags.JOB_AD_CONTACT_PROTECTION_ENABLED) {
    return {
      sourceCategory: input.sourceCategory,
      protectedText: input.sourceText,
      findings: [],
      reviewRequired: false,
      continuationStatus: "continued",
    };
  }

  const result = await protectMessageContactInformation(
    {
      messageId: `profile-plan:${randomUUID()}`,
      messageText: input.sourceText,
      sourceCategory: input.sourceCategory,
      context: input.requestContext,
    },
    input.dependencies,
    { featureFlags: flags }
  );

  return {
    sourceCategory: input.sourceCategory,
    protectedText: result.protectedMessageText,
    findings: result.findings,
    reviewRequired: result.reviewRequirement,
    continuationStatus: result.continuationStatus,
  };
}

export async function recordContactProtectionFalsePositive(input: {
  findingHash: string;
  correctionMetadata: Record<string, unknown>;
  dependencies: ContactProtectionDependencies;
}): Promise<void> {
  await input.dependencies.falsePositiveRepository.append({
    findingHash: input.findingHash,
    outcome: "false_positive",
    correctionMetadata: input.correctionMetadata,
    recordedAt: new Date().toISOString(),
  });

  await input.dependencies.emitEvent("ContactProtectionFalsePositiveRecorded", {
    findingHash: input.findingHash,
    correctionMetadataHash: metadataHash(input.correctionMetadata),
  });
}
