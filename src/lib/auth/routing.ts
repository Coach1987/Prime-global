export type AuthRole = "candidate" | "employer" | "prime_global_recruiter" | "prime_global_admin" | "admin" | "super_admin";

export function isStaffRole(role: string | null | undefined): role is AuthRole {
  return role === "prime_global_recruiter" || role === "prime_global_admin" || role === "admin" || role === "super_admin";
}

export function normalizeAuthRole(role: string | null | undefined): AuthRole | null {
  if (role === "candidate" || role === "employer") return role;
  if (isStaffRole(role)) return role;
  return null;
}

export function getDashboardHref(role: AuthRole) {
  if (role === "candidate") return "/candidate/dashboard";
  if (role === "employer") return "/employers/dashboard";
  return "/admin/control-center";
}

export function getAccountHref(role: AuthRole) {
  if (role === "candidate") return "/candidate/onboarding";
  if (role === "employer") return "/employers/verification";
  return "/admin/dashboard";
}

export function getPostLoginHref(role: AuthRole) {
  if (role === "candidate") return "/candidate/dashboard";
  if (role === "employer") return "/employers/interview-center";
  return "/admin/control-center";
}