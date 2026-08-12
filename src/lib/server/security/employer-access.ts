import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import {
  isPendingEmployerApiAllowed,
  normalizeEmployerAccountStatus,
} from "@/lib/server/security/employer-access-policy";

export {
  isPendingEmployerApiAllowed,
  normalizeEmployerAccountStatus,
  type EmployerAccountStatus,
} from "@/lib/server/security/employer-access-policy";

export async function enforceEmployerApiAccess(request: Request, authUserId: string) {
  if (isPendingEmployerApiAllowed(request)) return null;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("employers")
    .select("verification_status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_STATUS_CHECK_FAILED", message: "Unable to verify employer access" } },
      { status: 500 }
    );
  }

  const accountStatus = normalizeEmployerAccountStatus(data?.verification_status as string | null | undefined);
  if (accountStatus === "approved") return null;

  const message =
    accountStatus === "rejected"
      ? "Employer account was rejected by Prime Global review"
      : accountStatus === "suspended"
        ? "Employer account is suspended"
        : "Employer verification pending review";

  return NextResponse.json(
    { success: false, error: { code: "EMPLOYER_APPROVAL_REQUIRED", message } },
    { status: 403 }
  );
}