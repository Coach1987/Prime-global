"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { asCandidateLocale, localizeCandidateStatus } from "@/lib/candidates/localization";

type CandidateProfile = {
  full_name?: string | null;
  professional_title?: string | null;
  country?: string | null;
  city?: string | null;
  bio?: string | null;
  updated_at?: string | null;
};

type ExperienceEntry = {
  company?: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
};

type EducationEntry = {
  institution?: string;
  degree?: string;
  year?: string;
};

type CertificateEntry = {
  title?: string;
  issuer?: string;
  year?: string;
};

type ProfessionalProfile = {
  headline?: string | null;
  biography?: string | null;
  experiences?: ExperienceEntry[];
  education_entries?: EducationEntry[];
  certificates?: CertificateEntry[];
  skills?: string[];
  languages?: string[];
  updated_at?: string | null;
};

type CompletionData = {
  completed?: boolean;
  completionPercent?: number;
};

type VerificationCase = {
  status?: string | null;
  candidate_message?: string | null;
  updated_at?: string | null;
};

type ResumeVersion = {
  verification_status?: string | null;
  created_at?: string | null;
};

type CertificateVersion = {
  original_filename?: string | null;
  verification_status?: string | null;
  created_at?: string | null;
};

type ApiPayload = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  documentVersions?: CertificateVersion[];
};

type CountResponse = {
  data?: Array<unknown>;
  success?: boolean;
};

async function readJsonResponse<T>(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get("content-type") ?? "";
  const bodyText = await response.text().catch(() => "");

  if (!contentType.includes("application/json")) {
    return { payload: null as T | null, errorMessage: fallbackMessage };
  }

  try {
    return { payload: (bodyText ? (JSON.parse(bodyText) as T) : null) as T | null, errorMessage: null };
  } catch {
    return { payload: null as T | null, errorMessage: fallbackMessage };
  }
}

function isApiSuccess(payload: ApiPayload | null | undefined) {
  return payload?.ok === true || payload?.success === true;
}

function toDisplayDate(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function sortByDateDesc<T extends { startDate?: string; year?: string; created_at?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const first = Date.parse(a.startDate ?? a.year ?? a.created_at ?? "");
    const second = Date.parse(b.startDate ?? b.year ?? b.created_at ?? "");
    const firstSafe = Number.isNaN(first) ? 0 : first;
    const secondSafe = Number.isNaN(second) ? 0 : second;
    return secondSafe - firstSafe;
  });
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-text-tertiary">{text}</p>;
}

