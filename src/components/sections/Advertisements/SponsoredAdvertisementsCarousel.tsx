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

type TargetNavigation = {
  href: string;
  external: boolean;
};

const INTERNAL_AD_TARGET_HOSTS = new Set([
  "primeglobal.pro",
  "www.primeglobal.pro",
  "localhost",
  "127.0.0.1",
]);

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

function resolveAdvertisementTarget(rawTargetUrl: string): TargetNavigation | null {
  try {
    const parsed = new URL(rawTargetUrl);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol !== "https:" && protocol !== "http:") {
      return null;
    }

    if (INTERNAL_AD_TARGET_HOSTS.has(parsed.hostname.toLowerCase())) {
      const localPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return {
        href: localPath || "/",
        external: false,
      };
    }

    return {
      href: parsed.toString(),
      external: true,
    };
  } catch {
    return null;
  }
}

function groupItems(items: PublicAdvertisementItem[], cardsPerGroup: number) {
  if (cardsPerGroup <= 0) {
    return [items];
  }

  const groups: PublicAdvertisementItem[][] = [];
  for (let index = 0; index < items.length; index += cardsPerGroup) {
    groups.push(items.slice(index, index + cardsPerGroup));
  }
  return groups;
}

export function SponsoredAdvertisementsCarousel({ locale, items }: SponsoredAdvertisementsCarouselProps) {
  const t = useTranslations("advertisements");
  const isArabic = locale === "ar";
  const sectionRef = useRef<HTMLElement>(null);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [isInteractionPaused, setIsInteractionPaused] = useState(false);
  const [isAnyVisibleVideoPlaying, setIsAnyVisibleVideoPlaying] = useState(false);
  const [cardsPerGroup, setCardsPerGroup] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const trackedImpressions = useRef<Set<string>>(new Set());
  const sessionId = useMemo(createSessionId, []);
  const groupedItems = useMemo(() => groupItems(items, cardsPerGroup), [items, cardsPerGroup]);
  const visibleItems = useMemo(
    () => groupedItems[activeGroupIndex] ?? [],
    [activeGroupIndex, groupedItems]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tabletMedia = window.matchMedia("(min-width: 768px)");
    const desktopMedia = window.matchMedia("(min-width: 1024px)");

    const syncLayoutPreferences = () => {
      setPrefersReducedMotion(reducedMotionMedia.matches);
      if (desktopMedia.matches) {
        setCardsPerGroup(3);
        return;
      }
      if (tabletMedia.matches) {
        setCardsPerGroup(2);
        return;
      }
      setCardsPerGroup(1);
    };

    syncLayoutPreferences();
    reducedMotionMedia.addEventListener("change", syncLayoutPreferences);
    tabletMedia.addEventListener("change", syncLayoutPreferences);
    desktopMedia.addEventListener("change", syncLayoutPreferences);

    return () => {
      reducedMotionMedia.removeEventListener("change", syncLayoutPreferences);
      tabletMedia.removeEventListener("change", syncLayoutPreferences);
      desktopMedia.removeEventListener("change", syncLayoutPreferences);
    };
  }, []);

  useEffect(() => {
    setActiveGroupIndex((current) => {
      if (groupedItems.length === 0) return 0;
      if (current < groupedItems.length) return current;
      return 0;
    });
  }, [groupedItems.length]);

  useEffect(() => {
    const shouldRotate = !prefersReducedMotion
      && groupedItems.length > 1
      && !isInteractionPaused
      && !isAnyVisibleVideoPlaying;

    if (!shouldRotate) {
      return;
    }

    const timer = setInterval(() => {
      setActiveGroupIndex((current) => (current + 1) % groupedItems.length);
    }, 30000);

    return () => clearInterval(timer);
  }, [groupedItems.length, isAnyVisibleVideoPlaying, isInteractionPaused, prefersReducedMotion]);

  useEffect(() => {
    if (visibleItems.length === 0) {
      return;
    }

    for (const item of visibleItems) {
      const key = `${item.id}:${sessionId}`;
      if (trackedImpressions.current.has(key)) {
        continue;
      }

      trackedImpressions.current.add(key);
      void trackEvent({
        advertisementId: item.id,
        eventType: "impression",
        locale,
        sessionId,
      });
    }
  }, [locale, sessionId, visibleItems]);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) {
      return;
    }

    const visibleVideos = Array.from(root.querySelectorAll<HTMLVideoElement>("[data-sponsored-video='true']"));
    if (visibleVideos.length === 0) {
      setIsAnyVisibleVideoPlaying(false);
      return;
    }

    const syncPlaybackState = () => {
      const anyPlaying = visibleVideos.some((video) => !video.paused && !video.ended);
      setIsAnyVisibleVideoPlaying(anyPlaying);
    };

    syncPlaybackState();
    visibleVideos.forEach((video) => {
      video.addEventListener("play", syncPlaybackState);
      video.addEventListener("pause", syncPlaybackState);
      video.addEventListener("ended", syncPlaybackState);
    });

    return () => {
      visibleVideos.forEach((video) => {
        video.removeEventListener("play", syncPlaybackState);
        video.removeEventListener("pause", syncPlaybackState);
        video.removeEventListener("ended", syncPlaybackState);
      });
    };
  }, [activeGroupIndex, visibleItems]);

  if (items.length === 0) {
    return null;
  }

  function moveToNextGroup() {
    if (groupedItems.length <= 1) {
      return;
    }
    setActiveGroupIndex((current) => (current + 1) % groupedItems.length);
  }

  function moveToPreviousGroup() {
    if (groupedItems.length <= 1) {
      return;
    }
    setActiveGroupIndex((current) => (current - 1 + groupedItems.length) % groupedItems.length);
  }

  return (
    <section
      ref={sectionRef}
      aria-label={t("sectionLabel")}
      className="relative overflow-hidden bg-[#040913] pb-20 pt-8 md:pb-28 md:pt-14"
      onMouseEnter={() => setIsInteractionPaused(true)}
      onMouseLeave={() => setIsInteractionPaused(false)}
      onFocusCapture={() => setIsInteractionPaused(true)}
      onBlurCapture={() => setIsInteractionPaused(false)}
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(120,188,255,0.2),transparent_35%),radial-gradient(circle_at_90%_85%,rgba(255,177,111,0.18),transparent_32%)]" />

      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-3 md:mb-8">
          <p className="text-xs uppercase tracking-[0.16em] text-blue-100/70">{t("headline")}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={moveToPreviousGroup}
              aria-label={isArabic ? "المجموعة السابقة" : "Previous group"}
              disabled={groupedItems.length <= 1}
              className="rounded-full border border-blue-100/25 bg-[#07162c]/80 px-3 py-1.5 text-xs text-blue-100 transition hover:border-blue-200/55 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isArabic ? "السابق" : "Previous"}
            </button>
            <button
              type="button"
              onClick={moveToNextGroup}
              aria-label={isArabic ? "المجموعة التالية" : "Next group"}
              disabled={groupedItems.length <= 1}
              className="rounded-full border border-blue-100/25 bg-[#07162c]/80 px-3 py-1.5 text-xs text-blue-100 transition hover:border-blue-200/55 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isArabic ? "التالي" : "Next"}
            </button>
            <span className="min-w-[84px] text-center text-xs text-text-tertiary">
              {t("counter", {
                current: activeGroupIndex + 1,
                total: groupedItems.length,
              })}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((advertisement, cardIndex) => {
            const target = resolveAdvertisementTarget(advertisement.targetUrl);

            return (
              <PrimeCard key={advertisement.id} className="min-w-0 overflow-hidden border border-blue-100/15 bg-[#06152b]/70 p-0 backdrop-blur-xl">
                <div className="relative min-h-[220px] bg-[#02070f] md:min-h-[240px]">
                  {advertisement.mediaType === "video" ? (
                    <video
                      data-sponsored-video="true"
                      src={advertisement.mediaUrl}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      aria-label={advertisement.mediaAlt}
                    />
                  ) : target ? (
                    <Link
                      href={target.href}
                      target={target.external ? "_blank" : undefined}
                      rel={target.external ? "noopener noreferrer" : undefined}
                      onClick={() => {
                        void trackEvent({
                          advertisementId: advertisement.id,
                          eventType: "click",
                          locale,
                          sessionId,
                        });
                      }}
                      aria-label={advertisement.title}
                      className="absolute inset-0 block"
                    >
                      <Image
                        src={advertisement.mediaUrl}
                        alt={advertisement.mediaAlt}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        loading={cardIndex === 0 ? "eager" : "lazy"}
                      />
                    </Link>
                  ) : (
                    <Image
                      src={advertisement.mediaUrl}
                      alt={advertisement.mediaAlt}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                      loading={cardIndex === 0 ? "eager" : "lazy"}
                    />
                  )}

                  {advertisement.mediaType === "video" ? null : (
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
                  )}
                  <div className="pointer-events-none absolute start-4 top-4 rounded-full border border-amber-200/30 bg-[#3b2814]/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                    {t("badge")}
                  </div>
                </div>

                <div className="p-5 md:p-6">
                  {target ? (
                    <Link
                      href={target.href}
                      target={target.external ? "_blank" : undefined}
                      rel={target.external ? "noopener noreferrer" : undefined}
                      className="line-clamp-2 font-heading text-xl text-text-primary transition hover:text-blue-100"
                      onClick={() => {
                        void trackEvent({
                          advertisementId: advertisement.id,
                          eventType: "click",
                          locale,
                          sessionId,
                        });
                      }}
                    >
                      {advertisement.title}
                    </Link>
                  ) : (
                    <h2 className="line-clamp-2 font-heading text-xl text-text-primary">{advertisement.title}</h2>
                  )}

                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-text-secondary">{advertisement.description}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {target ? (
                      <Link
                        href={target.href}
                        target={target.external ? "_blank" : undefined}
                        rel={target.external ? "noopener noreferrer" : undefined}
                        className={primeButtonClasses("primary")}
                        onClick={() => {
                          void trackEvent({
                            advertisementId: advertisement.id,
                            eventType: "click",
                            locale,
                            sessionId,
                          });
                        }}
                      >
                        {advertisement.ctaText}
                      </Link>
                    ) : (
                      <span className={`${primeButtonClasses("primary")} pointer-events-none opacity-60`}>
                        {advertisement.ctaText}
                      </span>
                    )}
                  </div>
                </div>
              </PrimeCard>
            );
          })}
        </div>

        {groupedItems.length > 1 ? (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {groupedItems.map((group, index) => {
              const selected = index === activeGroupIndex;
              return (
                <button
                  key={`group-${group.map((item) => item.id).join("-")}`}
                  type="button"
                  onClick={() => setActiveGroupIndex(index)}
                  aria-label={t("goTo", { index: index + 1 })}
                  aria-pressed={selected}
                  className={`h-2.5 rounded-full transition-all ${selected ? "w-8 bg-blue-300" : "w-2.5 bg-blue-100/35 hover:bg-blue-200/65"}`}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
