import { requirePageRole } from "@/lib/server/security/page-access";

const STAFF_ROLES = ["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"] as const;

export default async function AdminInternalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  await requirePageRole({
    locale,
    allowedRoles: [...STAFF_ROLES],
    unauthenticatedRedirect: `/${locale}/admin/login`,
  });

  return <>{children}</>;
}
