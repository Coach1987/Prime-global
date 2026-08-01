"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { asCandidateLocale, localizeCandidateStatus, localizeDocumentType } from "@/lib/candidates/localization";

type VerificationPayload = {
  versions: Array<Record<string, unknown>>;
  cases: Array<Record<string, unknown>>;
  actions: Array<Record<string, unknown>>;
};

export default function CandidateDocumentsPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const uiLocale = asCandidateLocale(locale);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<VerificationPayload>({ versions: [], cases: [], actions: [] });
  const [resumes, setResumes] = useState<Array<Record<string, unknown>>>([]);
  const [privateDocs, setPrivateDocs] = useState<Array<string>>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/candidates/document-verification", { credentials: "include" }),
      fetch("/api/candidates/resumes", { credentials: "include" }),
      fetch("/api/candidates/private-documents", { credentials: "include" }),
    ])
      .then(async ([timelineRes, resumesRes, privateRes]) => {
        const [timelinePayload, resumesPayload, privatePayload] = await Promise.all([
          timelineRes.json(),
          resumesRes.json(),
          privateRes.json(),
        ]);

        if (timelineRes.ok && timelinePayload?.success) setTimeline(timelinePayload.data ?? { versions: [], cases: [], actions: [] });
        if (resumesRes.ok && resumesPayload?.success) setResumes(resumesPayload.data ?? []);
        if (privateRes.ok && privatePayload?.success) setPrivateDocs(privatePayload.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">{isArabic ? "جارٍ تحميل المستندات..." : "Loading documents..."}</main>;

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-3xl text-text-primary">{isArabic ? "مركز المستندات" : "Document Center"}</h1>
        <p className="mt-3 text-sm text-text-secondary">
          {isArabic
            ? "تابع الملفات المرفوعة، ومراحل التحقق، وسجل المراجعة في مكان واحد."
            : "Track uploaded evidence, AI extraction flow, verification progress, and review history."}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">{isArabic ? "السير الذاتية المرفوعة" : "Uploaded resumes"}</p>
            <p className="mt-2 text-xl font-semibold text-gold">{resumes.length}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">{isArabic ? "المستندات المرفوعة" : "Uploaded documents"}</p>
            <p className="mt-2 text-xl font-semibold text-gold">{privateDocs.length}</p>
          </article>
          <article className="rounded-2xl border border-gold/20 bg-bg-primary/60 p-4">
            <p className="text-xs text-text-tertiary">{isArabic ? "حالات التحقق" : "Verification cases"}</p>
            <p className="mt-2 text-xl font-semibold text-gold">{timeline.cases.length}</p>
          </article>
        </div>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "المستندات المرفوعة" : "Uploaded Documents"}</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {timeline.versions.map((item, index) => (
              <li key={`version-${index}`}>
                {localizeDocumentType(String(item.document_type ?? "document"), uiLocale)}
                {" "}
                v{String(item.version_number ?? "1")}
                {" - "}
                {localizeCandidateStatus(String(item.verification_status ?? "pending"), uiLocale)}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "حالة التحقق والمراجعة" : "Verification & Review Status"}</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {timeline.cases.map((item, index) => (
              <li key={`case-${index}`}>
                {isArabic ? "الحالة" : "Case"} <span dir="ltr">{String(item.id ?? "-")}</span> - {localizeCandidateStatus(String(item.status ?? "pending"), uiLocale)} ({localizeCandidateStatus(String(item.priority ?? "normal"), uiLocale)})
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-gold/20 bg-bg-primary/60 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "استخراج الذكاء الاصطناعي والسجل" : "AI Extraction & History"}</h2>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            {timeline.actions.map((item, index) => (
              <li key={`action-${index}`}>
                {localizeCandidateStatus(String(item.action ?? "status_change"), uiLocale)} - {localizeCandidateStatus(String(item.new_status ?? "pending"), uiLocale)} ({String(item.created_at ?? "")})
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
