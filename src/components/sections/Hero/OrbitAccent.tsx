"use client";

import { useEffect, useId, useRef } from "react";
import { gsap } from "@/lib/gsap";

/**
 * A subtle, independent animation layer that orbits BEHIND the static
 * Prime Global logo image (see HeroLogoLockup) — never overlaps or
 * redraws any part of the logo itself. Provides two things continuously:
 *
 * 1. A faint elliptical guide ring, slowly counter-rotating (pure CSS,
 *    matches the globe/ring rotation speed used elsewhere on the site).
 * 2. A small bright point of light that travels the full ellipse at
 *    constant speed (GSAP MotionPath, linear easing — `ease: "none"`
 *    is essential here for a genuinely smooth, continuous orbit rather than one that pulses once per lap).
 *
 * This reads as ambient orbital energy around the logo — satisfying a
 * continuous "arrow orbiting the globe" motion requirement — without
 * altering a single pixel of the actual logo artwork, which is used
 * exactly as provided.
 */
export function OrbitAccent() {
  const uid = useId();
  const ringGradId = `orbitAccentRing-${uid}`;
  const glowGradId = `orbitAccentGlow-${uid}`;
  const pathId = `orbitAccentPath-${uid}`;
  const outerPathId = `orbitAccentOuterPath-${uid}`;

  const lightRef = useRef<SVGCircleElement>(null);
  const outerLightRef = useRef<SVGCircleElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion || !lightRef.current) return;

    const tweens = [
      gsap.to(lightRef.current, {
        duration: 14,
        repeat: -1,
        ease: "none",
        motionPath: {
          path: `#${pathId}`,
          align: `#${pathId}`,
          alignOrigin: [0.5, 0.5],
        },
      }),
    ];

    if (outerLightRef.current) {
      tweens.push(
        gsap.to(outerLightRef.current, {
          duration: 26,
          repeat: -1,
          ease: "none",
          motionPath: {
            path: `#${outerPathId}`,
            align: `#${outerPathId}`,
            alignOrigin: [0.5, 0.5],
          },
        })
      );
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        tweens.forEach((tw) => (entry.isIntersecting ? tw.play() : tw.pause()));
      },
      { threshold: 0.1 }
    );
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      tweens.forEach((tw) => tw.kill());
      observer.disconnect();
    };
  }, [pathId, outerPathId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-[-6%] z-0"
      aria-hidden="true"
    >
      {/* Outer grand orbit — larger, slower, quieter ring that reads as
          "large premium globe" scale without competing with the logo.
          The traveling light lives in the SAME svg/coordinate space as
          its path so the GSAP MotionPath alignment is exact. */}
      <div className="absolute inset-[-14%] animate-spin-slow [animation-duration:110s]">
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          <ellipse
            id={outerPathId}
            cx="100"
            cy="100"
            rx="99"
            ry="60"
            fill="none"
            stroke="#E0C179"
            strokeOpacity="0.12"
            strokeWidth="1"
            transform="rotate(12 100 100)"
          />
          <circle
            ref={outerLightRef}
            r="2.5"
            fill={`url(#${glowGradId})`}
            opacity="0.8"
            className="drop-shadow-[0_0_6px_rgba(224,193,121,0.7)]"
          />
        </svg>
      </div>

      {/* Faint guide ring, slow counter-rotation, sits behind the logo */}
      <div className="absolute inset-0 animate-spin-slow-reverse">
        <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={ringGradId} x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#E0C179" stopOpacity="0" />
              <stop offset="50%" stopColor="#E0C179" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#E0C179" stopOpacity="0" />
            </linearGradient>
            <radialGradient id={glowGradId}>
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="60%" stopColor="#E0C179" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#E0C179" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse
            id={pathId}
            cx="100"
            cy="100"
            rx="97"
            ry="40"
            fill="none"
            stroke={`url(#${ringGradId})`}
            strokeWidth="1.5"
            transform="rotate(-20 100 100)"
          />
        </svg>
      </div>

      {/* Traveling point of light, orbits at constant speed */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <circle
          ref={lightRef}
          r="4"
          fill={`url(#${glowGradId})`}
          className="drop-shadow-[0_0_8px_rgba(224,193,121,0.9)]"
        />
      </svg>
    </div>
  );
}
