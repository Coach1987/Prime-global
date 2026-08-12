import { redirect } from "next/navigation";

export default async function EmployerVerificationRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/employers/company-profile`);
}
