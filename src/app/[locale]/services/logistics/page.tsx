import { redirect } from "next/navigation";

export default async function LogisticsServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/services/logistics-support`);
}
