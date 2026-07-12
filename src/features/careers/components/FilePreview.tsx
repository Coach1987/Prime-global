"use client";

import { useTranslations } from "next-intl";
import type { UploadPreview } from "../types";

interface FilePreviewProps {
  file: UploadPreview | null;
  onClear: () => void;
}

export function FilePreview({ file, onClear }: FilePreviewProps) {
  const t = useTranslations("careers.apply.upload");

  if (!file) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-[#101c2e] px-4 py-3 text-sm text-slate-200">
      <div>
        <p className="font-medium text-white">{file.name}</p>
        <p className="text-xs text-slate-300">
          {t("fileMeta", { type: file.typeLabel.toUpperCase(), size: file.sizeLabel })}
        </p>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200"
      >
        {t("remove")}
      </button>
    </div>
  );
}