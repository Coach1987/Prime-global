import { createHash } from "node:crypto";

export interface NormalizationResult {
  normalizedText: string;
  tokens: string[];
  confidenceBoost: number;
  reasons: string[];
}

const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
const REPEATED_SEPARATORS = /[._\-]{2,}/g;
const WHITESPACE = /\s+/g;
const ENGLISH_NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};
const ARABIC_NUMBER_WORDS: Record<string, string> = {
  صفر: "0",
  واحد: "1",
  واحده: "1",
  اثنان: "2",
  اثنين: "2",
  ثلاثة: "3",
  ثلاثه: "3",
  أربعة: "4",
  اربعة: "4",
  خمسة: "5",
  خمسه: "5",
  ستة: "6",
  سبعة: "7",
  ثمانية: "8",
  تسعة: "9",
};

const HOMOGLYPH_MAP: Record<string, string> = {
  "＠": "@",
  "﹫": "@",
  "｡": ".",
  "。": ".",
  "․": ".",
  "𝟢": "0",
  "𝟣": "1",
  "𝟤": "2",
  "𝟯": "3",
  "𝟦": "4",
  "𝟧": "5",
  "𝟨": "6",
  "𝟩": "7",
  "𝟪": "8",
  "𝟫": "9",
};

const EMOJI_MAP: Record<string, string> = {
  "📧": "email",
  "☎": "phone",
  "📞": "phone",
  "🔗": "link",
};

function normalizeWords(input: string, map: Record<string, string>): string {
  let output = input;
  for (const [key, value] of Object.entries(map)) {
    output = output.replace(new RegExp(`\\b${key}\\b`, "gi"), value);
  }
  return output;
}

function mapCharacters(input: string, map: Record<string, string>): string {
  return input
    .split("")
    .map((char) => map[char] ?? char)
    .join("");
}

function safeDecodeUri(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function normalizeContactText(text: string): NormalizationResult {
  const reasons: string[] = [];
  let value = text.trim();

  const noZeroWidth = value.replace(ZERO_WIDTH, "");
  if (noZeroWidth !== value) reasons.push("removed_zero_width");
  value = noZeroWidth;

  const unicode = value.normalize("NFKC");
  if (unicode !== value) reasons.push("unicode_normalized");
  value = unicode;

  const decoded = safeDecodeUri(value);
  if (decoded !== value) reasons.push("url_decoded_foundation");
  value = decoded;

  const lower = value.toLowerCase();
  if (lower !== value) reasons.push("case_normalized");
  value = lower;

  const punctuation = value.replace(/\(at\)|\sat\s/g, "@").replace(/\(dot\)|\sdot\s/g, ".");
  if (punctuation !== value) reasons.push("punctuation_substitution_normalized");
  value = punctuation;

  const compactSeparators = value.replace(REPEATED_SEPARATORS, ".");
  if (compactSeparators !== value) reasons.push("repeated_separators_collapsed");
  value = compactSeparators;

  const homoglyphMapped = mapCharacters(value, HOMOGLYPH_MAP);
  if (homoglyphMapped !== value) reasons.push("homoglyphs_mapped");
  value = homoglyphMapped;

  const emojiMapped = mapCharacters(value, EMOJI_MAP);
  if (emojiMapped !== value) reasons.push("emoji_substitution_mapped");
  value = emojiMapped;

  const englishNumbers = normalizeWords(value, ENGLISH_NUMBER_WORDS);
  if (englishNumbers !== value) reasons.push("english_number_words_normalized");
  value = englishNumbers;

  const arabicNumbers = normalizeWords(value, ARABIC_NUMBER_WORDS);
  if (arabicNumbers !== value) reasons.push("arabic_number_words_normalized");
  value = arabicNumbers;

  value = value.replace(WHITESPACE, " ").trim();
  const compact = value.replace(/\s+/g, "");

  const tokens = value.split(/[^\p{L}\p{N}@._:/+-]+/u).filter(Boolean);
  if (tokens.length > 0) reasons.push("tokenized");

  let confidenceBoost = 0;
  if (reasons.includes("homoglyphs_mapped") || reasons.includes("removed_zero_width")) confidenceBoost += 0.1;
  if (reasons.includes("english_number_words_normalized") || reasons.includes("arabic_number_words_normalized")) confidenceBoost += 0.1;

  return {
    normalizedText: compact || value,
    tokens,
    confidenceBoost,
    reasons,
  };
}

export function hashNormalizedValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function redactPreview(value: string): string {
  if (value.length <= 4) return "***";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

export function looksLikeBase64(text: string): boolean {
  return /^[A-Za-z0-9+/=]{20,}$/.test(text.replace(/\s+/g, ""));
}

export function looksLikeHex(text: string): boolean {
  return /^[A-Fa-f0-9]{16,}$/.test(text.replace(/\s+/g, ""));
}
