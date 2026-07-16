import { Link } from "@/i18n/routing";

export default async function AuthGatewayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isArabic = locale === "ar";

  const cards = [
    {
      title: isArabic ? "تسجيل دخول المرشح" : "Candidate Sign In",
      description: isArabic ? "ادخل إلى مقابلاتك، الدعوات، وغرفة الانتظار داخل المنصة." : "Access your interviews, invitations, and in-platform waiting room.",
      href: "/candidate/login",
    },
    {
      title: isArabic ? "تسجيل دخول صاحب العمل" : "Employer Sign In",
      description: isArabic ? "ادخل إلى مركز المقابلات وسير العمل الخاضع للإشراف." : "Enter the interview center and supervised hiring workflow.",
      href: "/employers/login",
    },
    {
      title: isArabic ? "إنشاء حساب مرشح" : "Candidate Create Account",
      description: isArabic ? "أنشئ حسابك وابدأ إعداد ملفك المهني المحمي." : "Create your account and begin your protected professional profile.",
      href: "/candidate/register",
    },
    {
      title: isArabic ? "إنشاء حساب صاحب عمل" : "Employer Create Account",
      description: isArabic ? "أنشئ حساب شركتك لإرساله إلى مراجعة واعتماد برايم جلوبال." : "Create your company account for Prime Global review and approval.",
      href: "/employer/register",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="prime-auth-metallic-title font-heading text-4xl">{isArabic ? "بوابة المصادقة" : "Authentication Gateway"}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          {isArabic
            ? "اختر تسجيل الدخول أو إنشاء الحساب المناسب لدورك. يظل زر ابدأ الآن مخصصًا للتواصل فقط."
            : "Choose the sign-in or account creation path that matches your role. The Get Started button remains reserved for contact only."}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <article key={card.href} className="prime-auth-card rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
              <h2 className="font-heading text-2xl text-text-primary">{card.title}</h2>
              <p className="mt-2 text-sm leading-7 text-text-secondary">{card.description}</p>
              <Link href={card.href} className="prime-auth-pill mt-5">
                {isArabic ? "فتح" : "Open"}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}