export default function CandidateProfilePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const uiLocale = asCandidateLocale(locale);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [professional, setProfessional] = useState<ProfessionalProfile | null>(null);
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [verificationCase, setVerificationCase] = useState<VerificationCase | null>(null);
  const [cvStatus, setCvStatus] = useState<string>("pending_ai_analysis");
  const [certificateVersions, setCertificateVersions] = useState<CertificateVersion[]>([]);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const [applicationsCount, setApplicationsCount] = useState(0);
  const [interviewsCount, setInterviewsCount] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);

  useEffect(() => {
    async function bootstrap() {
      const authFallback = isArabic ? "تعذر التحقق من الجلسة." : "Unable to verify your session.";

      try {
        const authResponse = await fetch("/api/auth/me", { credentials: "include" });
        const authPayload = await readJsonResponse<ApiPayload & { data?: { role?: string } }>(authResponse, authFallback);

        if (!authResponse.ok || !isApiSuccess(authPayload.payload) || authPayload.payload?.data?.role !== "candidate") {
          router.replace("/auth?mode=signin&audience=candidate");
          return;
        }

        const [
          profileResponse,
          professionalResponse,
          completionResponse,
          verificationResponse,
          resumesResponse,
          privateDocsResponse,
          photoResponse,
          applicationsResponse,
          interviewsResponse,
          notificationsResponse,
        ] = await Promise.all([
          fetch("/api/candidates/profile", { credentials: "include" }),
          fetch("/api/candidates/professional-profile", { credentials: "include" }),
          fetch("/api/candidates/profile-completion", { credentials: "include" }),
          fetch("/api/candidates/document-verification", { credentials: "include" }),
          fetch("/api/candidates/resumes", { credentials: "include" }),
          fetch("/api/candidates/private-documents", { credentials: "include" }),
          fetch("/api/candidates/profile-photo", { credentials: "include" }),
          fetch("/api/candidates/applications", { credentials: "include" }),
          fetch("/api/interviews", { credentials: "include" }),
          fetch("/api/candidates/notifications", { credentials: "include" }),
        ]);

        const [
          profilePayload,
          professionalPayload,
          completionPayload,
          verificationPayload,
          resumesPayload,
          privateDocsPayload,
          photoPayload,
          applicationsPayload,
          interviewsPayload,
          notificationsPayload,
        ] = await Promise.all([
          readJsonResponse<ApiPayload & { data?: CandidateProfile | null }>(
            profileResponse,
            isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account details."
          ),
          readJsonResponse<ApiPayload & { data?: ProfessionalProfile | null }>(
            professionalResponse,
            isArabic ? "تعذر تحميل الملف المهني." : "Unable to load professional profile."
          ),
          readJsonResponse<ApiPayload & { data?: CompletionData }>(
            completionResponse,
            isArabic ? "تعذر تحميل نسبة اكتمال الملف." : "Unable to load profile completion."
          ),
          readJsonResponse<ApiPayload & { data?: { cases?: VerificationCase[] } }>(
            verificationResponse,
            isArabic ? "تعذر تحميل حالة التحقق." : "Unable to load verification status."
          ),
          readJsonResponse<ApiPayload & { documentVersions?: ResumeVersion[] }>(
            resumesResponse,
            isArabic ? "تعذر تحميل حالة السيرة الذاتية." : "Unable to load CV status."
          ),
          readJsonResponse<ApiPayload & { documentVersions?: CertificateVersion[] }>(
            privateDocsResponse,
            isArabic ? "تعذر تحميل بيانات الشهادات." : "Unable to load certificates."
          ),
          readJsonResponse<ApiPayload & { data?: { hasPhoto?: boolean } }>(
            photoResponse,
            isArabic ? "تعذر تحميل صورة الملف الشخصي." : "Unable to load profile photo."
          ),
          readJsonResponse<CountResponse>(applicationsResponse, ""),
          readJsonResponse<CountResponse>(interviewsResponse, ""),
          readJsonResponse<CountResponse>(notificationsResponse, ""),
        ]);

        if (!profileResponse.ok || !isApiSuccess(profilePayload.payload)) {
          setError(profilePayload.errorMessage ?? (isArabic ? "تعذر تحميل الملف المهني." : "Unable to load profile."));
          return;
        }

        const completionData = (completionPayload.payload?.data ?? null) as CompletionData | null;

        setProfile((profilePayload.payload?.data ?? null) as CandidateProfile | null);
        setProfessional((professionalPayload.payload?.data ?? null) as ProfessionalProfile | null);
        setCompletion(completionData);

        const latestCase = verificationPayload.payload?.data?.cases?.[0] ?? null;
        setVerificationCase(latestCase);

        const latestCvVersion = resumesPayload.payload?.documentVersions?.[0] ?? null;
        setCvStatus(String(latestCvVersion?.verification_status ?? "pending_ai_analysis"));
        setCertificateVersions(Array.isArray(privateDocsPayload.payload?.documentVersions) ? privateDocsPayload.payload.documentVersions : []);

        setHasPhoto(Boolean(photoPayload.payload?.data?.hasPhoto));
        setPhotoVersion((prev) => prev + 1);

        const nextApplications = Array.isArray(applicationsPayload.payload?.data)
          ? applicationsPayload.payload?.data.length
          : 0;
        const nextInterviews = Array.isArray(interviewsPayload.payload?.data)
          ? interviewsPayload.payload?.data.length
          : 0;
        const nextNotifications = Array.isArray(notificationsPayload.payload?.data)
          ? notificationsPayload.payload?.data.length
          : 0;

        setApplicationsCount(nextApplications);
        setInterviewsCount(nextInterviews);
        setNotificationsCount(nextNotifications);
      } catch {
        setError(isArabic ? "تعذر تحميل الملف المهني." : "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [isArabic, router]);

  const fullName = useMemo(() => profile?.full_name?.trim() || (isArabic ? "مرشح برايم جلوبال" : "Prime Global Candidate"), [isArabic, profile?.full_name]);
  const nameParts = useMemo(() => {
    const parts = fullName.split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] ?? "-",
      lastName: parts.length > 1 ? parts.slice(1).join(" ") : "-",
    };
  }, [fullName]);
  const headline = professional?.headline?.trim() || profile?.professional_title?.trim() || (isArabic ? "المسمى غير مضاف" : "Professional title not provided");
  const summary = professional?.biography?.trim() || profile?.bio?.trim() || "";
  const location = [profile?.country?.trim(), profile?.city?.trim()].filter(Boolean).join(" - ");

  const skills = Array.isArray(professional?.skills) ? professional.skills.filter(Boolean) : [];
  const languages = Array.isArray(professional?.languages) ? professional.languages.filter(Boolean) : [];
  const experiences = sortByDateDesc(Array.isArray(professional?.experiences) ? professional.experiences : []);
  const educationEntries = sortByDateDesc(Array.isArray(professional?.education_entries) ? professional.education_entries : []);
  const certificates = sortByDateDesc(Array.isArray(professional?.certificates) ? professional.certificates : []);

  const lastUpdatedAt = toDisplayDate(professional?.updated_at ?? profile?.updated_at ?? null);
  const completionPercent = Number(completion?.completionPercent ?? 0);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <p className="text-sm text-text-secondary">{isArabic ? "جارٍ تحميل الملف المهني..." : "Loading career profile..."}</p>
        </PrimeCard>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <p className="text-sm text-red-300">{error}</p>
          <Link href="/auth?mode=signin&audience=candidate" className={`${primeButtonClasses("secondary")} mt-4`}>
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </PrimeCard>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <div className="flex flex-col gap-5 border-b border-blue-200/15 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-full border border-blue-200/25 bg-[#0d1d38]">
              {hasPhoto ? (
                <img
                  src={`/api/candidates/profile-photo/content?v=${photoVersion}`}
                  alt={isArabic ? "صورة المرشح" : "Candidate profile photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-text-tertiary">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div>
              <PrimePageTitle>{isArabic ? "الملف المهني" : "Career Profile"}</PrimePageTitle>
              <p className="mt-1 text-lg font-semibold text-text-primary">{fullName}</p>
              <p className="mt-1 text-sm text-text-secondary">{headline}</p>
              <p className="mt-1 text-sm text-text-tertiary">{location || (isArabic ? "الموقع غير مضاف" : "Location not provided")}</p>
            </div>
          </div>

          <Link href="/candidate/settings" className={primeButtonClasses("primary")}>
            {isArabic ? "تعديل الملف" : "Edit Profile"}
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "اكتمال الملف" : "Profile completion"}</p>
            <p className="mt-2 text-2xl font-semibold text-silver">{completionPercent}%</p>
          </article>
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "حالة التحقق" : "Verification"}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{localizeCandidateStatus(verificationCase?.status ?? "pending_ai_analysis", uiLocale)}</p>
          </article>
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "حالة السيرة الذاتية" : "Current CV status"}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary">{localizeCandidateStatus(cvStatus, uiLocale)}</p>
          </article>
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "آخر تحديث" : "Last update"}</p>
            <p className="mt-2 text-sm font-semibold text-text-primary" dir={isArabic ? "rtl" : "ltr"}>{lastUpdatedAt}</p>
          </article>
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "الطلبات" : "Applications"}</p>
            <p className="mt-2 text-2xl font-semibold text-silver">{applicationsCount}</p>
          </article>
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "المقابلات" : "Interviews"}</p>
            <p className="mt-2 text-2xl font-semibold text-silver">{interviewsCount}</p>
          </article>
          <article className="rounded-2xl border border-blue-200/20 bg-[#061123]/80 p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{isArabic ? "الإشعارات" : "Notifications"}</p>
            <p className="mt-2 text-2xl font-semibold text-silver">{notificationsCount}</p>
          </article>
        </div>

        <section className="mt-8 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "بيانات الهوية" : "Identity"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-text-secondary">
            <p>
              <span className="font-semibold text-text-primary">{isArabic ? "الاسم الأول:" : "First name:"}</span> {nameParts.firstName}
            </p>
            <p>
              <span className="font-semibold text-text-primary">{isArabic ? "اسم العائلة:" : "Last name:"}</span> {nameParts.lastName}
            </p>
            <p className="sm:col-span-2">
              <span className="font-semibold text-text-primary">{isArabic ? "الاسم الكامل:" : "Full name:"}</span> {fullName}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "الملخص المهني" : "Professional Summary"}</h2>
          {summary ? <p className="mt-3 text-sm leading-7 text-text-secondary">{summary}</p> : <EmptyState text={isArabic ? "لم تتم إضافة ملخص مهني بعد." : "No professional summary added yet."} />}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "المهارات" : "Key Skills"}</h2>
            {skills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span key={`${skill}-${index}`} className="rounded-full border border-blue-200/30 px-3 py-1 text-xs text-silver">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="mt-3">
                <EmptyState text={isArabic ? "لا توجد مهارات مضافة بعد." : "No skills added yet."} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "اللغات" : "Languages"}</h2>
            {languages.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                {languages.map((language, index) => (
                  <li key={`${language}-${index}`}>{language}</li>
                ))}
              </ul>
            ) : (
              <div className="mt-3">
                <EmptyState text={isArabic ? "لا توجد لغات مضافة بعد." : "No languages added yet."} />
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "الخبرة العملية" : "Work Experience"}</h2>
            {experiences.length > 0 ? (
              <ol className="mt-4 space-y-4 text-sm text-text-secondary">
                {experiences.map((entry, index) => (
                  <li key={`experience-${index}`} className="border-l border-blue-200/20 pl-4">
                    <p className="font-semibold text-text-primary">{entry.role || (isArabic ? "مسمى غير مضاف" : "Role not provided")}</p>
                    <p>{entry.company || (isArabic ? "جهة العمل غير مضافة" : "Company not provided")}</p>
                    <p className="text-xs text-text-tertiary">
                      {(entry.startDate || "-") + " - " + (entry.endDate || (isArabic ? "حتى الآن" : "Present"))}
                    </p>
                    {entry.summary ? <p className="mt-2">{entry.summary}</p> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-3">
                <EmptyState text={isArabic ? "لا توجد خبرات مضافة بعد." : "No work experience added yet."} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "التعليم" : "Education"}</h2>
            {educationEntries.length > 0 ? (
              <ol className="mt-4 space-y-4 text-sm text-text-secondary">
                {educationEntries.map((entry, index) => (
                  <li key={`education-${index}`} className="border-l border-blue-200/20 pl-4">
                    <p className="font-semibold text-text-primary">{entry.degree || (isArabic ? "مؤهل غير مضاف" : "Degree not provided")}</p>
                    <p>{entry.institution || (isArabic ? "المؤسسة غير مضافة" : "Institution not provided")}</p>
                    <p className="text-xs text-text-tertiary" dir={isArabic ? "rtl" : "ltr"}>{entry.year || "-"}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-3">
                <EmptyState text={isArabic ? "لا توجد بيانات تعليمية بعد." : "No education entries added yet."} />
              </div>
            )}
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "الشهادات والدبلومات" : "Certificates & Diplomas"}</h2>
          {certificates.length > 0 || certificateVersions.length > 0 ? (
            <ul className="mt-4 space-y-3 text-sm text-text-secondary">
              {certificates.map((item, index) => (
                <li key={`certificate-${index}`}>
                  <span className="font-semibold text-text-primary">{item.title || (isArabic ? "شهادة" : "Certificate")}</span>
                  {item.issuer ? ` - ${item.issuer}` : ""}
                  {item.year ? ` (${item.year})` : ""}
                </li>
              ))}
              {certificateVersions.map((item, index) => (
                <li key={`certificate-version-${index}`}>
                  <span className="font-semibold text-text-primary" dir="ltr">{item.original_filename || (isArabic ? "وثيقة" : "Document")}</span>
                  <span className="text-xs text-text-tertiary"> {`(${localizeCandidateStatus(item.verification_status ?? "pending_verification", uiLocale)})`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState text={isArabic ? "لا توجد شهادات أو دبلومات بعد." : "No certificates or diplomas uploaded yet."} />
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <h2 className="font-heading text-xl text-text-primary">{isArabic ? "ملاحظات التحقق" : "Verification Notes"}</h2>
          {verificationCase?.candidate_message ? (
            <p className="mt-3 text-sm text-text-secondary">{verificationCase.candidate_message}</p>
          ) : (
            <div className="mt-3">
              <EmptyState text={isArabic ? "لا توجد ملاحظات تحقق حالياً." : "No verification notes at the moment."} />
            </div>
          )}
        </section>
      </PrimeCard>
    </main>
  );
}
