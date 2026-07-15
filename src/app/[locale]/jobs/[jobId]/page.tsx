"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type JobDetail = Record<string, unknown>;

export default function JobDetailPage() {
  const params = useParams<{ locale: string; jobId: string }>();
  const locale = String(params.locale ?? "en");
  const jobId = String(params.jobId ?? "");

  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () =>
      locale === "ar"
        ? {
            title: "تفاصيل الوظيفة",
            apply: "تسجيل الدخول للتقديم",
            secureNote: "لأسباب الخصوصية والأمان، يجب تسجيل الدخول قبل إرسال الطلب.",
          }
        : {
            title: "Job Details",
            apply: "Login to Apply",
            secureNote: "For privacy and security, login is required before submitting an application.",
          },
    [locale]
  );

  useEffect(() => {
    if (!jobId) return;

    fetch(`/api/jobs/${jobId}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          setError(payload?.error?.message ?? "Unable to load job details");
          return;
        }
        setJob(payload.data ?? null);
      })
      .catch(() => setError("Unable to load job details"));
  }, [jobId]);

  return (
    <main className="mx-auto w-full max-w-[1040px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <article className="mt-6 rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
          <h2 className="font-heading text-3xl text-text-primary">{String(job?.title ?? "-")}</h2>
          <p className="mt-2 text-sm text-text-secondary">{String(job?.city ?? "-")}, {String(job?.country ?? "-")}</p>
          <p className="mt-3 text-sm text-text-tertiary">{String(job?.experience ?? "-")} • {String(job?.work_mode ?? "-")}</p>
          <pre className="mt-5 overflow-auto rounded-xl bg-bg-secondary p-4 text-xs text-text-secondary">{JSON.stringify({ requirements: job?.requirements ?? null, responsibilities: job?.responsibilities ?? null }, null, 2)}</pre>
        </article>

        <p className="mt-6 text-sm text-text-secondary">{copy.secureNote}</p>
        <a href={`/${locale}/candidate/dashboard`} className="mt-4 inline-flex rounded-full bg-gold px-5 py-3 text-sm font-semibold text-bg-primary">
          {copy.apply}
        </a>
      </section>
    </main>
  );
}
