"use client";

export function ScrollIndicator() {
  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
      <span className="text-[11px] uppercase tracking-[0.15em] text-text-tertiary">
        Scroll
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        className="animate-bounce-chevron text-text-tertiary"
        aria-hidden="true"
      >
        <path
          d="M3 6l5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
