"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CountryOption, filterCountryOptions, getCountryOptions, SupportedLocale } from "@/lib/constants/countries";
import { PrimeInput } from "@/components/ui/prime/PrimeInput";
import { cn } from "@/lib/utils/cn";

interface CountrySelectorProps {
  locale: SupportedLocale;
  value: string;
  onChange: (nextCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function getLabel(option: CountryOption, locale: SupportedLocale) {
  return locale === "ar" ? option.nameAr : option.nameEn;
}

export function CountrySelector({ locale, value, onChange, placeholder, disabled }: CountrySelectorProps) {
  const allOptions = useMemo(() => getCountryOptions(), []);
  const selected = useMemo(() => allOptions.find((item) => item.code === value.toUpperCase()) ?? null, [allOptions, value]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (selected && !open) {
      setQuery(getLabel(selected, locale));
    }
    if (!selected && !open) {
      setQuery("");
    }
  }, [selected, open, locale]);

  const filtered = useMemo(() => filterCountryOptions(allOptions, query, locale).slice(0, 60), [allOptions, query, locale]);

  function selectOption(option: CountryOption) {
    onChange(option.code);
    setQuery(getLabel(option, locale));
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (filtered[highlightIndex]) {
        selectOption(filtered[highlightIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <PrimeInput
        value={query}
        onFocus={() => {
          setOpen(true);
          setHighlightIndex(0);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setHighlightIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open ? (
        <div className="absolute z-40 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-blue-200/25 bg-[#071426] p-1 shadow-[0_24px_52px_rgba(2,10,20,0.55)]">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-text-tertiary">{locale === "ar" ? "لا توجد نتائج" : "No matches"}</div>
          ) : (
            filtered.map((option, index) => {
              const active = index === highlightIndex;
              return (
                <button
                  key={option.code}
                  type="button"
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm",
                    active ? "bg-blue-500/20 text-blue-50" : "text-slate-200 hover:bg-blue-500/10"
                  )}
                >
                  <span className="text-base" aria-hidden="true">{option.flag}</span>
                  <span className="flex-1 truncate">{getLabel(option, locale)}</span>
                  <span className="text-xs text-text-tertiary">{option.dialCode}</span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
