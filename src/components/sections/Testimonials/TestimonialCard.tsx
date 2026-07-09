"use client";

import { useTranslations } from "next-intl";
import type { TestimonialItem } from "@/lib/constants/testimonials";

interface TestimonialCardProps {
  testimonial: TestimonialItem;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill={filled ? "currentColor" : "none"}
      className={filled ? "text-accent-primary" : "text-white/20"}
      aria-hidden="true"
    >
      <path
        d="M8 1.5l1.85 3.9 4.3.55-3.15 3 0.85 4.3L8 11.2l-3.85 2.05.85-4.3-3.15-3 4.3-.55L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const t = useTranslations(`testimonials.items.${testimonial.key}`);
  const tA11y = useTranslations("testimonials.a11y");

  return (
    <div className="flex h-full flex-col rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-md">
      {/* Star rating */}
      <div
        className="flex items-center gap-1"
        aria-label={tA11y("ratingLabel", { rating: testimonial.rating })}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <StarIcon key={i} filled={i < testimonial.rating} />
        ))}
      </div>

      {/* Quote */}
      <p className="mt-5 flex-1 text-[15px] leading-relaxed text-text-secondary">
        &ldquo;{t("quote")}&rdquo;
      </p>

      {/* Author */}
      <div className="mt-6 flex items-center gap-3 border-t border-white/[0.08] pt-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary/30 to-bg-elevated text-sm font-semibold text-accent-bright">
          {testimonial.initials}
        </span>
        <div className="text-start">
          <p className="text-sm font-semibold text-text-primary">{t("name")}</p>
          <p className="text-[13px] text-text-tertiary">{t("role")}</p>
        </div>
      </div>
    </div>
  );
}
