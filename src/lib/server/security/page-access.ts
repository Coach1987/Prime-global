import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardHref } from "@/lib/auth/routing";
import { createSupabasePublicClient } from "@/lib/server/supabase";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import {
  normalizeEmployerAccountStatus,
  type EmployerAccountStatus,
} from "@/lib/server/security/employer-access";
import { ACCESS_TOKEN_COOKIE } from "@/lib/server/security/session-cookies";
import type { AppRole } from "@/lib/server/security/auth";

const STAFF_ROLES = new Set<AppRole>([
  "prime_global_recruiter",
  "prime_global_admin",
  "admin",
  "super_admin",
]);

function normalizeRole(rawRole: unknown): AppRole {
  if (rawRole === "prime_global_admin") return "prime_global_admin";
  if (rawRole === "prime_global_recruiter") return "prime_global_recruiter";
  if (rawRole === "super_admin") return "super_admin";
  if (rawRole === "admin") return "admin";
  if (rawRole === "employer") return "employer";
  return "candidate";
}

function localizePath(locale: string, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized}`;
}

export function isStaffRole(role: AppRole | null | undefined) {
  return Boolean(role && STAFF_ROLES.has(role));
}

export async function readServerSession(): Promise<{ userId: string; role: AppRole } | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value?.trim();

  if (!accessToken) return null;

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;

  return {
    userId: data.user.id,
    role: normalizeRole(data.user.app_metadata?.app_role ?? data.user.user_metadata?.app_role),
  };
}

export async function readServerSessionRole(): Promise<AppRole | null> {
  return (await readServerSession())?.role ?? null;
}

export async function requirePageRole({
  locale,
  allowedRoles,
  unauthenticatedRedirect,
}: {
  locale: string;
  allowedRoles: AppRole[];
  unauthenticatedRedirect: string;
}): Promise<AppRole> {
  const role = await readServerSessionRole();

  if (!role) {
    redirect(unauthenticatedRedirect);
  }

  if (!allowedRoles.includes(role)) {
    redirect(localizePath(locale, getDashboardHref(role)));
  }

  return role;
}

export async function requireEmployerPageAccess({
  locale,
  allowedAccountStatuses,
}: {
  locale: string;
  allowedAccountStatuses: EmployerAccountStatus[];
}) {
  await requirePageRole({
    locale,
    allowedRoles: ["employer"],
    unauthenticatedRedirect: `/${locale}/auth?mode=signin&audience=employer`,
  });

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  if (!accessToken) {
    redirect(`/${locale}/auth?mode=signin&audience=employer`);
  }

  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    redirect(`/${locale}/auth?mode=signin&audience=employer`);
  }

  const employer = await getEmployerByAuthUserId(data.user.id);
  const accountStatus = normalizeEmployerAccountStatus(
    employer?.verification_status as string | null | undefined
  );

  if (!accountStatus || !allowedAccountStatuses.includes(accountStatus)) {
    redirect(`/${locale}/employer/pending-approval`);
  }

  return accountStatus;
}
