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

export const serverEnv = {
  SUPABASE_URL: readOptionalEnv("SUPABASE_URL"),
  SUPABASE_ANON_KEY: readOptionalEnv("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY"),
  RESEND_API_KEY: readOptionalEnv("RESEND_API_KEY"),
  OPENAI_API_KEY: readOptionalEnv("OPENAI_API_KEY"),
} as const;

export { readOptionalEnv, readRequiredEnv };
