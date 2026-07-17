import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { readOptionalEnv } from "@/lib/server/config/env";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export const CANDIDATE_VERIFICATION_PENDING_MESSAGE =
  "Your documents require manual verification before they can be approved.";

export const CANDIDATE_VERIFICATION_REJECTED_MESSAGE =
  "The uploaded documents do not appear to belong to the registered account. Please upload your own documents.";

export type VerificationDecision = "automatic_approval" | "accepted" | "pending_verification" | "rejected";

export type StaffReviewStatus = "not_required" | "pending" | "approved" | "rejected";

export type ExternalVerificationStatus = "not_available" | "detected" | "pending" | "verified" | "failed" | "unsafe";

export type DocumentVerificationProviderType =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure_openai"
  | "local"
  | "deterministic";

export interface CandidateIdentitySnapshot {
  fullName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  education: string[];
  degreeTitles: string[];
  workHistory: string[];
  skills: string[];
  languages: string[];
  contact: {
    email: string | null;
    phone: string | null;
    location: string | null;
  };
}

export interface VerificationDocumentInput {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

export interface DetectedFraudSignal {
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  evidence?: string;
}

export interface StrongEvidenceSignal {
  type:
    | "qr_code_reference"
    | "barcode_reference"
    | "verification_url"
    | "certificate_id"
    | "license_number"
    | "issuing_organization"
    | "digital_signature_indicator"
    | "pdf_metadata"
    | "embedded_identifier"
    | "issue_date"
    | "expiry_date"
    | "machine_readable_reference";
  value: string;
  confidence: "low" | "medium" | "high";
}

export interface VerificationResult {
  provider: DocumentVerificationProviderType;
  model: string;
  identityConfidenceScore: number;
  fraudRiskScore: number;
  fraudRiskBand: "low" | "review_recommended" | "mandatory_manual_review" | "escalated";
  highFraudOverrideApplied: boolean;
  decision: VerificationDecision;
  staffReviewStatus: StaffReviewStatus;
  identityReasoningSummary: string;
  fraudReasoningSummary: string;
  extractedIdentityFields: Record<string, unknown>;
  fieldScores: Record<string, number | null>;
  detectedFraudSignals: DetectedFraudSignal[];
  strongEvidenceSignals: StrongEvidenceSignal[];
  extractedVerificationReferences: {
    urls: string[];
    unsafeUrls: string[];
    certificateIds: string[];
    licenseNumbers: string[];
    issuingOrganizations: string[];
    digitalSignatureHints: string[];
    metadataReferences: string[];
    issueDates: string[];
    expiryDates: string[];
    machineReadableReferences: string[];
  };
  hasExternalVerificationReference: boolean;
  externalVerificationStatus: ExternalVerificationStatus;

  // Backward compatibility fields retained for existing call sites.
  confidenceScore: number;
  reasoningSummary: string;
}

interface ExtractedDocumentArtifact {
  input: VerificationDocumentInput;
  text: string;
  pdfMetadata: Record<string, unknown>;
  links: string[];
}

interface ProviderAssessment {
  extractedIdentityFields: Record<string, unknown>;
  fieldScores: Record<string, number | null>;
  identityReasoningSummary: string;
  fraudReasoningSummary?: string;
  detectedFraudSignals?: DetectedFraudSignal[];
  fraudRiskHint?: number | null;
}

export interface DocumentVerificationProvider {
  type: DocumentVerificationProviderType;
  model: string;
  isAvailable(): boolean;
  extractIdentityAndAnalyze(input: {
    snapshot: CandidateIdentitySnapshot;
    artifacts: ExtractedDocumentArtifact[];
  }): Promise<ProviderAssessment | null>;
  analyzeDocumentConsistency(input: {
    snapshot: CandidateIdentitySnapshot;
    artifacts: ExtractedDocumentArtifact[];
    extractedIdentityFields: Record<string, unknown>;
    fieldScores: Record<string, number | null>;
  }): Promise<{ identityReasoningSummary?: string; fieldScores?: Record<string, number | null> } | null>;
  analyzeFraudSignals(input: {
    snapshot: CandidateIdentitySnapshot;
    artifacts: ExtractedDocumentArtifact[];
    extractedIdentityFields: Record<string, unknown>;
    baseFraudSignals: DetectedFraudSignal[];
  }): Promise<{ fraudReasoningSummary?: string; fraudRiskHint?: number | null; signals?: DetectedFraudSignal[] } | null>;
}

const FIELD_WEIGHTS: Record<string, number> = {
  fullName: 20,
  dateOfBirth: 8,
  nationality: 8,
  education: 12,
  degreeTitles: 10,
  workHistory: 16,
  skills: 12,
  languages: 6,
  contactInformation: 6,
  otherIdentifyingInformation: 2,
};

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const URL_REGEX = /https?:\/\/[^\s)\]}"'<>]+/gi;
const CERTIFICATE_ID_REGEX = /\b(?:cert(?:ificate)?\s*(?:id|number)|cert#|رقم\s*الشهادة)\s*[:#-]?\s*([A-Z0-9-]{4,40})\b/gi;
const LICENSE_ID_REGEX = /\b(?:license\s*(?:id|number)|lic#|رقم\s*الرخصة)\s*[:#-]?\s*([A-Z0-9-]{4,40})\b/gi;
const ISSUE_DATE_REGEX = /\b(?:issue\s*date|issued\s*on|date\s*of\s*issue|تاريخ\s*الإصدار)\s*[:#-]?\s*([0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4}|\d{4}[\/.-][01]?\d[\/.-][0-3]?\d)\b/gi;
const EXPIRY_DATE_REGEX = /\b(?:expiry\s*date|expiration\s*date|valid\s*until|تاريخ\s*الانتهاء)\s*[:#-]?\s*([0-3]?\d[\/.-][01]?\d[\/.-]\d{2,4}|\d{4}[\/.-][01]?\d[\/.-][0-3]?\d)\b/gi;
const ISSUING_ORG_REGEX = /\b(?:issued\s*by|issuer|issuing\s*authority|جامعة|وزارة|ministry|university|institution)\s*[:#-]?\s*([^\n,.;]{3,80})/gi;
const QR_BARCODE_HINT_REGEX = /\b(?:qr\s*code|barcode|2d\s*barcode|code\s*128|ean-?13|datamatrix)\b/gi;
const DIGITAL_SIGNATURE_HINT_REGEX = /\b(?:digitally\s*signed|digital\s*signature|signed\s*electronically|pkcs|x509|pades)\b/gi;
const MACHINE_REFERENCE_REGEX = /\b(?:verification\s*ref(?:erence)?|ref(?:erence)?\s*no\.?|tracking\s*id|unique\s*id|معرف\s*التحقق)\s*[:#-]?\s*([A-Z0-9-]{4,64})\b/gi;

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const output: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (!value) continue;
    const next = value.trim();
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(next);
  }

  return output;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim();
      }

      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return Object.values(record)
          .filter((part) => typeof part === "string")
          .map((part) => String(part).trim())
          .filter(Boolean)
          .join(" ");
      }

      return "";
    })
    .filter(Boolean);
}

