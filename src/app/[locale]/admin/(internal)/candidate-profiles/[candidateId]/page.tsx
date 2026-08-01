"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

type CandidateDetail = {
  candidate_id: string;
  candidate_reference: string;
  professional_title: string | null;
  professional_summary: string | null;
  years_of_experience: number | null;
  skills: string[];
  employment_history: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  certifications: Array<Record<string, unknown>>;
  languages: string[];
  general_location: string | null;
  availability: string | null;
  desired_role: string | null;
  expected_salary: number | null;
  ai_summary: string | null;
  profile_status: string;
  candidate_private_profiles?: Array<{
    full_name: string;
    email: string;
    phone: string;
    address: string | null;
    original_cv_path: string;
    original_documents_paths: string[];
    identity_verification_status?: string | null;
    identity_verification_confidence?: number | null;
    identity_verification_reasoning?: string | null;
    identity_staff_review_status?: string | null;
    identity_verification_updated_at?: string | null;
  }>;
  candidate_profile_reviews?: Array<{ id: string; status: string; notes: string | null; reviewed_at: string | null }>;
};

function toTranslationStatusKey(status: string | null | undefined) {
  if (!status) return "unknown";
  if (status === "pending_review") return "pendingReview";
  if (status === "needs_changes") return "needsChanges";
  if (status === "approved") return "approved";
  if (status === "rejected") return "rejected";
  return "unknown";
}

function localizeVerificationStatus(value: string | null | undefined, locale: string) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "-";

  if (normalized === "pending_verification") return locale === "ar" ? "بانتظار التحقق" : "Pending verification";
  if (normalized === "verified") return locale === "ar" ? "متحقق" : "Verified";
  if (normalized === "failed") return locale === "ar" ? "فشل التحقق" : "Failed";
  if (normalized === "pending") return locale === "ar" ? "قيد الانتظار" : "Pending";
  if (normalized === "approved") return locale === "ar" ? "معتمد" : "Approved";
  if (normalized === "rejected") return locale === "ar" ? "مرفوض" : "Rejected";
  if (normalized === "needs_changes") return locale === "ar" ? "يحتاج تعديلات" : "Needs changes";
  return String(value);
}

