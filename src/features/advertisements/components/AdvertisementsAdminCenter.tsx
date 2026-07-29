"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeButton, primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import type { AdvertisementRecord, AdvertisementStatus } from "@/features/advertisements/types";

type AdminAdvertisementItem = AdvertisementRecord & {
  metrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
};

type AdvertisementFormState = {
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  media_type: "image" | "video";
  media_url: string;
  media_alt_ar: string;
  media_alt_en: string;
  target_url: string;
  cta_text_ar: string;
  cta_text_en: string;
  priority: number;
  starts_at: string;
  ends_at: string;
};

const ADMIN_ROLES = new Set(["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);

const INITIAL_FORM: AdvertisementFormState = {
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  media_type: "image",
  media_url: "",
  media_alt_ar: "",
  media_alt_en: "",
  target_url: "https://",
  cta_text_ar: "",
  cta_text_en: "",
  priority: 100,
  starts_at: "",
  ends_at: "",
};

const FILTERS: Array<"all" | AdvertisementStatus> = [
  "all",
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "active",
  "paused",
  "expired",
];

function toDatetimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function mapRecordToForm(advertisement: AdvertisementRecord): AdvertisementFormState {
  return {
    title_ar: advertisement.title_ar,
    title_en: advertisement.title_en,
    description_ar: advertisement.description_ar,
    description_en: advertisement.description_en,
    media_type: advertisement.media_type,
    media_url: advertisement.media_url,
    media_alt_ar: advertisement.media_alt_ar,
    media_alt_en: advertisement.media_alt_en,
    target_url: advertisement.target_url,
    cta_text_ar: advertisement.cta_text_ar,
    cta_text_en: advertisement.cta_text_en,
    priority: advertisement.priority,
    starts_at: toDatetimeLocal(advertisement.starts_at),
    ends_at: toDatetimeLocal(advertisement.ends_at),
  };
}

function buildPayload(form: AdvertisementFormState) {
  return {
    ...form,
    starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
    ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
  };
}

export function AdvertisementsAdminCenter({ locale }: { locale: string }) {
  const t = useTranslations("advertisementsAdmin");
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AdvertisementStatus>("all");
  const [items, setItems] = useState<AdminAdvertisementItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AdvertisementFormState>(INITIAL_FORM);

  const readErrorMessage = useCallback(async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as {
        error?: {
          message?: string;
        };
      };

      return payload.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }, []);

  const loadAds = useCallback(async (nextFilter: "all" | AdvertisementStatus) => {
    const response = await fetch(`/api/admin/advertisements?status=${nextFilter}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, t("errors.loadFailed")));
    }

    const payload = (await response.json()) as {
      data?: AdminAdvertisementItem[];
    };

    setItems(payload.data ?? []);
  }, [readErrorMessage, t]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        setError(null);

        const [csrfResponse, authResponse] = await Promise.all([
          fetch("/api/security/csrf", { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" }),
        ]);

        const csrfPayload = await csrfResponse.json();
        setCsrfToken(String(csrfPayload?.data?.csrfToken ?? ""));

        const authPayload = await authResponse.json();
        const role = String(authPayload?.data?.role ?? "");
        const isAllowed = Boolean(authPayload?.success) && ADMIN_ROLES.has(role);
        setAuthorized(isAllowed);

        if (!isAllowed) {
          setError(t("errors.unauthorized"));
          return;
        }

        await loadAds(filter);
      } catch {
        setError(t("errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [filter, loadAds, t]);

  function updateField<Key extends keyof AdvertisementFormState>(key: Key, value: AdvertisementFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setNotice(null);

      const payload = buildPayload(form);
      const response = await fetch(
        selectedId ? `/api/admin/advertisements/${selectedId}` : "/api/admin/advertisements",
        {
          method: selectedId ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, t("errors.saveFailed")));
      }

      const responsePayload = (await response.json()) as { data?: AdminAdvertisementItem };
      const saved = responsePayload.data;

      if (saved) {
        setSelectedId(saved.id);
        setForm(mapRecordToForm(saved));
      }

      await loadAds(filter);
      setNotice(t("notices.saved"));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onUpload(file: File) {
    try {
      setUploading(true);
      setError(null);
      setNotice(null);

      const formData = new FormData();
      formData.set("file", file);
      formData.set("locale", locale === "ar" ? "ar" : "en");

      const response = await fetch("/api/admin/advertisements/upload", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, t("errors.uploadFailed")));
      }

      const payload = (await response.json()) as {
        data?: {
          mediaUrl?: string;
          mediaType?: "image" | "video";
        };
      };

      if (payload.data?.mediaUrl) {
        updateField("media_url", payload.data.mediaUrl);
      }

      if (payload.data?.mediaType) {
        updateField("media_type", payload.data.mediaType);
      }

      setNotice(t("notices.uploaded"));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("errors.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function onAction(action: "submit_review" | "approve" | "reject" | "activate" | "pause") {
    if (!selectedId) {
      return;
    }

    const reason =
      action === "reject"
        ? window.prompt(t("prompts.rejectionReason"), "")?.trim() ?? ""
        : "";

    if (action === "reject" && reason.length < 3) {
      setError(t("errors.rejectReasonRequired"));
      return;
    }

    try {
      setError(null);
      setNotice(null);

      const response = await fetch(`/api/admin/advertisements/${selectedId}/actions`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, t("errors.actionFailed")));
      }

      const payload = (await response.json()) as { data?: AdminAdvertisementItem };
      if (payload.data) {
        setForm(mapRecordToForm(payload.data));
      }

      await loadAds(filter);
      setNotice(t("notices.actionCompleted"));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t("errors.actionFailed"));
    }
  }

  async function onDelete() {
    if (!selectedId) {
      return;
    }

    if (!window.confirm(t("prompts.deleteConfirm"))) {
      return;
    }

    try {
      setError(null);
      setNotice(null);

      const response = await fetch(`/api/admin/advertisements/${selectedId}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-csrf-token": csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, t("errors.deleteFailed")));
      }

      setSelectedId(null);
      setForm(INITIAL_FORM);
      await loadAds(filter);
      setNotice(t("notices.deleted"));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("errors.deleteFailed"));
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1340px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard className="p-7 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-text-primary md:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>
          </div>
          <button
            type="button"
            className={primeButtonClasses("secondary")}
            onClick={() => {
              setSelectedId(null);
              setForm(INITIAL_FORM);
              setNotice(t("notices.newDraft"));
            }}
          >
            {t("newDraft")}
          </button>
        </div>

        {loading ? <p className="mt-6 text-sm text-text-secondary">{t("loading")}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-300">{notice}</p> : null}

        {!authorized && !loading ? <p className="mt-8 text-sm text-text-secondary">{t("errors.unauthorized")}</p> : null}

        {authorized ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
            <section className="rounded-2xl border border-white/10 bg-[#071429]/70 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {FILTERS.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setFilter(entry)}
                    className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.14em] transition ${filter === entry ? "border-blue-200/70 bg-blue-200/20 text-blue-100" : "border-white/20 text-text-secondary hover:border-blue-200/40 hover:text-blue-100"}`}
                  >
                    {t(`filters.${entry}`)}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const selectedItem = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id);
                        setForm(mapRecordToForm(item));
                      }}
                      className={`w-full rounded-xl border p-4 text-left transition ${selectedItem ? "border-blue-200/70 bg-blue-200/15" : "border-white/10 bg-[#08162b]/65 hover:border-blue-200/35"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="line-clamp-1 font-semibold text-text-primary">{item.title_en}</h2>
                        <span className="rounded-full border border-blue-200/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-100">
                          {t(`filters.${item.status}`)}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{item.description_en}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-tertiary">
                        <span>{t("priority")}: {item.priority}</span>
                        <span>{t("impressions")}: {item.metrics?.impressions ?? 0}</span>
                        <span>{t("clicks")}: {item.metrics?.clicks ?? 0}</span>
                        <span>{t("ctr")}: {item.metrics?.ctr ?? 0}%</span>
                      </div>
                    </button>
                  );
                })}

                {!loading && items.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-[#08162b]/60 p-4 text-sm text-text-secondary">{t("empty")}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#071429]/70 p-5">
              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {t("fields.titleEn")}
                    <input
                      required
                      value={form.title_en}
                      onChange={(event) => updateField("title_en", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.titleAr")}
                    <input
                      required
                      dir="rtl"
                      value={form.title_ar}
                      onChange={(event) => updateField("title_ar", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {t("fields.descriptionEn")}
                    <textarea
                      required
                      rows={4}
                      value={form.description_en}
                      onChange={(event) => updateField("description_en", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.descriptionAr")}
                    <textarea
                      required
                      dir="rtl"
                      rows={4}
                      value={form.description_ar}
                      onChange={(event) => updateField("description_ar", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {t("fields.ctaEn")}
                    <input
                      required
                      value={form.cta_text_en}
                      onChange={(event) => updateField("cta_text_en", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.ctaAr")}
                    <input
                      required
                      dir="rtl"
                      value={form.cta_text_ar}
                      onChange={(event) => updateField("cta_text_ar", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {t("fields.altEn")}
                    <input
                      required
                      value={form.media_alt_en}
                      onChange={(event) => updateField("media_alt_en", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.altAr")}
                    <input
                      required
                      dir="rtl"
                      value={form.media_alt_ar}
                      onChange={(event) => updateField("media_alt_ar", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {t("fields.targetUrl")}
                    <input
                      required
                      type="url"
                      value={form.target_url}
                      onChange={(event) => updateField("target_url", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.priority")}
                    <input
                      required
                      type="number"
                      min={1}
                      max={10000}
                      value={form.priority}
                      onChange={(event) => updateField("priority", Number(event.target.value || "0"))}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm text-text-secondary">
                    {t("fields.startsAt")}
                    <input
                      type="datetime-local"
                      value={form.starts_at}
                      onChange={(event) => updateField("starts_at", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.endsAt")}
                    <input
                      type="datetime-local"
                      value={form.ends_at}
                      onChange={(event) => updateField("ends_at", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>
                </div>

                <div className="grid gap-3 rounded-xl border border-white/10 bg-[#08162b]/70 p-4">
                  <label className="text-sm text-text-secondary">
                    {t("fields.mediaType")}
                    <select
                      value={form.media_type}
                      onChange={(event) => updateField("media_type", event.target.value as "image" | "video")}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    >
                      <option value="image">{t("media.image")}</option>
                      <option value="video">{t("media.video")}</option>
                    </select>
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.mediaPath")}
                    <input
                      required
                      value={form.media_url}
                      onChange={(event) => updateField("media_url", event.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/20 bg-[#031024] px-3 py-2 text-sm text-text-primary"
                    />
                  </label>

                  <label className="text-sm text-text-secondary">
                    {t("fields.upload")}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void onUpload(file);
                        }
                      }}
                      className="mt-1.5 block w-full text-sm text-text-secondary file:me-3 file:rounded-full file:border-0 file:bg-blue-200/20 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-100"
                    />
                  </label>

                  <p className="text-xs text-text-tertiary">{t("uploadHint")}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PrimeButton type="submit" disabled={saving || uploading}>
                    {saving ? t("saving") : selectedId ? t("update") : t("create")}
                  </PrimeButton>

                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => void onAction("submit_review")}
                    disabled={!selectedId}
                  >
                    {t("actions.submitReview")}
                  </button>

                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => void onAction("approve")}
                    disabled={!selectedId}
                  >
                    {t("actions.approve")}
                  </button>

                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => void onAction("reject")}
                    disabled={!selectedId}
                  >
                    {t("actions.reject")}
                  </button>

                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => void onAction("activate")}
                    disabled={!selectedId}
                  >
                    {t("actions.activate")}
                  </button>

                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => void onAction("pause")}
                    disabled={!selectedId}
                  >
                    {t("actions.pause")}
                  </button>

                  <button
                    type="button"
                    className={primeButtonClasses("secondary")}
                    onClick={() => void onDelete()}
                    disabled={!selectedId}
                  >
                    {t("actions.delete")}
                  </button>
                </div>
              </form>

              <div className="mt-6 rounded-xl border border-white/10 bg-[#08162b]/70 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">{t("preview")}</p>
                <h3 className="mt-2 text-lg font-semibold text-text-primary">{form.title_en || t("previewFallback")}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{form.description_en || t("previewDescription")}</p>
                {form.media_url ? (
                  form.media_type === "video" ? (
                    <video src={form.media_url} controls preload="metadata" className="mt-4 max-h-56 w-full rounded-lg object-cover" />
                  ) : (
                    <div className="relative mt-4 h-56 w-full overflow-hidden rounded-lg">
                      <Image
                        src={form.media_url}
                        alt={form.media_alt_en || "preview"}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  )
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </PrimeCard>
    </main>
  );
}
