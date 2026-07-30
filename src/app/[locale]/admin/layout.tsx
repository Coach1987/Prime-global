import { InternalManagementShell } from "@/components/layout/internal/InternalManagementShell";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <InternalManagementShell locale={locale}>{children}</InternalManagementShell>;
}