function overlapScore(expected: string[], documentText: string) {
  const base = uniqueStrings(expected);
  if (base.length === 0) return null;

  let matches = 0;
  const normalizedText = normalize(documentText);
  for (const value of base) {
    if (normalizedText.includes(normalize(value))) {
      matches += 1;
    }
  }

  const ratio = matches / base.length;
  return Math.round((35 + ratio * 65) * 100) / 100;
}

function scalarMatchScore(expected: string | null, documentText: string) {
  if (!expected) return null;
  const normalizedExpected = normalize(expected);
  if (!normalizedExpected) return null;

  const matched = normalize(documentText).includes(normalizedExpected);
  return matched ? 98 : 25;
}

function normalizePhone(value: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

function extractTextFallback(buffer: Buffer) {
  const asUtf8 = buffer.toString("utf8");
  const printable = asUtf8.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, " ");
  return printable.replace(/\s+/g, " ").trim();
}

function isPrivateOrUnsafeHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    return true;
  }

  return false;
}

function classifyVerificationUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const scheme = parsed.protocol.toLowerCase();
    if (scheme !== "https:" && scheme !== "http:") {
      return { safe: false, reason: "unsupported_scheme", normalized: rawUrl };
    }

    if (isPrivateOrUnsafeHost(parsed.hostname)) {
      return { safe: false, reason: "unsafe_host", normalized: parsed.toString() };
    }

    return { safe: true, reason: "safe", normalized: parsed.toString() };
  } catch {
    return { safe: false, reason: "invalid_url", normalized: rawUrl };
  }
}

function extractPatternCaptures(regex: RegExp, text: string) {
  const captures: string[] = [];
  let match: RegExpExecArray | null;
  const cloned = new RegExp(regex.source, regex.flags);
  while ((match = cloned.exec(text)) !== null) {
    const value = (match[1] ?? match[0] ?? "").trim();
    if (value) captures.push(value);
  }
  return uniqueStrings(captures);
}

