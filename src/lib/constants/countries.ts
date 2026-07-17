import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";
import arLocale from "i18n-iso-countries/langs/ar.json";
import { getCountries, getCountryCallingCode } from "libphonenumber-js/min";

countries.registerLocale(enLocale);
countries.registerLocale(arLocale);

export type SupportedLocale = "en" | "ar";

export interface CountryOption {
  code: string;
  nameEn: string;
  nameAr: string;
  dialCode: string;
  flag: string;
}

function codeToFlag(code: string) {
  const normalized = code.toUpperCase();
  return normalized.replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
}

const COUNTRY_OPTIONS: CountryOption[] = getCountries()
  .map((code) => {
    const nameEn = countries.getName(code, "en", { select: "official" }) ?? code;
    const nameAr = countries.getName(code, "ar", { select: "official" }) ?? nameEn;
    return {
      code,
      nameEn,
      nameAr,
      dialCode: `+${getCountryCallingCode(code)}`,
      flag: codeToFlag(code),
    };
  })
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

export function getCountryOptions() {
  return COUNTRY_OPTIONS;
}

export function getCountryName(code: string | null | undefined, locale: SupportedLocale) {
  if (!code) return "";
  const country = COUNTRY_OPTIONS.find((item) => item.code === code.toUpperCase());
  if (!country) return "";
  return locale === "ar" ? country.nameAr : country.nameEn;
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function filterCountryOptions(options: CountryOption[], query: string, locale: SupportedLocale) {
  const q = normalize(query.trim());
  if (!q) return options;

  return options.filter((option) => {
    const localizedName = locale === "ar" ? option.nameAr : option.nameEn;
    return (
      normalize(localizedName).startsWith(q) ||
      normalize(option.nameEn).startsWith(q) ||
      normalize(option.nameAr).startsWith(q) ||
      option.code.toLowerCase().startsWith(q) ||
      option.dialCode.startsWith(query.trim())
    );
  });
}
