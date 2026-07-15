"use client";

import { useParams } from "next/navigation";

export default function MessagesPage() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const isArabic = locale === "ar";

  return (
    <main className="mx-auto w-full max-w-[960px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{isArabic ? "المحادثات الخاضعة للإشراف" : "Supervised Messaging"}</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {isArabic
            ? "أُغلقت قنوات المراسلة الخاصة المباشرة. استخدم مراكز المحادثات الخاضعة للإشراف بحسب نوع المستخدم."
            : "Legacy direct private messaging has been closed. Use the supervised conversation centers for your user type."}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`/${locale}/employers/supervised-conversations`} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
            {isArabic ? "مركز صاحب العمل" : "Employer center"}
          </a>
          <a href={`/${locale}/candidate/supervised-conversations`} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
            {isArabic ? "مركز المرشح" : "Candidate center"}
          </a>
          <a href={`/${locale}/admin/recruitment`} className="rounded-full border border-gold/30 px-5 py-3 text-sm font-semibold text-gold transition hover:bg-gold/10">
            {isArabic ? "مركز برايم جلوبال" : "Prime Global center"}
          </a>
        </div>
      </section>
    </main>
  );
}
