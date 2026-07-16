import { Link } from "@/i18n/routing";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeIconBadge } from "@/components/ui/prime/PrimeIconBadge";

export default async function AuthGatewayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === "ar";

  const cards = [
    {
      icon: "C",
      title: isArabic ? "تسجيل دخول المرشح" : "Candidate Sign In",
      description: isArabic ? "ادخل إلى مقابلاتك، الدعوات، وغرفة الانتظار داخل المنصة." : "Access your interviews, invitations, and in-platform waiting room.",
      href: "/candidate/login",
    },
    {
      icon: "E",
      title: isArabic ? "تسجيل دخول صاحب العمل" : "Employer Sign In",
      description: isArabic ? "ادخل إلى مركز المقابلات وسير العمل الخاضع للإشراف." : "Enter the interview center and supervised hiring workflow.",
      href: "/employers/login",
    },
    {
      icon: "C",
      title: isArabic ? "إنشاء حساب مرشح" : "Candidate Create Account",
      description: isArabic ? "أنشئ حسابك وابدأ إعداد ملفك المهني المحمي." : "Create your account and begin your protected professional profile.",
      href: "/candidate/register",
    },
    {
      icon: "E",
      title: isArabic ? "إنشاء حساب صاحب عمل" : "Employer Create Account",
      description: isArabic ? "أنشئ حساب شركتك لإرساله إلى مراجعة واعتماد برايم جلوبال." : "Create your company account for Prime Global review and approval.",
      href: "/employer/register",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
        <PrimePageTitle>{isArabic ? "بوابة المصادقة" : "Authentication Gateway"}</PrimePageTitle>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          {isArabic
            ? "اختر تسجيل الدخول أو إنشاء الحساب المناسب لدورك. يظل زر ابدأ الآن مخصصًا للتواصل فقط."
            : "Choose the sign-in or account creation path that matches your role. The Get Started button remains reserved for contact only."}
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          {cards.map((card) => (
            <PrimeCard key={card.href} className="p-6">
              <div className="flex items-center gap-3.5">
                <PrimeIconBadge>{card.icon}</PrimeIconBadge>
                <h2 className="font-heading text-[25px] leading-none tracking-tight text-slate-100">{card.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-7 text-text-secondary">{card.description}</p>
              <Link href={card.href} className={`${primeButtonClasses("primary")} mt-6`}>
                {isArabic ? "فتح" : "Open"}
              </Link>
            </PrimeCard>
          ))}
        </div>
      </section>
    </main>
  );
}