async function extractDocumentArtifact(document: VerificationDocumentInput): Promise<ExtractedDocumentArtifact> {
  const fallback = {
    input: document,
    text: extractTextFallback(document.buffer),
    pdfMetadata: {} as Record<string, unknown>,
    links: [] as string[],
  };

  try {
    if (document.mimeType === "application/pdf" || document.fileName.toLowerCase().endsWith(".pdf")) {
      const parser = new PDFParse({ data: document.buffer });
      const [textResult, infoResult] = await Promise.all([
        parser.getText().catch(() => ({ text: "" })),
        parser.getInfo({ parsePageInfo: true }).catch(() => null),
      ]);
      await parser.destroy();

      const metadata = infoResult
        ? {
            totalPages: infoResult.total ?? null,
            info: infoResult.info ?? null,
            metadata: infoResult.metadata ?? null,
            pageLabels: Array.isArray(infoResult.pages)
              ? infoResult.pages
                  .map((entry) => (typeof entry?.pageLabel === "string" ? entry.pageLabel : null))
                  .filter(Boolean)
              : [],
          }
        : {};

      const links = Array.isArray(infoResult?.pages)
        ? infoResult.pages
            .flatMap((entry) => (Array.isArray(entry?.links) ? entry.links : []))
            .map((entry) => String((entry as Record<string, unknown>)?.url ?? "").trim())
            .filter(Boolean)
        : [];

      return {
        input: document,
        text: (textResult.text ?? "").trim() || fallback.text,
        pdfMetadata: metadata,
        links: uniqueStrings(links),
      };
    }

    if (
      document.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      document.fileName.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer: document.buffer });
      return {
        ...fallback,
        text: (result.value ?? "").trim() || fallback.text,
      };
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function buildCandidateEvidence(snapshot: CandidateIdentitySnapshot) {
  return uniqueStrings([
    snapshot.fullName,
    snapshot.nationality,
    snapshot.contact.email,
    snapshot.contact.phone,
    snapshot.contact.location,
    ...snapshot.education,
    ...snapshot.degreeTitles,
    ...snapshot.workHistory,
    ...snapshot.skills,
    ...snapshot.languages,
  ]);
}

function deterministicIdentityAssessment(input: {
  snapshot: CandidateIdentitySnapshot;
  artifacts: ExtractedDocumentArtifact[];
}): ProviderAssessment {
  const combinedText = input.artifacts.map((entry) => entry.text).join("\n");
  const normalizedText = normalize(combinedText);
  const emails = uniqueStrings(combinedText.match(EMAIL_REGEX) ?? []);
  const phones = uniqueStrings((combinedText.match(PHONE_REGEX) ?? []).map((value) => value.trim()));

  const fullNameScore = scalarMatchScore(input.snapshot.fullName, combinedText);
  const dateOfBirthScore = scalarMatchScore(input.snapshot.dateOfBirth, combinedText);
  const nationalityScore = scalarMatchScore(input.snapshot.nationality, combinedText);
  const educationScore = overlapScore(input.snapshot.education, combinedText);
  const degreeScore = overlapScore(input.snapshot.degreeTitles, combinedText);
  const workHistoryScore = overlapScore(input.snapshot.workHistory, combinedText);
  const skillsScore = overlapScore(input.snapshot.skills, combinedText);
  const languagesScore = overlapScore(input.snapshot.languages, combinedText);

  const expectedEmail = input.snapshot.contact.email ? normalize(input.snapshot.contact.email) : null;
  const expectedPhone = normalizePhone(input.snapshot.contact.phone);
  const hasExpectedEmail = expectedEmail ? emails.some((value) => normalize(value) === expectedEmail) : false;
  const hasExpectedPhone = expectedPhone
    ? phones.some((value) => {
        const candidate = normalizePhone(value);
        return Boolean(candidate && (candidate.endsWith(expectedPhone) || expectedPhone.endsWith(candidate)));
      })
    : false;

  let contactScore: number | null = null;
  if (expectedEmail || expectedPhone) {
    if (hasExpectedEmail || hasExpectedPhone) {
      contactScore = 96;
    } else if (emails.length > 0 || phones.length > 0) {
      contactScore = 30;
    } else {
      contactScore = 50;
    }
  }

  const evidenceTokens = buildCandidateEvidence(input.snapshot)
    .map((entry) => normalize(entry))
    .filter((entry) => entry.length > 2);

  const otherMatches = evidenceTokens.filter((entry) => normalizedText.includes(entry)).length;
  const otherScore = evidenceTokens.length > 0 ? Math.round((otherMatches / evidenceTokens.length) * 100) : null;

  return {
    extractedIdentityFields: {
      fullName: fullNameScore && fullNameScore >= 90 ? input.snapshot.fullName : null,
      dateOfBirth: dateOfBirthScore && dateOfBirthScore >= 90 ? input.snapshot.dateOfBirth : null,
      nationality: nationalityScore && nationalityScore >= 90 ? input.snapshot.nationality : null,
      education: input.snapshot.education.filter((entry) => normalizedText.includes(normalize(entry))).slice(0, 8),
      degreeTitles: input.snapshot.degreeTitles.filter((entry) => normalizedText.includes(normalize(entry))).slice(0, 8),
      workHistory: input.snapshot.workHistory.filter((entry) => normalizedText.includes(normalize(entry))).slice(0, 8),
      skills: input.snapshot.skills.filter((entry) => normalizedText.includes(normalize(entry))).slice(0, 12),
      languages: input.snapshot.languages.filter((entry) => normalizedText.includes(normalize(entry))).slice(0, 8),
      contactInformation: {
        emails,
        phones,
        matchedEmail: hasExpectedEmail ? input.snapshot.contact.email : null,
        matchedPhone: hasExpectedPhone ? input.snapshot.contact.phone : null,
      },
      otherIdentifyingInformation: {
        evidenceTokenMatches: otherMatches,
      },
    },
    fieldScores: {
      fullName: fullNameScore,
      dateOfBirth: dateOfBirthScore,
      nationality: nationalityScore,
      education: educationScore,
      degreeTitles: degreeScore,
      workHistory: workHistoryScore,
      skills: skillsScore,
      languages: languagesScore,
      contactInformation: contactScore,
      otherIdentifyingInformation: otherScore,
    },
    identityReasoningSummary:
      "Deterministic verification compared account identity fields with extracted document text and metadata.",
    fraudReasoningSummary:
      "Deterministic fraud analysis inspected conflicts, timeline anomalies, duplicate hashes, metadata anomalies, and unsafe verification references.",
  };
}

function computeIdentityConfidenceScore(input: {
  fieldScores: Record<string, number | null>;
  snapshot: CandidateIdentitySnapshot;
}) {
  let weightedSum = 0;
  let usedWeight = 0;

  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    const score = input.fieldScores[field];
    if (typeof score !== "number" || !Number.isFinite(score)) {
      continue;
    }
    weightedSum += Math.max(0, Math.min(100, score)) * weight;
    usedWeight += weight;
  }

  if (usedWeight === 0) {
    return 40;
  }

  let score = weightedSum / usedWeight;

  const hasName = Boolean(input.snapshot.fullName?.trim());
  if (hasName && typeof input.fieldScores.fullName === "number" && input.fieldScores.fullName <= 35) {
    score = Math.min(score, 49);
  }

  const hasContact = Boolean(input.snapshot.contact.email || input.snapshot.contact.phone);
  if (hasContact && typeof input.fieldScores.contactInformation === "number" && input.fieldScores.contactInformation <= 30) {
    score = Math.min(score, 49);
  }

  if (usedWeight < 30) {
    score = Math.min(score, 70);
  }

  return Math.round(score * 100) / 100;
}

