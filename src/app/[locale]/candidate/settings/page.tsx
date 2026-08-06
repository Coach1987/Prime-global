"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import { PrimeCheckbox, PrimeInput, PrimeLabel, PrimeTextarea } from "@/components/ui/prime/PrimeInput";
import { PrimePageTitle } from "@/components/ui/prime/PrimePageTitle";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { InternationalPhoneInput } from "@/components/ui/InternationalPhoneInput";
import { LocalizedFileInput } from "@/components/ui/LocalizedFileInput";
import { asCandidateLocale, localizeCandidateStatus } from "@/lib/candidates/localization";

type CandidateProfile = {
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  city?: string | null;
  professional_title?: string | null;
  bio?: string | null;
};

type ProfessionalProfile = {
  headline?: string | null;
  biography?: string | null;
  experiences?: Array<Record<string, unknown>>;
  education_entries?: Array<Record<string, unknown>>;
  skills?: string[];
  languages?: string[];
};

type ResumeRow = {
  id: string;
  filename: string;
  is_primary: boolean;
  created_at: string;
};

type DocumentVersionRow = {
  id: string;
  original_filename: string;
  document_type: string;
  verification_status: string;
  version_number: number;
  is_active: boolean;
  created_at: string;
};

type SettingsField =
  | "firstName"
  | "lastName"
  | "phone"
  | "country"
  | "city"
  | "professionalTitle"
  | "summary"
  | "skills"
  | "workExperience"
  | "education"
  | "languages"
  | "cv"
  | "certificates"
  | "profilePhoto"
  | "profilePhotoVisibility";

type FieldErrors = Partial<Record<SettingsField, string>>;

type ApiPayload = {
  ok?: boolean;
  success?: boolean;
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  error?: { code?: string; message?: string };
  data?: unknown;
  documentVersions?: DocumentVersionRow[];
};

type PhotoVisibility = "private" | "employer_profile";

const CV_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const CERT_ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const CV_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const CERT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const PHOTO_MAX_SIZE_BYTES = 3 * 1024 * 1024;
const PHOTO_ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

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

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function baseName(pathValue: string) {
  const parts = pathValue.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? pathValue;
}

