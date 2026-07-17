const PLACEHOLDER_VALUES = new Set(["", "changeme", "your-value"]);

function normalizeSupabaseProjectUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const normalizedPath = url.pathname.replace(/\/+$/, "");
    if (normalizedPath === "/rest/v1") {
      url.pathname = "";
    }
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
  }
}

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
  const value = readOptionalEnv("SUPABASE_URL") ?? readOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  return value ? normalizeSupabaseProjectUrl(value) : undefined;
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
  SUPABASE_COMPANY_DOCS_BUCKET: readOptionalEnv("SUPABASE_COMPANY_DOCS_BUCKET"),
  SUPABASE_COMPANY_LOGOS_BUCKET: readOptionalEnv("SUPABASE_COMPANY_LOGOS_BUCKET"),
  SUPABASE_CANDIDATE_RESUMES_BUCKET: readOptionalEnv("SUPABASE_CANDIDATE_RESUMES_BUCKET"),
  APP_CSRF_SECRET: readOptionalEnv("APP_CSRF_SECRET"),
  APP_RATE_LIMIT_WINDOW_MS: readOptionalEnv("APP_RATE_LIMIT_WINDOW_MS"),
  APP_RATE_LIMIT_MAX_REQUESTS: readOptionalEnv("APP_RATE_LIMIT_MAX_REQUESTS"),
  RESEND_API_KEY: readOptionalEnv("RESEND_API_KEY"),
  EMAIL_PROVIDER: readOptionalEnv("EMAIL_PROVIDER"),
  EMAIL_FROM: readOptionalEnv("EMAIL_FROM"),
  EMAIL_RATE_LIMIT_PER_MINUTE: readOptionalEnv("EMAIL_RATE_LIMIT_PER_MINUTE"),
  APP_BASE_URL: readOptionalEnv("APP_BASE_URL"),
  AI_SUPERVISOR_SLA_MINUTES: readOptionalEnv("AI_SUPERVISOR_SLA_MINUTES"),
  JOB_ALERT_MATCH_THRESHOLD: readOptionalEnv("JOB_ALERT_MATCH_THRESHOLD"),
  OPENAI_API_KEY: readOptionalEnv("OPENAI_API_KEY"),
  DOCUMENT_VERIFICATION_PROVIDER: readOptionalEnv("DOCUMENT_VERIFICATION_PROVIDER"),
  DOCUMENT_VERIFICATION_MODEL: readOptionalEnv("DOCUMENT_VERIFICATION_MODEL"),
} as const;

export {
  readOptionalEnv,
  readRequiredEnv,
  readSupabaseUrl,
  readSupabaseAnonKey,
  readRequiredSupabaseUrl,
};
