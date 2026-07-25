export type EmployerSummary = {
  id?: string | null;
  company_name?: string | null;
  industry?: string | null;
  verification_status?: string | null;
};

export type PublicJobSearchRow = {
  id: string;
  status?: string | null;
  title?: string | null;
  department?: string | null;
  country?: string | null;
  city?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  employment_type?: string | null;
  work_mode?: string | null;
  required_skills?: string[] | null;
  responsibilities?: string | null;
  requirements?: string | null;
  experience?: string | null;
  education?: string | null;
  publish_date?: string | null;
  employers?: EmployerSummary[] | EmployerSummary | null;
};

export type PublicJobSearchInput = {
  q?: string;
  keyword?: string;
  profession?: string;
  specialization?: string;
  category?: string;
  skill?: string;
  country?: string;
  city?: string;
  employmentType?: string;
  workMode?: string;
};

export type PublicJobSearchMatch = {
  row: PublicJobSearchRow;
  score: number;
};

export const JOB_SEARCH_TAXONOMY: Record<string, string[]> = {
  fitness: [
    "fitness",
    "gym",
    "personal trainer",
    "fitness trainer",
    "sports coach",
    "strength coach",
    "strength and conditioning coach",
    "physical training",
    "physical fitness instructor",
    "لياقة",
    "لياقة بدنية",
    "مدرب رياضي",
    "مدرب لياقة",
    "رياضة",
    "مدرب",
  ],
  logistics: [
    "logistics",
    "supply chain",
    "warehouse",
    "shipping",
    "distribution",
    "freight",
    "transport",
    "لوجستيات",
    "سلسلة التوريد",
    "مخزن",
    "شحن",
    "توزيع",
    "نقل",
  ],
  administration: [
    "administration",
    "administrative",
    "office",
    "office assistant",
    "coordinator",
    "executive assistant",
    "سكرتارية",
    "ادارة",
    "إدارة",
    "إداري",
    "مكتب",
    "منسق",
  ],
  accounting: [
    "accounting",
    "accountant",
    "finance",
    "bookkeeper",
    "payroll",
    "محاسبة",
    "محاسب",
    "مالية",
    "رواتب",
  ],
  technology: [
    "it",
    "information technology",
    "software",
    "developer",
    "engineer",
    "data",
    "tech",
    "تقنية",
    "تكنولوجيا",
    "برمجيات",
    "مطور",
    "مهندس برمجيات",
    "بيانات",
  ],
  healthcare: [
    "healthcare",
    "medical",
    "nurse",
    "doctor",
    "clinic",
    "hospital",
    "الرعاية الصحية",
    "صحي",
    "طبي",
    "ممرض",
    "طبيب",
    "عيادة",
    "مستشفى",
  ],
  hospitality: [
    "hospitality",
    "hotel",
    "restaurant",
    "chef",
    "waiter",
    "guest relations",
    "ضيافة",
    "فندق",
    "مطعم",
    "طاه",
    "نادل",
    "استقبال",
  ],
  construction: [
    "construction",
    "site",
    "civil",
    "foreman",
    "contractor",
    "electrician",
    "سباكة",
    "انشاء",
    "إنشاء",
    "موقع",
    "مدني",
    "مقاول",
    "كهربائي",
  ],
  sales: [
    "sales",
    "business development",
    "account manager",
    "retail",
    "inside sales",
    "مبيعات",
    "تطوير الأعمال",
    "مدير حسابات",
    "تجزئة",
  ],
  engineering: [
    "engineering",
    "engineer",
    "mechanical",
    "electrical",
    "industrial",
    "project engineer",
    "هندسة",
    "مهندس",
    "ميكانيكي",
    "كهربائي",
    "صناعي",
  ],
};

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g;
const ARABIC_TATWEEL = /\u0640/g;
const PUNCTUATION = /[^\p{L}\p{N}\s]/gu;
const MULTI_SPACE = /\s+/g;

const SEARCH_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const ARABIC_VARIANTS: Record<string, string> = {
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٱ": "ا",
  "ى": "ي",
  "ئ": "ي",
  "ؤ": "و",
  "ة": "ه",
};

function normalizeArabicLetters(value: string): string {
  return value
    .split("")
    .map((char) => ARABIC_VARIANTS[char] ?? char)
    .join("");
}

function isSearchToken(token: string): boolean {
  return token.length > 1 && !SEARCH_STOPWORDS.has(token);
}

export function normalizeSearchText(value: string): string {
  return normalizeArabicLetters(value)
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(ARABIC_TATWEEL, "")
    .toLowerCase()
    .replace(PUNCTUATION, " ")
    .replace(MULTI_SPACE, " ")
    .trim();
}

export function toTokens(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length > 1);
}

export function expandOccupationalTerms(input: PublicJobSearchInput): string[] {
  const rawTerms = [
    input.q,
    input.keyword,
    input.profession,
    input.specialization,
    input.category,
    input.skill,
  ].filter((term): term is string => Boolean(term && term.trim()));

  const normalizedRaw = rawTerms.map((term) => normalizeSearchText(term)).filter(Boolean);
  const termSet = new Set<string>();

  for (const term of normalizedRaw) {
    termSet.add(term);
    for (const token of term.split(" ")) {
      if (isSearchToken(token)) termSet.add(token);
    }
  }

  const currentTerms = Array.from(termSet);

  for (const taxonomyTerms of Object.values(JOB_SEARCH_TAXONOMY)) {
    const normalizedTaxonomy = taxonomyTerms.map((term) => normalizeSearchText(term));
    const shouldExpand = normalizedTaxonomy.some((taxonomyTerm) => {
      if (!taxonomyTerm) return false;
      const taxonomyTokens = taxonomyTerm.split(" ").filter(isSearchToken);

      return currentTerms.some((queryTerm) => {
        if (!queryTerm) return false;
        if (taxonomyTerm === queryTerm) return true;

        const queryTokens = queryTerm.split(" ").filter(isSearchToken);
        return queryTokens.some((token) => taxonomyTokens.includes(token));
      });
    });

    if (!shouldExpand) continue;

    for (const taxonomyTerm of normalizedTaxonomy) {
      if (!taxonomyTerm) continue;
      termSet.add(taxonomyTerm);
      for (const token of taxonomyTerm.split(" ")) {
        if (isSearchToken(token)) termSet.add(token);
      }
    }
  }

  return Array.from(termSet).sort((left, right) => right.length - left.length);
}

