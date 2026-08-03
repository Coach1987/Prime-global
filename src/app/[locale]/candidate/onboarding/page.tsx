"use client";

import { FormEvent, Ref, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCheckbox, PrimeInput, PrimeLabel, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { InternationalPhoneInput } from "@/components/ui/InternationalPhoneInput";
import { LocalizedFileInput } from "@/components/ui/LocalizedFileInput";
import { asCandidateLocale, localizeDocumentType } from "@/lib/candidates/localization";
import { getEmployerBlockedFromCandidateActionsMessage } from "@/lib/auth/role-guard-messages";

type CandidateProfile = {
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  city?: string | null;
  professional_title?: string | null;
  bio?: string | null;
};

type ProfileCompletion = {
  completed: boolean;
  completionPercent: number;
  missing: string[];
};

type DocumentVersionRow = {
  id: string;
  document_type: string;
  version_number: number;
  original_filename: string;
  verification_status: string;
  is_active: boolean;
  created_at: string;
};

type DocumentCaseRow = {
  id: string;
  status: string;
  priority: string;
  candidate_message?: string | null;
  created_at: string;
  updated_at: string;
};

type CandidateVerificationTimeline = {
  versions: DocumentVersionRow[];
  cases: DocumentCaseRow[];
};

type OnboardingField =
  | "countryCode"
  | "phoneE164"
  | "city"
  | "desiredPosition"
  | "experienceLevel"
  | "shortBio"
  | "skills"
  | "languages"
  | "education"
  | "cv"
  | "supportingFiles";

type FieldErrors = Partial<Record<OnboardingField, string>>;

type ApiErrorShape = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  error?: { code?: string; message?: string };
  details?: { fieldErrors?: Record<string, string[]> };
};

const CV_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const SUPPORTING_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const SUPPORTING_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const REQUIREMENT_LABELS: Record<string, { en: string; ar: string }> = {
  cv: { en: "Upload your CV", ar: "حمّل السيرة الذاتية" },
  diploma: { en: "Upload at least one diploma or certificate", ar: "حمّل دبلوما أو شهادة واحدة على الأقل" },
  summary: { en: "Complete your professional summary", ar: "أكمل الملخص المهني" },
  skills: { en: "Add your skills", ar: "أضف المهارات" },
  experience: { en: "Add work experience", ar: "أضف الخبرات العملية" },
  education: { en: "Add education entries", ar: "أضف بيانات التعليم" },
  languages: { en: "Add your languages", ar: "أضف اللغات" },
  country: { en: "Select your country", ar: "اختر بلدك" },
  phone: { en: "Enter a valid international phone number", ar: "أدخل رقم هاتف دولي صحيح" },
};

function labelForRequirement(key: string, locale: "en" | "ar") {
  return REQUIREMENT_LABELS[key]?.[locale] ?? key;
}

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

function isApiSuccess(payload: ApiErrorShape | null | undefined) {
  return payload?.ok === true || payload?.success === true;
}

function mapFieldKeyToOnboardingField(inputKey: string): OnboardingField | null {
  const key = inputKey.trim().toLowerCase();

  if (["country", "countrycode", "nationality"].includes(key)) return "countryCode";
  if (["phone", "phonenumber", "phonee164"].includes(key)) return "phoneE164";
  if (["city"].includes(key)) return "city";
  if (["desiredposition", "professionaltitle", "headline"].includes(key)) return "desiredPosition";
  if (["experience", "workexperience", "experiences"].includes(key)) return "experienceLevel";
  if (["shortbio", "bio", "summary", "biography"].includes(key)) return "shortBio";
  if (["skills"].includes(key)) return "skills";
  if (["languages"].includes(key)) return "languages";
  if (["education", "educationentries"].includes(key)) return "education";
  if (["cv", "resume", "file"].includes(key)) return "cv";
  if (["supportingfiles", "files", "certificate", "certificates", "diploma"].includes(key)) return "supportingFiles";

  return null;
}

function extractBackendFieldErrors(payload: ApiErrorShape | null | undefined): FieldErrors {
  const next: FieldErrors = {};
  const direct = payload?.fieldErrors ?? {};
  const detailed = payload?.details?.fieldErrors ?? {};

  for (const [key, value] of Object.entries(direct)) {
    const mapped = mapFieldKeyToOnboardingField(key);
    if (mapped && typeof value === "string" && value.trim()) {
      next[mapped] = value.trim();
    }
  }

  for (const [key, values] of Object.entries(detailed)) {
    const mapped = mapFieldKeyToOnboardingField(key);
    if (mapped && Array.isArray(values) && values[0]?.trim() && !next[mapped]) {
      next[mapped] = values[0].trim();
    }
  }

  return next;
}

