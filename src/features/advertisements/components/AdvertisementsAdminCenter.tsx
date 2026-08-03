"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { PrimeCard } from "@/components/ui/prime/PrimeCard";
import { primeButtonClasses } from "@/components/ui/prime/PrimeButton";
import type { AdvertisementRecord, AdvertisementStatus } from "@/features/advertisements/types";

type AdminAdvertisementItem = AdvertisementRecord;

const ADMIN_ROLES = new Set(["prime_global_recruiter", "prime_global_admin", "admin", "super_admin"]);

const FILTERS: Array<"all" | AdvertisementStatus> = [
  "all",
  "pending_review",
  "approved",
  "active",
  "paused",
  "rejected",
  "expired",
  "draft",
];

function statusLabel(status: AdvertisementStatus, locale: string) {
  if (locale === "ar") {
    if (status === "pending_review") return "قيد المراجعة";
    if (status === "approved") return "معتمد";
    if (status === "rejected") return "مرفوض";
    if (status === "active") return "نشط";
    if (status === "paused") return "متوقف";
    if (status === "expired") return "منتهي";
    return "مسودة";
  }

  if (status === "pending_review") return "Pending review";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "expired") return "Expired";
  return "Draft";
}

export function AdvertisementsAdminCenter({ locale }: { locale: string }) {
  const t = useTranslations("advertisementsAdmin");
  const isArabic = locale === "ar";
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | AdvertisementStatus>("all");
  const [items, setItems] = useState<AdminAdvertisementItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const readErrorMessage = useCallback(async (response: Response, fallback: string) => {
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
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

    const payload = (await response.json()) as { data?: AdminAdvertisementItem[] };
    const nextItems = payload.data ?? [];
    setItems(nextItems);

    if (nextItems.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !nextItems.some((item) => item.id === selectedId)) {
      setSelectedId(nextItems[0].id);
    }
  }, [readErrorMessage, selectedId, t]);

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

  async function onAction(action: "approve" | "reject" | "hide" | "republish") {
    if (!selectedId) return;

    const reason = action === "reject"
      ? window.prompt(isArabic ? "سبب الرفض" : "Rejection reason", "")?.trim() ?? ""
      : "";

    if (action === "reject" && reason.length < 3) {
      setError(t("errors.rejectReasonRequired"));
      return;
    }

    try {
      setActing(true);
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

      await loadAds(filter);
      setNotice(t("notices.actionCompleted"));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : t("errors.actionFailed"));
    } finally {
      setActing(false);
    }
  }

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId]
  );

  return (
    <main className="mx-auto w-full max-w-[1340px] px-4 pb-20 pt-[124px] sm:px-6 md:px-8">
      <PrimeCard className="p-7 md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl text-text-primary md:text-4xl">{t("title")}</h1>
            <p className="mt-2 text-sm text-text-secondary">{t("subtitle")}</p>
          </div>
        </div>

        {loading ? <p className="mt-6 text-sm text-text-secondary">{t("loading")}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {notice ? <p className="mt-4 text-sm text-emerald-300">{notice}</p> : null}
        {!authorized && !loading ? <p className="mt-8 text-sm text-text-secondary">{t("errors.unauthorized")}</p> : null}

        {authorized ? (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${selectedItem ? "border-blue-200/70 bg-blue-200/15" : "border-white/10 bg-[#08162b]/65 hover:border-blue-200/35"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="line-clamp-1 font-semibold text-text-primary">{isArabic ? item.title_ar : item.title_en}</h2>
                        <span className="rounded-full border border-blue-200/30 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-blue-100">
                          {statusLabel(item.status, locale)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-text-secondary">{isArabic ? item.description_ar : item.description_en}</p>
                    </button>
                  );
                })}

                {!loading && items.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-[#08162b]/60 p-4 text-sm text-text-secondary">{t("empty")}</p>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#071429]/70 p-5">
              {!selected ? (
                <p className="text-sm text-text-secondary">{t("empty")}</p>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-text-primary">
                    {isArabic ? selected.title_ar : selected.title_en}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {isArabic ? selected.description_ar : selected.description_en}
                  </p>
                  <p className="mt-2 text-xs text-text-tertiary">
                    {isArabic ? "الحالة" : "Status"}: {statusLabel(selected.status, locale)}
                  </p>

                  {selected.media_url ? (
                    selected.media_type === "video" ? (
                      <video src={selected.media_url} controls preload="metadata" className="mt-4 max-h-64 w-full rounded-lg object-cover" />
                    ) : (
                      <div className="relative mt-4 h-64 w-full overflow-hidden rounded-lg">
                        <Image
                          src={selected.media_url}
                          alt={(isArabic ? selected.media_alt_ar : selected.media_alt_en) || "advertisement"}
                          fill
                          unoptimized
                          sizes="(max-width: 1280px) 100vw, 50vw"
                          className="object-cover"
                        />
                      </div>
                    )
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={primeButtonClasses("secondary")}
                      onClick={() => void onAction("approve")}
                      disabled={acting}
                    >
                      {isArabic ? "موافقة" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className={primeButtonClasses("secondary")}
                      onClick={() => void onAction("reject")}
                      disabled={acting}
                    >
                      {isArabic ? "رفض" : "Reject"}
                    </button>
                    <button
                      type="button"
                      className={primeButtonClasses("secondary")}
                      onClick={() => void onAction("hide")}
                      disabled={acting}
                    >
                      {isArabic ? "إيقاف" : "Pause"}
                    </button>
                    <button
                      type="button"
                      className={primeButtonClasses("secondary")}
                      onClick={() => void onAction("republish")}
                      disabled={acting}
                    >
                      {isArabic ? "تفعيل" : "Activate"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        ) : null}
      </PrimeCard>
    </main>
  );
}
