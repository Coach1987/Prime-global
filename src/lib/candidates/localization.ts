export type CandidateLocale = "en" | "ar";

function normalizeKey(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function toTitleCaseFromSnake(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  pending_ai_analysis: { en: "Pending AI Analysis", ar: "قيد تحليل الذكاء الاصطناعي" },
  pending_manual_review: { en: "Under Review", ar: "قيد المراجعة" },
  pending_verification: { en: "Under Review", ar: "قيد المراجعة" },
  under_review: { en: "Under Review", ar: "قيد المراجعة" },
  approved: { en: "Verified", ar: "تم التحقق" },
  verified: { en: "Verified", ar: "تم التحقق" },
  auto_approved: { en: "Verified", ar: "تم التحقق" },
  accepted: { en: "Verified", ar: "تم التحقق" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  replacement_requested: { en: "Additional Information Required", ar: "مطلوب استكمال المعلومات" },
  additional_evidence_requested: { en: "Additional Information Required", ar: "مطلوب استكمال المعلومات" },
  live_verification_required: { en: "Additional Information Required", ar: "مطلوب استكمال المعلومات" },
  superseded: { en: "Replaced", ar: "تم الاستبدال" },
  escalated: { en: "Under Review", ar: "قيد المراجعة" },
  submitted: { en: "Submitted", ar: "تم التقديم" },
  shortlisted: { en: "Shortlisted", ar: "في القائمة المختصرة" },
  interview_requested: { en: "Interview Requested", ar: "تم طلب مقابلة" },
  interview_scheduled: { en: "Interview Scheduled", ar: "تمت جدولة مقابلة" },
  offer: { en: "Offer", ar: "عرض" },
  withdrawn: { en: "Withdrawn", ar: "تم السحب" },
  pending: { en: "Pending", ar: "قيد الانتظار" },
  active: { en: "Active", ar: "نشط" },
  closed: { en: "Closed", ar: "مغلق" },
  open: { en: "Open", ar: "مفتوح" },
  offline: { en: "Offline", ar: "غير متصل" },
  online: { en: "Online", ar: "متصل" },
};

const DOCUMENT_LABELS: Record<string, { en: string; ar: string }> = {
  cv: { en: "CV", ar: "السيرة الذاتية" },
  certificate: { en: "Certificate", ar: "شهادة" },
  diploma: { en: "Diploma", ar: "دبلوم" },
  supporting_document: { en: "Supporting Document", ar: "مستند داعم" },
  additional_evidence: { en: "Additional Evidence", ar: "أدلة إضافية" },
  profile_photo: { en: "Profile Photo", ar: "صورة الملف الشخصي" },
  private_document: { en: "Private Document", ar: "مستند خاص" },
  document: { en: "Document", ar: "مستند" },
};

export function localizeCandidateStatus(value: string | null | undefined, locale: CandidateLocale) {
  const key = normalizeKey(value);
  if (!key) return locale === "ar" ? "غير متوفر" : "Not available";
  const mapped = STATUS_LABELS[key];
  if (mapped) return locale === "ar" ? mapped.ar : mapped.en;
  return locale === "ar" ? toTitleCaseFromSnake(key) : toTitleCaseFromSnake(key);
}

export function localizeDocumentType(value: string | null | undefined, locale: CandidateLocale) {
  const key = normalizeKey(value) || "document";
  const mapped = DOCUMENT_LABELS[key] ?? DOCUMENT_LABELS.document;
  return locale === "ar" ? mapped.ar : mapped.en;
}

export function asCandidateLocale(locale: string): CandidateLocale {
  return locale === "ar" ? "ar" : "en";
}
