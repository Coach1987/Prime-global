import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { UnifiedAuthExperience } from "@/components/auth/UnifiedAuthExperience";

export default async function AuthGatewayPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
          <section className="rounded-[32px] border border-blue-200/20 bg-[linear-gradient(160deg,rgba(9,20,38,0.88),rgba(4,12,24,0.84))] p-7 shadow-[0_28px_72px_rgba(3,9,24,0.42),0_0_0_1px_rgba(103,161,228,0.12),0_0_34px_rgba(57,124,209,0.16)] backdrop-blur-[18px] md:p-10">
            <p className="text-sm text-text-secondary">Loading authentication...</p>
          </section>
        </main>
      }
    >
      <UnifiedAuthExperience />
    </Suspense>
  );
}