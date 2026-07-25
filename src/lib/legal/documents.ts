import path from "node:path";

export type LegalLocale = "en" | "ar";

export type LegalDocumentKey =
  | "terms-of-service"
  | "privacy-policy"
  | "cookie-policy"
  | "employer-agreement"
  | "candidate-agreement"
  | "ai-transparency-policy"
  | "payment-refund-policy"
  | "data-processing-agreement"
  | "security-policy"
  | "trust-charter";

type LegalDocumentDefinition = {
  slug: LegalDocumentKey;
  sourceFile: string;
  title: {
    en: string;
    ar: string;
  };
  summary: {
    en: string;
    ar: string;
  };
};

export const LEGAL_DOCUMENTS: LegalDocumentDefinition[] = [
  {
    slug: "terms-of-service",
    sourceFile: "TERMS_OF_SERVICE.md",
    title: { en: "Terms of Service", ar: "شروط الاستخدام" },
    summary: {
      en: "Platform-wide usage terms for Prime Global services.",
      ar: "الشروط العامة لاستخدام خدمات ومنصة Prime Global.",
    },
  },
  {
    slug: "privacy-policy",
    sourceFile: "PRIVACY_POLICY.md",
    title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
    summary: {
      en: "How Prime Global processes, protects, and governs personal data.",
      ar: "كيفية جمع ومعالجة وحماية البيانات الشخصية لدى Prime Global.",
    },
  },
  {
    slug: "cookie-policy",
    sourceFile: "COOKIE_POLICY.md",
    title: { en: "Cookie Policy", ar: "سياسة ملفات تعريف الارتباط" },
    summary: {
      en: "Rules for cookie and tracking technology usage.",
      ar: "قواعد استخدام ملفات تعريف الارتباط وتقنيات التتبع.",
    },
  },
  {
    slug: "employer-agreement",
    sourceFile: "EMPLOYER_AGREEMENT.md",
    title: { en: "Employer Agreement", ar: "اتفاقية صاحب العمل" },
    summary: {
      en: "Terms applicable to employers using recruitment workflows.",
      ar: "الشروط المطبقة على أصحاب العمل في مسارات التوظيف.",
    },
  },
  {
    slug: "candidate-agreement",
    sourceFile: "CANDIDATE_AGREEMENT.md",
    title: { en: "Candidate Agreement", ar: "اتفاقية المرشح" },
    summary: {
      en: "Terms applicable to candidates and profile/application usage.",
      ar: "الشروط المطبقة على المرشحين واستخدام الملف والطلبات.",
    },
  },
  {
    slug: "ai-transparency-policy",
    sourceFile: "AI_TRANSPARENCY_POLICY.md",
    title: { en: "AI Transparency Policy", ar: "سياسة شفافية الذكاء الاصطناعي" },
    summary: {
      en: "How AI-assisted features are governed and supervised.",
      ar: "كيفية حوكمة وإشراف وظائف الذكاء الاصطناعي المساعدة.",
    },
  },
  {
    slug: "payment-refund-policy",
    sourceFile: "PAYMENT_REFUND_POLICY.md",
    title: { en: "Payment And Refund Policy", ar: "سياسة الدفع والاسترداد" },
    summary: {
      en: "Commercial billing and refund framework for paid services.",
      ar: "إطار الفوترة والاسترداد للخدمات المدفوعة.",
    },
  },
  {
    slug: "data-processing-agreement",
    sourceFile: "DATA_PROCESSING_AGREEMENT.md",
    title: { en: "Data Processing Agreement", ar: "اتفاقية معالجة البيانات" },
    summary: {
      en: "Processor obligations for customer personal data handling.",
      ar: "التزامات معالج البيانات عند التعامل مع بيانات العملاء.",
    },
  },
  {
    slug: "security-policy",
    sourceFile: "SECURITY_POLICY.md",
    title: { en: "Security Policy", ar: "سياسة الأمان" },
    summary: {
      en: "Security controls and risk management commitments.",
      ar: "ضوابط الأمان والتزامات إدارة المخاطر.",
    },
  },
  {
    slug: "trust-charter",
    sourceFile: "TRUST_CHARTER.md",
    title: { en: "Trust Charter", ar: "ميثاق الثقة" },
    summary: {
      en: "Core trust principles guiding platform governance.",
      ar: "مبادئ الثقة الأساسية التي توجه حوكمة المنصة.",
    },
  },
];

export const LEGAL_DOCUMENTS_BY_SLUG = new Map(
  LEGAL_DOCUMENTS.map((document) => [document.slug, document] as const)
);

const SOURCE_FILE_TO_SLUG = new Map(
  LEGAL_DOCUMENTS.map((document) => [document.sourceFile, document.slug] as const)
);

export function getLegalSourcePath(locale: LegalLocale, sourceFile: string) {
  if (locale === "ar") {
    return path.join(process.cwd(), "docs", "legal", "ar", sourceFile);
  }
  return path.join(process.cwd(), "docs", "legal", sourceFile);
}

export function resolveLegalSlugFromMarkdownLink(linkTarget: string) {
  const filename = linkTarget.split("/").pop() ?? "";
  return SOURCE_FILE_TO_SLUG.get(filename) ?? null;
}