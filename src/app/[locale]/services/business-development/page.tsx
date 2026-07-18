import { redirect } from "next/navigation";

export default async function BusinessDevelopmentServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/services/business-administration`);
}
