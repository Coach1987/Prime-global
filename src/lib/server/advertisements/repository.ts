import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AdvertisementRecord,
  PublicAdvertisementItem,
} from "@/features/advertisements/types";
import { createSupabaseAdminClient, createSupabasePublicClient } from "@/lib/server/supabase";
import { ADVERTISEMENT_BUCKET } from "./constants";
import { isAdvertisementPubliclyVisible, sortAdvertisementsForPublic } from "./public";

export class AdvertisementMediaIntegrityError extends Error {
  code: "INVALID_MEDIA_URL" | "MEDIA_OBJECT_MISSING";

  status: number;

  constructor(code: "INVALID_MEDIA_URL" | "MEDIA_OBJECT_MISSING", message: string, status = 400) {
    super(message);
    this.name = "AdvertisementMediaIntegrityError";
    this.code = code;
    this.status = status;
  }
}

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

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function normalizeAdvertisementStoragePath(storagePath: string) {
  return storagePath.trim().replace(/^\/+/, "");
}

function splitAdvertisementStoragePath(storagePath: string) {
  const slashIndex = storagePath.lastIndexOf("/");
  if (slashIndex === -1) {
    return { directory: "", objectName: storagePath };
  }

  return {
    directory: storagePath.slice(0, slashIndex),
    objectName: storagePath.slice(slashIndex + 1),
  };
}

function toAdvertisementMediaIntegrityError(message: string) {
  if (message.includes("Invalid advertisement media path")) {
    return new AdvertisementMediaIntegrityError(
      "INVALID_MEDIA_URL",
      "Advertisement media path must be a valid storage object key."
    );
  }

  if (
    message.includes("Advertisement media object is missing") ||
    message.includes("Cannot activate advertisement because media object is missing from storage")
  ) {
    return new AdvertisementMediaIntegrityError(
      "MEDIA_OBJECT_MISSING",
      "Advertisement media file is missing from storage. Upload the media again before continuing."
    );
  }

  return null;
}

function normalizeAdvertisementWriteError(error: { message?: string } | null) {
  const message = String(error?.message ?? "");
  const integrityError = toAdvertisementMediaIntegrityError(message);
  if (integrityError) {
    return integrityError;
  }

  return new Error(message || "Advertisement write failed.");
}

async function checkAdvertisementMediaObjectExistsViaMetadata(storagePath: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .schema("storage")
    .from("objects")
    .select("id")
    .eq("bucket_id", ADVERTISEMENT_BUCKET)
    .eq("name", storagePath)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      data: null,
      error,
    } as const;
  }

  return {
    ok: true,
    data,
    error: null,
  } as const;
}

async function checkAdvertisementMediaObjectExistsOnce(storagePath: string) {
  const normalizedPath = normalizeAdvertisementStoragePath(storagePath);

  if (!normalizedPath || normalizedPath.includes("://")) {
    return {
      ok: false,
      code: "INVALID_MEDIA_URL",
      message: "Advertisement media path must be a valid storage object key.",
      storagePath: normalizedPath,
    } as const;
  }

  const metadataLookup = await checkAdvertisementMediaObjectExistsViaMetadata(normalizedPath);
  if (metadataLookup.ok) {
    if (metadataLookup.data) {
      return {
        ok: true,
        storagePath: normalizedPath,
      } as const;
    }

    return {
      ok: false,
      code: "MEDIA_OBJECT_MISSING",
      message: "Advertisement media file is missing from storage. Upload the media again before continuing.",
      storagePath: normalizedPath,
    } as const;
  }

  const { directory, objectName } = splitAdvertisementStoragePath(normalizedPath);
  if (!objectName) {
    return {
      ok: false,
      code: "INVALID_MEDIA_URL",
      message: "Advertisement media path must include a file name.",
      storagePath: normalizedPath,
    } as const;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(ADVERTISEMENT_BUCKET)
    .list(directory, { limit: 100, search: objectName });

  if (error) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_MISSING",
      message: "Advertisement media file is missing from storage. Upload the media again before continuing.",
      storagePath: normalizedPath,
    } as const;
  }

  const exactMatch = (data ?? []).some((entry) => entry.name === objectName);
  if (!exactMatch) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_MISSING",
      message: "Advertisement media file is missing from storage. Upload the media again before continuing.",
      storagePath: normalizedPath,
    } as const;
  }

  return {
    ok: true,
    storagePath: normalizedPath,
  } as const;
}

export async function verifyAdvertisementMediaObjectExists(
  storagePath: string,
  options?: { attempts?: number; delayMs?: number }
) {
  const attempts = Number.isFinite(options?.attempts) ? Math.max(1, Math.floor(options?.attempts ?? 1)) : 1;
  const delayMs = Number.isFinite(options?.delayMs) ? Math.max(0, Math.floor(options?.delayMs ?? 0)) : 0;

  let lastResult = await checkAdvertisementMediaObjectExistsOnce(storagePath);
  if (lastResult.ok || lastResult.code === "INVALID_MEDIA_URL") {
    return lastResult;
  }

  for (let attemptIndex = 1; attemptIndex < attempts; attemptIndex += 1) {
    if (delayMs > 0) {
      await wait(delayMs);
    }

    lastResult = await checkAdvertisementMediaObjectExistsOnce(storagePath);
    if (lastResult.ok || lastResult.code === "INVALID_MEDIA_URL") {
      return lastResult;
    }
  }

  return lastResult;
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

export async function listEmployerAdvertisementsByAuthUserId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("created_by", authUserId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AdvertisementRecord[];
}

export async function getEmployerAdvertisementByIdForAuthUser(id: string, authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("advertisements")
    .select("*")
    .eq("id", id)
    .eq("created_by", authUserId)
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
    throw normalizeAdvertisementWriteError(error);
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
    throw normalizeAdvertisementWriteError(error);
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
  const nowIso = new Date().toISOString();

  const { data, error } = await publicClient
    .from("advertisements")
    .select("*")
    .eq("status", "active")
    .eq("moderation_status", "passed")
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gt.${nowIso}`)
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
    const mediaCheck = await verifyAdvertisementMediaObjectExists(entry.media_url, { attempts: 2, delayMs: 75 });
    if (!mediaCheck.ok) {
      continue;
    }

    const signedUrl = await buildSignedMediaUrl(adminClient, mediaCheck.storagePath);
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
