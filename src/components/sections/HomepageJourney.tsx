"use client";

import { useLayoutEffect } from "react";
import { gsap } from "@/lib/gsap";

type RevealPattern = "a" | "b" | "c" | "d";

const ENTRANCE_START = "top 76%";

function getExitX(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  return bounds.left + bounds.width / 2 <= window.innerWidth / 2 ? -72 : 72;
}

function getRevealConfig(pattern: RevealPattern, isRtl: boolean) {
  switch (pattern) {
    case "a":
      return {
        headingFrom: { autoAlpha: 0, y: 56, filter: "blur(4px)" },
        eyebrowFrom: { autoAlpha: 0, y: 18, filter: "blur(2px)" },
        bodyFrom: { autoAlpha: 0, y: 24, filter: "blur(2px)" },
        supportingFrom: { autoAlpha: 0, y: 22, filter: "blur(2px)" },
        staggerFrom: { autoAlpha: 0, y: 26, scale: 0.985, filter: "blur(2px)" },
      };
    case "b":
      return {
        headingFrom: { autoAlpha: 0, y: -48, filter: "blur(4px)" },
        eyebrowFrom: { autoAlpha: 0, y: -16, filter: "blur(2px)" },
        bodyFrom: { autoAlpha: 0, y: 20, filter: "blur(2px)" },
        supportingFrom: { autoAlpha: 0, y: 18, filter: "blur(2px)" },
        staggerFrom: { autoAlpha: 0, y: 24, scale: 0.985, filter: "blur(2px)" },
      };
    case "c":
      return {
        headingFrom: { autoAlpha: 0, x: isRtl ? 58 : -58, filter: "blur(4px)" },
        eyebrowFrom: { autoAlpha: 0, x: isRtl ? 18 : -18, filter: "blur(2px)" },
        bodyFrom: { autoAlpha: 0, y: 22, filter: "blur(2px)" },
        supportingFrom: { autoAlpha: 0, x: isRtl ? 20 : -20, filter: "blur(2px)" },
        staggerFrom: { autoAlpha: 0, x: isRtl ? 24 : -24, y: 12, scale: 0.985, filter: "blur(2px)" },
      };
    case "d":
    default:
      return {
        headingFrom: { autoAlpha: 0, y: 44, filter: "blur(3px)" },
        eyebrowFrom: { autoAlpha: 0, y: 16, filter: "blur(2px)" },
        bodyFrom: { autoAlpha: 0, y: 26, filter: "blur(2px)" },
        supportingFrom: { autoAlpha: 0, y: 24, filter: "blur(2px)" },
        staggerFrom: { autoAlpha: 0, y: 30, scale: 0.99, filter: "blur(2px)" },
      };
  }
}

