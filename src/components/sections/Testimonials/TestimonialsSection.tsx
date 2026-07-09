"use client";

import { useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, A11y } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TestimonialCard } from "./TestimonialCard";
import { TESTIMONIALS } from "@/lib/constants/testimonials";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./testimonials.css";

export function TestimonialsSection() {
  const t = useTranslations("testimonials");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const paginationRef = useRef<HTMLDivElement>(null);
  const swiperRef = useRef<SwiperInstance | null>(null);

  return (
    <section className="relative overflow-hidden bg-bg-secondary py-16 md:py-32">
      <div className="mx-auto max-w-[1280px] px-5 md:px-8">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />

        <div className="relative mt-14 md:mt-16">
          {/*
            Swiper is a client-only library (it manipulates the DOM
            directly for touch/transform handling) and cannot render
            during SSR — this is inherent to any JS carousel, not
            specific to our setup. To avoid the testimonial text being
            completely invisible to search engines and no-JS users, a
            plain-text fallback is rendered inside <noscript> below with
            the same content, and Swiper mounts directly here (no
            artificial extra render-pass gate) so JS-enabled clients see
            it as early as possible.
          */}
          <Swiper
            key={isRtl ? "rtl" : "ltr"}
            modules={[Navigation, Pagination, A11y]}
            dir={isRtl ? "rtl" : "ltr"}
            onBeforeInit={(swiper) => {
              swiperRef.current = swiper;
              if (typeof swiper.params.navigation !== "boolean") {
                swiper.params.navigation = {
                  ...swiper.params.navigation,
                  prevEl: prevRef.current,
                  nextEl: nextRef.current,
                };
              }
              if (typeof swiper.params.pagination !== "boolean") {
                swiper.params.pagination = {
                  ...swiper.params.pagination,
                  el: paginationRef.current,
                };
              }
            }}
            spaceBetween={24}
            slidesPerView={1}
            speed={600}
            pagination={{
              clickable: true,
              bulletClass: "testimonials-bullet",
              bulletActiveClass: "testimonials-bullet-active",
            }}
            a11y={{
              prevSlideMessage: t("a11y.prevSlide"),
              nextSlideMessage: t("a11y.nextSlide"),
            }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="!overflow-visible !pb-14"
          >
            {TESTIMONIALS.map((testimonial) => (
              <SwiperSlide key={testimonial.key} className="!h-auto">
                <TestimonialCard testimonial={testimonial} />
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Custom pagination dots (Swiper populates this container) */}
          <div ref={paginationRef} className="mt-2 flex items-center justify-center gap-2" />

          {/* Custom navigation arrows */}
          <button
            ref={prevRef}
            type="button"
            aria-label={t("a11y.prevSlide")}
            className="absolute -start-4 top-[38%] z-10 hidden h-11 w-11 -translate-x-full -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-bg-primary/80 text-text-primary backdrop-blur-md transition-all duration-200 hover:border-accent-primary/50 hover:bg-accent-primary/10 disabled:pointer-events-none disabled:opacity-30 rtl:translate-x-full lg:flex"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:rotate-180" aria-hidden="true">
              <path
                d="M11 4 6 9l5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            ref={nextRef}
            type="button"
            aria-label={t("a11y.nextSlide")}
            className="absolute -end-4 top-[38%] z-10 hidden h-11 w-11 translate-x-full -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-bg-primary/80 text-text-primary backdrop-blur-md transition-all duration-200 hover:border-accent-primary/50 hover:bg-accent-primary/10 disabled:pointer-events-none disabled:opacity-30 rtl:-translate-x-full lg:flex"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="rtl:rotate-180" aria-hidden="true">
              <path
                d="M7 4l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Plain-text fallback for search engines and no-JS clients —
            Swiper's slides above are only present once JS hydrates. */}
        <noscript>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((testimonial) => (
              <TestimonialCard key={testimonial.key} testimonial={testimonial} />
            ))}
          </div>
        </noscript>
      </div>
    </section>
  );
}
