"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

/**
 * Displays `value` immediately (correct content for SSR, no-JS clients,
 * and search engine crawlers), then — once mounted and scrolled into
 * view — replays a count-up-from-zero animation as a progressive
 * enhancement. This avoids ever showing an incorrect "0" as the actual
 * rendered content, which would happen if the count started from a
 * literal 0 state before JS/animation had a chance to run.
 */
export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1.8,
  className,
}: AnimatedCounterProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          // Only now, once we know the animation will actually run, do
          // we drop to 0 and count back up — never render 0 as a
          // "resting" state.
          const counter = { val: 0 };
          setDisplay(0);
          gsap.to(counter, {
            val: value,
            duration,
            ease: "power2.out",
            onUpdate: () => setDisplay(Math.round(counter.val)),
          });
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={spanRef} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}
