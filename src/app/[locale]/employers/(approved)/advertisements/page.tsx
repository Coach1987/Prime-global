import { EmployerAdvertisementsCenter } from "@/features/advertisements/components/EmployerAdvertisementsCenter";

export default async function EmployerAdvertisementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <EmployerAdvertisementsCenter locale={locale} />;
}