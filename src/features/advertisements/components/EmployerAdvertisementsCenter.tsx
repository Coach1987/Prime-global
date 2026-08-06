"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { PrimeButton, primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import {
  employerInput,
  employerPageShell,
  employerSecondaryButton,
  employerSectionCard,
} from "@/features/employers/ui/portal-theme";
import type { AdvertisementRecord, AdvertisementStatus } from "@/features/advertisements/types";

type EmployerAdvertisementItem = AdvertisementRecord;

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

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
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

function statusLabel(status: AdvertisementStatus) {
  if (status === "pending_review") return "Pending Review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "active") return "Visible";
  if (status === "paused") return "Hidden";
  if (status === "expired") return "Expired";
  return "Draft";
}

export function EmployerAdvertisementsCenter({ locale }: { locale: string }) {
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [hasEmployerProfile, setHasEmployerProfile] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [items, setItems] = useState<EmployerAdvertisementItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<AdvertisementFormState>(INITIAL_FORM);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readErrorMessage = useCallback(async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      return payload.error?.message ?? fallback;
    } catch {
      return fallback;
    }
  }, []);

  const loadAds = useCallback(async () => {
    const response = await fetch("/api/employers/advertisements", {
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 404) {
        setHasEmployerProfile(false);
        setItems([]);
        return;
      }
      throw new Error(await readErrorMessage(response, "Failed to load advertisements."));
    }

    setHasEmployerProfile(true);

    const payload = (await response.json()) as { data?: EmployerAdvertisementItem[] };
    const nextItems = payload.data ?? [];
    setItems(nextItems);

    if (nextItems.length > 0 && !selectedId) {
      setSelectedId(nextItems[0].id);
      setForm(mapRecordToForm(nextItems[0]));
    }
  }, [readErrorMessage, selectedId]);

  useEffect(() => {
    async function bootstrap() {
      try {
        setLoading(true);
        const csrfResponse = await fetch("/api/security/csrf", { credentials: "include" });
        const csrfPayload = await csrfResponse.json();
        setCsrfToken(String(csrfPayload?.data?.csrfToken ?? ""));

        const profileResponse = await fetch("/api/employers/profile", { credentials: "include" });
        const profilePayload = await profileResponse.json().catch(() => null);
        const profileExists = Boolean(profileResponse.ok && profilePayload?.success && profilePayload?.data);
        setHasEmployerProfile(profileExists);

        if (!profileExists) {
          setItems([]);
          return;
        }

        await loadAds();
      } catch (bootstrapError) {
        setError(bootstrapError instanceof Error ? bootstrapError.message : "Failed to load employer advertisements.");
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [loadAds]);

  function updateField<Key extends keyof AdvertisementFormState>(key: Key, value: AdvertisementFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      // Upload pending file before saving — media_url must exist before the API call.
      if (pendingFile) {
        const uploaded = await onUpload(pendingFile);
        setPendingFile(null);
        if (!uploaded) {
          setSaving(false);
          return;
        }
      }

      // Guard: reject the save if media_url is still empty after any upload.
      if (!form.media_url) {
        setError(locale === "ar" ? "يرجى اختيار ملف وسائط قبل حفظ الإعلان." : "Please select a media file to upload before saving the advertisement.");
        setSaving(false);
        return;
      }

      const response = await fetch(
        selectedId ? `/api/employers/advertisements/${selectedId}` : "/api/employers/advertisements",
        {
          method: selectedId ? "PATCH" : "POST",
          credentials: "include",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(buildPayload(form)),
        }
      );

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to save advertisement."));
      }

      const payload = (await response.json()) as { data?: EmployerAdvertisementItem };
      if (payload.data) {
        setSelectedId(payload.data.id);
        setForm(mapRecordToForm(payload.data));
      }

      await loadAds();
      setMessage(selectedId ? "Advertisement updated." : "Advertisement draft created.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save advertisement.");
    } finally {
      setSaving(false);
    }
  }

  // Returns true on success so onSubmit can continue; false on failure.
  async function onUpload(file: File): Promise<boolean> {
    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      const formData = new FormData();
      formData.set("file", file);
      formData.set("locale", locale === "ar" ? "ar" : "en");

      const response = await fetch("/api/employers/advertisements/upload", {
        method: "POST",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to upload media."));
      }

      const payload = (await response.json()) as {
        data?: { mediaUrl?: string; mediaType?: "image" | "video" };
      };

      if (payload.data?.mediaUrl) updateField("media_url", payload.data.mediaUrl);
      if (payload.data?.mediaType) updateField("media_type", payload.data.mediaType);

      return true;
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload media.");
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function submitForReview() {
    if (!selectedId) return;

    try {
      setError(null);
      setMessage(null);
      const response = await fetch(`/api/employers/advertisements/${selectedId}/actions`, {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ action: "submit_review" }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to submit advertisement for review."));
      }

      await loadAds();
      setMessage("Advertisement submitted for Prime Global review.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit advertisement for review.");
    }
  }

  async function onDelete() {
    if (!selectedId || !window.confirm("Delete this advertisement draft?")) return;

    try {
      setError(null);
      setMessage(null);
      const response = await fetch(`/api/employers/advertisements/${selectedId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "x-csrf-token": csrfToken },
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "Unable to delete advertisement."));
      }

      setSelectedId(null);
      setForm(INITIAL_FORM);
      setPendingFile(null);
      await loadAds();
      setMessage("Advertisement deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete advertisement.");
    }
  }

  return (
    <main className={employerPageShell}>
      <PrimeCard className="rounded-3xl border border-gold/20 bg-bg-secondary/80 p-7 shadow-[0_20px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-text-primary md:text-4xl">{locale === "ar" ? "الإعلانات" : "Advertisements"}</h1>
            <p className="mt-2 text-sm text-text-secondary">
              {locale === "ar"
                ? "أنشئ إعلانات الشركة وأرسلها للمراجعة عند الحاجة."
                : "Create company advertisements and submit them for review when needed."}
            </p>
          </div>
          {hasEmployerProfile ? (
            <button
              type="button"
              className={primeButtonClasses("secondary")}
              onClick={() => {
                setSelectedId(null);
                setForm(INITIAL_FORM);
                setPendingFile(null);
                setShowCreateForm((current) => !current);
                setMessage(null);
              }}
            >
              {showCreateForm
                ? (locale === "ar" ? "إغلاق" : "Close")
                : (locale === "ar" ? "إعلان جديد" : "New Advertisement")}
            </button>
          ) : null}
        </div>

        {loading ? <p className="mt-6 text-sm text-text-secondary">Loading advertisements...</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-300">{message}</p> : null}

        {!loading && !hasEmployerProfile ? (
          <div className={`mt-8 ${employerSectionCard}`}>
            <p className="text-sm text-text-secondary">
              {locale === "ar"
                ? "أكمل ملف الشركة قبل إنشاء إعلان."
                : "Complete your company profile before creating an advertisement."}
            </p>
            <a
              href={`/${locale}/employers/company-profile`}
              className={`mt-4 ${employerSecondaryButton}`}
            >
              {locale === "ar" ? "الانتقال إلى ملف الشركة" : "Go to Company Profile"}
            </a>
          </div>
        ) : null}

        {!loading && hasEmployerProfile ? (
          <div className="mt-8 space-y-4">
            {items.length === 0 ? (
              <p className={`${employerSectionCard} text-sm text-text-secondary`}>
                {locale === "ar" ? "لا توجد إعلانات حتى الآن." : "No advertisements yet."}
              </p>
            ) : null}
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.id);
                  setForm(mapRecordToForm(item));
                  setPendingFile(null);
                  setShowCreateForm(true);
                }}
                className={`w-full text-left ${employerSectionCard} ${item.id === selectedId ? "border-gold/40 bg-bg-primary" : "hover:border-gold/30"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="line-clamp-1 font-semibold text-text-primary">{item.title_en}</h2>
                  <span className="rounded-full border border-gold/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-gold">
                    {item.status === "draft" && item.moderation_reason ? "Changes Requested" : statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{item.description_en}</p>
              </button>
            ))}
          </div>
        ) : null}

        {hasEmployerProfile && showCreateForm ? (
          <section className={`mt-6 ${employerSectionCard}`}>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Title (English)
                  <input required value={form.title_en} onChange={(event) => updateField("title_en", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
                <label className="text-sm text-text-secondary">
                  Title (Arabic)
                  <input required dir="rtl" value={form.title_ar} onChange={(event) => updateField("title_ar", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Description (English)
                  <textarea required rows={4} value={form.description_en} onChange={(event) => updateField("description_en", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
                <label className="text-sm text-text-secondary">
                  Description (Arabic)
                  <textarea required dir="rtl" rows={4} value={form.description_ar} onChange={(event) => updateField("description_ar", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  CTA Text (English)
                  <input required value={form.cta_text_en} onChange={(event) => updateField("cta_text_en", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
                <label className="text-sm text-text-secondary">
                  CTA Text (Arabic)
                  <input required dir="rtl" value={form.cta_text_ar} onChange={(event) => updateField("cta_text_ar", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Media Alt Text (English)
                  <input required value={form.media_alt_en} onChange={(event) => updateField("media_alt_en", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
                <label className="text-sm text-text-secondary">
                  Media Alt Text (Arabic)
                  <input required dir="rtl" value={form.media_alt_ar} onChange={(event) => updateField("media_alt_ar", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Target URL
                  <input required type="url" value={form.target_url} onChange={(event) => updateField("target_url", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
                <label className="text-sm text-text-secondary">
                  Display Priority
                  <input required type="number" min={1} max={10000} value={form.priority} onChange={(event) => updateField("priority", Number(event.target.value || "0"))} className={`mt-1.5 ${employerInput}`} />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-text-secondary">
                  Start Date/Time
                  <input type="datetime-local" value={form.starts_at} onChange={(event) => updateField("starts_at", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
                <label className="text-sm text-text-secondary">
                  End Date/Time
                  <input type="datetime-local" value={form.ends_at} onChange={(event) => updateField("ends_at", event.target.value)} className={`mt-1.5 ${employerInput}`} />
                </label>
              </div>

              <div className="grid gap-3 rounded-xl border border-gold/15 bg-bg-primary/50 p-4">
                <label className="text-sm text-text-secondary">
                  Media Type
                  <select value={form.media_type} onChange={(event) => updateField("media_type", event.target.value as "image" | "video")} className={`mt-1.5 ${employerInput}`}>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </label>

                <label className="text-sm text-text-secondary">
                  Storage Media Path
                  {/* read-only — populated automatically by the upload endpoint */}
                  <input readOnly value={form.media_url} className={`mt-1.5 ${employerInput} cursor-not-allowed opacity-60`} placeholder="Populated automatically after upload" />
                </label>

                <label className="text-sm text-text-secondary">
                  {uploading ? "Uploading…" : "Upload Media"}
                  {/* Store the file; actual upload runs at the start of onSubmit */}
                  <input type="file" disabled={uploading || saving} accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    setPendingFile(file);
                  }} className="mt-1.5 block w-full text-sm text-text-secondary file:me-3 file:rounded-full file:border-0 file:bg-gold/20 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-gold disabled:opacity-50" />
                  {pendingFile && !form.media_url && (
                    <span className="mt-1 block text-xs text-gold/70">{pendingFile.name} — will upload when you save</span>
                  )}
                </label>

                <p className="text-xs text-text-tertiary">Upload JPG, JPEG, PNG, WEBP, MP4, or WEBM. Images should be at least 1200x420.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PrimeButton type="submit" disabled={saving || uploading}>{saving ? (uploading ? "Uploading…" : "Saving...") : uploading ? "Uploading…" : selectedId ? "Update Advertisement" : "Create Advertisement"}</PrimeButton>
                <button type="button" className={primeButtonClasses("secondary")} onClick={() => void submitForReview()} disabled={!selectedId || uploading || saving}>Submit for Review</button>
                <button type="button" className={primeButtonClasses("secondary")} onClick={() => void onDelete()} disabled={!selectedId || saving || uploading}>Delete</button>
              </div>
            </form>

            <div className="mt-6 rounded-xl border border-gold/15 bg-bg-primary/50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-text-tertiary">Preview</p>
              <h3 className="mt-2 text-lg font-semibold text-text-primary">{form.title_en || "Advertisement title preview"}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-text-secondary">{form.description_en || "Advertisement description preview"}</p>
              {form.media_url ? (
                form.media_type === "video" ? (
                  <video src={form.media_url} controls preload="metadata" className="mt-4 max-h-56 w-full rounded-lg object-cover" />
                ) : (
                  <div className="relative mt-4 h-56 w-full overflow-hidden rounded-lg">
                    <Image src={form.media_url} alt={form.media_alt_en || "preview"} fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                  </div>
                )
              ) : null}
            </div>
          </section>
        ) : null}
      </PrimeCard>
    </main>
  );
}