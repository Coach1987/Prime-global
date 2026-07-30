import { AdminCompanyManagementCenter } from "@/features/admin/components/AdminCompanyManagementCenter";

export default async function AdminControlCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <AdminCompanyManagementCenter locale={locale} />;
}