function mapIdentityDecision(identityConfidenceScore: number) {
  if (identityConfidenceScore >= 95) {
    return { decision: "automatic_approval" as const, staffReviewStatus: "not_required" as const };
  }

  if (identityConfidenceScore >= 75) {
    return { decision: "accepted" as const, staffReviewStatus: "not_required" as const };
  }

  if (identityConfidenceScore >= 50) {
    return { decision: "pending_verification" as const, staffReviewStatus: "pending" as const };
  }

  return { decision: "rejected" as const, staffReviewStatus: "rejected" as const };
}

function mapFraudRiskBand(fraudRiskScore: number) {
  if (fraudRiskScore >= 75) return "escalated" as const;
  if (fraudRiskScore >= 50) return "mandatory_manual_review" as const;
  if (fraudRiskScore >= 25) return "review_recommended" as const;
  return "low" as const;
}

function applyFraudRiskOverride(input: {
  identityDecision: ReturnType<typeof mapIdentityDecision>;
  fraudRiskScore: number;
}) {
  const band = mapFraudRiskBand(input.fraudRiskScore);
  let decision = input.identityDecision.decision;
  let staffReviewStatus = input.identityDecision.staffReviewStatus;
  let highFraudOverrideApplied = false;

  if (decision !== "rejected" && input.fraudRiskScore >= 75) {
    decision = "pending_verification";
    staffReviewStatus = "pending";
    highFraudOverrideApplied = true;
  } else if (decision !== "rejected" && input.fraudRiskScore >= 50) {
    decision = "pending_verification";
    staffReviewStatus = "pending";
  }

  return {
    fraudRiskBand: band,
    highFraudOverrideApplied,
    decision,
    staffReviewStatus,
  };
}

function severityWeight(severity: DetectedFraudSignal["severity"]) {
  if (severity === "critical") return 28;
  if (severity === "high") return 18;
  if (severity === "medium") return 10;
  return 4;
}

function computeFraudRiskScore(input: { signals: DetectedFraudSignal[]; hintedRisk?: number | null }) {
  const base = input.signals.reduce((sum, signal) => sum + severityWeight(signal.severity), 0);
  const hint = typeof input.hintedRisk === "number" && Number.isFinite(input.hintedRisk)
    ? Math.max(0, Math.min(100, input.hintedRisk))
    : 0;

  const combined = Math.max(base, hint, Math.round((base * 0.7 + hint * 0.3) * 100) / 100);
  return Math.max(0, Math.min(100, Math.round(combined * 100) / 100));
}

function findFraudSignals(input: {
  snapshot: CandidateIdentitySnapshot;
  artifacts: ExtractedDocumentArtifact[];
  extractedIdentityFields: Record<string, unknown>;
  references: VerificationResult["extractedVerificationReferences"];
}) {
  const signals: DetectedFraudSignal[] = [];
  const combinedText = input.artifacts.map((entry) => entry.text).join("\n");

  const extractedName = typeof input.extractedIdentityFields.fullName === "string"
    ? input.extractedIdentityFields.fullName
    : null;

  if (input.snapshot.fullName && extractedName && normalize(input.snapshot.fullName) !== normalize(extractedName)) {
    signals.push({
      code: "conflicting_names",
      severity: "high",
      description: "Detected a conflicting full name between account profile and document extraction.",
      evidence: "full_name_mismatch",
    });
  }

  const years = Array.from(combinedText.matchAll(/\b(19\d{2}|20\d{2})\b/g)).map((entry) => Number(entry[1]));
  const nowYear = new Date().getUTCFullYear();
  if (years.some((year) => year > nowYear + 1)) {
    signals.push({
      code: "future_timeline",
      severity: "critical",
      description: "Found impossible future years in educational or employment timeline.",
      evidence: "timeline_year_out_of_bounds",
    });
  }

  if (input.references.unsafeUrls.length > 0) {
    signals.push({
      code: "unsafe_verification_reference",
      severity: "high",
      description: "Document contains unsafe or invalid verification references.",
      evidence: input.references.unsafeUrls[0],
    });
  }

  const suspiciousProducer = input.artifacts.some((artifact) => {
    const producer = String((artifact.pdfMetadata.info as Record<string, unknown> | undefined)?.Producer ?? "");
    return /photoshop|editor|manipulat|modified/i.test(producer);
  });
  if (suspiciousProducer) {
    signals.push({
      code: "suspicious_pdf_metadata",
      severity: "medium",
      description: "PDF metadata suggests intensive editing tooling that may require manual review.",
      evidence: "producer_metadata",
    });
  }

  const missingPageHint = input.artifacts.some((artifact) => {
    const pages = Number((artifact.pdfMetadata.totalPages as number | null) ?? 0);
    return pages === 0 && artifact.input.mimeType === "application/pdf";
  });
  if (missingPageHint) {
    signals.push({
      code: "missing_pages_or_unreadable_pdf",
      severity: "medium",
      description: "PDF page metadata could not be confirmed or appears missing.",
      evidence: "pdf_pages_unavailable",
    });
  }

  const issuingOrgs = input.references.issuingOrganizations;
  if (issuingOrgs.length > 1) {
    signals.push({
      code: "contradictory_issuing_organizations",
      severity: "medium",
      description: "Multiple issuing organizations were detected and may conflict.",
      evidence: issuingOrgs.slice(0, 3).join(" | "),
    });
  }

  return signals;
}

