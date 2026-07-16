import { Link } from "@/i18n/routing";

export default async function EmployerPendingApprovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-8 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{isArabic ? "الحساب قيد المراجعة" : "Account Pending Review"}</h1>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "تم إنشاء حساب صاحب العمل، لكنه سيبقى في حالة pending_review حتى يعتمد فريق برايم غلوبال الشركة. لن يتم فتح بيانات المرشحين أو نشر الوظائف قبل التحقق."
            : "Your employer account has been created, but it remains in pending_review until Prime Global approves the company. Candidate data and publishing access stay blocked until verification is complete."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/employers/login" className="prime-auth-pill-outline">
            {isArabic ? "العودة إلى تسجيل الدخول" : "Back to Sign In"}
          </Link>
          <Link href="/contact" className="prime-auth-pill-outline">
            {isArabic ? "التواصل مع برايم غلوبال" : "Contact Prime Global"}
          </Link>
        </div>
      </section>
    </main>
  );
}