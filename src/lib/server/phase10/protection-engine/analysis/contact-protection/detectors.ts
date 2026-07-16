import type {
  ContactCategory,
  ContactDetectorFinding,
  ContactDetectorInput,
  ContactDetectorProvider,
  ContactProtectionAction,
} from "./types.ts";
import { hashNormalizedValue, looksLikeBase64, looksLikeHex, normalizeContactText, redactPreview } from "./normalization.ts";

function confidenceFromScore(score: number): "low" | "medium" | "high" | "very_high" {
  if (score >= 0.9) return "very_high";
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function finding(input: {
  detectorId: string;
  detectorVersion: string;
  ruleId: string;
  findingType: ContactCategory;
  normalizedValue: string;
  confidenceScore: number;
  explanation: string;
  matchingReasons: string[];
  sourceRange: { start: number; end: number } | null;
  suggestedProtectionAction: ContactProtectionAction;
  falsePositivePossible?: boolean;
}): ContactDetectorFinding {
  return {
    detectorId: input.detectorId,
    detectorVersion: input.detectorVersion,
    ruleId: input.ruleId,
    findingType: input.findingType,
    normalizedValueHash: hashNormalizedValue(input.normalizedValue),
    redactedPreview: redactPreview(input.normalizedValue),
    confidenceLevel: confidenceFromScore(input.confidenceScore),
    confidenceScore: input.confidenceScore,
    explanation: input.explanation,
    matchingReasons: input.matchingReasons,
    sourceRange: input.sourceRange,
    crossMessageReferences: [],
    suggestedProtectionAction: input.suggestedProtectionAction,
    humanReviewRequirement: input.confidenceScore < 0.5,
    falsePositivePossible: input.falsePositivePossible ?? input.confidenceScore < 0.8,
  };
}

function findAll(regex: RegExp, text: string): Array<{ value: string; start: number; end: number }> {
  const matches: Array<{ value: string; start: number; end: number }> = [];
  for (const match of text.matchAll(regex)) {
    if (!match[0] || typeof match.index !== "number") continue;
    matches.push({ value: match[0], start: match.index, end: match.index + match[0].length });
  }
  return matches;
}

function obfuscationBonus(text: string): number {
  const indicators = ["(at)", " dot ", "@", "\u200b", "📧", " خمسة ", " five "];
  return indicators.some((item) => text.includes(item)) ? 0.1 : 0;
}

export class EmailContactDetector implements ContactDetectorProvider {
  detectorId = "email-contact-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const normalized = normalizeContactText(input.sourceText);
    const matches = findAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g, normalized.normalizedText);
    return matches.map((match) =>
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-EMAIL-001",
        findingType: "email",
        normalizedValue: match.value,
        confidenceScore: Math.min(0.95, 0.78 + normalized.confidenceBoost + obfuscationBonus(input.sourceText)),
        explanation: "Detected an email pattern after normalization.",
        matchingReasons: ["email_pattern", ...normalized.reasons],
        sourceRange: { start: match.start, end: match.end },
        suggestedProtectionAction: "mask_email",
      })
    );
  }
}

export class PhoneContactDetector implements ContactDetectorProvider {
  detectorId = "phone-contact-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const normalized = normalizeContactText(input.sourceText).normalizedText;
    const matches = findAll(/(?:\+?\d[\d\s-]{7,}\d)/g, normalized);
    return matches.map((match) =>
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-PHONE-001",
        findingType: "phone",
        normalizedValue: match.value.replace(/\D+/g, ""),
        confidenceScore: 0.8,
        explanation: "Detected a phone-number-like pattern.",
        matchingReasons: ["phone_pattern"],
        sourceRange: { start: match.start, end: match.end },
        suggestedProtectionAction: "mask_phone",
      })
    );
  }
}

export class SocialContactDetector implements ContactDetectorProvider {
  detectorId = "social-contact-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const matches = findAll(/(?:@[_a-z0-9]{3,}|linkedin\.com\/in\/[_a-z0-9-]+)/g, input.sourceText.toLowerCase());
    return matches.map((match) =>
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-SOCIAL-001",
        findingType: "social_handle",
        normalizedValue: match.value,
        confidenceScore: 0.7,
        explanation: "Detected social handle or profile link.",
        matchingReasons: ["social_pattern"],
        sourceRange: { start: match.start, end: match.end },
        suggestedProtectionAction: "hide_social_handle",
      })
    );
  }
}

export class ExternalLinkDetector implements ContactDetectorProvider {
  detectorId = "external-link-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const matches = findAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s)]*)?/gi, input.sourceText);
    return matches.map((match) =>
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-URL-001",
        findingType: "external_url",
        normalizedValue: match.value,
        confidenceScore: 0.72,
        explanation: "Detected an external URL.",
        matchingReasons: ["url_pattern"],
        sourceRange: { start: match.start, end: match.end },
        suggestedProtectionAction: "neutralize_link",
      })
    );
  }
}

export class MeetingLinkDetector implements ContactDetectorProvider {
  detectorId = "meeting-link-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const matches = findAll(/https?:\/\/(?:zoom\.us|meet\.google\.com|teams\.microsoft\.com)\/[^\s)]+/gi, input.sourceText);
    return matches.map((match) =>
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-EXTERNAL-MEETING-001",
        findingType: "external_meeting_link",
        normalizedValue: match.value,
        confidenceScore: 0.93,
        explanation: "Detected an external meeting link.",
        matchingReasons: ["meeting_link_pattern"],
        sourceRange: { start: match.start, end: match.end },
        suggestedProtectionAction: "block_external_meeting_link",
      })
    );
  }
}