function extractVerificationReferences(artifacts: ExtractedDocumentArtifact[]) {
  const aggregateText = artifacts
    .flatMap((artifact) => [artifact.text, ...artifact.links, JSON.stringify(artifact.pdfMetadata ?? {})])
    .join("\n");

  const allUrls = uniqueStrings([...(aggregateText.match(URL_REGEX) ?? []), ...artifacts.flatMap((artifact) => artifact.links)]);
  const safeUrls: string[] = [];
  const unsafeUrls: string[] = [];

  for (const raw of allUrls) {
    const classified = classifyVerificationUrl(raw);
    if (classified.safe) {
      safeUrls.push(classified.normalized);
    } else {
      unsafeUrls.push(classified.normalized);
    }
  }

  return {
    urls: uniqueStrings(safeUrls),
    unsafeUrls: uniqueStrings(unsafeUrls),
    certificateIds: extractPatternCaptures(CERTIFICATE_ID_REGEX, aggregateText),
    licenseNumbers: extractPatternCaptures(LICENSE_ID_REGEX, aggregateText),
    issuingOrganizations: extractPatternCaptures(ISSUING_ORG_REGEX, aggregateText),
    digitalSignatureHints: uniqueStrings(aggregateText.match(DIGITAL_SIGNATURE_HINT_REGEX) ?? []),
    metadataReferences: uniqueStrings(
      artifacts.flatMap((artifact) => {
        const info = artifact.pdfMetadata.info as Record<string, unknown> | undefined;
        const values = [info?.Title, info?.Author, info?.Producer, info?.Creator].map((entry) =>
          typeof entry === "string" ? entry : null
        );
        return values.filter(Boolean) as string[];
      })
    ),
    issueDates: extractPatternCaptures(ISSUE_DATE_REGEX, aggregateText),
    expiryDates: extractPatternCaptures(EXPIRY_DATE_REGEX, aggregateText),
    machineReadableReferences: extractPatternCaptures(MACHINE_REFERENCE_REGEX, aggregateText),
  };
}

function extractStrongEvidenceSignals(
  references: ReturnType<typeof extractVerificationReferences>,
  artifacts: ExtractedDocumentArtifact[]
): StrongEvidenceSignal[] {
  const output: StrongEvidenceSignal[] = [];

  for (const url of references.urls) {
    output.push({ type: "verification_url", value: url, confidence: "medium" });
  }

  for (const value of references.certificateIds) {
    output.push({ type: "certificate_id", value, confidence: "medium" });
  }

  for (const value of references.licenseNumbers) {
    output.push({ type: "license_number", value, confidence: "medium" });
  }

  for (const value of references.issuingOrganizations) {
    output.push({ type: "issuing_organization", value, confidence: "low" });
  }

  for (const value of references.digitalSignatureHints) {
    output.push({ type: "digital_signature_indicator", value, confidence: "medium" });
  }

  for (const value of references.issueDates) {
    output.push({ type: "issue_date", value, confidence: "low" });
  }

  for (const value of references.expiryDates) {
    output.push({ type: "expiry_date", value, confidence: "low" });
  }

  for (const value of references.machineReadableReferences) {
    output.push({ type: "machine_readable_reference", value, confidence: "medium" });
  }

  for (const artifact of artifacts) {
    if (artifact.links.length > 0 || Object.keys(artifact.pdfMetadata).length > 0) {
      output.push({
        type: "pdf_metadata",
        value: `metadata:${artifact.input.fileName}`,
        confidence: "low",
      });
    }

    const qrHints = artifact.text.match(QR_BARCODE_HINT_REGEX) ?? [];
    for (const hint of uniqueStrings(qrHints)) {
      output.push({ type: "qr_code_reference", value: hint, confidence: "low" });
    }
  }

  return output.slice(0, 200);
}

