import { createSupabaseAdminClient } from "@/lib/server/supabase";

export async function getCandidateByAuthUserId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id, auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}