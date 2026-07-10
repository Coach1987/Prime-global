"use client";

export function ScrollIndicator() {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-3 md:flex">
      <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500">
        Scroll
      </span>

      <div className="relative flex h-10 w-6 items-start justify-center rounded-full border border-white/15 bg-white/[0.03] p-1 backdrop-blur-sm">
        <span className="mt-1 h-1.5 w-1.5 animate-bounce rounded-full bg-blue-300 shadow-[0_0_10px_rgba(125,211,252,0.8)]" />
      </div>
    </div>
  );
}
