import { requirePageRole } from "@/lib/server/security/page-access";

export default async function EmployersLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  await requirePageRole({
    locale,
    allowedRoles: ["employer"],
    unauthenticatedRedirect: `/${locale}/auth?mode=signin&audience=employer`,
  });

  return <>{children}</>;
}
