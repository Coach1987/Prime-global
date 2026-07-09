"use client";

/**
 * Smoothly scrolls to a target element by id, using the global Lenis
 * instance if the app's SmoothScrollProvider has initialized one
 * (exposed on window.__lenis), otherwise falling back to native
 * scrollIntoView so the header works even before that provider exists.
 */
export function smoothScrollTo(targetId: string, offset = 88) {
  const el = document.getElementById(targetId);
  if (!el) return;

  const lenis = (window as unknown as { __lenis?: { scrollTo: (target: HTMLElement, opts?: Record<string, unknown>) => void } }).__lenis;

  if (lenis) {
    lenis.scrollTo(el, { offset: -offset, duration: 1.2 });
    return;
  }

  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
}
