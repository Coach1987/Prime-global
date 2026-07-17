"use client";

import { useEffect, useMemo, useState } from "react";
import { getCountryOptions, SupportedLocale } from "@/lib/constants/countries";
import { normalizeToE164 } from "@/lib/utils/phone";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";

interface InternationalPhoneInputProps {
  locale: SupportedLocale;
  countryCode: string;
  value: string;
  onChange: (nextValue: string, normalizedE164: string) => void;
  onCountryCodeChange?: (nextCountryCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function InternationalPhoneInput({
  locale,
  countryCode,
  value,
  onChange,
  onCountryCodeChange,
  placeholder,
  disabled,
}: InternationalPhoneInputProps) {
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const selected = useMemo(() => countryOptions.find((item) => item.code === countryCode.toUpperCase()) ?? null, [countryOptions, countryCode]);
  const [phoneCountryCode, setPhoneCountryCode] = useState(countryCode.toUpperCase());

  useEffect(() => {
    setPhoneCountryCode(countryCode.toUpperCase());
  }, [countryCode]);

  const dialCode = selected?.dialCode ?? "";

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(150px,220px)_1fr] gap-3">
        <label className="sr-only" htmlFor="phone-country-select">
          {locale === "ar" ? "دولة رقم الهاتف" : "Phone country"}
        </label>
        <select
          id="phone-country-select"
          value={phoneCountryCode}
          disabled={disabled}
          onChange={(event) => {
            const nextCode = event.target.value;
            setPhoneCountryCode(nextCode);
            onCountryCodeChange?.(nextCode);
            const normalized = normalizeToE164(value, nextCode);
            onChange(value, normalized);
          }}
          className="w-full rounded-2xl border border-blue-200/20 bg-[#061123] px-3 py-3 text-slate-100 focus:border-blue-300/60 focus:outline-none"
        >
          {countryOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.flag} {locale === "ar" ? option.nameAr : option.nameEn} ({option.dialCode})
            </option>
          ))}
        </select>

        <PrimeInput
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            const raw = event.target.value;
            const normalized = normalizeToE164(raw, phoneCountryCode);
            onChange(raw, normalized);
          }}
        />
      </div>
      <p className="text-xs text-text-tertiary">
        {locale === "ar"
          ? `سيتم حفظ الرقم بصيغة دولية قياسية مثل ${dialCode || "+966"}.`
          : `The number is stored in standard international format, for example ${dialCode || "+966"}.`}
      </p>
    </div>
  );
}
