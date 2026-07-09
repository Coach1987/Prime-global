"use client";

import { useTranslations } from "next-intl";
import { CONTACT_INFO } from "@/lib/constants/contact";

/**
 * Embeds Google Maps centered on Sousse, Tunisia. The brochure gives only
 * the city, not a street address, so this uses a basic no-API-key iframe
 * embed (Google's public "output=embed" search format) centered on the
 * city rather than a precise pinned location. Once a real office address
 * or Google Place ID is available, replace the `src` query below with an
 * exact address search or a Place ID embed for an accurate pin.
 *
 * The invert/grayscale/contrast filter below is a common CSS trick to
 * dark-tint a standard (light) Google Maps embed so it matches the site's
 * navy theme, since Google's embed iframe API doesn't expose a native
 * dark mode without a billed Maps JavaScript API key. Verify visually
 * once running — the exact filter values may need tuning for legibility.
 */
export function ContactMap() {
  const t = useTranslations("contact.map");
  const { lat, lng } = CONTACT_INFO.mapCenter;

  const mapSrc = `https://www.google.com/maps?q=${lat},${lng}(${encodeURIComponent(
    CONTACT_INFO.location
  )})&z=13&output=embed`;

  return (
    <div className="overflow-hidden rounded-[20px] border border-white/[0.08]">
      <div className="relative aspect-[16/7] w-full">
        <iframe
          title={t("title")}
          src={mapSrc}
          className="absolute inset-0 h-full w-full grayscale-[20%] invert-[92%] contrast-[90%]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="bg-bg-elevated px-5 py-3 text-center text-[13px] text-text-tertiary">
        {t("approximateNotice")}
      </p>
    </div>
  );
}
