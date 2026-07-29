import { listPublicAdvertisements } from "@/lib/server/advertisements/repository";
import { SponsoredAdvertisementsCarousel } from "./SponsoredAdvertisementsCarousel";

export async function SponsoredAdvertisementsSection({ locale }: { locale: string }) {
  const normalizedLocale = locale === "ar" ? "ar" : "en";
  const items = await listPublicAdvertisements(normalizedLocale);

  if (items.length === 0) {
    return null;
  }

  return <SponsoredAdvertisementsCarousel locale={normalizedLocale} items={items} />;
}
