"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const CONNECTIONS = [
  "M7 31 C20 31 32 35 50 42",
  "M4 58 C21 56 35 50 50 42",
  "M14 78 C29 66 40 53 50 42",
  "M93 27 C78 29 65 35 50 42",
  "M96 57 C79 55 65 49 50 42",
  "M88 78 C73 66 61 53 50 42",
] as const;

const CONVERGENCE_PATHS = [
  "M-8 12 L18 20 L35 31 L50 42",
  "M-6 88 L20 72 L36 55 L50 42",
  "M108 10 L81 20 L65 31 L50 42",
  "M109 88 L81 71 L65 55 L50 42",
  "M22 -8 L31 16 L40 31 L50 42",
  "M80 108 L70 76 L60 56 L50 42",
] as const;

const NODES = [
  [8, 38], [16, 18], [12, 78], [31, 30], [49, 42], [67, 50], [76, 30], [88, 76], [92, 34],
] as const;

export function HeroGatewayLayer() {
  const layerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const layer = layerRef.current;
    const root = layer?.closest<HTMLElement>("[data-hero-root]");
    if (!layer || !root) {
      return;
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        root.dataset.heroActive = entry?.isIntersecting ? "true" : "false";
      },
      { rootMargin: "10% 0px" }
    );
    visibilityObserver.observe(root);

    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add(
        {
          desktop: "(min-width: 1024px)",
          mobile: "(max-width: 1023px)",
          reduceMotion: "(prefers-reduced-motion: reduce)",
        },
        (matchContext) => {
          const { desktop, reduceMotion } = matchContext.conditions ?? {};
          const map = root.querySelector("[data-hero-map]");
          const lights = root.querySelectorAll("[data-hero-light]");
          const lockup = root.querySelector("[data-hero-lockup]");
          const content = root.querySelector("[data-hero-content]");
          const connections = layer.querySelectorAll("[data-gateway-connection]");
          const connectionFlow = layer.querySelectorAll("[data-gateway-flow]");
          const nodes = layer.querySelectorAll("[data-gateway-node]");
          const convergence = layer.querySelectorAll("[data-gateway-convergence]");
          const trails = layer.querySelectorAll("[data-gateway-trail]");
          const aperture = layer.querySelector("[data-gateway-aperture]");
          const exposure = layer.querySelector("[data-gateway-exposure]");
          const transition = layer.querySelector("[data-gateway-transition]");
          const advertisements = root.nextElementSibling?.matches("[data-sponsored-handoff]")
            ? root.nextElementSibling
            : null;
          const advertisementContent = advertisements?.querySelector("[data-sponsored-handoff-content]") ?? null;
          const advertisementVeil = advertisements?.querySelector("[data-sponsored-handoff-veil]") ?? null;

          if (reduceMotion) {
            gsap.set([connections, nodes], { autoAlpha: 0.16 });
            gsap.set([connectionFlow, convergence, trails, aperture, exposure], { autoAlpha: 0 });
            gsap.set(transition, { autoAlpha: 0.45 });
            if (advertisementContent) {
              gsap.set(advertisementContent, { autoAlpha: 1, y: 0 });
            }
            if (advertisementVeil) {
              gsap.set(advertisementVeil, { autoAlpha: 0 });
            }
            return;
          }

          gsap.set(map, { scale: 1, yPercent: 0, transformOrigin: "50% 42%" });
          gsap.set(connections, { autoAlpha: 0, strokeDashoffset: 80 });
          gsap.set(connectionFlow, { autoAlpha: 0, strokeDashoffset: 120 });
          gsap.set(nodes, { autoAlpha: 0, scale: 0.6, transformOrigin: "center" });
          gsap.set(convergence, { autoAlpha: 0, strokeDashoffset: 140 });
          gsap.set(trails, { autoAlpha: 0, strokeDashoffset: 110 });
          gsap.set(aperture, { autoAlpha: 0, scale: 0.72, transformOrigin: "50% 50%" });
          gsap.set(exposure, { autoAlpha: 0 });
          gsap.set(transition, { autoAlpha: 0 });
          if (advertisementContent) {
            gsap.set(advertisementContent, { autoAlpha: desktop ? 0.5 : 0.72, y: desktop ? 30 : 14 });
          }
          if (advertisementVeil) {
            gsap.set(advertisementVeil, { autoAlpha: desktop ? 0.9 : 0.62 });
          }

          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom bottom",
              scrub: desktop ? 0.7 : 0.35,
              invalidateOnRefresh: true,
            },
          });

          timeline
            .to(map, { scale: desktop ? 1.035 : 1.015, yPercent: desktop ? -1.5 : -0.5, duration: 0.2 }, 0)
            .to(lights, { xPercent: desktop ? 4 : 1.5, yPercent: -1.5, duration: 0.22 }, 0)
            .to(connections, { autoAlpha: desktop ? 0.58 : 0.34, strokeDashoffset: 0, duration: 0.24 }, 0.18)
            .to(connectionFlow, { autoAlpha: desktop ? 0.72 : 0.38, strokeDashoffset: 0, duration: 0.3 }, 0.22)
            .to(nodes, { autoAlpha: desktop ? 0.82 : 0.5, scale: 1, stagger: 0.014, duration: 0.2 }, 0.24)
            .to(map, { scale: desktop ? 1.17 : 1.035, yPercent: desktop ? -2.5 : -0.75, duration: 0.26 }, 0.38)
            .to(connections, { scale: desktop ? 1.12 : 1.03, transformOrigin: "50% 42%", duration: 0.28 }, 0.4)
            .to(lockup, { scale: desktop ? 1.09 : 1.025, yPercent: desktop ? -1.5 : -0.5, duration: 0.28 }, 0.44)
            .to(convergence, { autoAlpha: desktop ? 0.62 : 0.3, strokeDashoffset: 0, stagger: 0.018, duration: 0.25 }, 0.48)
            .to(map, { scale: desktop ? 1.32 : 1.055, yPercent: desktop ? -4 : -1, duration: 0.27 }, 0.5)
            .to(map, { scale: desktop ? 1.62 : 1.08, yPercent: desktop ? -5.5 : -1.25, duration: 0.24 }, 0.62)
            .to(connections, { scale: desktop ? 1.48 : 1.1, autoAlpha: desktop ? 0.34 : 0.18, duration: 0.25 }, 0.64)
            .to(trails, { autoAlpha: desktop ? 0.68 : 0.34, strokeDashoffset: 0, duration: 0.24 }, 0.66)
            .to(connectionFlow, { scale: desktop ? 1.36 : 1.08, transformOrigin: "50% 42%", duration: 0.24 }, 0.68)
            .to(lockup, { scale: desktop ? 1.15 : 1.04, yPercent: desktop ? -3 : -1, duration: 0.22 }, 0.74)
            .to(content, { yPercent: desktop ? -2 : -0.5, autoAlpha: desktop ? 0.9 : 0.96, duration: 0.2 }, 0.76)
            .to(aperture, { autoAlpha: desktop ? 0.86 : 0.48, scale: desktop ? 1.42 : 1.12, duration: 0.18 }, 0.82)
            .to(connections, { autoAlpha: desktop ? 0.08 : 0.12, scale: desktop ? 2.15 : 1.2, duration: 0.16 }, 0.84)
            .to(connectionFlow, { autoAlpha: desktop ? 0.12 : 0.18, scale: desktop ? 1.95 : 1.16, duration: 0.16 }, 0.84)
            .to(nodes, { autoAlpha: 0, scale: desktop ? 2.1 : 1.25, duration: 0.15 }, 0.85)
            .to(convergence, { autoAlpha: 0, scale: desktop ? 2.3 : 1.18, transformOrigin: "50% 42%", duration: 0.16 }, 0.84)
            .to(trails, { autoAlpha: 0, scale: desktop ? 1.8 : 1.12, transformOrigin: "50% 42%", duration: 0.15 }, 0.85)
            .to(map, { scale: desktop ? 2.05 : 1.12, yPercent: desktop ? -7 : -1.5, duration: 0.16 }, 0.84)
            .to(exposure, { autoAlpha: desktop ? 0.3 : 0.16, duration: 0.12 }, 0.87)
            .to(content, { autoAlpha: desktop ? 0.72 : 0.88, duration: 0.12 }, 0.88)
            .to(transition, { autoAlpha: 1, duration: 0.1 }, 0.9);

          if (advertisements && advertisementContent) {
            const advertisementTimeline = gsap.timeline({
              defaults: { ease: "none" },
              scrollTrigger: {
                trigger: advertisements,
                start: "top bottom",
                end: desktop ? "top 62%" : "top 78%",
                scrub: desktop ? 0.55 : 0.25,
                invalidateOnRefresh: true,
              },
            });
            if (advertisementVeil) {
              advertisementTimeline.to(advertisementVeil, { autoAlpha: 0, duration: 1 }, 0);
            }
            advertisementTimeline.to(advertisementContent, { autoAlpha: 1, y: 0, duration: 1 }, 0);
          }
        }
      );
    }, root);

    return () => {
      visibilityObserver.disconnect();
      delete root.dataset.heroActive;
      media.revert();
      context.revert();
    };
  }, []);

  return (
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      <svg className="absolute inset-0 h-full w-full opacity-80" viewBox="0 0 100 100" preserveAspectRatio="none">
        <g className="hidden lg:block">
          {CONNECTIONS.map((path) => (
            <g key={path}>
              <path data-gateway-connection d={path} fill="none" stroke="rgba(146, 190, 238, 0.72)" strokeWidth="0.12" strokeDasharray="1.1 1.7" vectorEffect="non-scaling-stroke" />
              <path data-gateway-flow d={path} fill="none" stroke="rgba(222, 237, 251, 0.86)" strokeWidth="0.3" strokeLinecap="round" strokeDasharray="0.25 9" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          {NODES.map(([cx, cy]) => (
            <g key={`${cx}-${cy}`} data-gateway-node>
              <circle cx={cx} cy={cy} r="0.18" fill="rgba(213, 231, 248, 0.92)" />
              <circle cx={cx} cy={cy} r="0.58" fill="none" stroke="rgba(93, 159, 226, 0.56)" strokeWidth="0.12" vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>

        <g className="hidden md:block" fill="none">
          {CONVERGENCE_PATHS.map((path) => (
            <path key={path} data-gateway-convergence d={path} stroke="rgba(132, 184, 234, 0.56)" strokeWidth="0.16" strokeDasharray="1.8 2.4" vectorEffect="non-scaling-stroke" />
          ))}
        </g>

        <g className="hidden lg:block" fill="none">
          <path data-gateway-trail d="M2 92 L24 73 L37 57 L50 42" stroke="rgba(91, 160, 232, 0.5)" strokeWidth="0.18" strokeDasharray="2 2.6" vectorEffect="non-scaling-stroke" />
          <path data-gateway-trail d="M98 87 L77 70 L63 55 L50 42" stroke="rgba(207, 224, 242, 0.34)" strokeWidth="0.14" strokeDasharray="1.4 2.8" vectorEffect="non-scaling-stroke" />
        </g>

      </svg>

      <div data-gateway-aperture className="absolute inset-[-8%] bg-[radial-gradient(ellipse_at_50%_42%,rgba(173,210,244,0.12)_0%,rgba(91,155,218,0.08)_18%,rgba(30,82,140,0.04)_38%,rgba(2,8,20,0)_68%)]" />
      <div data-gateway-exposure className="absolute inset-0 bg-[linear-gradient(90deg,rgba(108,170,226,0.08)_0%,rgba(209,229,247,0.2)_50%,rgba(108,170,226,0.08)_100%)]" />
      <div data-gateway-transition className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(180deg,rgba(4,9,19,0)_0%,rgba(4,9,19,0.35)_35%,rgba(4,9,19,0.82)_70%,#040913_100%)]" />
    </div>
  );
}