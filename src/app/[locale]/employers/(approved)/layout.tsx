import { EmployerPortalShell } from "@/components/layout/EmployerShell/EmployerPortalShell";
import { requireEmployerPageAccess } from "@/lib/server/security/page-access";

export default async function ApprovedEmployerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  await requireEmployerPageAccess({
    locale,
    allowedAccountStatuses: ["approved"],
  });

  return <EmployerPortalShell locale={locale}>{children}</EmployerPortalShell>;
}