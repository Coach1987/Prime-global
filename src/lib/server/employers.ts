import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { forbiddenResponse } from "@/lib/server/security/auth";

export const EMPLOYER_VERIFICATION_STATUSES = [
  "pending",
  "documents_submitted",
  "admin_review",
  "verified",
  "rejected",
  "suspended",
] as const;

export type EmployerVerificationStatus = (typeof EMPLOYER_VERIFICATION_STATUSES)[number];
export type EmployerAccountStatus = "pending_review" | "approved" | "rejected" | "suspended";

export async function getEmployerByAuthUserId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("employers")
    .select("id, auth_user_id, verification_status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function normalizeEmployerAccountStatus(
  verificationStatus: string | null | undefined
): EmployerAccountStatus | null {
  if (verificationStatus === "verified") {
    return "approved";
  }

  if (verificationStatus === "rejected") {
    return "rejected";
  }

  if (verificationStatus === "suspended") {
    return "suspended";
  }

  if (verificationStatus === "pending" || verificationStatus === "documents_submitted" || verificationStatus === "admin_review") {
    return "pending_review";
  }

  return null;
}

export function isEmployerApproved(verificationStatus: string | null | undefined) {
  return normalizeEmployerAccountStatus(verificationStatus) === "approved";
}

export function requireEmployerOperationalStatus(verificationStatus: string | null | undefined) {
  const accountStatus = normalizeEmployerAccountStatus(verificationStatus);

  if (accountStatus === "rejected") {
    return forbiddenResponse("Employer account was rejected by Prime Global review");
  }

  if (accountStatus === "suspended") {
    return forbiddenResponse("Employer account is suspended");
  }

  return null;
}

export function requireVerifiedEmployerStatus(verificationStatus: string | null | undefined) {
  const accountStatus = normalizeEmployerAccountStatus(verificationStatus);

  if (accountStatus === "approved") {
    return null;
  }

  if (accountStatus === "rejected") {
    return forbiddenResponse("Employer account was rejected by Prime Global review");
  }

  if (accountStatus === "suspended") {
    return forbiddenResponse("Employer account is suspended");
  }

  return forbiddenResponse("Employer verification pending review");
}
