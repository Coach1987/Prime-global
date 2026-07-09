"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SmoothScrollProviderProps {
  children: ReactNode;
}

/**
 * Wraps the app with Lenis smooth scrolling, driven by GSAP's ticker
 * rather than Lenis's own RAF loop (`autoRaf: false`). This keeps
 * ScrollTrigger's scroll-position reads in sync with Lenis on the same
 * frame — without this, ScrollTrigger-based animations (used throughout
 * Services, WhyUs, FAQ, and Footer) can lag a frame behind Lenis's
 * smoothed scroll position.
 *
 * Also exposes the Lenis instance on `window.__lenis`, which
 * `smoothScrollTo` (used by header/nav/CTA click handlers) checks for
 * and uses when present, falling back to native scroll otherwise.
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Respect reduced-motion: skip driving Lenis via GSAP's ticker and
    // let native scroll (with its own reduced-motion-aware behavior)
    // take over. The <ReactLenis> wrapper below still mounts (so the
    // DOM structure stays stable), but without a driving RAF loop it
    // effectively does nothing.
    if (prefersReducedMotion) return;

    function update(time: number) {
      // GSAP's ticker passes time in seconds; Lenis's raf expects ms.
      lenisRef.current?.lenis?.raf(time * 1000);
    }

    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    const lenis = lenisRef.current?.lenis;
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      // Expose globally for smoothScrollTo's window.__lenis lookup.
      (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;
    }

    // Recalculate trigger positions now that Lenis owns scroll behavior.
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(update);
      delete (window as unknown as { __lenis?: unknown }).__lenis;
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
