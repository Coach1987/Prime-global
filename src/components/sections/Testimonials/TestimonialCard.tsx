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
      className={filled ? "text-blue-300" : "text-white/15"}
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

export function TestimonialCard({
  testimonial,
}: TestimonialCardProps) {
  const t = useTranslations(
    `testimonials.items.${testimonial.key}`
  );

  const tA11y = useTranslations(
    "testimonials.a11y"
  );

  return (
    <article
      className="
        group
        relative
        flex
        h-full
        min-h-[340px]
        flex-col
        overflow-hidden
        rounded-[28px]
        border
        border-white/10
        bg-gradient-to-b
        from-white/[0.055]
        to-white/[0.02]
        p-7
        backdrop-blur-2xl
        transition-all
        duration-500
        hover:-translate-y-2
        hover:border-blue-300/35
        hover:shadow-[0_28px_70px_rgba(15,80,160,0.22)]
        sm:p-8
      "
    >
      {/* Ambient blue light */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-20
          -top-20
          h-48
          w-48
          rounded-full
          bg-blue-500/[0.08]
          blur-3xl
          transition-all
          duration-500
          group-hover:bg-blue-400/[0.16]
        "
      />

      {/* Decorative quote mark */}
      <span
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          right-7
          top-3
          font-heading
          text-[88px]
          leading-none
          text-white/[0.035]
          transition-colors
          duration-500
          group-hover:text-blue-300/[0.07]
        "
      >
        “
      </span>

      {/* Rating */}
      <div
        className="relative z-10 flex items-center gap-1"
        aria-label={tA11y("ratingLabel", {
          rating: testimonial.rating,
        })}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon
            key={index}
            filled={index < testimonial.rating}
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote className="relative z-10 mt-6 flex-1">
        <p className="text-[15px] leading-7 text-slate-300 sm:text-base">
          &ldquo;{t("quote")}&rdquo;
        </p>
      </blockquote>

      {/* Divider */}
      <div
        aria-hidden="true"
        className="relative z-10 mt-7 h-px bg-gradient-to-r from-blue-400/35 via-white/10 to-transparent"
      />

      {/* Author */}
      <footer className="relative z-10 mt-6 flex items-center gap-4">
        <span
          className="
            flex
            h-12
            w-12
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            border-blue-300/20
            bg-gradient-to-br
            from-blue-500/25
            via-slate-700/40
            to-[#07111e]
            text-sm
            font-semibold
            tracking-wide
            text-blue-200
            shadow-[0_8px_24px_rgba(20,80,160,0.18)]
          "
        >
          {testimonial.initials}
        </span>

        <div className="min-w-0 text-start">
          <p className="truncate text-sm font-semibold text-white">
            {t("name")}
          </p>

          <p className="mt-1 truncate text-[13px] text-slate-400">
            {t("role")}
          </p>
        </div>
      </footer>
    </article>
  );
}
