import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AdvertisementRecord,
  PublicAdvertisementItem,
} from "@/features/advertisements/types";
import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/server/supabase";
import { ADVERTISEMENT_BUCKET } from "./constants";
import { isAdvertisementPubliclyVisible, sortAdvertisementsForPublic } from "./public";

function mapPublicAdvertisement(
  record: AdvertisementRecord,
  locale: "en" | "ar",
  mediaUrl: string
): PublicAdvertisementItem {
  return {
    id: record.id,
    mediaType: record.media_type,
    mediaUrl,
    mediaAlt: locale === "ar" ? record.media_alt_ar : record.media_alt_en,
    title: locale === "ar" ? record.title_ar : record.title_en,
    description: locale === "ar" ? record.description_ar : record.description_en,
    targetUrl: record.target_url,
    ctaText: locale === "ar" ? record.cta_text_ar : record.cta_text_en,
    priority: record.priority,
    startsAt: record.starts_at,
    endsAt: record.ends_at,
  };
}

async function buildSignedMediaUrl(supabase: SupabaseClient, storagePath: string) {
  const { data } = await supabase.storage
    .from(ADVERTISEMENT_BUCKET)
    .createSignedUrl(storagePath, 60 * 10);

  return data?.signedUrl ?? "";
}

export async function listAdminAdvertisements(status?: string) {
  const supabase = createSupabaseAdminClient();
  let query = supabase.from("advertisements").select("*").order("updated_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AdvertisementRecord[];
  const ids = rows.map((row) => row.id);

  const metrics = await getAdvertisementMetrics(ids);
  const withMetrics = rows.map((row) => ({
    ...row,
    metrics: metrics[row.id] ?? { impressions: 0, clicks: 0, ctr: 0 },
  }));

  return withMetrics;
}

export async function getAdminAdvertisementById(id: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("advertisements").select("*").eq("id", id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdvertisementRecord | null) ?? null;
}

export async function listEmployerAdvertisements(employerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("created_by", employerId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdvertisementRecord[];
}

export async function getEmployerAdvertisementById(id: string, employerId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("id", id)
    .eq("created_by", employerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as AdvertisementRecord | null) ?? null;
}

export async function createAdvertisement(input: Partial<AdvertisementRecord>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisements")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdvertisementRecord;
}

export async function updateAdvertisement(id: string, input: Partial<AdvertisementRecord>) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisements")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AdvertisementRecord;
}

export async function deleteAdvertisement(id: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("advertisements").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function logAdvertisementAudit(input: {
  advertisementId: string | null;
  action:
    | "create"
    | "edit"
    | "submit_review"
    | "approve"
    | "reject"
    | "request_edits"
    | "activate"
    | "hide"
    | "pause"
    | "republish"
    | "delete";
  actorAuthUserId: string;
  actorRole: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();
  const storedAction =
    input.action === "request_edits"
      ? "edit"
      : input.action === "republish"
        ? "activate"
        : input.action === "hide"
          ? "pause"
          : input.action;
  const { error } = await supabase.from("advertisement_audit_logs").insert({
    advertisement_id: input.advertisementId,
    action: storedAction,
    actor_auth_user_id: input.actorAuthUserId,
    actor_role: input.actorRole,
    from_status: input.fromStatus ?? null,
    to_status: input.toStatus ?? null,
    reason: input.reason ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function listPublicAdvertisements(locale: "en" | "ar") {
  const publicClient = createSupabasePublicClient();
  const adminClient = createSupabaseAdminClient();

  const { data, error } = await publicClient
    .from("advertisements")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  const now = new Date();
  const visibleRecords = sortAdvertisementsForPublic(
    ((data ?? []) as AdvertisementRecord[]).filter((entry) => isAdvertisementPubliclyVisible(entry, now))
  );

  const items: PublicAdvertisementItem[] = [];
  for (const entry of visibleRecords) {
    const signedUrl = await buildSignedMediaUrl(adminClient, entry.media_url);
    if (!signedUrl) {
      continue;
    }

    items.push(mapPublicAdvertisement(entry, locale, signedUrl));
  }

  return items;
}

export async function createAdvertisementAnalyticsEvent(input: {
  advertisementId: string;
  eventType: "impression" | "click";
  locale: "en" | "ar";
  sessionHash: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("advertisement_analytics_events")
    .insert({
      advertisement_id: input.advertisementId,
      event_type: input.eventType,
      locale: input.locale,
      session_hash: input.sessionHash,
      metadata: input.metadata ?? {},
    });

  if (error && !/duplicate key value/i.test(error.message)) {
    throw new Error(error.message);
  }
}

export async function getAdvertisementMetrics(advertisementIds: string[]) {
  if (advertisementIds.length === 0) {
    return {} as Record<string, { impressions: number; clicks: number; ctr: number }>;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisement_analytics_events")
    .select("advertisement_id,event_type")
    .in("advertisement_id", advertisementIds);

  if (error) {
    throw new Error(error.message);
  }

  const result: Record<string, { impressions: number; clicks: number; ctr: number }> = {};

  for (const id of advertisementIds) {
    result[id] = { impressions: 0, clicks: 0, ctr: 0 };
  }

  for (const row of data ?? []) {
    const advertisementId = String((row as Record<string, unknown>).advertisement_id ?? "");
    const eventType = String((row as Record<string, unknown>).event_type ?? "");
    if (!result[advertisementId]) {
      result[advertisementId] = { impressions: 0, clicks: 0, ctr: 0 };
    }

    if (eventType === "impression") {
      result[advertisementId].impressions += 1;
    }

    if (eventType === "click") {
      result[advertisementId].clicks += 1;
    }
  }

  for (const id of Object.keys(result)) {
    const bucket = result[id];
    bucket.ctr = bucket.impressions > 0 ? Number(((bucket.clicks / bucket.impressions) * 100).toFixed(2)) : 0;
  }

  return result;
}
