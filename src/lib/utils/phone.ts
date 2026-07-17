import { parsePhoneNumberFromString } from "libphonenumber-js/min";

const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function isValidE164(phone: string | null | undefined) {
  if (!phone) return false;
  return E164_PATTERN.test(phone.trim());
}

export function normalizeToE164(phoneInput: string, countryCode?: string | null) {
  const trimmed = phoneInput.trim();
  if (!trimmed) return "";

  const parsed = parsePhoneNumberFromString(trimmed, (countryCode ?? undefined) as never);
  if (!parsed || !parsed.isValid()) return "";
  return parsed.number;
}
