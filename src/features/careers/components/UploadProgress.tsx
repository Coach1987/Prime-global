"use client";

import { useTranslations } from "next-intl";

interface UploadProgressProps {
  progress: number;
}

export function UploadProgress({ progress }: UploadProgressProps) {
  const t = useTranslations("careers.apply.upload");

  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-xs text-slate-300">{t("progress", { value: progress })}</p>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-200" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}