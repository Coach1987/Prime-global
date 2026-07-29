import {
  createContactProtectionDetectors,
  createInMemoryCrossMessageRepository,
  createInMemoryFalsePositiveRepository,
  createInMemoryMessageProjectionRepository,
  createProfileProtectionPlan,
} from "../phase10/protection-engine/analysis/contact-protection/index.ts";

interface AdvertisementModerationInput {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  ctaTextAr: string;
  ctaTextEn: string;
  targetUrl: string;
  mediaMetadata?: string | null;
}

export interface AdvertisementModerationResult {
  status: "passed" | "needs_review" | "failed";
  reason: string | null;
  findings: string[];
}

const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/giu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const WHATSAPP_PATTERN = /(wa\.me\/|whatsapp\.com\/|whats?app\b)/giu;
const TELEGRAM_PATTERN = /(t\.me\/|telegram\.me\/|telegram\.org\/)/giu;
const PROHIBITED_PATTERN = /(casino|betting|porn|adult|escort|hate|terror|weapon)/giu;
const UNSAFE_PATTERN = /(kill|attack|fraud|scam|steal|phishing|exploit)/giu;
const MALICIOUS_URL_PATTERN = /(javascript:|data:|vbscript:|file:|blob:|about:)/giu;

function normalizeInputFields(input: AdvertisementModerationInput) {
  return [
    input.titleAr,
    input.titleEn,
    input.descriptionAr,
    input.descriptionEn,
    input.ctaTextAr,
    input.ctaTextEn,
    input.targetUrl,
    input.mediaMetadata ?? "",
  ].join("\n");
}

function checkTargetUrl(urlValue: string) {
  try {
    const url = new URL(urlValue);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "Unsupported URL protocol";
    }

    if (MALICIOUS_URL_PATTERN.test(urlValue)) {
      return "Suspicious URL scheme";
    }

    return null;
  } catch {
    return "Invalid target URL";
  }
}

export async function moderateAdvertisementContent(
  input: AdvertisementModerationInput
): Promise<AdvertisementModerationResult> {
  const findings: string[] = [];
  const text = normalizeInputFields(input);

  const urlIssue = checkTargetUrl(input.targetUrl);
  if (urlIssue) {
    findings.push(urlIssue);
    return {
      status: "failed",
      reason: urlIssue,
      findings,
    };
  }

  if (MALICIOUS_URL_PATTERN.test(text)) {
    findings.push("Malicious URL pattern");
  }

  if (PROHIBITED_PATTERN.test(text)) {
    findings.push("Prohibited content detected");
  }

  if (UNSAFE_PATTERN.test(text)) {
    findings.push("Unsafe content detected");
  }

  if (PHONE_PATTERN.test(text)) {
    findings.push("Phone number detected");
  }

  if (EMAIL_PATTERN.test(text)) {
    findings.push("Email address detected");
  }

  if (WHATSAPP_PATTERN.test(text)) {
    findings.push("WhatsApp contact detected");
  }

  if (TELEGRAM_PATTERN.test(text)) {
    findings.push("Telegram contact detected");
  }

  const contactProtectionPlan = await createProfileProtectionPlan({
    sourceText: text,
    sourceCategory: "job_advertisements",
    requestContext: {
      actor: {
        actorId: "advertisement-moderation",
        role: "prime_global_staff",
      },
      organizationId: "prime-global",
      tenantId: null,
      conversationId: "advertisement-moderation",
      workflowStage: "intake",
      priorRelatedFindings: [],
      policyVersion: "phase10-contact-protection-v1",
      consentVersion: "phase10-consent-v1",
    },
    dependencies: {
      detectors: createContactProtectionDetectors(),
      projectionRepository: createInMemoryMessageProjectionRepository(),
      crossMessageRepository: createInMemoryCrossMessageRepository(),
      falsePositiveRepository: createInMemoryFalsePositiveRepository(),
      resolveRule: ({ findingType, fieldCategory }) => ({
        ruleId: `ad-rule:${findingType}:${fieldCategory}`,
        ruleVersion: "1.0.0",
        registryVersion: "advertisement-moderation-v1",
        policyIds: ["phase10.contact-protection"],
        businessRuleIds: ["advertisement.workflow"],
        ruleSnapshotHash: "advertisement-moderation-v1",
        resolutionTimestamp: new Date().toISOString(),
        effectiveDateUsed: new Date().toISOString(),
        fallbackApplied: false,
        deprecatedRuleWarning: false,
        humanReviewRequirement: false,
      }),
      emitEvent: async () => undefined,
      appendAudit: async () => undefined,
      appendEvidence: async () => undefined,
    },
    featureFlags: {
      CONTACT_PROTECTION_ENABLED: true,
      EMAIL_PROTECTION_ENABLED: true,
      PHONE_PROTECTION_ENABLED: true,
      SOCIAL_CONTACT_PROTECTION_ENABLED: true,
      EXTERNAL_LINK_PROTECTION_ENABLED: true,
      MEETING_LINK_PROTECTION_ENABLED: true,
      SHORT_URL_PROTECTION_ENABLED: true,
      OBFUSCATION_PROTECTION_ENABLED: true,
      JOB_AD_CONTACT_PROTECTION_ENABLED: true,
    },
  });

  if (contactProtectionPlan.findings.length > 0) {
    findings.push(...contactProtectionPlan.findings.map((finding) => `Contact protection: ${finding.findingType}`));
  }

  if (findings.some((entry) => /Prohibited content|Unsafe content|Malicious URL|Invalid target URL|Unsupported URL protocol/.test(entry))) {
    return {
      status: "failed",
      reason: findings[0] ?? "Content failed moderation",
      findings,
    };
  }

  if (findings.length > 0) {
    return {
      status: "needs_review",
      reason: findings[0],
      findings,
    };
  }

  return {
    status: "passed",
    reason: null,
    findings: [],
  };
}
