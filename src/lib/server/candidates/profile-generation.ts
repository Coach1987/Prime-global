import { readOptionalEnv } from "@/lib/server/config/env";

export type Locale = "en" | "ar";

export interface CandidateCareerSubmission {
  candidateId: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  desiredPosition: string;
  yearsOfExperience: number;
  coverLetter: string;
  originalCvPath: string;
  originalDocumentPaths: string[];
  locale: Locale;
  supportingNotes?: string[];
}

export interface CandidateProfileGenerationResult {
  professionalTitle: string | null;
  professionalSummary: string | null;
  yearsOfExperience: number | null;
  skills: string[];
  employmentHistory: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  languages: string[];
  generalLocation: string | null;
  availability: string | null;
  desiredRole: string | null;
  expectedSalary: number | null;
  aiSummary: string | null;
  generatedBy: string;
  generatedContent: Record<string, unknown>;
}

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{6,}\d)/g;
const WHATSAPP_PATTERN = /(?:wa\.me\/[\w/-]+|whatsapp\S+)/gi;
const TELEGRAM_PATTERN = /(?:t\.me\/[\w/-]+|telegram\S+)/gi;
const SOCIAL_HANDLE_PATTERN = /(?:@\w{3,}|linkedin\.com\/[\w./-]+|facebook\.com\/[\w./-]+|instagram\.com\/[\w./-]+)/gi;
const EXTERNAL_URL_PATTERN = /https?:\/\/[\w.-]+(?:\/[\w./?%&=-]*)?/gi;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function containsContactDetails(value: string) {
  if (!value) return false;
  return (
    EMAIL_PATTERN.test(value) ||
    PHONE_PATTERN.test(value) ||
    WHATSAPP_PATTERN.test(value) ||
    TELEGRAM_PATTERN.test(value) ||
    SOCIAL_HANDLE_PATTERN.test(value) ||
    EXTERNAL_URL_PATTERN.test(value)
  );
}

export function redactContactDetails(value: string) {
  return normalizeWhitespace(
    value
      .replace(EMAIL_PATTERN, "[redacted-email]")
      .replace(PHONE_PATTERN, "[redacted-phone]")
      .replace(WHATSAPP_PATTERN, "[redacted-whatsapp]")
      .replace(TELEGRAM_PATTERN, "[redacted-telegram]")
      .replace(SOCIAL_HANDLE_PATTERN, "[redacted-handle]")
      .replace(EXTERNAL_URL_PATTERN, "[redacted-url]")
  );
}

export function sanitizeTextInput(value?: string | null) {
  if (!value) return null;
  const normalized = normalizeWhitespace(value);
  return normalized ? redactContactDetails(normalized).slice(0, 4000) : null;
}

export function normalizeLocation(location?: string | null) {
  const sanitized = sanitizeTextInput(location);
  if (!sanitized) return null;
  return sanitized.slice(0, 160);
}

export function createCandidateReference(candidateId: string, createdAt = new Date()) {
  const year = String(createdAt.getUTCFullYear());
  const digits = candidateId.replace(/[^0-9]/g, "").slice(-6).padStart(6, "0");
  return `PG-CAND-${year}-${digits}`;
}

export function buildPromptLanguage(locale: Locale) {
  return locale === "ar" ? "Arabic" : "English";
}

