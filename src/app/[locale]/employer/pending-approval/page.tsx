import { Link } from "@/i18n/routing";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";

export default async function EmployerPendingApprovalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === "ar";

  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8 md:p-10">
        <PrimePageTitle>{isArabic ? "الحساب قيد المراجعة" : "Account Pending Review"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "تم إنشاء حساب صاحب العمل، لكنه سيبقى في حالة pending_review حتى يعتمد فريق برايم غلوبال الشركة. لن يتم فتح بيانات المرشحين أو نشر الوظائف قبل التحقق."
            : "Your employer account has been created, but it remains in pending_review until Prime Global approves the company. Candidate data and publishing access stay blocked until verification is complete."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/employers/login" className={primeButtonClasses("secondary")}>
            {isArabic ? "العودة إلى تسجيل الدخول" : "Back to Sign In"}
          </Link>
          <Link href="/contact" className={primeButtonClasses("secondary")}>
            {isArabic ? "التواصل مع برايم غلوبال" : "Contact Prime Global"}
          </Link>
        </div>
      </PrimeCard>
    </main>
  );
}