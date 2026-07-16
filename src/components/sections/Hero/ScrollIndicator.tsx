"use client";

import { useTranslations } from "next-intl";

export function ScrollIndicator() {
  const t = useTranslations("hero");

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
      <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
        {t("scrollHint")}
      </span>

      <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-3 py-2 backdrop-blur-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(87,164,255,0.68)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-slate-500/70" />
      </div>

      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="motion-reduce:animate-none animate-bounce" aria-hidden="true">
        <path d="M3 6l5 5 5-5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
