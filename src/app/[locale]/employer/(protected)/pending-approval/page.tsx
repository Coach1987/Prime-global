import { Link } from "@/i18n/routing";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { normalizeEmployerAccountStatus } from "@/lib/server/security/employer-access";
import { readServerSession } from "@/lib/server/security/page-access";

export default async function EmployerPendingApprovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "employerPendingApproval" });
  const session = await readServerSession();
  if (!session) redirect(`/${locale}/auth?mode=signin&audience=employer`);

  const employer = await getEmployerByAuthUserId(session.userId);
  const verificationStatus = String(employer?.verification_status ?? "pending");
  const accountStatus = normalizeEmployerAccountStatus(verificationStatus);
  if (accountStatus === "approved") redirect(`/${locale}/employers/dashboard`);

  const statusLabel =
    verificationStatus === "documents_submitted"
      ? t("statuses.documentsSubmitted")
      : verificationStatus === "admin_review"
        ? t("statuses.adminReview")
        : verificationStatus === "rejected"
          ? t("statuses.rejected")
          : verificationStatus === "suspended"
            ? t("statuses.suspended")
            : t("statuses.pending");

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-20 pt-10 sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">{t("eyebrow")}</p>
        <PrimePageTitle className="mt-3">{t("title")}</PrimePageTitle>
        <p className="mt-4 text-sm leading-7 text-text-secondary">{t("intro")}</p>

        <div className="mt-6 rounded-xl border border-gold/25 bg-gold/5 p-4" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-tertiary">{t("statusLabel")}</p>
          <p className="mt-2 text-lg font-semibold text-gold">{statusLabel}</p>
        </div>

        <div className="mt-6">
          <h2 className="font-heading text-2xl text-text-primary">{t("nextTitle")}</h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">{t("nextBody")}</p>
          <p className="mt-3 text-sm leading-7 text-text-secondary">{t("reviewBody")}</p>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/employers/company-profile" className={primeButtonClasses("primary")}>
            {t("profileCta")}
          </Link>
          <Link href="/contact" className={primeButtonClasses("secondary")}>
            {t("contactCta")}
          </Link>
        </div>
      </PrimeCard>
    </main>
  );
}