import type { AiPiiSensitivity, PiiRedactionCategory, PiiRedactionResult } from "../contracts/types.ts";

const PLACEHOLDERS: Record<PiiRedactionCategory, string> = {
  email: "[REDACTED_EMAIL]",
  phone: "[REDACTED_PHONE]",
  address: "[REDACTED_ADDRESS]",
  national_id: "[REDACTED_ID]",
  passport: "[REDACTED_ID]",
  document_identifier: "[REDACTED_ID]",
  url_token: "[REDACTED_URL_TOKEN]",
  document_path: "[REDACTED_DOCUMENT_PATH]",
  contact_instruction: "[REDACTED_CONTACT_INSTRUCTION]",
  social_handle: "[REDACTED_CONTACT]",
  messaging_identifier: "[REDACTED_CONTACT]",
};

const SENSITIVITY_RANK: Record<AiPiiSensitivity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  restricted: 4,
};

const CATEGORY_MIN_LEVEL: Record<PiiRedactionCategory, number> = {
  email: 1,
  phone: 1,
  url_token: 1,
  social_handle: 1,
  messaging_identifier: 1,
  document_path: 2,
  contact_instruction: 2,
  address: 3,
  national_id: 3,
  passport: 3,
  document_identifier: 3,
};

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu;
const PHONE_PATTERN = /(?:\+?[0-9٠-٩][0-9٠-٩\s().-]{6,}[0-9٠-٩])/g;
const ADDRESS_PATTERN =
  /(?:\b(?:address|street|st\.?|road|rd\.?|avenue|ave\.?|building|apt\.?|floor|district|zip|postal(?:\s+code)?)\b[^\n,;]{0,80}|(?:العنوان|شارع|طريق|حي|عمارة|شقة|طابق|رمز\s*بريدي)[^\n،؛]{0,80})/giu;
const NATIONAL_ID_PATTERN =
  /(?:\b(?:national\s*id|id\s*number|nid|رقم\s*الهوية|الهوية(?:\s*الوطنية)?)\b\s*[:#-]?\s*[A-Z0-9٠-٩-]{5,30})/giu;
const PASSPORT_PATTERN =
  /(?:\b(?:passport(?:\s*number)?|رقم\s*جواز(?:\s*السفر)?|جواز\s*السفر)\b\s*[:#-]?\s*[A-Z0-9٠-٩-]{5,30})/giu;
const DOC_ID_PATTERN =
  /(?:\b(?:doc(?:ument)?\s*(?:id|number)|reference\s*(?:id|number)|رقم\s*المستند|معرف\s*المستند)\b\s*[:#-]?\s*[A-Z0-9٠-٩-]{5,40})/giu;
const STORAGE_PATH_PATTERN =
  /(?:\b(?:candidate-private|candidate-private-documents|candidate-resumes|candidate-cvs|signed-contracts|storage\/v1\/object)\/[A-Za-z0-9/_\-.]+|(?:\/|\\)(?:[\w.-]+(?:\/|\\))+[\w.-]+\.(?:pdf|docx?|png|jpe?g|webp|txt)\b)/giu;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const URL_TOKEN_PATTERN = /(?:token|key|signature|sig|auth|jwt|access[_-]?token)=/i;

function shouldRedact(category: PiiRedactionCategory, sensitivity: AiPiiSensitivity) {
  return SENSITIVITY_RANK[sensitivity] >= CATEGORY_MIN_LEVEL[category];
}

function applyPattern(
  input: string,
  pattern: RegExp,
  placeholder: string
): { output: string; count: number } {
  let count = 0;
  const output = input.replace(pattern, () => {
    count += 1;
    return placeholder;
  });
  return { output, count };
}

function applyUrlTokenRedaction(input: string): { output: string; count: number } {
  let count = 0;
  const output = input.replace(URL_PATTERN, (match) => {
    if (!URL_TOKEN_PATTERN.test(match)) {
      return match;
    }
    count += 1;
    return PLACEHOLDERS.url_token;
  });
  return { output, count };
}

export function redactSensitiveText(input: string, sensitivity: AiPiiSensitivity): PiiRedactionResult {
  const metadata: PiiRedactionResult["metadata"] = [];
  let redactedText = `${input}`;

  const operations: Array<{ category: PiiRedactionCategory; run: () => { output: string; count: number } }> = [
    {
      category: "email",
      run: () => applyPattern(redactedText, EMAIL_PATTERN, PLACEHOLDERS.email),
    },
    {
      category: "phone",
      run: () => applyPattern(redactedText, PHONE_PATTERN, PLACEHOLDERS.phone),
    },
    {
      category: "url_token",
      run: () => applyUrlTokenRedaction(redactedText),
    },
    {
      category: "document_path",
      run: () => applyPattern(redactedText, STORAGE_PATH_PATTERN, PLACEHOLDERS.document_path),
    },
    {
      category: "address",
      run: () => applyPattern(redactedText, ADDRESS_PATTERN, PLACEHOLDERS.address),
    },
    {
      category: "national_id",
      run: () => applyPattern(redactedText, NATIONAL_ID_PATTERN, PLACEHOLDERS.national_id),
    },
    {
      category: "passport",
      run: () => applyPattern(redactedText, PASSPORT_PATTERN, PLACEHOLDERS.passport),
    },
    {
      category: "document_identifier",
      run: () => applyPattern(redactedText, DOC_ID_PATTERN, PLACEHOLDERS.document_identifier),
    },
  ];

  for (const operation of operations) {
    if (!shouldRedact(operation.category, sensitivity)) {
      continue;
    }

    const { output, count } = operation.run();
    redactedText = output;
    if (count > 0) {
      metadata.push({
        category: operation.category,
        placeholder: PLACEHOLDERS[operation.category],
        count,
      });
    }
  }

  return {
    input,
    redactedText,
    redactionApplied: metadata.length > 0,
    categories: metadata.map((item) => item.category),
    metadata,
  };
}

export { PLACEHOLDERS };