function hasStrictMatch(fieldValue: string | null | undefined, filterValue: string | undefined): boolean {
  if (!filterValue) return true;
  const source = normalizeSearchText(String(fieldValue ?? ""));
  const filter = normalizeSearchText(filterValue);
  if (!filter) return true;
  return source.includes(filter);
}

function extractEmployer(employers: PublicJobSearchRow["employers"]): EmployerSummary | null {
  if (!employers) return null;
  return Array.isArray(employers) ? employers[0] ?? null : employers;
}

function buildSearchDocument(row: PublicJobSearchRow) {
  const employer = extractEmployer(row.employers);
  const title = normalizeSearchText(String(row.title ?? ""));
  const department = normalizeSearchText(String(row.department ?? ""));
  const skills = normalizeSearchText((row.required_skills ?? []).join(" "));
  const description = normalizeSearchText(
    [row.responsibilities, row.requirements, row.experience, row.education].filter(Boolean).join(" ")
  );
  const location = normalizeSearchText([row.country, row.city].filter(Boolean).join(" "));
  const employerProfile = normalizeSearchText([employer?.company_name, employer?.industry].filter(Boolean).join(" "));

  return {
    title,
    department,
    skills,
    description,
    location,
    employerProfile,
  };
}

function countMatches(haystack: string, terms: string[]): number {
  if (!haystack) return 0;
  let matches = 0;
  for (const term of terms) {
    if (term && haystack.includes(term)) {
      matches += 1;
    }
  }
  return matches;
}

function scoreJob(row: PublicJobSearchRow, terms: string[], primaryTerm: string): number {
  const doc = buildSearchDocument(row);
  let score = 0;

  if (primaryTerm && doc.title === primaryTerm) {
    score += 2000;
  }

  const titleMatches = countMatches(doc.title, terms);
  if (titleMatches > 0) {
    score += 1200 + titleMatches * 40;
  }

  const skillMatches = countMatches(`${doc.skills} ${doc.department}`, terms);
  if (skillMatches > 0) {
    score += 800 + skillMatches * 25;
  }

  const categoryMatches = countMatches(`${doc.department} ${doc.employerProfile}`, terms);
  if (categoryMatches > 0) {
    score += 600 + categoryMatches * 20;
  }

  const descriptionMatches = countMatches(doc.description, terms);
  if (descriptionMatches > 0) {
    score += 300 + descriptionMatches * 10;
  }

  return score;
}

function matchSearchTerms(row: PublicJobSearchRow, terms: string[]): boolean {
  if (terms.length === 0) return true;

  const doc = buildSearchDocument(row);
  const combined = [doc.title, doc.department, doc.skills, doc.description, doc.location]
    .filter(Boolean)
    .join(" ");

  return terms.some((term) => combined.includes(term));
}

function toTimestamp(value: string | null | undefined): number {
  const timestamp = Date.parse(String(value ?? ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function buildSafeSummary(row: PublicJobSearchRow): string {
  const source = [row.responsibilities, row.requirements, row.department].find((value) => value && value.trim()) ?? "";
  const normalized = String(source).replace(MULTI_SPACE, " ").trim();
  if (!normalized) return "";
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

export function filterAndRankPublicJobs(rows: PublicJobSearchRow[], input: PublicJobSearchInput): PublicJobSearchMatch[] {
  const terms = expandOccupationalTerms(input);
  const primaryTerm = normalizeSearchText(input.q ?? input.keyword ?? input.profession ?? "");

  return rows
    .filter((row) => row.status === "published")
    .filter((row) => {
      const employer = extractEmployer(row.employers);
      return employer?.verification_status === "verified";
    })
    .filter((row) => hasStrictMatch(row.country, input.country))
    .filter((row) => hasStrictMatch(row.city, input.city))
    .filter((row) => hasStrictMatch(row.department, input.category))
    .filter((row) => hasStrictMatch(row.department, input.specialization))
    .filter((row) => hasStrictMatch(row.department, input.profession))
    .filter((row) => hasStrictMatch((row.required_skills ?? []).join(" "), input.skill))
    .filter((row) => {
      if (!input.employmentType) return true;
      return row.employment_type === input.employmentType;
    })
    .filter((row) => {
      if (!input.workMode) return true;
      return row.work_mode === input.workMode;
    })
    .filter((row) => matchSearchTerms(row, terms))
    .map((row) => ({ row, score: scoreJob(row, terms, primaryTerm) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;

      const rightTime = toTimestamp(right.row.publish_date);
      const leftTime = toTimestamp(left.row.publish_date);
      if (rightTime !== leftTime) return rightTime - leftTime;

      const leftTitle = normalizeSearchText(String(left.row.title ?? ""));
      const rightTitle = normalizeSearchText(String(right.row.title ?? ""));
      if (leftTitle !== rightTitle) return leftTitle.localeCompare(rightTitle);

      return String(left.row.id).localeCompare(String(right.row.id));
    });
}

export function escapeLikeValue(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