async function createOpenAiProvider(modelOverride?: string): Promise<DocumentVerificationProvider> {
  const apiKey = readOptionalEnv("OPENAI_API_KEY");
  const model = modelOverride ?? readOptionalEnv("DOCUMENT_VERIFICATION_MODEL") ?? readOptionalEnv("OPENAI_MODEL") ?? "gpt-5.4-mini";

  return {
    type: "openai",
    model,
    isAvailable() {
      return Boolean(apiKey);
    },
    async extractIdentityAndAnalyze(input) {
      if (!apiKey) {
        return null;
      }

      const promptPayload = {
        candidate: input.snapshot,
        documents: input.artifacts.map((artifact) => ({
          name: artifact.input.fileName,
          mimeType: artifact.input.mimeType,
          textSample: artifact.text.slice(0, 8000),
        })),
        task: {
          extractIdentity: true,
          scoreIdentityFields: Object.keys(FIELD_WEIGHTS),
          detectFraudSignals: true,
          returnJsonOnly: true,
          outputSchema: {
            extractedIdentityFields: "object",
            fieldScores: "record<string, number | null>",
            identityReasoningSummary: "string",
            fraudReasoningSummary: "string",
            fraudRiskHint: "number | null",
            detectedFraudSignals: "array<{code,severity,description,evidence?}>",
          },
        },
      };

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a document identity and fraud-risk analysis system. Use only provided document/account data. Never assume authenticity from links, QR, or barcodes alone.",
            },
            {
              role: "user",
              content: JSON.stringify(promptPayload),
            },
          ],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) return null;

      try {
        const parsed = JSON.parse(content) as Record<string, unknown>;
        const fieldScoresInput = parsed.fieldScores && typeof parsed.fieldScores === "object"
          ? (parsed.fieldScores as Record<string, unknown>)
          : {};

        const fieldScores = Object.fromEntries(
          Object.keys(FIELD_WEIGHTS).map((key) => {
            const raw = fieldScoresInput[key];
            if (typeof raw === "number" && Number.isFinite(raw)) {
              return [key, Math.max(0, Math.min(100, raw))];
            }
            return [key, null];
          })
        ) as Record<string, number | null>;

        const detectedFraudSignals = Array.isArray(parsed.detectedFraudSignals)
          ? (parsed.detectedFraudSignals as Array<Record<string, unknown>>)
              .map((entry) => {
                const severity =
                  entry.severity === "critical" ||
                  entry.severity === "high" ||
                  entry.severity === "medium" ||
                  entry.severity === "low"
                    ? entry.severity
                    : "medium";

                return {
                  code: typeof entry.code === "string" ? entry.code.slice(0, 80) : "ai_signal",
                  severity,
                  description:
                    typeof entry.description === "string"
                      ? entry.description.slice(0, 400)
                      : "AI detected a potentially suspicious pattern.",
                  evidence: typeof entry.evidence === "string" ? entry.evidence.slice(0, 180) : undefined,
                } satisfies DetectedFraudSignal;
              })
              .slice(0, 50)
          : [];

        return {
          extractedIdentityFields:
            parsed.extractedIdentityFields && typeof parsed.extractedIdentityFields === "object"
              ? (parsed.extractedIdentityFields as Record<string, unknown>)
              : {},
          fieldScores,
          identityReasoningSummary:
            typeof parsed.identityReasoningSummary === "string"
              ? parsed.identityReasoningSummary.slice(0, 4000)
              : "AI compared account identity with extracted document attributes.",
          fraudReasoningSummary:
            typeof parsed.fraudReasoningSummary === "string"
              ? parsed.fraudReasoningSummary.slice(0, 4000)
              : undefined,
          fraudRiskHint:
            typeof parsed.fraudRiskHint === "number" && Number.isFinite(parsed.fraudRiskHint)
              ? Math.max(0, Math.min(100, parsed.fraudRiskHint))
              : null,
          detectedFraudSignals,
        };
      } catch {
        return null;
      }
    },
    async analyzeDocumentConsistency() {
      return null;
    },
    async analyzeFraudSignals() {
      return null;
    },
  };
}

function createUnavailableProvider(type: Exclude<DocumentVerificationProviderType, "openai" | "deterministic">, modelOverride?: string): DocumentVerificationProvider {
  const model = modelOverride ?? readOptionalEnv("DOCUMENT_VERIFICATION_MODEL") ?? `${type}-unconfigured`;
  return {
    type,
    model,
    isAvailable() {
      return false;
    },
    async extractIdentityAndAnalyze() {
      return null;
    },
    async analyzeDocumentConsistency() {
      return null;
    },
    async analyzeFraudSignals() {
      return null;
    },
  };
}

function createDeterministicProvider(modelOverride?: string): DocumentVerificationProvider {
  return {
    type: "deterministic",
    model: modelOverride ?? "deterministic-fallback",
    isAvailable() {
      return true;
    },
    async extractIdentityAndAnalyze(input) {
      return deterministicIdentityAssessment(input);
    },
    async analyzeDocumentConsistency() {
      return null;
    },
    async analyzeFraudSignals() {
      return null;
    },
  };
}

export async function selectDocumentVerificationProvider(): Promise<DocumentVerificationProvider> {
  const configured = (readOptionalEnv("DOCUMENT_VERIFICATION_PROVIDER") ?? "").toLowerCase();
  const model = readOptionalEnv("DOCUMENT_VERIFICATION_MODEL") ?? undefined;

  const normalized: DocumentVerificationProviderType =
    configured === "openai" ||
    configured === "anthropic" ||
    configured === "gemini" ||
    configured === "azure_openai" ||
    configured === "local" ||
    configured === "deterministic"
      ? configured
      : readOptionalEnv("OPENAI_API_KEY")
        ? "openai"
        : "deterministic";

  if (normalized === "openai") {
    const provider = await createOpenAiProvider(model);
    if (provider.isAvailable()) {
      return provider;
    }
    return createDeterministicProvider("deterministic-fallback");
  }

  if (normalized === "deterministic") {
    return createDeterministicProvider(model);
  }

  return createUnavailableProvider(normalized, model);
}

export function calculateDocumentContentHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function detectDuplicateHashAcrossAccounts(input: { candidateId: string; contentHash: string }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_document_versions")
    .select("id, candidate_id")
    .eq("content_hash", input.contentHash)
    .neq("candidate_id", input.candidateId)
    .limit(1);

  if (error) {
    return null;
  }

  return (data ?? []).length > 0 ? (data ?? [])[0] : null;
}

