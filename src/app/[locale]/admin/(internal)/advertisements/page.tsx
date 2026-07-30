import { AdvertisementsAdminCenter } from "@/features/advertisements/components/AdvertisementsAdminCenter";

export default async function AdminAdvertisementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AdvertisementsAdminCenter locale={locale} />;
}