export default function CandidateOnboardingPage() {
  const locale = useLocale();
  const tDoc = useTranslations("candidateDocumentVerification");
  const isArabic = locale === "ar";
  const uiLocale = asCandidateLocale(locale);
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmployerBlocked, setIsEmployerBlocked] = useState(false);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const fieldRefs = useRef<Partial<Record<OnboardingField, HTMLElement | null>>>({});
  const [verificationNotice, setVerificationNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [verificationTimeline, setVerificationTimeline] = useState<CandidateVerificationTimeline | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number; label: string } | null>(null);

  const [form, setForm] = useState({
    city: "",
    countryCode: "",
    phoneRaw: "",
    phoneE164: "",
    desiredPosition: "",
    experienceLevel: "",
    shortBio: "",
    skills: "",
    languages: "",
    education: "",
    jobAlertsEnabled: true,
  });

  const missingLabels = useMemo(
    () => (completion?.missing ?? []).map((item) => labelForRequirement(item, isArabic ? "ar" : "en")),
    [completion, isArabic]
  );

  const hasExistingCv = useMemo(
    () => (verificationTimeline?.versions ?? []).some((version) => version.document_type === "cv"),
    [verificationTimeline]
  );

  const hasExistingSupportingDocuments = useMemo(
    () =>
      (verificationTimeline?.versions ?? []).some((version) =>
        ["diploma", "certificate", "supporting_document", "additional_evidence"].includes(version.document_type)
      ),
    [verificationTimeline]
  );

  function setFieldRef(field: OnboardingField) {
    return (element: HTMLElement | null) => {
      fieldRefs.current[field] = element;
    };
  }

  function clearFieldError(field: OnboardingField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function focusFirstInvalidField(errors: FieldErrors) {
    const priority: OnboardingField[] = [
      "countryCode",
      "phoneE164",
      "city",
      "desiredPosition",
      "experienceLevel",
      "shortBio",
      "skills",
      "languages",
      "education",
      "cv",
      "supportingFiles",
    ];

    const firstInvalid = priority.find((field) => Boolean(errors[field]));
    if (!firstInvalid) return;

    const target = fieldRefs.current[firstInvalid];
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => {
      target.focus();
    });
  }

  function validateForm(): FieldErrors {
    const errors: FieldErrors = {};
    const skills = form.skills
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const languages = form.languages
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!form.countryCode.trim()) {
      errors.countryCode = isArabic ? "يرجى اختيار الدولة." : "Please select your country.";
    }
    if (!form.phoneE164.trim()) {
      errors.phoneE164 = isArabic ? "يرجى إدخال رقم هاتف دولي صحيح." : "Please enter a valid international phone number.";
    }
    if (!form.city.trim()) {
      errors.city = isArabic ? "يرجى إدخال المدينة." : "City is required.";
    }
    if (!form.desiredPosition.trim()) {
      errors.desiredPosition = isArabic ? "يرجى إدخال المنصب المطلوب." : "Desired position is required.";
    }
    if (!form.experienceLevel.trim()) {
      errors.experienceLevel = isArabic ? "يرجى إدخال الخبرة العملية." : "Work experience is required.";
    }
    if (!form.shortBio.trim()) {
      errors.shortBio = isArabic ? "يرجى إدخال الملخص المهني." : "Professional summary is required.";
    }
    if (skills.length === 0) {
      errors.skills = isArabic ? "يرجى إضافة مهارة واحدة على الأقل." : "Please add at least one skill.";
    }
    if (languages.length === 0) {
      errors.languages = isArabic ? "يرجى إضافة لغة واحدة على الأقل." : "Please add at least one language.";
    }
    if (!form.education.trim()) {
      errors.education = isArabic ? "يرجى إدخال بيانات التعليم." : "Education is required.";
    }

    if (!cvFile && !hasExistingCv) {
      errors.cv = isArabic ? "يرجى رفع السيرة الذاتية." : "Please upload your CV.";
    }

    if (cvFile) {
      if (!CV_ALLOWED_TYPES.has(cvFile.type)) {
        errors.cv =
          isArabic
            ? "يجب أن يكون ملف السيرة الذاتية بصيغة PDF أو DOC أو DOCX."
            : "The CV must be a PDF, DOC, or DOCX file.";
      } else if (cvFile.size > CV_MAX_SIZE_BYTES) {
        errors.cv = isArabic ? "حجم ملف السيرة الذاتية كبير جدًا." : "The CV file is too large.";
      } else if (cvFile.size === 0) {
        errors.cv = isArabic ? "ملف السيرة الذاتية يبدو تالفًا." : "The CV file appears to be corrupted.";
      }
    }

    if (supportingFiles.length === 0 && !hasExistingSupportingDocuments) {
      errors.supportingFiles = isArabic
        ? "يرجى رفع شهادة أو دبلوم واحد على الأقل."
        : "Please upload at least one diploma or certificate.";
    }

    if (supportingFiles.some((file) => !SUPPORTING_ALLOWED_TYPES.has(file.type))) {
      errors.supportingFiles = isArabic
        ? "صيغة إحدى الشهادات غير مدعومة."
        : "This certificate format is not supported.";
    } else if (supportingFiles.some((file) => file.size > SUPPORTING_MAX_SIZE_BYTES)) {
      errors.supportingFiles = isArabic
        ? "حجم إحدى الشهادات كبير جدًا."
        : "One of the uploaded certificates is too large.";
    } else if (supportingFiles.some((file) => file.size === 0)) {
      errors.supportingFiles = isArabic
        ? "تعذر قراءة إحدى الشهادات. يرجى المحاولة مرة أخرى."
        : "We couldn't upload this certificate. Please try again.";
    }

    return errors;
  }

  function getInputErrorClass(field: OnboardingField) {
    return fieldErrors[field]
      ? "border-red-400/80 focus:border-red-300/80 focus:shadow-[0_0_0_1px_rgba(252,165,165,0.6),0_0_18px_rgba(248,113,113,0.35)]"
      : undefined;
  }

  async function loadCompletion() {
    const response = await fetch("/api/candidates/profile-completion", { credentials: "include" });
    const { payload } = await readJsonResponse<{ success?: boolean; data?: ProfileCompletion }>(
      response,
      isArabic ? "تعذر تحميل نسبة اكتمال الملف." : "Unable to load profile completion."
    );
    if (response.ok && isApiSuccess(payload as ApiErrorShape)) {
      setCompletion((payload?.data as ProfileCompletion | undefined) ?? null);
    }
  }

  async function loadVerificationTimeline() {
    const response = await fetch("/api/candidates/document-verification", { credentials: "include" });
    const { payload } = await readJsonResponse<{ success?: boolean; data?: CandidateVerificationTimeline }>(
      response,
      isArabic ? "تعذر تحميل حالة الوثائق." : "Unable to load document verification status."
    );
    if (response.ok && isApiSuccess(payload as ApiErrorShape)) {
      setVerificationTimeline({
        versions: Array.isArray(payload?.data?.versions) ? payload.data.versions : [],
        cases: Array.isArray(payload?.data?.cases) ? payload.data.cases : [],
      });
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const csrfResponse = await fetch("/api/security/csrf");
        const csrfPayload = await readJsonResponse<{ data?: { csrfToken?: string } }>(csrfResponse, "");
        setCsrfToken(csrfPayload.payload?.data?.csrfToken ?? "");

        const authResponse = await fetch("/api/auth/me", { credentials: "include" });
        const authPayload = await readJsonResponse<{ success?: boolean; data?: { role?: string } }>(
          authResponse,
          isArabic ? "تعذر التحقق من الجلسة." : "Unable to verify your session."
        );

        const authenticatedRole = authPayload.payload?.data?.role;
        if (!authResponse.ok || !isApiSuccess(authPayload.payload as ApiErrorShape) || authenticatedRole !== "candidate") {
          if (authenticatedRole === "employer") {
            setIsEmployerBlocked(true);
            setError(getEmployerBlockedFromCandidateActionsMessage(locale));
            return;
          }

          setError(isArabic ? "هذه الصفحة مخصصة للمرشحين المسجلين فقط." : "This page is only for authenticated candidates.");
          return;
        }

        const [profileResponse, professionalResponse, completionResponse, verificationResponse] = await Promise.all([
          fetch("/api/candidates/profile", { credentials: "include" }),
          fetch("/api/candidates/professional-profile", { credentials: "include" }),
          fetch("/api/candidates/profile-completion", { credentials: "include" }),
          fetch("/api/candidates/document-verification", { credentials: "include" }),
        ]);

        const [profilePayload, professionalPayload, completionPayload, verificationPayload] = await Promise.all([
          readJsonResponse<{ success?: boolean; data?: CandidateProfile | null }>(
            profileResponse,
            isArabic ? "تعذر تحميل الملف الشخصي." : "Unable to load profile."
          ),
          readJsonResponse<{ success?: boolean; data?: Record<string, unknown> }>(
            professionalResponse,
            isArabic ? "تعذر تحميل الملف المهني." : "Unable to load professional profile."
          ),
          readJsonResponse<{ success?: boolean; data?: ProfileCompletion }>(
            completionResponse,
            isArabic ? "تعذر تحميل نسبة الاكتمال." : "Unable to load completion data."
          ),
          readJsonResponse<{ success?: boolean; data?: CandidateVerificationTimeline }>(
            verificationResponse,
            isArabic ? "تعذر تحميل حالة التحقق." : "Unable to load verification timeline."
          ),
        ]);

        if (!profileResponse.ok || !isApiSuccess(profilePayload.payload as ApiErrorShape)) {
          setError(profilePayload.errorMessage ?? (isArabic ? "تعذر تحميل الملف الشخصي." : "Unable to load profile."));
          return;
        }

        const nextProfile = ((profilePayload.payload as { data?: CandidateProfile | null } | null)?.data ?? null) as CandidateProfile | null;
        const professional = (professionalPayload.payload?.data ?? {}) as Record<string, unknown>;
        setVerificationTimeline({
          versions: Array.isArray(verificationPayload.payload?.data?.versions) ? verificationPayload.payload.data.versions : [],
          cases: Array.isArray(verificationPayload.payload?.data?.cases) ? verificationPayload.payload.data.cases : [],
        });

        setProfile(nextProfile);
        setCompletion(completionPayload.payload?.data ?? null);
        setForm((prev) => ({
          ...prev,
          city: String(nextProfile?.city ?? ""),
          countryCode: String(nextProfile?.country ?? ""),
          phoneRaw: String(nextProfile?.phone_number ?? ""),
          phoneE164: String(nextProfile?.phone_number ?? ""),
          desiredPosition: String(nextProfile?.professional_title ?? professional?.headline ?? ""),
          shortBio: String(nextProfile?.bio ?? professional?.biography ?? ""),
          skills: Array.isArray(professional?.skills) ? (professional.skills as string[]).join(", ") : "",
          languages: Array.isArray(professional?.languages) ? (professional.languages as string[]).join(", ") : "",
          education: Array.isArray(professional?.education_entries) ? String((professional.education_entries as unknown[]).length) : "",
        }));
      } catch {
        setError(isArabic ? "تعذر تحميل بيانات الإعداد." : "Unable to load onboarding data.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [isArabic, locale]);

  async function uploadDocuments(onStepComplete: (label: string) => void) {
    const notices: string[] = [];

    if (cvFile) {
      const cvData = new FormData();
      cvData.append("file", cvFile);
      const cvResponse = await fetch("/api/candidates/resumes", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: cvData,
      });
      const cvPayload = await readJsonResponse<ApiErrorShape & { verification?: { message?: string } }>(
        cvResponse,
        isArabic
          ? "لم نتمكن من حفظ طلبك الآن. يرجى المحاولة مرة أخرى."
          : "We couldn't save your application right now. Please try again."
      );
      if (!cvResponse.ok || !isApiSuccess(cvPayload.payload)) {
        const nextFieldErrors = extractBackendFieldErrors(cvPayload.payload);
        const backendMessage =
          cvPayload.payload?.message ??
          cvPayload.payload?.error?.message ??
          cvPayload.errorMessage ??
          (isArabic ? "تعذر تحميل السيرة الذاتية." : "We couldn't process your CV upload right now.");

        throw {
          message: backendMessage,
          fieldErrors: {
            ...nextFieldErrors,
            cv:
              nextFieldErrors.cv ??
              (isArabic ? "تعذر تحميل السيرة الذاتية. يرجى المحاولة مرة أخرى." : "The CV could not be uploaded."),
          } as FieldErrors,
        };
      }

      onStepComplete(isArabic ? "تم رفع السيرة الذاتية." : "CV uploaded.");

      if (typeof cvPayload.payload?.verification?.message === "string" && cvPayload.payload.verification.message.trim()) {
        notices.push(cvPayload.payload.verification.message.trim());
      }
    }

    if (supportingFiles.length > 0) {
      const docsData = new FormData();
      supportingFiles.forEach((file) => docsData.append("files", file));
      const docsResponse = await fetch("/api/candidates/private-documents", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: docsData,
      });
      const docsPayload = await readJsonResponse<ApiErrorShape & { verification?: { message?: string } }>(
        docsResponse,
        isArabic
          ? "لم نتمكن من حفظ طلبك الآن. يرجى المحاولة مرة أخرى."
          : "We couldn't save your application right now. Please try again."
      );
      if (!docsResponse.ok || !isApiSuccess(docsPayload.payload)) {
        const nextFieldErrors = extractBackendFieldErrors(docsPayload.payload);
        const backendMessage =
          docsPayload.payload?.message ??
          docsPayload.payload?.error?.message ??
          docsPayload.errorMessage ??
          (isArabic ? "تعذر تحميل المستندات." : "We couldn't process your documents right now.");

        throw {
          message: backendMessage,
          fieldErrors: {
            ...nextFieldErrors,
            supportingFiles:
              nextFieldErrors.supportingFiles ??
              (isArabic
                ? "تعذر رفع إحدى الشهادات. يرجى المحاولة مرة أخرى."
                : "We couldn't upload this certificate. Please try again."),
          } as FieldErrors,
        };
      }

      onStepComplete(isArabic ? "تم رفع الشهادات." : "Certificates uploaded.");

      if (typeof docsPayload.payload?.verification?.message === "string" && docsPayload.payload.verification.message.trim()) {
        notices.push(docsPayload.payload.verification.message.trim());
      }
    }

    return notices;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || saving) return;

    setSaving(true);
    setError(null);
    setErrorSummary(null);
    setFieldErrors({});
    setVerificationNotice(null);

    const localErrors = validateForm();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      setErrorSummary(
        isArabic ? "يرجى تصحيح الحقول المميزة أدناه." : "Please correct the highlighted fields below."
      );
      setSaving(false);
      requestAnimationFrame(() => focusFirstInvalidField(localErrors));
      return;
    }

    const skills = form.skills
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const languages = form.languages
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    try {
      const totalSteps = 3 + (cvFile ? 1 : 0) + (supportingFiles.length > 0 ? 1 : 0);
      setSubmitProgress({
        current: 0,
        total: Math.max(totalSteps, 1),
        label: isArabic ? "جارٍ بدء الحفظ..." : "Starting save...",
      });

      const advanceProgress = (label: string) => {
        setSubmitProgress((prev) => {
          if (!prev) return prev;
          return {
            current: Math.min(prev.current + 1, prev.total),
            total: prev.total,
            label,
          };
        });
      };

      const notices = await uploadDocuments(advanceProgress);
      if (notices.length > 0) {
        setVerificationNotice(Array.from(new Set(notices)).join(" "));
      }

      const profileResponse = await fetch("/api/candidates/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          fullName: profile.full_name ?? "",
          email: profile.email ?? "",
          phoneNumber: form.phoneE164,
          country: form.countryCode,
          city: form.city,
          professionalTitle: form.desiredPosition,
          bio: form.shortBio,
        }),
      });

      const profilePayload = await readJsonResponse<ApiErrorShape>(
        profileResponse,
        isArabic
          ? "لم نتمكن من حفظ طلبك الآن. يرجى المحاولة مرة أخرى."
          : "We couldn't save your application right now. Please try again."
      );
      if (!profileResponse.ok || !isApiSuccess(profilePayload.payload)) {
        const nextFieldErrors = extractBackendFieldErrors(profilePayload.payload);
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          setErrorSummary(
            isArabic ? "يرجى تصحيح الحقول المميزة أدناه." : "Please correct the highlighted fields below."
          );
          requestAnimationFrame(() => focusFirstInvalidField(nextFieldErrors));
        } else {
          setError(
            profilePayload.payload?.message ??
              profilePayload.payload?.error?.message ??
              profilePayload.errorMessage ??
              (isArabic ? "تعذر حفظ الملف الأساسي." : "Unable to save core profile.")
          );
        }
        return;
      }
      advanceProgress(isArabic ? "تم حفظ الملف الأساسي." : "Core profile saved.");

      const professionalResponse = await fetch("/api/candidates/professional-profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          headline: form.desiredPosition,
          biography: form.shortBio,
          experiences: form.experienceLevel
            ? [{ company: isArabic ? "مقدم من المرشح" : "Provided by candidate", role: form.desiredPosition || (isArabic ? "مرشح" : "Candidate"), startDate: "2020", summary: form.experienceLevel }]
            : [],
          educationEntries: form.education
            ? [{ institution: isArabic ? "مقدم من المرشح" : "Provided by candidate", degree: isArabic ? "مؤهل" : "Qualification", year: form.education }]
            : [],
          certificates: [],
          skills,
          languages,
          portfolioUrl: "",
          linkedInUrl: "",
          websiteUrl: "",
          availability: "",
          nationality: form.countryCode,
        }),
      });

      const professionalPayload = await readJsonResponse<ApiErrorShape>(
        professionalResponse,
        isArabic
          ? "لم نتمكن من حفظ طلبك الآن. يرجى المحاولة مرة أخرى."
          : "We couldn't save your application right now. Please try again."
      );
      if (!professionalResponse.ok || !isApiSuccess(professionalPayload.payload)) {
        const nextFieldErrors = extractBackendFieldErrors(professionalPayload.payload);
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          setErrorSummary(
            isArabic ? "يرجى تصحيح الحقول المميزة أدناه." : "Please correct the highlighted fields below."
          );
          requestAnimationFrame(() => focusFirstInvalidField(nextFieldErrors));
        } else {
          setError(
            professionalPayload.payload?.message ??
              professionalPayload.payload?.error?.message ??
              professionalPayload.errorMessage ??
              (isArabic ? "تعذر حفظ الملف المهني." : "Unable to save professional profile.")
          );
        }
        return;
      }
      advanceProgress(isArabic ? "تم حفظ الملف المهني." : "Professional profile saved.");

      const alertsResponse = await fetch("/api/candidates/job-alert-preferences", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          desiredJobTitles: form.desiredPosition ? [form.desiredPosition] : [],
          relatedJobTitles: [],
          skills,
          experienceLevel: form.experienceLevel || null,
          industry: null,
          country: form.countryCode || null,
          city: form.city || null,
          workModePreference: "any",
          languages,
          availability: null,
          emailNotificationFrequency: form.jobAlertsEnabled ? "instant" : "disabled",
          notificationThreshold: 70,
          unsubscribed: !form.jobAlertsEnabled,
        }),
      });

      const alertsPayload = await readJsonResponse<ApiErrorShape>(
        alertsResponse,
        isArabic
          ? "لم نتمكن من حفظ طلبك الآن. يرجى المحاولة مرة أخرى."
          : "We couldn't save your application right now. Please try again."
      );
      if (!alertsResponse.ok || !isApiSuccess(alertsPayload.payload)) {
        const nextFieldErrors = extractBackendFieldErrors(alertsPayload.payload);
        if (Object.keys(nextFieldErrors).length > 0) {
          setFieldErrors(nextFieldErrors);
          setErrorSummary(
            isArabic ? "يرجى تصحيح الحقول المميزة أدناه." : "Please correct the highlighted fields below."
          );
          requestAnimationFrame(() => focusFirstInvalidField(nextFieldErrors));
        } else {
          setError(
            alertsPayload.payload?.message ??
              alertsPayload.payload?.error?.message ??
              alertsPayload.errorMessage ??
              (isArabic ? "تعذر حفظ إعدادات التنبيه." : "Unable to save job alert settings.")
          );
        }
        return;
      }
      advanceProgress(isArabic ? "تم حفظ تنبيهات الوظائف." : "Job alerts saved.");

      await loadCompletion();
      await loadVerificationTimeline();
      const completionResponse = await fetch("/api/candidates/profile-completion", { credentials: "include" });
      const completionPayload = await readJsonResponse<{ success?: boolean; data?: ProfileCompletion }>(
        completionResponse,
        isArabic ? "تعذر تحميل نسبة الاكتمال." : "Unable to load completion data."
      );
      const nextCompletion = completionPayload.payload?.data as ProfileCompletion | undefined;
      if (completionResponse.ok && isApiSuccess(completionPayload.payload as ApiErrorShape) && nextCompletion?.completed) {
        router.push("/candidate/dashboard");
        router.refresh();
      }
    } catch (caught) {
      const fallbackMessage = isArabic
        ? "لم نتمكن من حفظ طلبك الآن. يرجى المحاولة مرة أخرى."
        : "We couldn't save your application right now. Please try again.";

      const message =
        typeof caught === "object" && caught && "message" in caught && typeof caught.message === "string"
          ? caught.message
          : fallbackMessage;
      const nextFieldErrors =
        typeof caught === "object" && caught && "fieldErrors" in caught
          ? ((caught.fieldErrors as FieldErrors | undefined) ?? {})
          : {};

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        setErrorSummary(isArabic ? "يرجى تصحيح الحقول المميزة أدناه." : "Please correct the highlighted fields below.");
        requestAnimationFrame(() => focusFirstInvalidField(nextFieldErrors));
      } else {
        setError(message || fallbackMessage);
      }
    } finally {
      setSaving(false);
      setSubmitProgress(null);
    }
  }

  const latestCase = verificationTimeline?.cases?.[0] ?? null;

  function statusLabel(status: string) {
    if (status === "pending_manual_review") return tDoc("status.pendingManualReview");
    if (status === "verified" || status === "auto_approved") return tDoc("status.verified");
    if (status === "additional_evidence_requested") return tDoc("status.additionalEvidenceRequired");
    if (status === "replacement_requested") return tDoc("status.replacementRequired");
    if (status === "live_verification_required") return tDoc("status.liveVerificationRequired");
    if (status === "rejected") return tDoc("status.couldNotBeVerified");
    if (status === "superseded") return tDoc("status.replaced");
    if (status === "escalated") return tDoc("status.pendingManualReview");
    return tDoc("status.received");
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-8 text-sm text-text-secondary backdrop-blur-xl">
          {isArabic ? "جارٍ تحميل الإعداد الأولي..." : "Loading onboarding..."}
        </section>
      </main>
    );
  }

  if (!profile) {
    async function handleBlockedEmployerSignOut() {
      let csrf = "";
      try {
        const csrfResponse = await fetch("/api/security/csrf", { credentials: "include" });
        const csrfPayload = await csrfResponse.json().catch(() => null);
        csrf = typeof csrfPayload?.data?.csrfToken === "string" ? csrfPayload.data.csrfToken : "";
      } catch {
        csrf = "";
      }

      await fetch("/api/auth/logout", {
        method: "POST",
        headers: csrf ? { "x-csrf-token": csrf } : undefined,
        credentials: "include",
      }).catch(() => undefined);

      router.push(`/${locale}`);
      router.refresh();
    }

    return (
      <main className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <section className="rounded-3xl border border-blue-200/20 bg-[#081223]/82 p-8 backdrop-blur-xl">
          <h1 className="font-heading text-3xl text-text-primary">{isArabic ? "الدخول مطلوب" : "Sign in required"}</h1>
          <p className="mt-3 text-sm text-text-secondary">{error ?? (isArabic ? "يجب تسجيل الدخول أولاً للوصول إلى إعداد الملف الشخصي." : "You need to sign in before continuing to onboarding.")}</p>
          {isEmployerBlocked ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/employer")}
                className={primeButtonClasses("secondary")}
              >
                {isArabic ? "العودة إلى بوابة صاحب العمل" : "Return to Employer Portal"}
              </button>
              <button
                type="button"
                onClick={() => handleBlockedEmployerSignOut().catch(() => undefined)}
                className="inline-flex items-center justify-center rounded-full border border-white/30 px-5 py-3 text-sm font-semibold text-text-primary"
              >
                {isArabic ? "تسجيل الخروج" : "Sign out"}
              </button>
            </div>
          ) : (
            <Link href="/auth?mode=signin&role=candidate" className={`${primeButtonClasses("secondary")} mt-5`}>
              {isArabic ? "فتح تسجيل الدخول" : "Open sign in"}
            </Link>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-8 md:p-10">
        <PrimePageTitle>{isArabic ? "أكمل ملفك المهني" : "Complete your professional profile"}</PrimePageTitle>
        <p className="mt-3 text-sm leading-7 text-text-secondary">
          {isArabic
            ? "لا يمكن طلب أو دخول المقابلات قبل اكتمال الملف المهني. تظل الوثائق الأصلية خاصة ولا تُعرض مباشرة لأصحاب العمل."
            : "Interview actions stay blocked until your professional profile is complete. Original documents remain private and are never directly exposed to employers."}
        </p>

        {verificationNotice ? (
          <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-100/10 px-4 py-3 text-sm text-amber-100">
            {verificationNotice}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <h2 className="font-heading text-xl text-text-primary">{tDoc("panel.title")}</h2>
          <p className="mt-2 text-sm text-text-secondary">{tDoc("panel.subtitle")}</p>

          <div className="mt-3 rounded-xl border border-blue-200/20 bg-[#081223]/70 px-4 py-3 text-sm text-text-secondary">
            <p className="font-medium text-text-primary">{tDoc("panel.currentStatus")}</p>
            <p className="mt-1">{statusLabel(latestCase?.status ?? "pending_manual_review")}</p>
            {latestCase?.candidate_message ? <p className="mt-2 text-amber-100">{latestCase.candidate_message}</p> : null}
          </div>

          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            <p>{tDoc("panel.historyPreserved")}</p>
            <p>{tDoc("panel.uploadReplacement")}</p>
            <p>{tDoc("panel.submitAdditionalEvidence")}</p>
          </div>

          {verificationTimeline?.versions?.length ? (
            <div className="mt-4 space-y-2">
              {verificationTimeline.versions.slice(0, 5).map((version) => (
                <div key={version.id} className="rounded-xl border border-blue-200/20 bg-[#081223]/70 px-4 py-3 text-sm text-text-secondary">
                  <p className="font-medium text-text-primary">
                    {localizeDocumentType(version.document_type, uiLocale)} v{version.version_number}
                  </p>
                  <p>{statusLabel(version.verification_status)}</p>
                  {version.is_active ? <p className="text-emerald-200">{tDoc("status.verified")}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
          <p className="text-sm text-text-secondary">
            {isArabic ? "نسبة اكتمال الملف" : "Profile completion"}: <span className="font-semibold text-slate-100">{completion?.completionPercent ?? 0}%</span>
          </p>
          {missingLabels.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-amber-100">
              {missingLabels.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-emerald-200">{isArabic ? "ملفك مكتمل ويمكنك المتابعة إلى المقابلات." : "Your profile is complete and interview access is enabled."}</p>
          )}
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
          {errorSummary ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            >
              {errorSummary}
            </div>
          ) : null}

          {submitProgress ? (
            <div className="rounded-2xl border border-blue-300/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
              <p>{submitProgress.label}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-blue-950/60">
                <div
                  className="h-full bg-blue-300 transition-all duration-300"
                  style={{ width: `${Math.round((submitProgress.current / submitProgress.total) * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "الدولة" : "Country"}</span>
              <CountrySelector
                id="onboarding-country"
                locale={isArabic ? "ar" : "en"}
                value={form.countryCode}
                onChange={(countryCode) => {
                  setForm((prev) => ({ ...prev, countryCode }));
                  clearFieldError("countryCode");
                }}
                placeholder={isArabic ? "ابحث عن الدولة" : "Search country"}
                inputRef={setFieldRef("countryCode") as Ref<HTMLInputElement>}
                inputClassName={getInputErrorClass("countryCode")}
                ariaInvalid={Boolean(fieldErrors.countryCode)}
                ariaDescribedBy={fieldErrors.countryCode ? "onboarding-country-error" : undefined}
              />
              {fieldErrors.countryCode ? (
                <p id="onboarding-country-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.countryCode}
                </p>
              ) : null}
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "رقم الهاتف الدولي" : "International phone number"}</span>
              <InternationalPhoneInput
                selectId="onboarding-phone-country"
                inputId="onboarding-phone"
                locale={isArabic ? "ar" : "en"}
                countryCode={form.countryCode || "SA"}
                value={form.phoneRaw}
                onCountryCodeChange={(nextCode) => {
                  setForm((prev) => ({ ...prev, countryCode: nextCode }));
                  clearFieldError("countryCode");
                }}
                onChange={(phoneRaw, phoneE164) => {
                  setForm((prev) => ({ ...prev, phoneRaw, phoneE164 }));
                  clearFieldError("phoneE164");
                }}
                placeholder={isArabic ? "مثال: +966 5XXXXXXXX" : "Example: +966 5XXXXXXXX"}
                inputRef={setFieldRef("phoneE164") as Ref<HTMLInputElement>}
                inputClassName={getInputErrorClass("phoneE164")}
                selectClassName={getInputErrorClass("phoneE164")}
                ariaInvalid={Boolean(fieldErrors.phoneE164)}
                ariaDescribedBy={fieldErrors.phoneE164 ? "onboarding-phone-error" : undefined}
              />
              {fieldErrors.phoneE164 ? (
                <p id="onboarding-phone-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.phoneE164}
                </p>
              ) : null}
            </PrimeLabel>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المدينة" : "City"}</span>
              <PrimeInput
                id="onboarding-city"
                ref={setFieldRef("city") as Ref<HTMLInputElement>}
                className={getInputErrorClass("city")}
                aria-invalid={Boolean(fieldErrors.city)}
                aria-describedby={fieldErrors.city ? "onboarding-city-error" : undefined}
                value={form.city}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, city: event.target.value }));
                  clearFieldError("city");
                }}
              />
              {fieldErrors.city ? (
                <p id="onboarding-city-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.city}
                </p>
              ) : null}
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المنصب المطلوب" : "Desired position"}</span>
              <PrimeInput
                id="onboarding-desired-position"
                ref={setFieldRef("desiredPosition") as Ref<HTMLInputElement>}
                required
                className={getInputErrorClass("desiredPosition")}
                aria-invalid={Boolean(fieldErrors.desiredPosition)}
                aria-describedby={fieldErrors.desiredPosition ? "onboarding-desired-position-error" : undefined}
                value={form.desiredPosition}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, desiredPosition: event.target.value }));
                  clearFieldError("desiredPosition");
                }}
              />
              {fieldErrors.desiredPosition ? (
                <p id="onboarding-desired-position-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.desiredPosition}
                </p>
              ) : null}
            </PrimeLabel>
          </div>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "الخبرة العملية" : "Work experience"}</span>
            <PrimeInput
              id="onboarding-experience"
              ref={setFieldRef("experienceLevel") as Ref<HTMLInputElement>}
              className={getInputErrorClass("experienceLevel")}
              aria-invalid={Boolean(fieldErrors.experienceLevel)}
              aria-describedby={fieldErrors.experienceLevel ? "onboarding-experience-error" : undefined}
              value={form.experienceLevel}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, experienceLevel: event.target.value }));
                clearFieldError("experienceLevel");
              }}
            />
            {fieldErrors.experienceLevel ? (
              <p id="onboarding-experience-error" className="mt-2 text-xs text-red-300">
                {fieldErrors.experienceLevel}
              </p>
            ) : null}
          </PrimeLabel>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "الملخص المهني" : "Professional summary"}</span>
            <PrimeTextarea
              id="onboarding-summary"
              ref={setFieldRef("shortBio") as Ref<HTMLTextAreaElement>}
              rows={5}
              className={getInputErrorClass("shortBio")}
              aria-invalid={Boolean(fieldErrors.shortBio)}
              aria-describedby={fieldErrors.shortBio ? "onboarding-summary-error" : undefined}
              value={form.shortBio}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, shortBio: event.target.value }));
                clearFieldError("shortBio");
              }}
            />
            {fieldErrors.shortBio ? (
              <p id="onboarding-summary-error" className="mt-2 text-xs text-red-300">
                {fieldErrors.shortBio}
              </p>
            ) : null}
          </PrimeLabel>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "المهارات" : "Skills"}</span>
              <PrimeInput
                id="onboarding-skills"
                ref={setFieldRef("skills") as Ref<HTMLInputElement>}
                className={getInputErrorClass("skills")}
                aria-invalid={Boolean(fieldErrors.skills)}
                aria-describedby={fieldErrors.skills ? "onboarding-skills-error" : undefined}
                value={form.skills}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, skills: event.target.value }));
                  clearFieldError("skills");
                }}
                placeholder={isArabic ? "مفصولة بفواصل" : "Comma separated"}
              />
              {fieldErrors.skills ? (
                <p id="onboarding-skills-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.skills}
                </p>
              ) : null}
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "اللغات" : "Languages"}</span>
              <PrimeInput
                id="onboarding-languages"
                ref={setFieldRef("languages") as Ref<HTMLInputElement>}
                className={getInputErrorClass("languages")}
                aria-invalid={Boolean(fieldErrors.languages)}
                aria-describedby={fieldErrors.languages ? "onboarding-languages-error" : undefined}
                value={form.languages}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, languages: event.target.value }));
                  clearFieldError("languages");
                }}
                placeholder={isArabic ? "مثال: العربية, الإنجليزية" : "Example: Arabic, English"}
              />
              {fieldErrors.languages ? (
                <p id="onboarding-languages-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.languages}
                </p>
              ) : null}
            </PrimeLabel>
          </div>

          <PrimeLabel>
            <span className="mb-2 block">{isArabic ? "بيانات التعليم" : "Education"}</span>
            <PrimeInput
              id="onboarding-education"
              ref={setFieldRef("education") as Ref<HTMLInputElement>}
              className={getInputErrorClass("education")}
              aria-invalid={Boolean(fieldErrors.education)}
              aria-describedby={fieldErrors.education ? "onboarding-education-error" : undefined}
              value={form.education}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, education: event.target.value }));
                clearFieldError("education");
              }}
              placeholder={isArabic ? "مثال: بكالوريوس 2020" : "Example: Bachelor 2020"}
            />
            {fieldErrors.education ? (
              <p id="onboarding-education-error" className="mt-2 text-xs text-red-300">
                {fieldErrors.education}
              </p>
            ) : null}
          </PrimeLabel>

          <div className="grid gap-5 sm:grid-cols-2">
            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "تحميل السيرة الذاتية" : "Upload CV"}</span>
              <LocalizedFileInput
                isArabic={isArabic}
                id="onboarding-cv"
                accept=".pdf,.doc,.docx"
                selectedFiles={cvFile ? [cvFile] : []}
                inputRef={setFieldRef("cv") as (element: HTMLInputElement | null) => void}
                className={getInputErrorClass("cv")}
                ariaInvalid={Boolean(fieldErrors.cv)}
                ariaDescribedBy={fieldErrors.cv ? "onboarding-cv-error" : undefined}
                singleLabel={{ en: "Choose CV file", ar: "اختيار ملف السيرة الذاتية" }}
                onChange={(files) => {
                  setCvFile(files[0] ?? null);
                  clearFieldError("cv");
                }}
              />
              {fieldErrors.cv ? (
                <p id="onboarding-cv-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.cv}
                </p>
              ) : null}
            </PrimeLabel>

            <PrimeLabel>
              <span className="mb-2 block">{isArabic ? "تحميل الشهادات/الدبلومات" : "Upload diplomas/certificates"}</span>
              <LocalizedFileInput
                isArabic={isArabic}
                id="onboarding-certificates"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                selectedFiles={supportingFiles}
                inputRef={setFieldRef("supportingFiles") as (element: HTMLInputElement | null) => void}
                className={getInputErrorClass("supportingFiles")}
                ariaInvalid={Boolean(fieldErrors.supportingFiles)}
                ariaDescribedBy={fieldErrors.supportingFiles ? "onboarding-certificates-error" : undefined}
                multiLabel={{ en: "Choose certificate files", ar: "اختيار ملفات الشهادات" }}
                onChange={(files) => {
                  setSupportingFiles(files);
                  clearFieldError("supportingFiles");
                }}
              />
              {fieldErrors.supportingFiles ? (
                <p id="onboarding-certificates-error" className="mt-2 text-xs text-red-300">
                  {fieldErrors.supportingFiles}
                </p>
              ) : null}
            </PrimeLabel>
          </div>

          <label className="flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#071428]/75 px-4 py-3 text-sm text-text-secondary">
            <PrimeCheckbox type="checkbox" checked={form.jobAlertsEnabled} onChange={(event) => setForm((prev) => ({ ...prev, jobAlertsEnabled: event.target.checked }))} />
            <span>{isArabic ? "تفعيل تنبيهات الوظائف المناسبة لملفي." : "Enable matching job alerts."}</span>
          </label>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button type="submit" disabled={saving || !csrfToken} className={primeButtonClasses("primary")}>
            {saving ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : isArabic ? "حفظ ومتابعة" : "Save and continue"}
          </button>
        </form>
      </PrimeCard>
    </main>
  );
}