export async function verifyCandidateDocumentIdentity(input: {
  snapshot: CandidateIdentitySnapshot;
  candidateId: string;
  documents: VerificationDocumentInput[];
}): Promise<VerificationResult> {
  const artifacts = await Promise.all(input.documents.map((document) => extractDocumentArtifact(document)));
  const references = extractVerificationReferences(artifacts);
  const strongEvidenceSignals = extractStrongEvidenceSignals(references, artifacts);

  const configuredProvider = await selectDocumentVerificationProvider();
  const deterministicProvider = createDeterministicProvider();
  const provider = configuredProvider.isAvailable() ? configuredProvider : deterministicProvider;

  const providerAssessment =
    (await provider.extractIdentityAndAnalyze({ snapshot: input.snapshot, artifacts })) ??
    (await deterministicProvider.extractIdentityAndAnalyze({ snapshot: input.snapshot, artifacts })) ??
    deterministicIdentityAssessment({ snapshot: input.snapshot, artifacts });

  const identityConsistencyPatch = await provider.analyzeDocumentConsistency({
    snapshot: input.snapshot,
    artifacts,
    extractedIdentityFields: providerAssessment.extractedIdentityFields,
    fieldScores: providerAssessment.fieldScores,
  });

  const rawFraudSignals = findFraudSignals({
    snapshot: input.snapshot,
    artifacts,
    extractedIdentityFields: providerAssessment.extractedIdentityFields,
    references,
  });

  for (const duplicate of await Promise.all(
    input.documents.map(async (document) => {
      const contentHash = calculateDocumentContentHash(document.buffer);
      return detectDuplicateHashAcrossAccounts({ candidateId: input.candidateId, contentHash });
    })
  )) {
    if (duplicate) {
      rawFraudSignals.push({
        code: "duplicate_hash_across_unrelated_accounts",
        severity: "critical",
        description: "Detected the same document hash in another candidate account.",
        evidence: "cross_account_hash_match",
      });
      break;
    }
  }

  const providerFraudPatch = await provider.analyzeFraudSignals({
    snapshot: input.snapshot,
    artifacts,
    extractedIdentityFields: providerAssessment.extractedIdentityFields,
    baseFraudSignals: rawFraudSignals,
  });

  const mergedFieldScores = {
    ...providerAssessment.fieldScores,
    ...(identityConsistencyPatch?.fieldScores ?? {}),
  };

  const identityConfidenceScore = computeIdentityConfidenceScore({
    fieldScores: mergedFieldScores,
    snapshot: input.snapshot,
  });

  const mergedSignals = uniqueFraudSignals([
    ...rawFraudSignals,
    ...(providerAssessment.detectedFraudSignals ?? []),
    ...(providerFraudPatch?.signals ?? []),
  ]);

  const fraudRiskScore = computeFraudRiskScore({
    signals: mergedSignals,
    hintedRisk: providerFraudPatch?.fraudRiskHint ?? providerAssessment.fraudRiskHint,
  });

  const identityDecision = mapIdentityDecision(identityConfidenceScore);
  const fraudOverride = applyFraudRiskOverride({
    identityDecision,
    fraudRiskScore,
  });

  const hasExternalVerificationReference =
    references.urls.length > 0 || references.unsafeUrls.length > 0 || references.machineReadableReferences.length > 0;

  const externalVerificationStatus: ExternalVerificationStatus =
    hasExternalVerificationReference
      ? references.unsafeUrls.length > 0
        ? "unsafe"
        : "detected"
      : "not_available";

  return {
    provider: provider.type,
    model: provider.model,
    identityConfidenceScore,
    fraudRiskScore,
    fraudRiskBand: fraudOverride.fraudRiskBand,
    highFraudOverrideApplied: fraudOverride.highFraudOverrideApplied,
    decision: fraudOverride.decision,
    staffReviewStatus: fraudOverride.staffReviewStatus,
    identityReasoningSummary:
      identityConsistencyPatch?.identityReasoningSummary ??
      providerAssessment.identityReasoningSummary,
    fraudReasoningSummary:
      providerFraudPatch?.fraudReasoningSummary ??
      providerAssessment.fraudReasoningSummary ??
      "Fraud risk was estimated using metadata, reference-safety, structural consistency, and cross-account hash checks.",
    extractedIdentityFields: providerAssessment.extractedIdentityFields,
    fieldScores: mergedFieldScores,
    detectedFraudSignals: mergedSignals,
    strongEvidenceSignals,
    extractedVerificationReferences: references,
    hasExternalVerificationReference,
    externalVerificationStatus,
    confidenceScore: identityConfidenceScore,
    reasoningSummary:
      identityConsistencyPatch?.identityReasoningSummary ?? providerAssessment.identityReasoningSummary,
  };
}

