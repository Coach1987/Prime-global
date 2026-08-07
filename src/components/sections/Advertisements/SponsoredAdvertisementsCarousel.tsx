"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import type { PublicAdvertisementItem } from "@/features/advertisements/types";

interface SponsoredAdvertisementsCarouselProps {
  locale: "en" | "ar";
  items: PublicAdvertisementItem[];
}

function createSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function trackEvent(input: {
  advertisementId: string;
  eventType: "impression" | "click";
  locale: "en" | "ar";
  sessionId: string;
}) {
  try {
    await fetch(`/api/advertisements/${input.advertisementId}/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        eventType: input.eventType,
        locale: input.locale,
        sessionId: input.sessionId,
      }),
    });
  } catch {
    // Ignore telemetry failures to keep homepage UX resilient.
  }
}

export function SponsoredAdvertisementsCarousel({ locale, items }: SponsoredAdvertisementsCarouselProps) {
  const t = useTranslations("advertisements");
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const sessionId = useMemo(createSessionId, []);

  useEffect(() => {
    if (items.length <= 1 || paused) {
      return;
    }

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [items.length, paused]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (items.length === 0) return 0;
      if (current < items.length) return current;
      return 0;
    });
  }, [items.length]);

  useEffect(() => {
    const active = items[activeIndex];
    if (!active) {
      return;
    }

    const key = `${active.id}:${sessionId}`;
    if (trackedImpressions.current.has(key)) {
      return;
    }

    trackedImpressions.current.add(key);
    void trackEvent({
      advertisementId: active.id,
      eventType: "impression",
      locale,
      sessionId,
    });
  }, [activeIndex, items, locale, sessionId]);

  const active = items[activeIndex];
  if (!active) {
    return null;
  }

  return (
    <section
      aria-label={t("sectionLabel")}
      className="relative overflow-hidden bg-[#040913] pb-20 pt-8 md:pb-28 md:pt-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(120,188,255,0.2),transparent_35%),radial-gradient(circle_at_90%_85%,rgba(255,177,111,0.18),transparent_32%)]" />

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 md:px-8">
        <PrimeCard className="overflow-hidden border border-blue-100/15 bg-[#06152b]/70 p-0 backdrop-blur-xl">
          <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="relative min-h-[220px] bg-[#02070f] md:min-h-[320px]">
              {active.mediaType === "video" ? (
                <video
                  key={active.id}
                  src={active.mediaUrl}
                  className="h-full w-full object-cover"
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={active.mediaAlt}
                />
              ) : (
                <Image
                  key={active.id}
                  src={active.mediaUrl}
                  alt={active.mediaAlt}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover"
                />
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
              <div className="absolute start-4 top-4 rounded-full border border-amber-200/30 bg-[#3b2814]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                {t("badge")}
              </div>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-100/70">{t("headline")}</p>
              <h2 className="mt-3 font-heading text-2xl text-text-primary md:text-3xl">{active.title}</h2>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{active.description}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={active.targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={primeButtonClasses("primary")}
                  onClick={() => {
                    void trackEvent({
                      advertisementId: active.id,
                      eventType: "click",
                      locale,
                      sessionId,
                    });
                  }}
                >
                  {active.ctaText}
                </Link>

                <span className="text-xs text-text-tertiary">
                  {t("counter", {
                    current: activeIndex + 1,
                    total: items.length,
                  })}
                </span>
              </div>

              {items.length > 1 ? (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {items.map((item, index) => {
                    const selected = index === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={t("goTo", { index: index + 1 })}
                        aria-pressed={selected}
                        className={`h-2.5 rounded-full transition-all ${selected ? "w-8 bg-blue-300" : "w-2.5 bg-blue-100/35 hover:bg-blue-200/65"}`}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </PrimeCard>
      </div>
    </section>
  );
}
