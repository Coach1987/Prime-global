import { EmployerPortalShell } from "@/components/layout/EmployerShell/EmployerPortalShell";
import { requireEmployerPageAccess } from "@/lib/server/security/page-access";

export default async function EmployerOnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  await requireEmployerPageAccess({
    locale,
    allowedAccountStatuses: ["pending_review", "approved", "rejected"],
  });

  return <EmployerPortalShell locale={locale}>{children}</EmployerPortalShell>;
}