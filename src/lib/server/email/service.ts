import { serverEnv } from "@/lib/server/config/env";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

export type EmailDeliveryState =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

export interface TransactionalEmailInput {
  idempotencyKey: string;
  authUserId?: string;
  recipientEmail: string;
  templateKey: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, unknown>;
}

interface EmailProviderResult {
  providerMessageId?: string;
  status: Extract<EmailDeliveryState, "sent" | "failed" | "suppressed">;
  error?: string;
}

interface EmailProvider {
  name: string;
  send: (input: TransactionalEmailInput) => Promise<EmailProviderResult>;
}

const windowStartByKey = new Map<string, number>();
const sentCountByKey = new Map<string, number>();

function parseRateLimitPerMinute() {
  const parsed = Number(serverEnv.EMAIL_RATE_LIMIT_PER_MINUTE ?? "60");
  if (!Number.isFinite(parsed) || parsed < 1) return 60;
  return Math.min(600, Math.floor(parsed));
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const windowMs = 60_000;
  const windowStart = windowStartByKey.get(key) ?? now;

  if (now - windowStart >= windowMs) {
    windowStartByKey.set(key, now);
    sentCountByKey.set(key, 0);
  }

  const count = (sentCountByKey.get(key) ?? 0) + 1;
  sentCountByKey.set(key, count);

  return count <= parseRateLimitPerMinute();
}

function buildResendProvider(): EmailProvider {
  return {
    name: "resend",
    async send(input) {
      if (!serverEnv.RESEND_API_KEY) {
        return { status: "failed", error: "RESEND_API_KEY is not configured" };
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverEnv.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: serverEnv.EMAIL_FROM ?? "Prime Global <no-reply@primeglobal.tn>",
          to: [input.recipientEmail],
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        return { status: "failed", error: `Resend request failed: ${response.status} ${details}` };
      }

      const payload = (await response.json()) as { id?: string };
      return { status: "sent", providerMessageId: payload.id };
    },
  };
}

function buildDevelopmentProvider(): EmailProvider {
  return {
    name: "development",
    async send(input) {
      console.info("[email:dev-adapter] simulated outbound email", {
        to: input.recipientEmail,
        subject: input.subject,
        templateKey: input.templateKey,
        idempotencyKey: input.idempotencyKey,
      });

      return { status: "sent", providerMessageId: `dev-${crypto.randomUUID()}` };
    },
  };
}

function resolveProvider(): EmailProvider {
  const provider = (serverEnv.EMAIL_PROVIDER ?? "development").toLowerCase();
  if (provider === "resend") return buildResendProvider();
  return buildDevelopmentProvider();
}

async function isUnsubscribed(recipientEmail: string, authUserId?: string) {
  const supabase = createSupabaseAdminClient();

  if (authUserId) {
    const { data: candidate } = await supabase
      .from("candidate_profiles")
      .select("id")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (candidate?.id) {
      const { data: preference } = await supabase
        .from("candidate_job_alert_preferences")
        .select("unsubscribed, email_notification_frequency")
        .eq("candidate_id", candidate.id)
        .maybeSingle();

      if (preference?.unsubscribed || preference?.email_notification_frequency === "disabled") {
        return true;
      }
    }
  }

  const { data: token } = await supabase
    .from("email_unsubscribe_tokens")
    .select("id")
    .eq("email", recipientEmail)
    .eq("scope", "job_alerts")
    .not("used_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Boolean(token);
}

export async function sendTransactionalEmail(input: TransactionalEmailInput) {
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase
    .from("email_delivery_events")
    .select("id, status")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing?.status && existing.status !== "failed") {
    return {
      deduplicated: true,
      status: existing.status as EmailDeliveryState,
    };
  }

  if (!checkRateLimit(input.authUserId ?? input.recipientEmail)) {
    await supabase.from("email_delivery_events").upsert(
      {
        idempotency_key: input.idempotencyKey,
        auth_user_id: input.authUserId ?? null,
        recipient_email: input.recipientEmail,
        template_key: input.templateKey,
        provider_name: resolveProvider().name,
        status: "suppressed",
        last_error: "Rate limit exceeded",
        metadata: input.metadata ?? {},
      },
      { onConflict: "idempotency_key" }
    );

    return { deduplicated: false, status: "suppressed" as EmailDeliveryState };
  }

  if (await isUnsubscribed(input.recipientEmail, input.authUserId)) {
    await supabase.from("email_delivery_events").upsert(
      {
        idempotency_key: input.idempotencyKey,
        auth_user_id: input.authUserId ?? null,
        recipient_email: input.recipientEmail,
        template_key: input.templateKey,
        provider_name: resolveProvider().name,
        status: "suppressed",
        last_error: "Recipient unsubscribed",
        metadata: input.metadata ?? {},
      },
      { onConflict: "idempotency_key" }
    );

    return { deduplicated: false, status: "suppressed" as EmailDeliveryState };
  }

  await supabase.from("email_delivery_events").upsert(
    {
      idempotency_key: input.idempotencyKey,
      auth_user_id: input.authUserId ?? null,
      recipient_email: input.recipientEmail,
      template_key: input.templateKey,
      provider_name: resolveProvider().name,
      status: "queued",
      metadata: input.metadata ?? {},
    },
    { onConflict: "idempotency_key" }
  );

  const provider = resolveProvider();
  const delivery = await provider.send(input);

  await supabase
    .from("email_delivery_events")
    .update({
      provider_name: provider.name,
      provider_message_id: delivery.providerMessageId ?? null,
      status: delivery.status,
      last_error: delivery.error ?? null,
      retries: delivery.status === "failed" ? 1 : 0,
      next_retry_at:
        delivery.status === "failed" ? new Date(Date.now() + 5 * 60_000).toISOString() : null,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    })
    .eq("idempotency_key", input.idempotencyKey);

  return { deduplicated: false, status: delivery.status as EmailDeliveryState };
}

export function requiredEmailEnvVars() {
  return {
    EMAIL_PROVIDER: "Set to 'resend' for production provider integration",
    EMAIL_FROM: "Sender identity, e.g. Prime Global <no-reply@primeglobal.tn>",
    RESEND_API_KEY: "Required when EMAIL_PROVIDER=resend",
    APP_BASE_URL: "Public application URL used for secure links",
  };
}
