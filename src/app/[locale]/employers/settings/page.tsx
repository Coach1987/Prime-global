import { Link } from "@/i18n/routing";

export default async function EmployerSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">
          {isArabic ? "إعدادات حساب الشركة" : "Employer Settings"}
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          {isArabic
            ? "إدارة تفضيلات الحساب والشركة."
            : "Manage employer account and company preferences."}
        </p>

        <div className="mt-8 space-y-4">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">{isArabic ? "ملف الشركة" : "Company Profile"}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isArabic
                ? "حدّث بيانات الشركة الرسمية وحالة التحقق."
                : "Update company details and verification status."}
            </p>
            <Link href="/employers/company-profile" className="mt-4 inline-flex rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10">
              {isArabic ? "فتح ملف الشركة" : "Open Company Profile"}
            </Link>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
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
