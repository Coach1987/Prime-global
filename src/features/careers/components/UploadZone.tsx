"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

interface UploadZoneProps {
  onSelect: (file: File | null) => void;
}

export function UploadZone({ onSelect }: UploadZoneProps) {
  const t = useTranslations("careers.apply.upload");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-dashed border-blue-300/35 bg-[#101d31]/60 p-5">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="sr-only"
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
      />

      <p className="text-sm text-slate-200">{t("title")}</p>
      <p className="mt-1 text-xs text-slate-400">{t("hint")}</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white"
      >
        {t("selectFile")}
      </button>
    </div>
  );
}