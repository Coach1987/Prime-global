import { createConfidenceModel } from "./confidence.ts";
import type {
  AnalysisProviderName,
  ProtectionAction,
  ProtectionCategory,
  ProtectionFinding,
  ProtectionFindingType,
} from "./types.ts";

function redactValue(value: string): string {
  return value.replace(/[A-Za-z0-9]/g, "*");
}

function mapCategory(type: ProtectionFindingType): ProtectionCategory {
  if (["email", "phone", "social_handle", "address"].includes(type)) return "contact_information";
  if (["passport_number", "national_id", "personal_number"].includes(type)) return "identity_document";
  if (["hidden_metadata"].includes(type)) return "metadata";
  if (["url", "shortened_url", "embedded_link", "external_meeting_link"].includes(type)) return "linkage";
  if (["qr_code", "barcode"].includes(type)) return "image_code";
  return "unknown";
}

function mapAction(type: ProtectionFindingType): ProtectionAction {
  if (type === "qr_code") return "mask_qr";
  if (type === "barcode") return "mask_barcode";
  if (type === "hidden_metadata") return "metadata_strip";
  if (["url", "shortened_url", "embedded_link", "external_meeting_link"].includes(type)) return "link_neutralize";
  if (type === "unknown_sensitive_pattern") return "observe";
  return "text_redact";
}

function findingTemplate(input: {
  findingType: ProtectionFindingType;
  excerpt: string;
  score: number;
  provider: AnalysisProviderName;
  sourceFileReference: string;
  organizationScope: string;
  candidateScope: string;
  evidenceReference?: string | null;
  detectorVersion?: string;
  explanation: string;
}): ProtectionFinding {
  const confidence = createConfidenceModel(input.score, input.explanation);

  return {
    findingId: `finding:${input.findingType}:${Math.random().toString(36).slice(2, 10)}`,
    findingType: input.findingType,
    sourceProvider: input.provider,
    sourceFileReference: input.sourceFileReference,
    pageNumber: null,
    region: null,
    normalizedExcerpt: input.excerpt,
    redactedExcerpt: redactValue(input.excerpt),
    confidenceLevel: confidence.level,
    confidenceScore: confidence.score,
    explanation: confidence.explanation,
    protectionCategory: mapCategory(input.findingType),
    suggestedProtectionAction: mapAction(input.findingType),
    evidenceReference: input.evidenceReference ?? null,
    humanReviewRequired: confidence.level === "very_high",
    falsePositivePossible: confidence.level !== "very_high",
    detectorVersion: input.detectorVersion ?? "stage8-foundation-v1",
    schemaVersion: "stage8.finding.v1",
    organizationScope: input.organizationScope,
    candidateScope: input.candidateScope,
    createdTimestamp: new Date().toISOString(),
  };
}

const FINDING_PATTERNS: Array<{ type: ProtectionFindingType; regex: RegExp; score: number; explanation: string }> = [
  { type: "email", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, score: 0.86, explanation: "Email pattern found in document text." },
  { type: "phone", regex: /\+?[0-9][0-9\-\s]{7,}[0-9]/g, score: 0.79, explanation: "Phone number pattern found in document text." },
  { type: "shortened_url", regex: /\b(?:bit\.ly|tinyurl\.com|t\.co)\/\S+/gi, score: 0.82, explanation: "Shortened URL found and should be neutralized." },
  { type: "url", regex: /\bhttps?:\/\/\S+/gi, score: 0.7, explanation: "URL found in document text." },
  { type: "social_handle", regex: /(^|\s)@[a-zA-Z0-9_]{3,30}\b/g, score: 0.66, explanation: "Social handle pattern found." },
  { type: "external_meeting_link", regex: /\bhttps?:\/\/(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com)\/\S*/gi, score: 0.92, explanation: "External meeting link found." },
  { type: "passport_number", regex: /\b[A-PR-WY][1-9]\d\s?\d{4}[1-9]\b/g, score: 0.62, explanation: "Potential passport number pattern found." },
  { type: "national_id", regex: /\b\d{10,14}\b/g, score: 0.55, explanation: "Potential national ID pattern found." },
];

export function createFindingsFromText(input: {
  text: string;
  provider: AnalysisProviderName;
  sourceFileReference: string;
  organizationScope: string;
  candidateScope: string;
}): ProtectionFinding[] {
  const findings: ProtectionFinding[] = [];

  for (const pattern of FINDING_PATTERNS) {
    const matches = input.text.matchAll(pattern.regex);
    for (const match of matches) {
      const excerpt = (match[0] ?? "").trim();
      if (!excerpt) continue;
      findings.push(
        findingTemplate({
          findingType: pattern.type,
          excerpt,
          score: pattern.score,
          provider: input.provider,
          sourceFileReference: input.sourceFileReference,
          organizationScope: input.organizationScope,
          candidateScope: input.candidateScope,
          explanation: pattern.explanation,
        })
      );
    }
  }

  return findings;
}

export function createProviderFinding(input: {
  findingType: ProtectionFindingType;
  provider: AnalysisProviderName;
  sourceFileReference: string;
  organizationScope: string;
  candidateScope: string;
  excerpt: string;
  confidenceScore: number;
  explanation: string;
  pageNumber?: number | null;
  region?: ProtectionFinding["region"];
}): ProtectionFinding {
  const finding = findingTemplate({
    findingType: input.findingType,
    excerpt: input.excerpt,
    score: input.confidenceScore,
    provider: input.provider,
    sourceFileReference: input.sourceFileReference,
    organizationScope: input.organizationScope,
    candidateScope: input.candidateScope,
    explanation: input.explanation,
  });

  return {
    ...finding,
    pageNumber: input.pageNumber ?? null,
    region: input.region ?? null,
  };
}
