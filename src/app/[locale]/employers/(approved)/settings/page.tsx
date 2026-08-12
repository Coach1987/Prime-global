import { Link } from "@/i18n/routing";
import {
  employerPageShell,
  employerSecondaryButton,
  employerSectionCard,
  employerSurfaceCard,
} from "@/features/employers/ui/portal-theme";

export default async function EmployerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return (
    <main className={employerPageShell}>
      <section className={employerSurfaceCard}>
        <h1 className="font-heading text-4xl text-text-primary">
          {isArabic ? "إعدادات حساب الشركة" : "Employer Settings"}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          {isArabic
            ? "إدارة تفضيلات الحساب والشركة."
            : "Manage employer account and company preferences."}
        </p>

        <div className="mt-8 space-y-4">
          <article className={employerSectionCard}>
            <h2 className="font-heading text-2xl text-text-primary">{isArabic ? "ملف الشركة" : "Company Profile"}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isArabic
                ? "حدّث بيانات الشركة الرسمية وحالة التحقق."
                : "Update company details and verification status."}
            </p>
            <Link href="/employers/company-profile" className={`mt-4 ${employerSecondaryButton}`}>
              {isArabic ? "فتح ملف الشركة" : "Open Company Profile"}
            </Link>
          </article>

          <article className={employerSectionCard}>
            <h2 className="font-heading text-2xl text-text-primary">{isArabic ? "تفضيلات الحساب" : "Account Preferences"}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isArabic
                ? "يتم حفظ اللغة وإعدادات الوصول على مستوى الحساب."
                : "Language and access preferences are saved at account level."}
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
