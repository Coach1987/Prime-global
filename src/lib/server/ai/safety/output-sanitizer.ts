import type { AiPiiSensitivity } from "../contracts/types.ts";
import { redactSensitiveText } from "./pii-redaction.ts";

const SOCIAL_PATTERN =
  /(?:@\w{3,}|linkedin\.com\/[\w./-]+|facebook\.com\/[\w./-]+|instagram\.com\/[\w./-]+|x\.com\/[\w./-]+)/giu;
const MESSAGING_PATTERN = /(?:wa\.me\/[\w/-]+|whatsapp\S*|t\.me\/[\w/-]+|telegram\S*|signal\S*|skype\S*)/giu;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const CONTACT_INSTRUCTION_PATTERN =
  /(?:contact\s+me|reach\s+me|call\s+me|email\s+me|message\s+me|whatsapp\s+me|send\s+me\s+a\s+message|تواصل\s+معي|اتصل\s+بي|راسلني|ابعث\s+لي\s+رسالة)/giu;
const HIDDEN_EMAIL_PATTERN =
  /(?:\b[a-z0-9._%+-]+\s*(?:\(?\s*at\s*\)?|\(?\s*@\s*\)?)\s*[a-z0-9.-]+\s*(?:\(?\s*dot\s*\)?|\(?\s*\.\s*\)?)\s*[a-z]{2,}\b)/giu;

interface SanitizedOutput {
  sanitized: string;
  redactionApplied: boolean;
  categories: string[];
  warnings: string[];
}

function replaceWithCategory(input: string, pattern: RegExp, replacement: string, category: string) {
  let count = 0;
  const output = input.replace(pattern, () => {
    count += 1;
    return replacement;
  });
  return { output, count, category };
}

function baseSanitize(input: string, sensitivity: AiPiiSensitivity): SanitizedOutput {
  const redacted = redactSensitiveText(input, sensitivity);
  return {
    sanitized: redacted.redactedText,
    redactionApplied: redacted.redactionApplied,
    categories: redacted.categories,
    warnings: redacted.redactionApplied ? ["PII redaction applied"] : [],
  };
}

export function sanitizeGenericOutput(input: string): SanitizedOutput {
  return baseSanitize(input, "medium");
}

export function sanitizeCandidateOutput(input: string): SanitizedOutput {
  return baseSanitize(input, "low");
}

export function sanitizeEmployerOutput(input: string): SanitizedOutput {
  const firstPass = baseSanitize(input, "high");
  let output = firstPass.sanitized;
  const categories = new Set(firstPass.categories);
  const warnings = [...firstPass.warnings];
  let strictRedactionApplied = false;

  const strictOps: Array<{ pattern: RegExp; replacement: string; category: string }> = [
    { pattern: SOCIAL_PATTERN, replacement: "[REDACTED_CONTACT]", category: "social_handle" },
    { pattern: MESSAGING_PATTERN, replacement: "[REDACTED_CONTACT]", category: "messaging_identifier" },
    { pattern: URL_PATTERN, replacement: "[REDACTED_CONTACT]", category: "url_token" },
    {
      pattern: CONTACT_INSTRUCTION_PATTERN,
      replacement: "[REDACTED_CONTACT_INSTRUCTION]",
      category: "contact_instruction",
    },
    { pattern: HIDDEN_EMAIL_PATTERN, replacement: "[REDACTED_EMAIL]", category: "email" },
  ];

  for (const op of strictOps) {
    const result = replaceWithCategory(output, op.pattern, op.replacement, op.category);
    output = result.output;
    if (result.count > 0) {
      strictRedactionApplied = true;
      categories.add(result.category);
    }
  }

  if (strictRedactionApplied) {
    warnings.push("Employer strict sanitizer removed direct-contact vectors");
  }

  return {
    sanitized: output,
    redactionApplied: firstPass.redactionApplied || strictRedactionApplied,
    categories: Array.from(categories),
    warnings,
  };
}

export type { SanitizedOutput };