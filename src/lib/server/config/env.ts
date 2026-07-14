const PLACEHOLDER_VALUES = new Set(["", "changeme", "your-value"]);

function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  if (!value || PLACEHOLDER_VALUES.has(value.toLowerCase())) {
    return undefined;
  }
  return value;
}

function readRequiredEnv(key: string): string {
  const value = readOptionalEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readSupabaseUrl(): string | undefined {
  return readOptionalEnv("SUPABASE_URL") ?? readOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function readSupabaseAnonKey(): string | undefined {
  return readOptionalEnv("SUPABASE_ANON_KEY") ?? readOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function readRequiredSupabaseUrl(): string {
  const value = readSupabaseUrl();
  if (!value) {
    throw new Error("Missing required environment variable: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
  }
  return value;
}

export const serverEnv = {
  SUPABASE_URL: readSupabaseUrl(),
  SUPABASE_ANON_KEY: readSupabaseAnonKey(),
  SUPABASE_SERVICE_ROLE_KEY: readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_CV_BUCKET: readOptionalEnv("SUPABASE_CV_BUCKET"),
  RESEND_API_KEY: readOptionalEnv("RESEND_API_KEY"),
  OPENAI_API_KEY: readOptionalEnv("OPENAI_API_KEY"),
} as const;

export {
  readOptionalEnv,
  readRequiredEnv,
  readSupabaseUrl,
  readSupabaseAnonKey,
  readRequiredSupabaseUrl,
};
