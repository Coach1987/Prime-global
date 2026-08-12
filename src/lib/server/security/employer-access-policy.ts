export type EmployerAccountStatus = "pending_review" | "approved" | "rejected" | "suspended";

const PENDING_EMPLOYER_API_RULES = [
  { pathname: "/api/auth/me", methods: ["GET"] },
  { pathname: "/api/auth/logout", methods: ["POST"] },
  { pathname: "/api/employers/profile", methods: ["GET", "POST", "PATCH"] },
  { pathname: "/api/employers/verification/documents", methods: ["GET", "POST"] },
  { pathname: "/api/companies/verification", methods: ["GET", "POST"] },
] as const;

export function normalizeEmployerAccountStatus(
  verificationStatus: string | null | undefined
): EmployerAccountStatus | null {
  if (verificationStatus === "verified") return "approved";
  if (verificationStatus === "rejected") return "rejected";
  if (verificationStatus === "suspended") return "suspended";
  if (
    verificationStatus === "pending" ||
    verificationStatus === "documents_submitted" ||
    verificationStatus === "admin_review"
  ) {
    return "pending_review";
  }

  return null;
}

export function isPendingEmployerApiAllowed(request: Pick<Request, "method" | "url">) {
  const { pathname } = new URL(request.url);
  const method = request.method.toUpperCase();

  return PENDING_EMPLOYER_API_RULES.some(
    (rule) => rule.pathname === pathname && (rule.methods as readonly string[]).includes(method)
  );
}