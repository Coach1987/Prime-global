"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";

interface SmoothScrollProviderProps {
  children: ReactNode;
}

const DRAG_THRESHOLD = 8;
const DRAG_SCROLL_MULTIPLIER = 1.15;
const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "video",
  "audio",
  "iframe",
  "label",
  "summary",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='slider']",
  "[role='switch']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

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

    let initializationFrame = 0;
    let detachLenis: (() => void) | undefined;

    const initializeLenis = () => {
      const lenis = lenisRef.current?.lenis;
      if (!lenis) {
        initializationFrame = window.requestAnimationFrame(initializeLenis);
        return;
      }

      lenis.on("scroll", ScrollTrigger.update);
      (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;

      const homepage = document.querySelector<HTMLElement>("[data-home-journey]");
      const desktopPointer = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
      let pointerId: number | null = null;
      let startY = 0;
      let lastY = 0;
      let dragTarget = 0;
      let isDragging = false;
      let suppressClick = false;

      const syncCursor = () => {
        if (homepage) {
          homepage.style.cursor = desktopPointer.matches ? "grab" : "";
        }
      };

      const resetDrag = () => {
        pointerId = null;
        isDragging = false;
        homepage?.removeAttribute("data-home-dragging");
        document.documentElement.style.removeProperty("user-select");
      };

      const onPointerDown = (event: PointerEvent) => {
        if (
          !homepage ||
          !desktopPointer.matches ||
          event.pointerType !== "mouse" ||
          !event.isPrimary ||
          event.button !== 0 ||
          !(event.target instanceof Element) ||
          event.target.closest(INTERACTIVE_SELECTOR)
        ) {
          return;
        }

        pointerId = event.pointerId;
        startY = event.clientY;
        lastY = event.clientY;
        dragTarget = lenis.targetScroll;
      };

      const onPointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId || !homepage) {
          return;
        }

        if (!isDragging) {
          if (Math.abs(event.clientY - startY) < DRAG_THRESHOLD) {
            return;
          }
          isDragging = true;
          suppressClick = true;
          homepage.setAttribute("data-home-dragging", "true");
          document.documentElement.style.setProperty("user-select", "none");
        }

        event.preventDefault();
        const deltaY = event.clientY - lastY;
        lastY = event.clientY;
        dragTarget = Math.max(0, Math.min(lenis.limit, dragTarget - deltaY * DRAG_SCROLL_MULTIPLIER));
        lenis.scrollTo(dragTarget, { lerp: 0.16 });
      };

      const onPointerEnd = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) {
          return;
        }
        resetDrag();
        window.setTimeout(() => {
          suppressClick = false;
        }, 0);
      };

      const onClick = (event: MouseEvent) => {
        if (!suppressClick) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      };

      if (homepage) {
        syncCursor();
        desktopPointer.addEventListener("change", syncCursor);
        homepage.addEventListener("pointerdown", onPointerDown);
        homepage.addEventListener("click", onClick, true);
        document.addEventListener("pointermove", onPointerMove, { passive: false });
        document.addEventListener("pointerup", onPointerEnd);
        document.addEventListener("pointercancel", onPointerEnd);
        window.addEventListener("blur", resetDrag);
      }

      ScrollTrigger.refresh();

      detachLenis = () => {
        lenis.off("scroll", ScrollTrigger.update);
        resetDrag();
        if (homepage) {
          homepage.style.removeProperty("cursor");
          desktopPointer.removeEventListener("change", syncCursor);
          homepage.removeEventListener("pointerdown", onPointerDown);
          homepage.removeEventListener("click", onClick, true);
        }
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerEnd);
        document.removeEventListener("pointercancel", onPointerEnd);
        window.removeEventListener("blur", resetDrag);
      };
    };

    initializationFrame = window.requestAnimationFrame(initializeLenis);

    return () => {
      gsap.ticker.remove(update);
      window.cancelAnimationFrame(initializationFrame);
      detachLenis?.();
      delete (window as unknown as { __lenis?: unknown }).__lenis;
    };
  }, []);

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, duration: 1.2 }} ref={lenisRef}>
      {children}
    </ReactLenis>
  );
}
