"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils/cn";

export type SegmentedTabsItem = {
  label: string;
  value: string;
};

type SegmentedTabsProps = {
  label: string;
  items: SegmentedTabsItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
  isRtl?: boolean;
};

export function SegmentedTabs({ label, items, activeIndex, onChange, className, isRtl = false }: SegmentedTabsProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeCount = Math.max(items.length, 1);
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), activeCount - 1);

  function focusTab(index: number) {
    const nextButton = buttonRefs.current[index];
    if (nextButton) {
      nextButton.focus({ preventScroll: true });
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const nextIndex = event.key === "ArrowDown" || !isRtl
        ? (index + 1) % items.length
        : (index - 1 + items.length) % items.length;
      onChange(nextIndex);
      focusTab(nextIndex);
      return;
    }

    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = event.key === "ArrowUp" || !isRtl
        ? (index - 1 + items.length) % items.length
        : (index + 1) % items.length;
      onChange(nextIndex);
      focusTab(nextIndex);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      onChange(0);
      focusTab(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      const nextIndex = items.length - 1;
      onChange(nextIndex);
      focusTab(nextIndex);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(index);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "relative isolate overflow-hidden rounded-full border border-blue-200/30 bg-[linear-gradient(140deg,rgba(9,24,46,0.92),rgba(6,17,34,0.9))] p-[3px]",
        "shadow-[inset_0_1px_0_rgba(215,233,255,0.12),0_0_0_1px_rgba(121,179,245,0.18),0_16px_34px_rgba(4,21,48,0.5)]",
        "focus-within:ring-2 focus-within:ring-blue-300/55 focus-within:ring-offset-2 focus-within:ring-offset-[#07152a]",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bottom-[3px] top-[3px] z-0 rounded-full border border-blue-100/45",
          "bg-gradient-to-b from-[#67c2ff] via-[#2d8ef7] to-[#0a5abc]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(181,220,255,0.34),0_0_22px_rgba(68,149,255,0.5)]",
          "transform-gpu transition-transform duration-[280ms] ease-in-out will-change-transform"
        )}
        style={{
          width: `calc(${100 / activeCount}% - 6px)`,
          ...(isRtl ? { right: "3px" } : { left: "3px" }),
          transform: `translateX(${isRtl ? -safeActiveIndex * 100 : safeActiveIndex * 100}%)`,
        }}
      />

      <div
        className="relative z-20 grid w-full"
        style={{ gridTemplateColumns: `repeat(${activeCount}, minmax(0, 1fr))` }}
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={(element) => {
              buttonRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            aria-selected={safeActiveIndex === index}
            tabIndex={safeActiveIndex === index ? 0 : -1}
            onClick={() => onChange(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative inline-flex min-h-10 w-full items-center justify-center rounded-full px-4 text-sm font-semibold tracking-[0.01em]",
              "cursor-pointer select-none [caret-color:transparent] transition-colors duration-300 ease-in-out focus:outline-none",
              "focus-visible:ring-2 focus-visible:ring-blue-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07152a]",
              safeActiveIndex === index ? "text-[#edf5ff]" : "text-slate-300 hover:text-slate-100"
            )}
          >
            <span className="pointer-events-none">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}