async function requestOpenAiJson(prompt: string) {
  const apiKey = readOptionalEnv("OPENAI_API_KEY");
  const model = readOptionalEnv("OPENAI_MODEL") ?? "gpt-5.4-mini";

  if (!apiKey) {
    return null;
  }

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
            "You are a strict recruiting information extraction system. Only use facts present in the source material. Never invent qualifications, skills, employment history, education, certificates, contact details, salary, or availability. If a field is uncertain, return null or an empty array. Never include email addresses, phone numbers, WhatsApp, Telegram, social handles, or external URLs in any employer-facing field.",
        },
        {
          role: "user",
          content: prompt,
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

  const content = payload.choices?.[0]?.message?.content ?? null;
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function deterministicSkills(input: CandidateCareerSubmission) {
  const skills = [input.desiredPosition, input.location]
    .map((value) => sanitizeTextInput(value) ?? "")
    .filter(Boolean);

  return Array.from(new Set(skills)).slice(0, 8);
}

export async function generateCandidateProfileDraft(input: CandidateCareerSubmission) {
  const prompt = JSON.stringify(
    {
      candidateReference: createCandidateReference(input.candidateId),
      sourceLanguage: buildPromptLanguage(input.locale),
      sourceFields: {
        fullName: input.fullName,
        location: input.location,
        desiredPosition: input.desiredPosition,
        yearsOfExperience: input.yearsOfExperience,
        coverLetter: input.coverLetter,
        originalCvPath: input.originalCvPath,
        originalDocumentPaths: input.originalDocumentPaths,
        supportingNotes: input.supportingNotes ?? [],
      },
      outputSchema: {
        professionalTitle: "string | null",
        professionalSummary: "string | null",
        yearsOfExperience: "number | null",
        skills: "string[]",
        employmentHistory: "array<object>",
        education: "array<object>",
        certifications: "array<object>",
        languages: "string[]",
        generalLocation: "string | null",
        availability: "string | null",
        desiredRole: "string | null",
        expectedSalary: "number | null",
        aiSummary: "string | null",
      },
    },
    null,
    2
  );

  const aiResult = await requestOpenAiJson(prompt);

  const professionalTitle =
    sanitizeTextInput(String(aiResult?.professionalTitle ?? input.desiredPosition)) ?? input.desiredPosition;
  const professionalSummary = sanitizeTextInput(
    String(aiResult?.professionalSummary ?? input.coverLetter.slice(0, 600))
  );
  const generalLocation = normalizeLocation(String(aiResult?.generalLocation ?? input.location));

  const skills = Array.isArray(aiResult?.skills)
    ? (aiResult.skills as Array<unknown>).map((skill) => sanitizeTextInput(String(skill)) ?? "").filter(Boolean)
    : deterministicSkills(input);

  const employmentHistory = Array.isArray(aiResult?.employmentHistory)
    ? (aiResult.employmentHistory as Array<Record<string, unknown>>)
    : [];
  const education = Array.isArray(aiResult?.education) ? (aiResult.education as Array<Record<string, unknown>>) : [];
  const certifications = Array.isArray(aiResult?.certifications)
    ? (aiResult.certifications as Array<Record<string, unknown>>)
    : [];
  const languages = Array.isArray(aiResult?.languages)
    ? (aiResult.languages as Array<unknown>).map((language) => sanitizeTextInput(String(language)) ?? "").filter(Boolean)
    : [];

  const aiSummary = sanitizeTextInput(
    String(
      aiResult?.aiSummary ??
        `Employer-facing profile generated for ${input.desiredPosition}. Review required before publication.`
    )
  );

  return {
    professionalTitle,
    professionalSummary,
    yearsOfExperience: Number.isFinite(Number(aiResult?.yearsOfExperience))
      ? Number(aiResult?.yearsOfExperience)
      : input.yearsOfExperience,
    skills,
    employmentHistory,
    education,
    certifications,
    languages,
    generalLocation,
    availability: sanitizeTextInput(String(aiResult?.availability ?? "Available upon Prime Global approval")),
    desiredRole: sanitizeTextInput(String(aiResult?.desiredRole ?? input.desiredPosition)),
    expectedSalary: typeof aiResult?.expectedSalary === "number" ? aiResult.expectedSalary : null,
    aiSummary,
    generatedBy: readOptionalEnv("OPENAI_API_KEY")
      ? `openai:${readOptionalEnv("OPENAI_MODEL") ?? "gpt-5.4-mini"}`
      : "deterministic-fallback",
    generatedContent: {
      candidateReference: createCandidateReference(input.candidateId),
      source: {
        location: input.location,
        desiredPosition: input.desiredPosition,
        yearsOfExperience: input.yearsOfExperience,
      },
      aiResult: aiResult ?? null,
    },
  } satisfies CandidateProfileGenerationResult;
}
