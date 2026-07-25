import { DEFAULT_LOCALE, isLocale } from "../constants/locales.ts";

export type AuthMode = "signin" | "register";

const APPLY_INTENT_PARAM = "applyIntent";

function normalizeLocale(rawLocale: string | null | undefined) {
  if (rawLocale && isLocale(rawLocale)) return rawLocale;
  return DEFAULT_LOCALE;
}

function isUnsafePath(value: string) {
  return value.startsWith("//") || value.includes("\\") || value.includes("\r") || value.includes("\n");
}

export function sanitizeLocalizedJobReturnTo(rawReturnTo: string | null | undefined, rawLocale: string | null | undefined) {
  if (!rawReturnTo || !rawReturnTo.trim()) return null;

  const locale = normalizeLocale(rawLocale);
  const trimmed = rawReturnTo.trim();

  if (!trimmed.startsWith("/") || isUnsafePath(trimmed)) {
    return null;
  }

  const [rawPathname, rawQuery = ""] = trimmed.split("?", 2);
  const localePrefix = `/${locale}/jobs/`;
  if (!rawPathname.startsWith(localePrefix)) {
    return null;
  }

  const slugOrId = rawPathname.slice(localePrefix.length).trim();
  if (!slugOrId || slugOrId.includes("/")) {
    return null;
  }

  if (slugOrId === "." || slugOrId === "..") {
    return null;
  }

  const search = new URLSearchParams(rawQuery);
  const safeSearch = new URLSearchParams();
  if (search.get(APPLY_INTENT_PARAM) === "1") {
    safeSearch.set(APPLY_INTENT_PARAM, "1");
  }

  const safeQuery = safeSearch.toString();
  return safeQuery ? `${rawPathname}?${safeQuery}` : rawPathname;
}

export function buildCandidateAuthHref({
  locale: rawLocale,
  mode,
  returnTo,
}: {
  locale: string | null | undefined;
  mode: AuthMode;
  returnTo?: string | null;
}) {
  const locale = normalizeLocale(rawLocale);
  const params = new URLSearchParams();
  params.set("mode", mode);
  params.set("audience", "candidate");

  const safeReturnTo = sanitizeLocalizedJobReturnTo(returnTo, locale);
  if (safeReturnTo) {
    params.set("returnTo", safeReturnTo);
  }

  return `/${locale}/auth?${params.toString()}`;
}

export function resolveCandidatePostAuthHref({
  locale,
  returnTo,
  fallback,
}: {
  locale: string | null | undefined;
  returnTo: string | null | undefined;
  fallback: string;
}) {
  const safeReturnTo = sanitizeLocalizedJobReturnTo(returnTo, locale);
  return safeReturnTo ?? fallback;
}
