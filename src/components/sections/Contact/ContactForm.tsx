"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  contactFormSchema,
  type ContactFormValues,
} from "@/lib/validations/contact-schema";
import { SERVICES } from "@/lib/constants/services";
import { cn } from "@/lib/utils/cn";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const tServices = useTranslations("services.items");

  const [submitState, setSubmitState] =
    useState<SubmitState>("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  async function onSubmit(values: ContactFormValues) {
    setSubmitState("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || t("errorMessage"));
      }

      setSubmitState("success");
      reset();
    } catch {
      setSubmitState("error");
    }
  }

  const input = (error: boolean) =>
    cn(
      "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white placeholder:text-slate-500 backdrop-blur-xl transition-all duration-300 focus:outline-none",
      error
        ? "border-red-400"
        : "focus:border-blue-300 focus:ring-4 focus:ring-blue-400/10"
    );

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-8 shadow-[0_24px_70px_rgba(0,0,0,.35)] backdrop-blur-2xl md:p-10">

      <div className="absolute -right-24 -top-24 h-60 w-60 rounded-full bg-blue-500/10 blur-[120px]" />

      <h2 className="font-heading text-3xl text-white">
        {t("title")}
      </h2>

      <div className="mt-3 h-px w-16 bg-gradient-to-r from-blue-300 to-transparent" />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-10 space-y-6"
      >
        <input
          {...register("name")}
          placeholder={t("namePlaceholder")}
          className={input(!!errors.name)}
        />

        <input
          {...register("email")}
          type="email"
          dir="ltr"
          placeholder={t("emailPlaceholder")}
          className={input(!!errors.email)}
        />

        <select
          {...register("service")}
          defaultValue=""
          className={cn(input(!!errors.service), "appearance-none")}
        >
          <option value="" disabled>
            {t("servicePlaceholder")}
          </option>

          {SERVICES.map((service) => (
            <option
              key={service.slug}
              value={service.slug}
            >
              {tServices(`${service.key}.title`)}
            </option>
          ))}

          <option value="other">
            {t("serviceOther")}
          </option>
        </select>

        <textarea
          {...register("message")}
          rows={6}
          placeholder={t("messagePlaceholder")}
          className={cn(
            input(!!errors.message),
            "resize-none"
          )}
        />

        <button
          disabled={submitState === "submitting"}
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 px-8 py-4 text-white font-semibold shadow-[0_18px_45px_rgba(30,120,255,.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(30,120,255,.45)] disabled:opacity-60"
        >
          {submitState === "submitting"
            ? t("sending")
            : t("send")}
        </button>

        <div role="status" aria-live="polite">
          {submitState === "success" && (
            <p className="text-emerald-400">
              {t("successMessage")}
            </p>
          )}

          {submitState === "error" && (
            <p className="text-red-400">
              {t("errorMessage")}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
