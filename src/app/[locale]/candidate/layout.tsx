import { requirePageRole } from "@/lib/server/security/page-access";

export default async function CandidateLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  await requirePageRole({
    locale,
    allowedRoles: ["candidate"],
    unauthenticatedRedirect: `/${locale}/auth?mode=signin&audience=candidate`,
  });

  return <>{children}</>;
}