export default function AdminCandidateProfileDetailPage() {
  const params = useParams<{ locale: string; candidateId: string }>();
  const t = useTranslations("ownerPortal.candidateProfileDetail");
  const locale = String(params.locale ?? "en");
  const candidateId = String(params.candidateId ?? "");
  const [hasSession, setHasSession] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [profile, setProfile] = useState<CandidateDetail | null>(null);
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(
    () => ({
      title: t("title"),
      approve: t("approve"),
      reject: t("reject"),
      changes: t("changes"),
      regenerate: t("regenerate"),
      save: t("save"),
    }),
    [t]
  );

  useEffect(() => {
    fetch("/api/security/csrf")
      .then((response) => response.json())
      .then((payload) => setCsrfToken(payload?.data?.csrfToken ?? ""))
      .catch(() => setCsrfToken(""));

    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (!payload?.success || !candidateId) return;
        setHasSession(true);

        return fetch(`/api/admin/candidate-profiles/${candidateId}`, {
          credentials: "include",
        })
          .then((response) => response.json())
          .then((payload) => {
            const nextProfile = payload?.data ?? null;
            setProfile(nextProfile);
            setTitle(nextProfile?.professional_title ?? "");
            setSummary(nextProfile?.professional_summary ?? "");
          });
      })
        .catch(() => setError(t("errors.loadFailed")));
  }, [candidateId, t]);

  async function submitAction(action: "approve" | "reject" | "needs_changes" | "regenerate") {
    if (!hasSession) return;

    const response = await fetch(`/api/admin/candidate-profiles/${candidateId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify({
        action,
        notes,
        profilePatch: {
          professionalTitle: title,
          professionalSummary: summary,
          profileStatus: action === "approve" ? "approved" : action === "reject" ? "rejected" : action === "regenerate" ? "pending_review" : "needs_changes",
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      setError(payload?.error?.message ?? t("errors.updateFailed"));
      return;
    }

    setProfile((current) =>
      current
        ? {
            ...current,
            professional_title: title,
            professional_summary: summary,
            profile_status: payload?.data?.status ?? current.profile_status,
          }
        : current
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1360px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.title}</h1>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.privateProfile")}</h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <p><span className="text-text-tertiary">{t("fields.reference")}:</span> {profile?.candidate_reference ?? "-"}</p>
              <p><span className="text-text-tertiary">{t("fields.fullName")}:</span> {profile?.candidate_private_profiles?.[0]?.full_name ?? "-"}</p>
              <p><span className="text-text-tertiary">{t("fields.email")}:</span> <span dir="ltr" className="[unicode-bidi:isolate] break-all">{profile?.candidate_private_profiles?.[0]?.email ?? "-"}</span></p>
              <p><span className="text-text-tertiary">{t("fields.phone")}:</span> <span dir="ltr" className="[unicode-bidi:isolate]">{profile?.candidate_private_profiles?.[0]?.phone ?? "-"}</span></p>
              <p><span className="text-text-tertiary">{t("fields.address")}:</span> {profile?.candidate_private_profiles?.[0]?.address ?? "-"}</p>
              <p><span className="text-text-tertiary">{t("fields.originalCvPath")}:</span> <span dir="ltr" className="[unicode-bidi:isolate] break-all">{profile?.candidate_private_profiles?.[0]?.original_cv_path ?? "-"}</span></p>
              <p><span className="text-text-tertiary">{t("fields.supportingDocs")}:</span> {profile?.candidate_private_profiles?.[0]?.original_documents_paths?.length ?? 0}</p>
              <p><span className="text-text-tertiary">{t("fields.identityVerification")}:</span> {localizeVerificationStatus(profile?.candidate_private_profiles?.[0]?.identity_verification_status ?? "pending_verification", locale)}</p>
              <p><span className="text-text-tertiary">{t("fields.confidence")}:</span> {profile?.candidate_private_profiles?.[0]?.identity_verification_confidence ?? "-"}</p>
              <p><span className="text-text-tertiary">{t("fields.staffReviewStatus")}:</span> {localizeVerificationStatus(profile?.candidate_private_profiles?.[0]?.identity_staff_review_status ?? "pending", locale)}</p>
              <p><span className="text-text-tertiary">{t("fields.aiReasoning")}:</span> {profile?.candidate_private_profiles?.[0]?.identity_verification_reasoning ?? "-"}</p>
            </div>
          </article>

          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.employerProfile")}</h2>
            <div className="mt-4 grid gap-4">
              <label className="space-y-2 text-sm text-text-secondary">
                <span className="block">{t("fields.professionalTitle")}</span>
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-text-primary" />
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                <span className="block">{t("fields.professionalSummary")}</span>
                <textarea value={summary} onChange={(event) => setSummary(event.target.value)} rows={6} className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-text-primary" />
              </label>
              <label className="space-y-2 text-sm text-text-secondary">
                <span className="block">{t("fields.reviewNotes")}</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-xl border border-gold/15 bg-bg-secondary px-4 py-3 text-text-primary" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => submitAction("approve")} className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-bg-primary">{copy.approve}</button>
              <button onClick={() => submitAction("reject")} className="rounded-full border border-red-400/30 px-4 py-2 text-sm font-semibold text-red-200">{copy.reject}</button>
              <button onClick={() => submitAction("needs_changes")} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">{copy.changes}</button>
              <button onClick={() => submitAction("regenerate")} className="rounded-full border border-gold/30 px-4 py-2 text-sm font-semibold text-gold">{copy.regenerate}</button>
            </div>

            <div className="mt-4 rounded-2xl border border-gold/10 bg-bg-secondary/70 p-4 text-sm text-text-secondary">
              <p className="font-semibold text-text-primary">{t("fields.status")}</p>
              <p className="mt-2">{t(`status.${toTranslationStatusKey(profile?.profile_status)}`)}</p>
            </div>
          </article>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.certificates")}</h2>
            <pre className="mt-4 overflow-auto rounded-xl bg-bg-secondary p-4 text-xs text-text-secondary">{JSON.stringify(profile?.certifications ?? [], null, 2)}</pre>
          </article>
          <article className="rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <h2 className="font-heading text-2xl text-text-primary">{t("sections.reviewHistory")}</h2>
            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              {profile?.candidate_profile_reviews?.map((review) => (
                <div key={review.id} className="rounded-xl border border-gold/10 px-4 py-3">
                  <p className="font-medium text-text-primary">{t(`status.${toTranslationStatusKey(review.status)}`)}</p>
                  <p>{review.notes ?? t("noNotes")}</p>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="mt-6 rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
          <h2 className="font-heading text-2xl text-text-primary">{t("sections.employerSummary")}</h2>
          <p className="mt-3 text-sm text-text-secondary">{profile?.ai_summary ?? t("noSummary")}</p>
          <p className="mt-2 text-xs text-text-tertiary">{t("fields.status")}: {t(`status.${toTranslationStatusKey(profile?.profile_status)}`)}</p>
          <p className="mt-2 text-xs text-text-tertiary">{t("fields.visibility")}: {profile?.profile_status === "approved" ? t("visible") : t("hidden")}</p>
        </article>
      </section>
    </main>
  );
}