export function HomepageJourney() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-home-journey]");
    if (!root) return;

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        {
          desktop: "(min-width: 1024px)",
          reducedMotion: "(prefers-reduced-motion: reduce)",
        },
        (matchContext) => {
          const { desktop, reducedMotion } = matchContext.conditions ?? {};
          const sections = root.querySelectorAll<HTMLElement>("[data-home-section]");

          if (reducedMotion) {
            gsap.set(root.querySelectorAll("[data-home-reveal], [data-home-stagger] > *"), { clearProps: "all" });
            gsap.set(root.querySelectorAll("[data-cinematic-image]"), { clearProps: "transform" });
            gsap.set(root.querySelectorAll("[data-home-bridge]"), { autoAlpha: 0.65, scaleX: 1 });
            return;
          }

          sections.forEach((section) => {
            const revealItems = section.querySelectorAll<HTMLElement>("[data-home-reveal]");
            const eyebrow = section.querySelectorAll<HTMLElement>('[data-home-reveal="eyebrow"]');
            const heading = section.querySelectorAll<HTMLElement>('[data-home-reveal="heading"]');
            const body = section.querySelectorAll<HTMLElement>('[data-home-reveal="body"]');
            const supporting = section.querySelectorAll<HTMLElement>('[data-home-reveal="supporting"]');
            const staggerItems = section.querySelectorAll<HTMLElement>("[data-home-stagger] > *");
            const bridge = section.querySelector<HTMLElement>("[data-home-bridge]");
            const background = section.querySelector<HTMLElement>("[data-cinematic-image]");
            const pattern = (section.dataset.homePattern ?? "d") as RevealPattern;
            const isRtl = document.documentElement.dir === "rtl";
            const revealConfig = getRevealConfig(pattern, isRtl);

            if (desktop && background) {
              gsap.fromTo(
                background,
                { scale: 1.02, yPercent: -1 },
                {
                  scale: 1.06,
                  yPercent: 1.5,
                  ease: "none",
                  scrollTrigger: {
                    trigger: section,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.9,
                  },
                }
              );
            }

            if (desktop) {
              const timeline = gsap.timeline({
                defaults: { ease: "none" },
                scrollTrigger: {
                  trigger: section,
                  start: ENTRANCE_START,
                  end: "top 56%",
                  scrub: 0.55,
                },
              });

              if (bridge) {
                timeline.fromTo(
                  bridge,
                  { autoAlpha: 0.18, scaleX: 0.12 },
                  { autoAlpha: 0.85, scaleX: 1, duration: 0.7 },
                  0
                );
              }

              if (revealItems.length > 0) {
                gsap.set(revealItems, { willChange: "transform, opacity, filter" });
                timeline
                  .fromTo(
                    eyebrow,
                    revealConfig.eyebrowFrom,
                    { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)", duration: 0.72, ease: "power3.out" },
                    0.04
                  )
                  .fromTo(
                    heading,
                    revealConfig.headingFrom,
                    { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)", duration: 1.08, ease: pattern === "d" ? "power3.out" : "expo.out" },
                    0.18
                  )
                  .fromTo(
                    body,
                    revealConfig.bodyFrom,
                    { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)", duration: 0.84, ease: "power3.out" },
                    0.46
                  )
                  .fromTo(
                    supporting,
                    revealConfig.supportingFrom,
                    { autoAlpha: 1, x: 0, y: 0, filter: "blur(0px)", stagger: 0.12, duration: 0.78, ease: "power3.out" },
                    0.62
                  );
              }

              if (staggerItems.length > 0) {
                timeline.fromTo(
                  staggerItems,
                  revealConfig.staggerFrom,
                  { autoAlpha: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", stagger: pattern === "a" ? 0.12 : 0.1, duration: 0.86, ease: "power3.out" },
                  0.78
                );
              }

              if (section.hasAttribute("data-home-directional-exit")) {
                const exitTimeline = gsap.timeline({
                  defaults: { autoAlpha: 0, duration: 0.78, ease: "power2.in" },
                  scrollTrigger: {
                    trigger: section,
                    start: "bottom 88%",
                    end: "bottom 54%",
                    scrub: 0.55,
                    invalidateOnRefresh: true,
                  },
                });
                const exitVars = {
                  x: (_index: number, element: HTMLElement) => getExitX(element),
                };

                exitTimeline
                  .to(heading, exitVars, 0)
                  .to(eyebrow, exitVars, 0.04)
                  .to(body, exitVars, 0.1)
                  .to(supporting, { ...exitVars, stagger: 0.06 }, 0.16)
                  .to(staggerItems, { ...exitVars, stagger: 0.06 }, 0.24);
              }
              return;
            }

            if (bridge) {
              gsap.fromTo(
                bridge,
                { autoAlpha: 0.25, scaleX: 0.35 },
                {
                  autoAlpha: 0.7,
                  scaleX: 1,
                  duration: 0.7,
                  ease: "power2.out",
                  scrollTrigger: { trigger: section, start: "top 92%", once: true },
                }
              );
            }

            if (revealItems.length > 0 || staggerItems.length > 0) {
              const mobileTimeline = gsap.timeline({
                defaults: { ease: "power2.out" },
                scrollTrigger: { trigger: section, start: ENTRANCE_START, once: true },
              });
              mobileTimeline
                .fromTo(eyebrow, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.56 }, 0)
                .fromTo(heading, { autoAlpha: 0, y: 24, filter: "blur(2px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.74 }, 0.12)
                .fromTo(body, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.58 }, 0.26)
                .fromTo(supporting, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.56, stagger: 0.08 }, 0.38)
                .fromTo(staggerItems, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.54, stagger: 0.08 }, 0.5);
            }
          });
        }
      );
    }, root);

    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return null;
}
