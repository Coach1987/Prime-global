"use client";

import { useEffect, useState } from "react";

/**
 * Tracks which section id is currently in view (for in-page anchor links,
 * e.g. homepage sections like #services, #about, #contact) using
 * IntersectionObserver. Falls back gracefully if no matching sections exist
 * on the current page (e.g. sub-pages), in which case callers should rely
 * on pathname matching instead.
 */
export function useActiveSection(sectionIds: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        // Trigger when a section occupies the middle band of the viewport,
        // which feels more natural for a fixed header than edge-triggering.
        rootMargin: "-40% 0px -50% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
