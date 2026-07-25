import { createClient } from "@supabase/supabase-js";
import {
  readRequiredEnv,
  readRequiredSupabaseUrl,
  readSupabaseAnonKey,
} from "./config/env.ts";

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

export function createSupabasePublicClient() {
  const supabaseUrl = readRequiredSupabaseUrl();
  const anonKey = readSupabaseAnonKey();

  if (!anonKey) {
    throw new Error(
      "Missing required environment variable: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
