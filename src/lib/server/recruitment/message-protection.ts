import {
  createContactProtectionDetectors,
  createInMemoryCrossMessageRepository,
  createInMemoryFalsePositiveRepository,
  createInMemoryMessageProjectionRepository,
  protectMessageContactInformation,
} from "@/lib/server/phase10/protection-engine/analysis/contact-protection";

const projectionRepository = createInMemoryMessageProjectionRepository();
const crossMessageRepository = createInMemoryCrossMessageRepository();
const falsePositiveRepository = createInMemoryFalsePositiveRepository();

export function buildMessagePersistencePlan(input: { hadProtection: boolean }) {
  if (!input.hadProtection) {
    return {
      preserveOriginalPrivately: false,
      showProtectedProjection: false,
      visibleToCounterparty: true,
    };
  }

  return {
    preserveOriginalPrivately: true,
    showProtectedProjection: true,
    visibleToCounterparty: true,
  };
}

export async function protectRecruitmentMessage(input: {
  messageId: string;
  messageText: string;
  conversationId: string;
  actorRole: "employer" | "candidate" | "prime_global_staff";
  organizationId?: string;
}) {
  const now = new Date().toISOString();
  const protection = await protectMessageContactInformation(
    {
      messageId: input.messageId,
      messageText: input.messageText,
      sourceCategory: "messages",
      context: {
        actor: {
          actorId: `${input.actorRole}:actor`,
          role: "prime_global_staff",
        },
        organizationId: input.organizationId ?? "prime-global",
        tenantId: null,
        conversationId: input.conversationId,
        workflowStage: "interview",
        priorRelatedFindings: [],
        policyVersion: "phase10-contact-protection-v1",
        consentVersion: "phase10-consent-v1",
      },
    },
    {
      detectors: createContactProtectionDetectors(),
      projectionRepository,
      crossMessageRepository,
      falsePositiveRepository,
      resolveRule: ({ findingType, fieldCategory }) => ({
        ruleId: `rule:${findingType}:${fieldCategory}`,
        ruleVersion: "1.0.0",
        registryVersion: "stage9",
        policyIds: ["phase10.contact-protection"],
        businessRuleIds: ["recruitment.supervised-chat"],
        ruleSnapshotHash: "stage9-snapshot",
        resolutionTimestamp: now,
        effectiveDateUsed: now,
        fallbackApplied: false,
        deprecatedRuleWarning: false,
        humanReviewRequirement: false,
      }),
      emitEvent: async () => undefined,
      appendAudit: async () => undefined,
      appendEvidence: async () => undefined,
    },
    {
      featureFlags: {
        CONTACT_PROTECTION_ENABLED: true,
        EMAIL_PROTECTION_ENABLED: true,
        PHONE_PROTECTION_ENABLED: true,
        SOCIAL_CONTACT_PROTECTION_ENABLED: true,
        EXTERNAL_LINK_PROTECTION_ENABLED: true,
        MEETING_LINK_PROTECTION_ENABLED: true,
        SHORT_URL_PROTECTION_ENABLED: true,
        OBFUSCATION_PROTECTION_ENABLED: true,
        MESSAGE_PROTECTED_PROJECTION_ENABLED: true,
      },
    }
  );

  return {
    protectedText: protection.protectedMessageText,
    hadProtection: protection.findings.length > 0,
    findings: protection.findings.map((item) => item.findingType),
    reviewRequired: protection.reviewRequirement,
  };
}