export class ShortUrlDetector implements ContactDetectorProvider {
  detectorId = "short-url-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const matches = findAll(/https?:\/\/(?:bit\.ly|t\.co|tinyurl\.com|rb\.gy)\/[^\s)]+/gi, input.sourceText);
    return matches.map((match) =>
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-SHORT-URL-001",
        findingType: "shortened_url",
        normalizedValue: match.value,
        confidenceScore: 0.85,
        explanation: "Detected a shortened URL.",
        matchingReasons: ["short_url_pattern"],
        sourceRange: { start: match.start, end: match.end },
        suggestedProtectionAction: "neutralize_link",
      })
    );
  }
}

export class ObfuscatedContactDetector implements ContactDetectorProvider {
  detectorId = "obfuscated-contact-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const normalized = normalizeContactText(input.sourceText);
    const looksObfuscated =
      input.sourceText.includes("(at)") ||
      input.sourceText.includes(" dot ") ||
      /\s[a-z]\s[a-z]\s[a-z]\s/i.test(input.sourceText) ||
      /\u200b/.test(input.sourceText);

    if (!looksObfuscated) return [];

    return [
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-URL-001",
        findingType: normalized.normalizedText.includes("@") ? "email" : "unknown_bypass_pattern",
        normalizedValue: normalized.normalizedText,
        confidenceScore: normalized.normalizedText.includes("@") ? 0.68 : 0.42,
        explanation: "Detected an obfuscated contact-style pattern.",
        matchingReasons: ["obfuscation_pattern", ...normalized.reasons],
        sourceRange: null,
        suggestedProtectionAction: normalized.normalizedText.includes("@") ? "mask_email" : "observe_only",
        falsePositivePossible: true,
      }),
    ];
  }
}

export class UnicodeHomoglyphDetector implements ContactDetectorProvider {
  detectorId = "unicode-homoglyph-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const normalized = normalizeContactText(input.sourceText);
    if (!normalized.reasons.includes("homoglyphs_mapped")) return [];
    return [
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-EMAIL-001",
        findingType: normalized.normalizedText.includes("@") ? "email" : "unknown_bypass_pattern",
        normalizedValue: normalized.normalizedText,
        confidenceScore: 0.6,
        explanation: "Detected unicode homoglyph substitutions.",
        matchingReasons: ["unicode_homoglyph_pattern"],
        sourceRange: null,
        suggestedProtectionAction: "mask",
        falsePositivePossible: true,
      }),
    ];
  }
}

export class EncodedContentDetector implements ContactDetectorProvider {
  detectorId = "encoded-content-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    const condensed = input.sourceText.replace(/\s+/g, "");
    const encoded = looksLikeBase64(condensed) || looksLikeHex(condensed);
    if (!encoded) return [];
    return [
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: "PG-URL-001",
        findingType: "unknown_bypass_pattern",
        normalizedValue: condensed,
        confidenceScore: 0.45,
        explanation: "Detected encoded-like content. No execution was performed.",
        matchingReasons: [looksLikeBase64(condensed) ? "base64_like" : "hex_like"],
        sourceRange: null,
        suggestedProtectionAction: "observe_only",
        falsePositivePossible: true,
      }),
    ];
  }
}

export class MetadataContactDetector implements ContactDetectorProvider {
  detectorId = "metadata-contact-detector";

  detectorVersion = "1.0.0";

  detect(input: ContactDetectorInput): ContactDetectorFinding[] {
    if (input.sourceCategory !== "metadata") return [];
    const normalized = normalizeContactText(input.sourceText);
    const containsContact = normalized.normalizedText.includes("@") || /\d{7,}/.test(normalized.normalizedText);
    if (!containsContact) return [];

    return [
      finding({
        detectorId: this.detectorId,
        detectorVersion: this.detectorVersion,
        ruleId: normalized.normalizedText.includes("@") ? "PG-EMAIL-001" : "PG-PHONE-001",
        findingType: normalized.normalizedText.includes("@") ? "email" : "phone",
        normalizedValue: normalized.normalizedText,
        confidenceScore: 0.74,
        explanation: "Detected contact-like metadata content.",
        matchingReasons: ["metadata_contact_pattern"],
        sourceRange: null,
        suggestedProtectionAction: "protected_copy_only",
      }),
    ];
  }
}

export class CrossMessageContactDetector implements ContactDetectorProvider {
  detectorId = "cross-message-contact-detector";

  detectorVersion = "1.0.0";

  detect(): ContactDetectorFinding[] {
    return [];
  }
}

export function createContactProtectionDetectors(): ContactDetectorProvider[] {
  return [
    new EmailContactDetector(),
    new PhoneContactDetector(),
    new SocialContactDetector(),
    new ExternalLinkDetector(),
    new MeetingLinkDetector(),
    new ShortUrlDetector(),
    new ObfuscatedContactDetector(),
    new UnicodeHomoglyphDetector(),
    new EncodedContentDetector(),
    new CrossMessageContactDetector(),
    new MetadataContactDetector(),
  ];
}