export default function CandidateSettingsPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const uiLocale = asCandidateLocale(locale);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [email, setEmail] = useState("");
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [resumeVersions, setResumeVersions] = useState<DocumentVersionRow[]>([]);
  const [certificateVersions, setCertificateVersions] = useState<DocumentVersionRow[]>([]);
  const [privateDocumentPaths, setPrivateDocumentPaths] = useState<string[]>([]);

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [certificateFiles, setCertificateFiles] = useState<File[]>([]);
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [hasProfilePhoto, setHasProfilePhoto] = useState(false);
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState<PhotoVisibility>("private");
  const [profilePhotoVersion, setProfilePhotoVersion] = useState(0);
  const [photoRemoveRequested, setPhotoRemoveRequested] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneRaw: "",
    phoneE164: "",
    countryCode: "",
    city: "",
    professionalTitle: "",
    summary: "",
    skills: "",
    workExperience: "",
    education: "",
    languages: "",
  });

  const currentCv = useMemo(() => {
    const primary = resumes.find((item) => item.is_primary);
    return primary ?? resumes[0] ?? null;
  }, [resumes]);

  const currentCvVersion = useMemo(() => {
    return resumeVersions[0] ?? null;
  }, [resumeVersions]);

  const shownCertificateItems = useMemo(() => {
    if (certificateVersions.length > 0) {
      return certificateVersions.map((item) => ({
        id: item.id,
        name: item.original_filename,
        status: item.verification_status,
      }));
    }

    return privateDocumentPaths.map((pathValue) => ({
      id: pathValue,
      name: baseName(pathValue),
      status: "pending_verification",
    }));
  }, [certificateVersions, privateDocumentPaths]);

  useEffect(() => {
    async function bootstrap() {
      const authFallback = isArabic
        ? "تعذر التحقق من الجلسة."
        : "Unable to verify your session.";
      try {
        const csrfResponse = await fetch("/api/security/csrf", { credentials: "include" });
        const csrfPayload = await readJsonResponse<{ data?: { csrfToken?: string } }>(csrfResponse, "");
        setCsrfToken(csrfPayload.payload?.data?.csrfToken ?? "");

        const authResponse = await fetch("/api/auth/me", { credentials: "include" });
        const authPayload = await readJsonResponse<ApiPayload & { data?: { role?: string } }>(authResponse, authFallback);

        if (!authResponse.ok || !isApiSuccess(authPayload.payload) || authPayload.payload?.data?.role !== "candidate") {
          router.replace("/auth?mode=signin&audience=candidate");
          return;
        }

        const [profileRes, professionalRes, resumesRes, privateDocsRes, photoRes] = await Promise.all([
          fetch("/api/candidates/profile", { credentials: "include" }),
          fetch("/api/candidates/professional-profile", { credentials: "include" }),
          fetch("/api/candidates/resumes", { credentials: "include" }),
          fetch("/api/candidates/private-documents", { credentials: "include" }),
          fetch("/api/candidates/profile-photo", { credentials: "include" }),
        ]);

        const [profilePayload, professionalPayload, resumesPayload, privateDocsPayload, photoPayload] = await Promise.all([
          readJsonResponse<ApiPayload & { data?: CandidateProfile | null }>(
            profileRes,
            isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account details."
          ),
          readJsonResponse<ApiPayload & { data?: ProfessionalProfile | null }>(
            professionalRes,
            isArabic ? "تعذر تحميل الملف المهني." : "Unable to load professional profile."
          ),
          readJsonResponse<ApiPayload & { data?: ResumeRow[] }>(
            resumesRes,
            isArabic ? "تعذر تحميل السيرة الذاتية." : "Unable to load current CV."
          ),
          readJsonResponse<ApiPayload & { data?: string[] }>(
            privateDocsRes,
            isArabic ? "تعذر تحميل الشهادات." : "Unable to load certificates."
          ),
          readJsonResponse<ApiPayload & { data?: { hasPhoto?: boolean; photoVisibility?: PhotoVisibility | null } }>(
            photoRes,
            isArabic ? "تعذر تحميل صورة الملف الشخصي." : "Unable to load profile photo."
          ),
        ]);

        if (!profileRes.ok || !isApiSuccess(profilePayload.payload)) {
          setError(profilePayload.errorMessage ?? (isArabic ? "تعذر تحميل بيانات الحساب." : "Unable to load account details."));
          return;
        }

        const nextProfile = (profilePayload.payload?.data ?? null) as CandidateProfile | null;
        const nextProfessional = (professionalPayload.payload?.data ?? null) as ProfessionalProfile | null;

        const nameParts = splitName(String(nextProfile?.full_name ?? ""));
        setProfile(nextProfile);
        setEmail(String(nextProfile?.email ?? ""));
        setForm({
          firstName: nameParts.firstName,
          lastName: nameParts.lastName,
          phoneRaw: String(nextProfile?.phone_number ?? ""),
          phoneE164: String(nextProfile?.phone_number ?? ""),
          countryCode: String(nextProfile?.country ?? ""),
          city: String(nextProfile?.city ?? ""),
          professionalTitle: String(nextProfile?.professional_title ?? nextProfessional?.headline ?? ""),
          summary: String(nextProfile?.bio ?? nextProfessional?.biography ?? ""),
          skills: Array.isArray(nextProfessional?.skills) ? nextProfessional.skills.join(", ") : "",
          workExperience:
            Array.isArray(nextProfessional?.experiences) && nextProfessional.experiences.length > 0
              ? String((nextProfessional.experiences[0]?.summary ?? ""))
              : "",
          education:
            Array.isArray(nextProfessional?.education_entries) && nextProfessional.education_entries.length > 0
              ? String(nextProfessional.education_entries[0]?.degree ?? "")
              : "",
          languages: Array.isArray(nextProfessional?.languages) ? nextProfessional.languages.join(", ") : "",
        });

        if (resumesRes.ok && isApiSuccess(resumesPayload.payload)) {
          setResumes(Array.isArray(resumesPayload.payload?.data) ? resumesPayload.payload.data : []);
          setResumeVersions(Array.isArray(resumesPayload.payload?.documentVersions) ? resumesPayload.payload.documentVersions : []);
        }

        if (privateDocsRes.ok && isApiSuccess(privateDocsPayload.payload)) {
          setPrivateDocumentPaths(Array.isArray(privateDocsPayload.payload?.data) ? privateDocsPayload.payload.data : []);
          setCertificateVersions(Array.isArray(privateDocsPayload.payload?.documentVersions) ? privateDocsPayload.payload.documentVersions : []);
        }

        if (photoRes.ok && isApiSuccess(photoPayload.payload)) {
          setHasProfilePhoto(Boolean(photoPayload.payload?.data?.hasPhoto));
          setProfilePhotoVisibility(photoPayload.payload?.data?.photoVisibility === "employer_profile" ? "employer_profile" : "private");
          setProfilePhotoVersion((prev) => prev + 1);
        }
      } catch {
        setError(authFallback);
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [isArabic, router]);

  function setFieldError(field: SettingsField, message: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: message }));
  }

  function clearFieldError(field: SettingsField) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validateForm() {
    const nextErrors: FieldErrors = {};

    if (!form.firstName.trim()) nextErrors.firstName = isArabic ? "الاسم الأول مطلوب." : "First name is required.";
    if (!form.lastName.trim()) nextErrors.lastName = isArabic ? "اسم العائلة مطلوب." : "Last name is required.";
    if (!form.countryCode.trim()) nextErrors.country = isArabic ? "يرجى اختيار الدولة." : "Please select a country.";
    if (!form.city.trim()) nextErrors.city = isArabic ? "المدينة مطلوبة." : "City is required.";
    if (!form.professionalTitle.trim()) {
      nextErrors.professionalTitle = isArabic ? "المسمى الوظيفي مطلوب." : "Professional title is required.";
    }
    if (!form.summary.trim()) nextErrors.summary = isArabic ? "الملخص المهني مطلوب." : "Professional summary is required.";
    if (!form.skills.trim()) nextErrors.skills = isArabic ? "يرجى إدخال المهارات." : "Skills are required.";
    if (!form.workExperience.trim()) {
      nextErrors.workExperience = isArabic ? "يرجى إدخال الخبرة العملية." : "Work experience is required.";
    }
    if (!form.education.trim()) nextErrors.education = isArabic ? "يرجى إدخال التعليم." : "Education is required.";
    if (!form.languages.trim()) nextErrors.languages = isArabic ? "يرجى إدخال اللغات." : "Languages are required.";

    if (!form.phoneE164.trim()) {
      nextErrors.phone = isArabic ? "رقم الهاتف مطلوب." : "Phone number is required.";
    } else if (!/^\+[1-9]\d{5,15}$/.test(form.phoneE164.trim())) {
      nextErrors.phone =
        isArabic ? "صيغة رقم الهاتف غير صالحة. استخدم الصيغة الدولية." : "Invalid phone format. Use international format.";
    }

    if (cvFile) {
      if (!CV_ALLOWED_TYPES.has(cvFile.type)) {
        nextErrors.cv =
          isArabic ? "صيغة السيرة الذاتية غير مدعومة (PDF أو DOC أو DOCX)." : "The CV must be a PDF, DOC, or DOCX file.";
      } else if (cvFile.size > CV_MAX_SIZE_BYTES) {
        nextErrors.cv = isArabic ? "حجم ملف السيرة الذاتية كبير جدًا." : "The CV file is too large.";
      }
    }

    if (certificateFiles.some((file) => !CERT_ALLOWED_TYPES.has(file.type))) {
      nextErrors.certificates =
        isArabic ? "صيغة إحدى الشهادات غير مدعومة." : "This certificate format is not supported.";
    } else if (certificateFiles.some((file) => file.size > CERT_MAX_SIZE_BYTES)) {
      nextErrors.certificates =
        isArabic ? "حجم إحدى الشهادات كبير جدًا." : "One of the uploaded certificates is too large.";
    }

    if (profilePhotoFile) {
      if (!PHOTO_ALLOWED_TYPES.has(profilePhotoFile.type)) {
        nextErrors.profilePhoto =
          isArabic ? "صيغة الصورة غير مدعومة (JPEG أو PNG أو WebP)." : "Photo must be JPEG, PNG, or WebP.";
      } else if (profilePhotoFile.size > PHOTO_MAX_SIZE_BYTES) {
        nextErrors.profilePhoto = isArabic ? "حجم الصورة كبير جدًا." : "Photo size must be 3MB or less.";
      }
    }

    return nextErrors;
  }

  async function reloadDocuments() {
    const [resumesRes, privateDocsRes] = await Promise.all([
      fetch("/api/candidates/resumes", { credentials: "include" }),
      fetch("/api/candidates/private-documents", { credentials: "include" }),
    ]);

    const [resumesPayload, privateDocsPayload] = await Promise.all([
      readJsonResponse<ApiPayload & { data?: ResumeRow[] }>(
        resumesRes,
        isArabic ? "تعذر تحميل السيرة الذاتية." : "Unable to load current CV."
      ),
      readJsonResponse<ApiPayload & { data?: string[] }>(
        privateDocsRes,
        isArabic ? "تعذر تحميل الشهادات." : "Unable to load certificates."
      ),
    ]);

    if (resumesRes.ok && isApiSuccess(resumesPayload.payload)) {
      setResumes(Array.isArray(resumesPayload.payload?.data) ? resumesPayload.payload.data : []);
      setResumeVersions(Array.isArray(resumesPayload.payload?.documentVersions) ? resumesPayload.payload.documentVersions : []);
    }

    if (privateDocsRes.ok && isApiSuccess(privateDocsPayload.payload)) {
      setPrivateDocumentPaths(Array.isArray(privateDocsPayload.payload?.data) ? privateDocsPayload.payload.data : []);
      setCertificateVersions(Array.isArray(privateDocsPayload.payload?.documentVersions) ? privateDocsPayload.payload.documentVersions : []);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;

    setError(null);
    setSuccess(null);
    setFieldErrors({});

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);

    const skills = form.skills
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const languages = form.languages
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    try {
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();

      const profileResponse = await fetch("/api/candidates/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber: form.phoneE164.trim(),
          country: form.countryCode.trim(),
          city: form.city.trim(),
          professionalTitle: form.professionalTitle.trim(),
          bio: form.summary.trim(),
        }),
      });

      const profilePayload = await readJsonResponse<ApiPayload>(
        profileResponse,
        isArabic ? "تعذر حفظ بيانات الحساب." : "Unable to save account details."
      );

      if (!profileResponse.ok || !isApiSuccess(profilePayload.payload)) {
        const fieldErrors = profilePayload.payload?.fieldErrors ?? {};
        if (fieldErrors.phoneE164 || fieldErrors.phoneNumber) {
          setFieldError("phone", fieldErrors.phoneE164 ?? fieldErrors.phoneNumber ?? "");
        }
        if (fieldErrors.countryCode || fieldErrors.country) {
          setFieldError("country", fieldErrors.countryCode ?? fieldErrors.country ?? "");
        }
        if (fieldErrors.city) {
          setFieldError("city", fieldErrors.city);
        }

        setError(
          profilePayload.payload?.message ??
            profilePayload.payload?.error?.message ??
            profilePayload.errorMessage ??
            (isArabic ? "تعذر حفظ بيانات الحساب." : "Unable to save account details.")
        );
        return;
      }

      const professionalResponse = await fetch("/api/candidates/professional-profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          headline: form.professionalTitle.trim(),
          biography: form.summary.trim(),
          experiences: [
            {
              company: isArabic ? "مقدم من المرشح" : "Provided by candidate",
              role: form.professionalTitle.trim(),
              startDate: "2020",
              summary: form.workExperience.trim(),
            },
          ],
          educationEntries: [
            {
              institution: isArabic ? "مقدم من المرشح" : "Provided by candidate",
              degree: form.education.trim(),
              year: "2020",
            },
          ],
          certificates: [],
          skills,
          languages,
          portfolioUrl: "",
          linkedInUrl: "",
          websiteUrl: "",
          availability: "",
          nationality: form.countryCode.trim(),
        }),
      });

      const professionalPayload = await readJsonResponse<ApiPayload>(
        professionalResponse,
        isArabic ? "تعذر حفظ الملف المهني." : "Unable to save professional profile."
      );

      if (!professionalResponse.ok || !isApiSuccess(professionalPayload.payload)) {
        const fieldErrors = professionalPayload.payload?.fieldErrors ?? {};
        if (fieldErrors.desiredPosition) setFieldError("professionalTitle", fieldErrors.desiredPosition);
        if (fieldErrors.shortBio) setFieldError("summary", fieldErrors.shortBio);
        if (fieldErrors.skills) setFieldError("skills", fieldErrors.skills);
        if (fieldErrors.experienceLevel) setFieldError("workExperience", fieldErrors.experienceLevel);
        if (fieldErrors.education) setFieldError("education", fieldErrors.education);
        if (fieldErrors.languages) setFieldError("languages", fieldErrors.languages);

        setError(
          professionalPayload.payload?.message ??
            professionalPayload.payload?.error?.message ??
            professionalPayload.errorMessage ??
            (isArabic ? "تعذر حفظ الملف المهني." : "Unable to save professional profile.")
        );
        return;
      }

      if (cvFile) {
        const cvData = new FormData();
        cvData.append("file", cvFile);

        const cvResponse = await fetch("/api/candidates/resumes", {
          method: "POST",
          credentials: "include",
          headers: {
            "x-csrf-token": csrfToken,
          },
          body: cvData,
        });

        const cvPayload = await readJsonResponse<ApiPayload>(
          cvResponse,
          isArabic ? "تعذر رفع السيرة الذاتية." : "Unable to upload your CV."
        );

        if (!cvResponse.ok || !isApiSuccess(cvPayload.payload)) {
          const cvError = cvPayload.payload?.fieldErrors?.cv;
          if (cvError) setFieldError("cv", cvError);
          setError(
            cvPayload.payload?.message ??
              cvPayload.payload?.error?.message ??
              cvPayload.errorMessage ??
              (isArabic ? "تعذر رفع السيرة الذاتية." : "Unable to upload your CV.")
          );
          return;
        }
      }

      if (certificateFiles.length > 0) {
        const certData = new FormData();
        certificateFiles.forEach((file) => certData.append("files", file));

        const certResponse = await fetch("/api/candidates/private-documents", {
          method: "POST",
          credentials: "include",
          headers: {
            "x-csrf-token": csrfToken,
          },
          body: certData,
        });

        const certPayload = await readJsonResponse<ApiPayload>(
          certResponse,
          isArabic ? "تعذر رفع الشهادات." : "Unable to upload certificates."
        );

        if (!certResponse.ok || !isApiSuccess(certPayload.payload)) {
          const certError = certPayload.payload?.fieldErrors?.supportingFiles;
          if (certError) setFieldError("certificates", certError);
          setError(
            certPayload.payload?.message ??
              certPayload.payload?.error?.message ??
              certPayload.errorMessage ??
              (isArabic ? "تعذر رفع الشهادات." : "Unable to upload certificates.")
          );
          return;
        }
      }

      if (photoRemoveRequested) {
        const removePhotoResponse = await fetch("/api/candidates/profile-photo", {
          method: "DELETE",
          credentials: "include",
          headers: {
            "x-csrf-token": csrfToken,
          },
        });

        const removePhotoPayload = await readJsonResponse<ApiPayload>(
          removePhotoResponse,
          isArabic ? "تعذر حذف صورة الملف الشخصي." : "Unable to remove profile photo."
        );

        if (!removePhotoResponse.ok || !isApiSuccess(removePhotoPayload.payload)) {
          setFieldError(
            "profilePhoto",
            removePhotoPayload.payload?.fieldErrors?.profilePhoto ??
              removePhotoPayload.payload?.message ??
              removePhotoPayload.errorMessage ??
              (isArabic ? "تعذر حذف صورة الملف الشخصي." : "Unable to remove profile photo.")
          );
          return;
        }
      }

      if (profilePhotoFile) {
        const photoData = new FormData();
        photoData.append("photo", profilePhotoFile);
        photoData.append("visibility", profilePhotoVisibility);

        const profilePhotoResponse = await fetch("/api/candidates/profile-photo", {
          method: "POST",
          credentials: "include",
          headers: {
            "x-csrf-token": csrfToken,
          },
          body: photoData,
        });

        const profilePhotoPayload = await readJsonResponse<ApiPayload>(
          profilePhotoResponse,
          isArabic ? "تعذر رفع صورة الملف الشخصي." : "Unable to upload profile photo."
        );

        if (!profilePhotoResponse.ok || !isApiSuccess(profilePhotoPayload.payload)) {
          setFieldError(
            "profilePhoto",
            profilePhotoPayload.payload?.fieldErrors?.profilePhoto ??
              profilePhotoPayload.payload?.message ??
              profilePhotoPayload.errorMessage ??
              (isArabic ? "تعذر رفع صورة الملف الشخصي." : "Unable to upload profile photo.")
          );
          return;
        }
      }

      if (hasProfilePhoto || profilePhotoFile) {
        const visibilityResponse = await fetch("/api/candidates/profile-photo", {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ visibility: profilePhotoVisibility }),
        });

        const visibilityPayload = await readJsonResponse<ApiPayload>(
          visibilityResponse,
          isArabic ? "تعذر تحديث خصوصية الصورة." : "Unable to update photo visibility."
        );

        if (!visibilityResponse.ok || !isApiSuccess(visibilityPayload.payload)) {
          setFieldError(
            "profilePhotoVisibility",
            visibilityPayload.payload?.fieldErrors?.profilePhotoVisibility ??
              visibilityPayload.payload?.message ??
              visibilityPayload.errorMessage ??
              (isArabic ? "تعذر تحديث خصوصية الصورة." : "Unable to update photo visibility.")
          );
          return;
        }
      }

      await Promise.all([reloadDocuments(), fetch("/api/candidates/profile-photo", { credentials: "include" })
        .then((res) => readJsonResponse<ApiPayload & { data?: { hasPhoto?: boolean; photoVisibility?: PhotoVisibility | null } }>(
          res,
          isArabic ? "تعذر تحميل صورة الملف الشخصي." : "Unable to load profile photo."
        ))
        .then(({ payload }) => {
          if (!isApiSuccess(payload)) return;
          setHasProfilePhoto(Boolean(payload?.data?.hasPhoto));
          setProfilePhotoVisibility(payload?.data?.photoVisibility === "employer_profile" ? "employer_profile" : "private");
          setProfilePhotoVersion((prev) => prev + 1);
        })]);
      setCvFile(null);
      setCertificateFiles([]);
      setProfilePhotoFile(null);
      setPhotoRemoveRequested(false);
      setSuccess(isArabic ? "تم حفظ إعدادات الحساب بنجاح." : "Settings saved successfully.");
    } catch {
      setError(
        isArabic
          ? "تعذر حفظ الإعدادات الآن. يرجى المحاولة مرة أخرى."
          : "We couldn't save your settings right now. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <p className="text-sm text-text-secondary">{isArabic ? "جارٍ تحميل الإعدادات..." : "Loading settings..."}</p>
        </PrimeCard>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
        <PrimeCard as="section" className="p-7 md:p-10">
          <p className="text-sm text-red-300">
            {error ?? (isArabic ? "تعذر تحميل إعدادات المرشح." : "Unable to load candidate settings.")}
          </p>
          <Link href="/auth?mode=signin&audience=candidate" className={`${primeButtonClasses("secondary")} mt-4`}>
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </Link>
        </PrimeCard>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard as="section" className="p-7 md:p-10">
        <PrimePageTitle>{isArabic ? "إعدادات الحساب" : "Candidate Settings"}</PrimePageTitle>
        <p className="mt-3 text-sm text-text-secondary">
          {isArabic
            ? "حدّث بياناتك الشخصية والمهنية وأدر السيرة الذاتية والوثائق من مكان واحد."
            : "Edit your account, professional profile, CV, and documents from one place."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/candidate/profile" className={primeButtonClasses("secondary")}>
            {isArabic ? "الملف المهني" : "Career Profile"}
          </Link>
          <Link href="/candidate/onboarding" className={primeButtonClasses("secondary")}>
            {isArabic ? "تعديل الملف" : "Edit Profile"}
          </Link>
          <Link href="/candidate/documents" className={primeButtonClasses("secondary")}>
            {isArabic ? "مركز الوثائق" : "Document Center"}
          </Link>
        </div>

        <form className="mt-8 space-y-7" onSubmit={onSubmit} noValidate>
          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "صورة الملف الشخصي" : "Profile Photo"}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              {isArabic
                ? "الصورة اختيارية بالكامل ولا تؤثر على اكتمال الملف أو المطابقة أو التقييم."
                : "Photo is optional and does not affect profile completion, matching, or scoring."}
            </p>

            <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-start">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-blue-200/20 bg-[#0d1d38]">
                {hasProfilePhoto && !photoRemoveRequested ? (
                  <img
                    src={`/api/candidates/profile-photo/content?v=${profilePhotoVersion}`}
                    alt={isArabic ? "صورة المرشح" : "Candidate profile photo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-text-tertiary">
                    {form.firstName.trim().charAt(0).toUpperCase() || "C"}
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-4">
                <PrimeLabel>
                  <span className="mb-2 block">{isArabic ? "رفع أو استبدال الصورة" : "Upload or Replace Photo"}</span>
                  <LocalizedFileInput
                    isArabic={isArabic}
                    accept="image/png,image/jpeg,image/webp"
                    selectedFiles={profilePhotoFile ? [profilePhotoFile] : []}
                    singleLabel={{ en: "Choose profile photo", ar: "اختيار صورة الملف" }}
                    ariaInvalid={Boolean(fieldErrors.profilePhoto)}
                    ariaDescribedBy={fieldErrors.profilePhoto ? "settings-profile-photo-error" : undefined}
                    onChange={(files) => {
                      setProfilePhotoFile(files[0] ?? null);
                      setPhotoRemoveRequested(false);
                      clearFieldError("profilePhoto");
                    }}
                  />
                  {fieldErrors.profilePhoto ? (
                    <p id="settings-profile-photo-error" className="mt-2 text-xs text-red-300">{fieldErrors.profilePhoto}</p>
                  ) : null}
                </PrimeLabel>

                <PrimeLabel>
                  <span className="mb-2 block">{isArabic ? "خصوصية الصورة" : "Photo Visibility"}</span>
                  <select
                    value={profilePhotoVisibility}
                    className="w-full rounded-xl border border-blue-200/20 bg-[#061123] px-3 py-2 text-sm text-text-primary"
                    onChange={(event) => {
                      setProfilePhotoVisibility(event.target.value === "employer_profile" ? "employer_profile" : "private");
                      clearFieldError("profilePhotoVisibility");
                    }}
                  >
                    <option value="private">{isArabic ? "خاص (مرئي لك ولفريق Prime Global فقط)" : "Private (you and Prime Global staff only)"}</option>
                    <option value="employer_profile">
                      {isArabic ? "ملف صاحب العمل (بعد تقديمك بشكل مصرح فقط)" : "Employer profile (after authorized presentation only)"}
                    </option>
                  </select>
                  {fieldErrors.profilePhotoVisibility ? (
                    <p className="mt-2 text-xs text-red-300">{fieldErrors.profilePhotoVisibility}</p>
                  ) : null}
                </PrimeLabel>

                {(hasProfilePhoto || profilePhotoFile) && !photoRemoveRequested ? (
                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => {
                      setPhotoRemoveRequested(true);
                      setProfilePhotoFile(null);
                      clearFieldError("profilePhoto");
                    }}
                  >
                    {isArabic ? "إزالة الصورة عند الحفظ" : "Remove Photo On Save"}
                  </button>
                ) : null}

                {photoRemoveRequested ? (
                  <p className="text-xs text-text-secondary">{isArabic ? "سيتم حذف الصورة عند حفظ الإعدادات." : "Photo will be removed when settings are saved."}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "المعلومات الشخصية" : "Personal Information"}</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "الاسم الأول" : "First name"}</span>
                <PrimeInput
                  value={form.firstName}
                  className={fieldErrors.firstName ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={fieldErrors.firstName ? "settings-first-name-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, firstName: event.target.value }));
                    clearFieldError("firstName");
                  }}
                />
                {fieldErrors.firstName ? (
                  <p id="settings-first-name-error" className="mt-2 text-xs text-red-300">{fieldErrors.firstName}</p>
                ) : null}
              </PrimeLabel>

              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "اسم العائلة" : "Last name"}</span>
                <PrimeInput
                  value={form.lastName}
                  className={fieldErrors.lastName ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={fieldErrors.lastName ? "settings-last-name-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, lastName: event.target.value }));
                    clearFieldError("lastName");
                  }}
                />
                {fieldErrors.lastName ? (
                  <p id="settings-last-name-error" className="mt-2 text-xs text-red-300">{fieldErrors.lastName}</p>
                ) : null}
              </PrimeLabel>
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "رقم الهاتف" : "Phone number"}</span>
                <InternationalPhoneInput
                  locale={isArabic ? "ar" : "en"}
                  countryCode={form.countryCode || "SA"}
                  value={form.phoneRaw}
                  onCountryCodeChange={(nextCode) => {
                    setForm((prev) => ({ ...prev, countryCode: nextCode }));
                    clearFieldError("country");
                  }}
                  onChange={(phoneRaw, phoneE164) => {
                    setForm((prev) => ({ ...prev, phoneRaw, phoneE164 }));
                    clearFieldError("phone");
                  }}
                  placeholder={isArabic ? "مثال: +966 5XXXXXXXX" : "Example: +966 5XXXXXXXX"}
                  inputClassName={fieldErrors.phone ? "border-red-400/80" : undefined}
                  selectClassName={fieldErrors.phone ? "border-red-400/80" : undefined}
                  ariaInvalid={Boolean(fieldErrors.phone)}
                  ariaDescribedBy={fieldErrors.phone ? "settings-phone-error" : undefined}
                />
                {fieldErrors.phone ? (
                  <p id="settings-phone-error" className="mt-2 text-xs text-red-300">{fieldErrors.phone}</p>
                ) : null}
              </PrimeLabel>

              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "البريد الإلكتروني" : "Email"}</span>
                <PrimeInput value={email} disabled />
              </PrimeLabel>
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "الدولة" : "Country"}</span>
                <CountrySelector
                  locale={isArabic ? "ar" : "en"}
                  value={form.countryCode}
                  onChange={(countryCode) => {
                    setForm((prev) => ({ ...prev, countryCode }));
                    clearFieldError("country");
                  }}
                  placeholder={isArabic ? "ابحث عن الدولة" : "Search country"}
                  inputClassName={fieldErrors.country ? "border-red-400/80" : undefined}
                  ariaInvalid={Boolean(fieldErrors.country)}
                  ariaDescribedBy={fieldErrors.country ? "settings-country-error" : undefined}
                />
                {fieldErrors.country ? (
                  <p id="settings-country-error" className="mt-2 text-xs text-red-300">{fieldErrors.country}</p>
                ) : null}
              </PrimeLabel>

              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "المدينة" : "City / Location"}</span>
                <PrimeInput
                  value={form.city}
                  className={fieldErrors.city ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.city)}
                  aria-describedby={fieldErrors.city ? "settings-city-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, city: event.target.value }));
                    clearFieldError("city");
                  }}
                />
                {fieldErrors.city ? (
                  <p id="settings-city-error" className="mt-2 text-xs text-red-300">{fieldErrors.city}</p>
                ) : null}
              </PrimeLabel>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "الملف المهني" : "Professional Profile"}</h2>

            <PrimeLabel className="mt-4">
              <span className="mb-2 block">{isArabic ? "المسمى الوظيفي" : "Professional title"}</span>
              <PrimeInput
                value={form.professionalTitle}
                className={fieldErrors.professionalTitle ? "border-red-400/80" : undefined}
                aria-invalid={Boolean(fieldErrors.professionalTitle)}
                aria-describedby={fieldErrors.professionalTitle ? "settings-title-error" : undefined}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, professionalTitle: event.target.value }));
                  clearFieldError("professionalTitle");
                }}
              />
              {fieldErrors.professionalTitle ? (
                <p id="settings-title-error" className="mt-2 text-xs text-red-300">{fieldErrors.professionalTitle}</p>
              ) : null}
            </PrimeLabel>

            <PrimeLabel className="mt-4">
              <span className="mb-2 block">{isArabic ? "الملخص المهني" : "Professional summary"}</span>
              <PrimeTextarea
                rows={5}
                value={form.summary}
                className={fieldErrors.summary ? "border-red-400/80" : undefined}
                aria-invalid={Boolean(fieldErrors.summary)}
                aria-describedby={fieldErrors.summary ? "settings-summary-error" : undefined}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, summary: event.target.value }));
                  clearFieldError("summary");
                }}
              />
              {fieldErrors.summary ? (
                <p id="settings-summary-error" className="mt-2 text-xs text-red-300">{fieldErrors.summary}</p>
              ) : null}
            </PrimeLabel>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "المهارات" : "Skills"}</span>
                <PrimeInput
                  value={form.skills}
                  placeholder={isArabic ? "مفصولة بفواصل" : "Comma separated"}
                  className={fieldErrors.skills ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.skills)}
                  aria-describedby={fieldErrors.skills ? "settings-skills-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, skills: event.target.value }));
                    clearFieldError("skills");
                  }}
                />
                {fieldErrors.skills ? (
                  <p id="settings-skills-error" className="mt-2 text-xs text-red-300">{fieldErrors.skills}</p>
                ) : null}
              </PrimeLabel>

              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "اللغات" : "Languages"}</span>
                <PrimeInput
                  value={form.languages}
                  placeholder={isArabic ? "مثال: العربية, الإنجليزية" : "Example: Arabic, English"}
                  className={fieldErrors.languages ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.languages)}
                  aria-describedby={fieldErrors.languages ? "settings-languages-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, languages: event.target.value }));
                    clearFieldError("languages");
                  }}
                />
                {fieldErrors.languages ? (
                  <p id="settings-languages-error" className="mt-2 text-xs text-red-300">{fieldErrors.languages}</p>
                ) : null}
              </PrimeLabel>
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "الخبرة العملية" : "Work experience"}</span>
                <PrimeTextarea
                  rows={4}
                  value={form.workExperience}
                  className={fieldErrors.workExperience ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.workExperience)}
                  aria-describedby={fieldErrors.workExperience ? "settings-experience-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, workExperience: event.target.value }));
                    clearFieldError("workExperience");
                  }}
                />
                {fieldErrors.workExperience ? (
                  <p id="settings-experience-error" className="mt-2 text-xs text-red-300">{fieldErrors.workExperience}</p>
                ) : null}
              </PrimeLabel>

              <PrimeLabel>
                <span className="mb-2 block">{isArabic ? "التعليم" : "Education"}</span>
                <PrimeTextarea
                  rows={4}
                  value={form.education}
                  className={fieldErrors.education ? "border-red-400/80" : undefined}
                  aria-invalid={Boolean(fieldErrors.education)}
                  aria-describedby={fieldErrors.education ? "settings-education-error" : undefined}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, education: event.target.value }));
                    clearFieldError("education");
                  }}
                />
                {fieldErrors.education ? (
                  <p id="settings-education-error" className="mt-2 text-xs text-red-300">{fieldErrors.education}</p>
                ) : null}
              </PrimeLabel>
            </div>
          </section>

          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "السيرة الذاتية والوثائق" : "CV & Documents"}</h2>

            <div className="mt-4 rounded-xl border border-blue-200/20 bg-[#061123]/80 p-4">
              <p className="text-sm text-text-secondary">{isArabic ? "السيرة الذاتية الحالية" : "Current CV"}</p>
              <p className="mt-1 text-sm text-text-primary" dir="ltr">{currentCv?.filename ?? (isArabic ? "لا توجد سيرة ذاتية مرفوعة" : "No CV uploaded yet")}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {isArabic ? "الحالة" : "Status"}: {localizeCandidateStatus(currentCvVersion?.verification_status ?? "pending", uiLocale)}
              </p>
              <p className="mt-2 text-xs text-text-tertiary">
                {isArabic
                  ? "استبدال السيرة الذاتية يضيف نسخة جديدة ويحافظ على تاريخ التحقق السابق."
                  : "Replacing the CV creates a new version and keeps prior verification history."}
              </p>
            </div>

            <PrimeLabel className="mt-4">
              <span className="mb-2 block">{isArabic ? "استبدال السيرة الذاتية" : "Replace CV"}</span>
              <LocalizedFileInput
                isArabic={isArabic}
                accept=".pdf,.doc,.docx"
                selectedFiles={cvFile ? [cvFile] : []}
                singleLabel={{ en: "Choose CV file", ar: "اختيار ملف السيرة الذاتية" }}
                ariaInvalid={Boolean(fieldErrors.cv)}
                ariaDescribedBy={fieldErrors.cv ? "settings-cv-error" : undefined}
                onChange={(files) => {
                  setCvFile(files[0] ?? null);
                  clearFieldError("cv");
                }}
              />
              {fieldErrors.cv ? <p id="settings-cv-error" className="mt-2 text-xs text-red-300">{fieldErrors.cv}</p> : null}
            </PrimeLabel>

            <div className="mt-6 rounded-xl border border-blue-200/20 bg-[#061123]/80 p-4">
              <p className="text-sm text-text-secondary">{isArabic ? "الشهادات الحالية" : "Current certificates"}</p>
              <ul className="mt-2 space-y-2 text-sm text-text-primary">
                {shownCertificateItems.length > 0 ? (
                  shownCertificateItems.map((item) => (
                    <li key={item.id}>
                      <span dir="ltr">{item.name}</span> <span className="text-xs text-text-tertiary">({localizeCandidateStatus(item.status, uiLocale)})</span>
                    </li>
                  ))
                ) : (
                  <li className="text-text-tertiary">{isArabic ? "لا توجد شهادات مرفوعة." : "No certificates uploaded."}</li>
                )}
              </ul>
              <p className="mt-2 text-xs text-text-tertiary">
                {isArabic
                  ? "للاستبدال أو الإزالة، استخدم مسار إدارة الوثائق الآمن."
                  : "For replace/remove, use the existing safe document workflow in Document Center."}
              </p>
              <Link href="/candidate/documents" className={`${primeButtonClasses("secondary")} mt-3`}>
                {isArabic ? "فتح مركز الوثائق" : "Open Document Center"}
              </Link>
            </div>

            <PrimeLabel className="mt-4">
              <span className="mb-2 block">{isArabic ? "إضافة شهادات جديدة" : "Add new certificates"}</span>
              <LocalizedFileInput
                isArabic={isArabic}
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                selectedFiles={certificateFiles}
                multiLabel={{ en: "Choose certificate files", ar: "اختيار ملفات الشهادات" }}
                ariaInvalid={Boolean(fieldErrors.certificates)}
                ariaDescribedBy={fieldErrors.certificates ? "settings-certificates-error" : undefined}
                onChange={(files) => {
                  setCertificateFiles(files);
                  clearFieldError("certificates");
                }}
              />
              {fieldErrors.certificates ? (
                <p id="settings-certificates-error" className="mt-2 text-xs text-red-300">{fieldErrors.certificates}</p>
              ) : null}
            </PrimeLabel>
          </section>

          <section className="rounded-2xl border border-blue-200/20 bg-[#071428]/80 p-5">
            <h2 className="font-heading text-xl text-text-primary">{isArabic ? "الحساب" : "Account"}</h2>
            <label className="mt-3 flex min-h-12 items-start gap-3 rounded-2xl border border-blue-200/20 bg-[#061123]/70 px-4 py-3 text-sm text-text-secondary">
              <PrimeCheckbox type="checkbox" checked readOnly />
              <span>
                {isArabic
                  ? "تتم إدارة مشاركة السيرة الذاتية عبر طبقة حماية برايم جلوبال ولا تُكشف النسخ الأصلية لأصحاب العمل."
                  : "CV originals remain protected by Prime Global disclosure controls and are never directly exposed to employers."}
              </span>
            </label>
          </section>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <button type="submit" disabled={saving || !csrfToken} className={primeButtonClasses("primary")}>
            {saving ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : isArabic ? "حفظ الإعدادات" : "Save settings"}
          </button>
        </form>
      </PrimeCard>
    </main>
  );
}