function uniqueFraudSignals(signals: DetectedFraudSignal[]) {
  const seen = new Set<string>();
  const output: DetectedFraudSignal[] = [];

  for (const signal of signals) {
    const key = `${signal.code}:${signal.evidence ?? ""}:${signal.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(signal);
  }

  return output.slice(0, 100);
}

export async function persistIdentityVerificationDecision(input: {
  candidateId: string;
  source: "resume_upload" | "private_document_upload" | "manual_review";
  snapshot: CandidateIdentitySnapshot;
  documents: VerificationDocumentInput[];
  result: VerificationResult;
}) {
  const supabase = createSupabaseAdminClient();

  const payload = {
    candidate_id: input.candidateId,
    source: input.source,
    verification_decision: input.result.decision,
    confidence_score: input.result.identityConfidenceScore,
    identity_confidence_score: input.result.identityConfidenceScore,
    fraud_risk_score: input.result.fraudRiskScore,
    ai_reasoning_summary: input.result.identityReasoningSummary,
    identity_reasoning_summary: input.result.identityReasoningSummary,
    fraud_reasoning_summary: input.result.fraudReasoningSummary,
    extracted_identity_fields: {
      ...input.result.extractedIdentityFields,
      fieldScores: input.result.fieldScores,
      provider: input.result.provider,
      model: input.result.model,
    },
    candidate_identity_snapshot: input.snapshot,
    document_paths: input.documents.map((document) => document.storagePath),
    document_metadata: input.documents.map((document) => ({
      storagePath: document.storagePath,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      contentHash: calculateDocumentContentHash(document.buffer),
    })),
    staff_review_status: input.result.staffReviewStatus,
    verification_provider: input.result.provider,
    verification_model: input.result.model,
    fraud_risk_band: input.result.fraudRiskBand,
    high_fraud_override_applied: input.result.highFraudOverrideApplied,
    detected_fraud_signals: input.result.detectedFraudSignals,
    strong_evidence_signals: input.result.strongEvidenceSignals,
    extracted_verification_references: input.result.extractedVerificationReferences,
    has_external_verification_reference: input.result.hasExternalVerificationReference,
    external_verification_status: input.result.externalVerificationStatus,
  };

  let insertResult = await supabase
    .from("candidate_document_identity_verifications")
    .insert(payload)
    .select("id")
    .single();

  if (insertResult.error && /column .* does not exist/i.test(insertResult.error.message)) {
    insertResult = await supabase
      .from("candidate_document_identity_verifications")
      .insert({
        candidate_id: input.candidateId,
        source: input.source,
        verification_decision: input.result.decision,
        confidence_score: input.result.identityConfidenceScore,
        ai_reasoning_summary: input.result.identityReasoningSummary,
        extracted_identity_fields: {
          ...input.result.extractedIdentityFields,
          fieldScores: input.result.fieldScores,
          provider: input.result.provider,
          model: input.result.model,
        },
        candidate_identity_snapshot: input.snapshot,
        document_paths: input.documents.map((document) => document.storagePath),
        document_metadata: input.documents.map((document) => ({
          storagePath: document.storagePath,
          fileName: document.fileName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          contentHash: calculateDocumentContentHash(document.buffer),
        })),
        staff_review_status: input.result.staffReviewStatus,
      })
      .select("id")
      .single();
  }

  if (insertResult.error || !insertResult.data) {
    throw new Error(
      `Failed to persist document identity verification: ${insertResult.error?.message ?? "unknown error"}`
    );
  }

  const profileStatus =
    input.result.decision === "automatic_approval" || input.result.decision === "accepted"
      ? "approved"
      : input.result.decision === "pending_verification"
        ? "pending_verification"
        : "rejected";

  const profileUpdate = await supabase
    .from("candidate_private_profiles")
    .update({
      identity_verification_status: profileStatus,
      identity_verification_confidence: input.result.identityConfidenceScore,
      identity_verification_reasoning: input.result.identityReasoningSummary,
      identity_verification_updated_at: new Date().toISOString(),
      identity_staff_review_status: input.result.staffReviewStatus,
      identity_last_verification_id: insertResult.data.id,
      fraud_risk_score: input.result.fraudRiskScore,
      fraud_risk_band: input.result.fraudRiskBand,
      external_verification_status: input.result.externalVerificationStatus,
    })
    .eq("candidate_id", input.candidateId);

  if (profileUpdate.error && !/column .* does not exist/i.test(profileUpdate.error.message)) {
    throw new Error(`Failed to update candidate identity verification state: ${profileUpdate.error.message}`);
  }

  return insertResult.data.id as string;
}

export async function notifyPrimeGlobalStaffForManualReview(input: {
  candidateId: string;
  candidateName: string;
  confidenceScore: number;
  fraudRiskScore?: number;
  verificationId: string;
}) {
  const supabase = createSupabaseAdminClient();
  const staffUserIds = new Set<string>();

  let page = 1;
  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) {
      break;
    }

    for (const user of data.users) {
      const role = user.app_metadata?.app_role ?? user.user_metadata?.app_role;
      if (
        role === "prime_global_recruiter" ||
        role === "prime_global_admin" ||
        role === "admin" ||
        role === "super_admin"
      ) {
        staffUserIds.add(user.id);
      }
    }

    if (data.users.length < 200) {
      break;
    }

    page += 1;
  }

  if (staffUserIds.size === 0) {
    return 0;
  }

  const dedupeSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recentNotifications } = await supabase
    .from("notification_events")
    .select("auth_user_id")
    .in("auth_user_id", Array.from(staffUserIds))
    .eq("category", "status_change")
    .eq("title", "Candidate documents require manual verification")
    .eq("entity_type", "candidate_document_identity_verification")
    .eq("entity_id", input.candidateId)
    .gte("created_at", dedupeSince);

  const recentlyNotified = new Set((recentNotifications ?? []).map((entry) => String(entry.auth_user_id)));

  const records = Array.from(staffUserIds)
    .filter((authUserId) => !recentlyNotified.has(authUserId))
    .map((authUserId) => ({
      auth_user_id: authUserId,
      category: "status_change",
      title: "Candidate documents require manual verification",
      body: `${input.candidateName} requires document review. Identity confidence: ${input.confidenceScore.toFixed(2)}%.${typeof input.fraudRiskScore === "number" ? ` Fraud risk: ${input.fraudRiskScore.toFixed(2)}%.` : ""}`,
      entity_type: "candidate_document_identity_verification",
      entity_id: input.candidateId,
      delivery_channels: ["dashboard", "realtime"],
    }));

  if (records.length === 0) {
    return 0;
  }

  await supabase.from("notification_events").insert(records);
  return records.length;
}

export function buildCandidateIdentitySnapshot(input: {
  fullName?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  education?: unknown;
  degreeTitles?: unknown;
  workHistory?: unknown;
  skills?: unknown;
  languages?: unknown;
}): CandidateIdentitySnapshot {
  return {
    fullName: input.fullName?.trim() || null,
    dateOfBirth: input.dateOfBirth?.trim() || null,
    nationality: input.nationality?.trim() || null,
    education: uniqueStrings(toStringArray(input.education)),
    degreeTitles: uniqueStrings(toStringArray(input.degreeTitles)),
    workHistory: uniqueStrings(toStringArray(input.workHistory)),
    skills: uniqueStrings(toStringArray(input.skills)),
    languages: uniqueStrings(toStringArray(input.languages)),
    contact: {
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      location: input.location?.trim() || null,
    },
  };
}
