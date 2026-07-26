import { createContactProtectionDetectors } from "./phase10/protection-engine/analysis/contact-protection/index.ts";

type EmployerAgencyInput = {
  companyName?: string | null;
  industry?: string | null;
  companyDescription?: string | null;
};

type JobContactInput = {
  title?: string | null;
  department?: string | null;
  responsibilities?: string | null;
  requirements?: string | null;
  benefits?: string | null;
  requiredSkills?: string[] | null;
};

export type LocalizedFieldMessage = {
  en: string;
  ar: string;
};

export type LocalizedFieldErrors = Record<string, LocalizedFieldMessage>;

const AGENCY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\brecruit(?:ment)?\s+agency\b/i, label: "recruitment agency" },
  { pattern: /\bstaffing\s+agency\b/i, label: "staffing agency" },
  { pattern: /\bplacement\s+agency\b/i, label: "placement agency" },
  { pattern: /\bmanpower\s+agency\b/i, label: "manpower agency" },
  { pattern: /\bintermediar(?:y|ies)\b/i, label: "intermediary" },
  { pattern: /\bthird[ -]?party\s+recruit(?:er|ment)?\b/i, label: "third-party recruiter" },
  { pattern: /\blabor\s+broker\b/i, label: "labor broker" },
  { pattern: /\bheadhunt(?:er|ing)\b/i, label: "headhunting" },
  { pattern: /\bagency\b/i, label: "agency" },
  { pattern: /\bconsultanc(?:y|ies)\b/i, label: "consultancy" },
  { pattern: /وكالة\s*توظيف/i, label: "وكالة توظيف" },
  { pattern: /مكتب\s*توظيف/i, label: "مكتب توظيف" },
  { pattern: /وسيط/i, label: "وسيط" },
  { pattern: /سمسار/i, label: "سمسار" },
];

const CONTACT_FIELD_MESSAGE_EN = "Direct contact channels are not allowed in job content.";
const CONTACT_FIELD_MESSAGE_AR = "لا يُسمح بإضافة قنوات تواصل مباشرة داخل محتوى الوظيفة.";

const AGENCY_FIELD_MESSAGE_EN = "Prime Global does not accept intermediary, brokerage, or recruitment agency employers.";
const AGENCY_FIELD_MESSAGE_AR = "برايم جلوبال لا تقبل جهات التوظيف الوسيطة أو المكاتب أو الوكالات.";

const contactDetectors = createContactProtectionDetectors();

const BLOCKED_CONTACT_FINDINGS = new Set([
  "email",
  "phone",
  "social_handle",
  "external_url",
  "shortened_url",
  "external_meeting_link",
]);

function normalizeInput(value: string) {
  return value.trim();
}

function findAgencyKeyword(value: string): string | null {
  for (const entry of AGENCY_PATTERNS) {
    if (entry.pattern.test(value)) {
      return entry.label;
    }
  }
  return null;
}

function withLocalizedFieldErrors(fieldNames: string[], en: string, ar: string) {
  const fieldErrors: Record<string, string> = {};
  const localizedFieldErrors: LocalizedFieldErrors = {};

  for (const fieldName of fieldNames) {
    fieldErrors[fieldName] = en;
    localizedFieldErrors[fieldName] = { en, ar };
  }

  return { fieldErrors, localizedFieldErrors };
}

export function evaluateAgencyPolicy(input: EmployerAgencyInput) {
  const scannedFields: Array<{ key: "companyName" | "industry" | "companyDescription"; value?: string | null }> = [
    { key: "companyName", value: input.companyName },
    { key: "industry", value: input.industry },
    { key: "companyDescription", value: input.companyDescription },
  ];

  const fieldMatches: Record<string, string[]> = {};

  for (const field of scannedFields) {
    const normalized = typeof field.value === "string" ? normalizeInput(field.value) : "";
    if (!normalized) continue;

    const matched = findAgencyKeyword(normalized);
    if (!matched) continue;

    if (!fieldMatches[field.key]) {
      fieldMatches[field.key] = [];
    }
    fieldMatches[field.key].push(matched);
  }

  const fields = Object.keys(fieldMatches);
  if (fields.length === 0) return null;

  const { fieldErrors, localizedFieldErrors } = withLocalizedFieldErrors(
    fields,
    AGENCY_FIELD_MESSAGE_EN,
    AGENCY_FIELD_MESSAGE_AR
  );

  return {
    code: "EMPLOYER_AGENCY_PROHIBITED",
    message: AGENCY_FIELD_MESSAGE_EN,
    messageAr: AGENCY_FIELD_MESSAGE_AR,
    fieldErrors,
    localizedFieldErrors,
    fieldMatches,
  };
}

function detectContactInField(text: string) {
  const findings = contactDetectors.flatMap((detector) =>
    detector.detect({
      sourceText: text,
      sourceCategory: "job_advertisements",
      conversationId: "employer-job-policy",
      workflowStage: "matching",
    })
  );

  return findings.filter((finding) => BLOCKED_CONTACT_FINDINGS.has(finding.findingType));
}

export function evaluateJobContactPolicy(input: JobContactInput) {
  const fieldValues: Array<{ key: keyof JobContactInput; value: string }> = [];

  if (input.title) fieldValues.push({ key: "title", value: input.title });
  if (input.department) fieldValues.push({ key: "department", value: input.department });
  if (input.responsibilities) fieldValues.push({ key: "responsibilities", value: input.responsibilities });
  if (input.requirements) fieldValues.push({ key: "requirements", value: input.requirements });
  if (input.benefits) fieldValues.push({ key: "benefits", value: input.benefits });
  if (Array.isArray(input.requiredSkills) && input.requiredSkills.length > 0) {
    fieldValues.push({ key: "requiredSkills", value: input.requiredSkills.join(" ") });
  }

  const blockedFields: Record<string, string[]> = {};

  for (const field of fieldValues) {
    const normalized = normalizeInput(field.value);
    if (!normalized) continue;

    const findings = detectContactInField(normalized);
    if (findings.length === 0) continue;

    blockedFields[String(field.key)] = Array.from(new Set(findings.map((finding) => finding.findingType)));
  }

  const fields = Object.keys(blockedFields);
  if (fields.length === 0) return null;

  const { fieldErrors, localizedFieldErrors } = withLocalizedFieldErrors(
    fields,
    CONTACT_FIELD_MESSAGE_EN,
    CONTACT_FIELD_MESSAGE_AR
  );

  return {
    code: "JOB_CONTACT_CHANNEL_BLOCKED",
    message: CONTACT_FIELD_MESSAGE_EN,
    messageAr: CONTACT_FIELD_MESSAGE_AR,
    fieldErrors,
    localizedFieldErrors,
    blockedFields,
  };
}