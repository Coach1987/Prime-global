"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { buildCandidateAuthHref } from "@/lib/auth/return-to";
import { useRouter } from "@/i18n/routing";

type JobDetail = {
  id: string;
  title: string;
  country: string | null;
  city: string | null;
  category: string | null;
  specialization: string | null;
  employment_type: string | null;
  publish_date: string | null;
  description: string | null;
  requirements: string | null;
  company_display_name: string | null;
};

type AuthPayload = {
  success: boolean;
  data?: {
    role?: string;
  };
};

type ApplyEligibilityResponse = {
  success: boolean;
  data?: {
    code: string;
    eligible: boolean;
    onboardingRedirect: string | null;
    duplicateApplicationId: string | null;
    profileCompletionPercent: number;
    missingRequirements: string[];
    cvReady: boolean;
    documentsReady: boolean;
    primaryResumeId: string | null;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

function Modal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const root = containerRef.current;
    const focusables = root?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusables?.[0]?.focus();
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" role="presentation">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby="apply-dialog-description"
        className="w-full max-w-xl rounded-3xl border border-blue-200/25 bg-[#0b1730] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]"
      >
        <h2 className="font-heading text-3xl text-text-primary">{title}</h2>
        <p id="apply-dialog-description" className="mt-2 text-sm leading-6 text-text-secondary">
          {description}
        </p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams<{ locale: string; jobId: string }>();
  const locale = String(params.locale ?? "en");
  const jobId = String(params.jobId ?? "");
  const searchParams = useSearchParams();
  const router = useRouter();
  const isArabic = locale === "ar";

  const [job, setJob] = useState<JobDetail | null>(null);
  const [authRole, setAuthRole] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<ApplyEligibilityResponse["data"] | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [roleNotice, setRoleNotice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoIntentHandled, setAutoIntentHandled] = useState(false);

  const copy = useMemo(
    () =>
      isArabic
        ? {
            pageTitle: "تفاصيل الوظيفة",
            apply: "قدّم الآن",
            requiresCandidate: "التقديم على الوظائف يتطلب حساب مرشح.",
            oneStepAway: "أنت على بُعد خطوة واحدة من التقديم.",
            benefitsIntro: "لإكمال التقديم بسهولة وأمان عبر Prime Global:",
            createProfile: "أنشئ ملفك المهني على Prime Global",
            uploadDocs: "حمّل السيرة الذاتية والشهادات مرة واحدة",
            alerts: "احصل على تنبيهات وظائف مستقبلية مطابقة",
            track: "تابع طلباتك بشكل آمن",
            protectedInterviews: "انضم إلى المقابلات المحمية عبر Prime Global",
            createAccount: "إنشاء حساب",
            signIn: "تسجيل الدخول",
            cancel: "إغلاق",
            profileStatus: "جاهزية الملف",
            docsStatus: "جاهزية الوثائق",
            cvReady: "السيرة الذاتية",
            certificatesReady: "الشهادات/المستندات",
            ready: "جاهز",
            missing: "غير مكتمل",
            submitApplication: "إرسال الطلب",
            profileIncomplete: "يجب إكمال متطلبات الملف قبل إرسال الطلب.",
            duplicate: "تم إرسال طلب سابق لهذه الوظيفة.",
            applySuccess: "تم إرسال طلبك بنجاح.",
            locationUnknown: "الموقع غير محدد",
            companyFallback: "شركة معتمدة",
            categoryFallback: "بدون تصنيف",
            description: "الوصف",
            requirements: "المتطلبات",
            published: "تاريخ النشر",
            employmentType: "نوع التوظيف",
            confirmationTitle: "تأكيد تقديم الطلب",
            confirmationDescription: "راجع جاهزية ملفك قبل إرسال طلبك. لن يتم الإرسال إلا بعد الضغط على زر الإرسال.",
          }
        : {
            pageTitle: "Job Details",
            apply: "Apply Now",
            requiresCandidate: "Applications require a Candidate account.",
            oneStepAway: "You're one step away from applying.",
            benefitsIntro: "To complete your application professionally and securely on Prime Global:",
            createProfile: "Create your professional Prime Global profile",
            uploadDocs: "Upload your CV and certificates once",
            alerts: "Receive future matching job alerts",
            track: "Track applications securely",
            protectedInterviews: "Join protected interviews through Prime Global",
            createAccount: "Create Account",
            signIn: "Sign In",
            cancel: "Close",
            profileStatus: "Profile readiness",
            docsStatus: "Documents readiness",
            cvReady: "CV",
            certificatesReady: "Certificates/Documents",
            ready: "Ready",
            missing: "Incomplete",
            submitApplication: "Submit Application",
            profileIncomplete: "Complete your profile requirements before submitting.",
            duplicate: "You have already applied to this job.",
            applySuccess: "Your application was submitted successfully.",
            locationUnknown: "Location not specified",
            companyFallback: "Verified employer",
            categoryFallback: "Uncategorized",
            description: "Description",
            requirements: "Requirements",
            published: "Published",
            employmentType: "Employment type",
            confirmationTitle: "Confirm Application",
            confirmationDescription: "Review your profile readiness before submitting. Submission happens only after explicit confirmation.",
          },
    [isArabic]
  );

  const applyIntentPath = `/${locale}/jobs/${jobId}?applyIntent=1`;
  const createAccountHref = buildCandidateAuthHref({ locale, mode: "register", returnTo: applyIntentPath });
  const signInHref = buildCandidateAuthHref({ locale, mode: "signin", returnTo: applyIntentPath });

  useEffect(() => {
    if (!jobId) return;

    let cancelled = false;

    Promise.all([
      fetch(`/api/jobs/${jobId}`),
      fetch("/api/auth/me", { credentials: "include" }),
      fetch("/api/security/csrf", { credentials: "include" }),
    ])
      .then(async ([jobResponse, authResponse, csrfResponse]) => {
        const [jobPayload, authPayload, csrfPayload] = await Promise.all([
          jobResponse.json(),
          authResponse.json(),
          csrfResponse.json(),
        ]);

        if (cancelled) return;

        if (!jobResponse.ok || !jobPayload.success) {
          setError(jobPayload?.error?.message ?? "Unable to load job details");
          return;
        }

        setJob(jobPayload.data as JobDetail);
        setCsrfToken(String(csrfPayload?.data?.csrfToken ?? ""));

        const authData = authPayload as AuthPayload;
        if (authResponse.ok && authData.success && authData.data?.role) {
          setAuthRole(String(authData.data.role));
        } else {
          setAuthRole(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load job details");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const loadEligibility = useCallback(async () => {
    const url = new URL(`/api/jobs/${jobId}/apply`, window.location.origin);
    url.searchParams.set("locale", locale);
    url.searchParams.set("returnTo", applyIntentPath);

    const response = await fetch(url.toString(), { credentials: "include" });
    const payload = (await response.json()) as ApplyEligibilityResponse;

    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error?.message ?? "Unable to validate application readiness");
    }

    setEligibility(payload.data);
    return payload.data;
  }, [applyIntentPath, jobId, locale]);

  const onApplyClick = useCallback(async () => {
    setFeedback(null);
    setRoleNotice(null);

    if (!authRole) {
      setAuthGateOpen(true);
      return;
    }

    if (authRole !== "candidate") {
      setRoleNotice(copy.requiresCandidate);
      return;
    }

    try {
      const nextEligibility = await loadEligibility();

      if (nextEligibility.code === "DUPLICATE_APPLICATION") {
        setRoleNotice(copy.duplicate);
        return;
      }

      if (nextEligibility.code === "CANDIDATE_PROFILE_INCOMPLETE") {
        if (nextEligibility.onboardingRedirect) {
          router.push(nextEligibility.onboardingRedirect as never);
          return;
        }
        setRoleNotice(copy.profileIncomplete);
        return;
      }

      if (!nextEligibility.eligible) {
        setRoleNotice(copy.requiresCandidate);
        return;
      }

      setConfirmOpen(true);
    } catch (applyError) {
      setRoleNotice(applyError instanceof Error ? applyError.message : "Unable to continue");
    }
  }, [authRole, copy.duplicate, copy.profileIncomplete, copy.requiresCandidate, loadEligibility, router]);

  useEffect(() => {
    if (autoIntentHandled) return;
    if (searchParams.get("applyIntent") !== "1") return;
    if (authRole !== "candidate") return;

    onApplyClick().catch(() => undefined);
    setAutoIntentHandled(true);
  }, [authRole, autoIntentHandled, onApplyClick, searchParams]);

  async function submitApplication() {
    if (!eligibility?.eligible || !job) return;
    setSubmitting(true);
    setRoleNotice(null);

    try {
      const url = new URL(`/api/jobs/${job.id}/apply`, window.location.origin);
      url.searchParams.set("locale", locale);
      url.searchParams.set("returnTo", applyIntentPath);

      const response = await fetch(url.toString(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          jobId: job.id,
          resumeId: eligibility.primaryResumeId ?? undefined,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        if (payload?.error?.code === "DUPLICATE_APPLICATION") {
          setRoleNotice(copy.duplicate);
          return;
        }

        if (payload?.error?.code === "CANDIDATE_PROFILE_INCOMPLETE" && payload?.data?.onboardingRedirect) {
          router.push(payload.data.onboardingRedirect as never);
          return;
        }

        throw new Error(payload?.error?.message ?? "Unable to submit application");
      }

      setConfirmOpen(false);
      setFeedback(copy.applySuccess);
    } catch (submitError) {
      setRoleNotice(submitError instanceof Error ? submitError.message : "Unable to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  const location = [job?.city, job?.country].filter(Boolean).join(", ") || copy.locationUnknown;

  return (
    <main className="mx-auto w-full max-w-[1040px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <section className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 backdrop-blur-xl md:p-10">
        <h1 className="font-heading text-4xl text-text-primary">{copy.pageTitle}</h1>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}

        {job ? (
          <article className="mt-6 rounded-2xl border border-gold/15 bg-bg-primary/70 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-gold">{job.company_display_name ?? copy.companyFallback}</p>
            <h2 className="mt-2 font-heading text-3xl text-text-primary">{job.title}</h2>
            <p className="mt-2 text-sm text-text-secondary">{location}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-text-tertiary">
              {(job.category ?? copy.categoryFallback) + " • " + (job.employment_type ?? "-")}
            </p>
            <p className="mt-2 text-xs text-text-tertiary">
              {copy.published}: {job.publish_date ? new Date(job.publish_date).toLocaleDateString(locale) : "-"}
            </p>

            <section className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-200">{copy.description}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-secondary">{job.description ?? "-"}</p>
            </section>

            <section className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-200">{copy.requirements}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-secondary">{job.requirements ?? "-"}</p>
            </section>

            {authRole && authRole !== "candidate" ? (
              <p className="mt-6 rounded-xl border border-amber-300/40 bg-amber-600/10 px-4 py-3 text-sm text-amber-100">
                {copy.requiresCandidate}
              </p>
            ) : null}

            {(!authRole || authRole === "candidate") && (
              <button
                type="button"
                onClick={() => onApplyClick().catch(() => undefined)}
                className="mt-6 inline-flex rounded-full bg-gold px-6 py-3 text-sm font-semibold text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
              >
                {copy.apply}
              </button>
            )}
          </article>
        ) : null}

        {roleNotice ? <p className="mt-4 text-sm text-amber-200">{roleNotice}</p> : null}
        {feedback ? <p className="mt-4 text-sm text-emerald-200">{feedback}</p> : null}
      </section>

      <Modal
        open={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        title={copy.oneStepAway}
        description={copy.benefitsIntro}
      >
        <ul className="space-y-2 text-sm text-text-secondary">
          <li>• {copy.createProfile}</li>
          <li>• {copy.uploadDocs}</li>
          <li>• {copy.alerts}</li>
          <li>• {copy.track}</li>
          <li>• {copy.protectedInterviews}</li>
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={createAccountHref}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
          >
            {copy.createAccount}
          </a>
          <a
            href={signInHref}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-blue-200/40 px-5 py-3 text-sm font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
          >
            {copy.signIn}
          </a>
        </div>

        <button
          type="button"
          onClick={() => setAuthGateOpen(false)}
          className="mt-3 inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
        >
          {copy.cancel}
        </button>
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={copy.confirmationTitle}
        description={copy.confirmationDescription}
      >
        <div className="space-y-3 text-sm text-text-secondary">
          <p>
            <span className="font-semibold text-text-primary">{copy.profileStatus}:</span>{" "}
            {eligibility?.profileCompletionPercent ?? 0}%
          </p>
          <p>
            <span className="font-semibold text-text-primary">{copy.cvReady}:</span>{" "}
            {eligibility?.cvReady ? copy.ready : copy.missing}
          </p>
          <p>
            <span className="font-semibold text-text-primary">{copy.certificatesReady}:</span>{" "}
            {eligibility?.documentsReady ? copy.ready : copy.missing}
          </p>

          {(eligibility?.missingRequirements?.length ?? 0) > 0 ? (
            <p>
              <span className="font-semibold text-text-primary">{copy.docsStatus}:</span>{" "}
              {eligibility?.missingRequirements.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            disabled={!eligibility?.eligible || submitting || !csrfToken}
            onClick={() => submitApplication().catch(() => undefined)}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-bg-primary disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
          >
            {submitting ? "..." : copy.submitApplication}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/80"
          >
            {copy.cancel}
          </button>
        </div>
      </Modal>
    </main>
  );
}
