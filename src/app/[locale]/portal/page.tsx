"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { normalizeAuthRole } from "@/lib/auth/routing";

export default function PortalPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        const payload = await response.json();

        if (!payload?.success) {
          if (!cancelled) {
            setCheckingAuth(false);
          }
          return;
        }

        const role = normalizeAuthRole(String(payload?.data?.role ?? ""));

        if (!role) {
          if (!cancelled) {
            setCheckingAuth(false);
          }
          return;
        }

        if (role === "candidate") {
          const completion = payload?.data?.profileCompletion;
          router.replace(completion?.completed ? "/candidate/dashboard" : "/candidate/onboarding");
          return;
        }

        if (role === "employer") {
          const verificationStatus = payload?.data?.verificationStatus;
          if (verificationStatus && verificationStatus !== "verified") {
            router.replace("/employer/pending-approval");
            return;
          }

          router.replace("/employers/dashboard");
          return;
        }

        router.replace("/admin/control-center");
      } catch {
        if (!cancelled) {
          setCheckingAuth(false);
        }
      }
    }

    checkAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <p className="text-sm text-text-secondary">Loading portal...</p>
        </PrimeCard>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>Prime Global Interview Portal</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">Secure access for candidates, employers, and Prime Global staff.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">Candidate</h2>
            <p className="mt-2 text-sm text-text-secondary">View My Interviews, invitations, waiting room, and protected meeting access.</p>
            <Link href="/auth?mode=signin&role=candidate" className={`${primeButtonClasses("secondary")} mt-4`}>Open My Interviews</Link>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">Employer</h2>
            <p className="mt-2 text-sm text-text-secondary">Access Interview Center, schedule flow, and supervised protected communications.</p>
            <Link href="/auth?mode=signin&role=employer" className={`${primeButtonClasses("secondary")} mt-4`}>Open Interview Center</Link>
          </PrimeCard>

          <PrimeCard className="p-5">
            <h2 className="font-heading text-2xl text-text-primary">Prime Global Staff</h2>
            <p className="mt-2 text-sm text-text-secondary">Open Control Center for moderation, supervision, and interview room governance.</p>
            <Link href="/admin/login" className={`${primeButtonClasses("secondary")} mt-4`}>Open Control Center</Link>
          </PrimeCard>
        </div>
      </PrimeCard>
    </main>
  );
}
