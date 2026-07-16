import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { forbiddenResponse } from "@/lib/server/security/auth";

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

export function requireVerifiedEmployerStatus(verificationStatus: string | null | undefined) {
  if (verificationStatus !== "verified") {
    return forbiddenResponse("Employer verification pending review");
  }
  return null;
}
