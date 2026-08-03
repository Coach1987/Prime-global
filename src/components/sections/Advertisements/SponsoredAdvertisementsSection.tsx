import { listPublicAdvertisements } from "@/lib/server/advertisements/repository";
import { unstable_noStore as noStore } from "next/cache";
import { SponsoredAdvertisementsCarousel } from "./SponsoredAdvertisementsCarousel";

export async function SponsoredAdvertisementsSection({ locale }: { locale: string }) {
  noStore();
  const normalizedLocale = locale === "ar" ? "ar" : "en";
  const items = await listPublicAdvertisements(normalizedLocale);

  if (items.length === 0) {
    return null;
  }

  return <SponsoredAdvertisementsCarousel locale={normalizedLocale} items={items} />;
}
