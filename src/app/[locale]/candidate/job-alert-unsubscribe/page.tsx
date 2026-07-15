"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Suspense } from "react";

function JobAlertUnsubscribeContent() {
  const params = useParams<{ locale: string }>();
  const locale = String(params.locale ?? "en");
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const copy = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "إلغاء الاشتراك من تنبيهات الوظائف",
            button: "تأكيد إلغاء الاشتراك",
            success: "تم إلغاء اشتراكك في تنبيهات الوظائف بنجاح.",
            failed: "تعذر إلغاء الاشتراك. قد يكون الرابط غير صالح أو منتهي الصلاحية.",
          }
        : {
            title: "Unsubscribe from Job Alerts",
            button: "Confirm Unsubscribe",
            success: "You have been unsubscribed from job alerts.",
            failed: "Unable to unsubscribe. The link may be invalid or expired.",
          },
    [locale]
  );

  useEffect(() => {
    setMessage("");
    setStatus("idle");
  }, [token]);

  async function unsubscribe() {
    const response = await fetch("/api/candidates/job-alerts/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setStatus("error");
      setMessage(copy.failed);
      return;
    }

    setStatus("success");
    setMessage(copy.success);
  }

  return (
    <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
      <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
      {message ? (
        <p className={`mt-4 text-sm ${status === "success" ? "text-emerald-300" : "text-red-300"}`}>
          {message}
        </p>
      ) : null}

      <button onClick={unsubscribe} className="mt-8 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
        {copy.button}
      </button>
    </section>
  );
}

export default function JobAlertUnsubscribePage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <Suspense
        fallback={
          <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 text-sm text-text-secondary backdrop-blur-xl md:p-10">
            Loading...
          </section>
        }
      >
        <JobAlertUnsubscribeContent />
      </Suspense>
    </main>
  );
}
