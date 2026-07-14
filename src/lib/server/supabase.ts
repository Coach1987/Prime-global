import { createClient } from "@supabase/supabase-js";
import { readRequiredEnv, readRequiredSupabaseUrl } from "./config/env";

export function createSupabaseAdminClient() {
  const supabaseUrl = readRequiredSupabaseUrl();
  const serviceRoleKey = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
