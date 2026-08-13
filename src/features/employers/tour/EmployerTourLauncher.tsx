"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const EmployerGuidedTour = dynamic(
  () => import("./EmployerGuidedTour").then((module) => module.EmployerGuidedTour),
  { ssr: false }
);

export function EmployerTourLauncher({ showEntry = true }: { showEntry?: boolean }) {
  const t = useTranslations("employerGuidedTour");
  const locale = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("employerDemo") === "autoplay") {
        setLoaded(true);
        return;
      }
      const stored = window.sessionStorage.getItem("prime-global:employer-guided-tour");
      const session = stored ? JSON.parse(stored) as { active?: boolean; completed?: boolean } : null;
      if (session?.active || session?.completed) setLoaded(true);
    } catch {
      // A disabled storage API should not block the registration experience.
    }
  }, []);

  function openTour() {
    setLoaded(true);
    setRequestOpen(true);
  }

  return (
    <>
      {showEntry ? (
        <button
          type="button"
          onClick={openTour}
          className="min-h-12 border-b border-blue-300/60 px-1 py-2 text-sm font-semibold text-blue-200 transition hover:border-gold hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70"
          aria-label={t("entry")}
          data-tour-entry
        >
          {t("entry")}
        </button>
      ) : null}
      {loaded ? (
        <EmployerGuidedTour
          locale={locale === "ar" ? "ar" : "en"}
          requestOpen={requestOpen}
          onRequestHandled={() => setRequestOpen(false)}
        />
      ) : null}
    </>
  );
}
