"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { contactFormSchema, type ContactFormValues } from "@/lib/validations/contact-schema";
import { SERVICES } from "@/lib/constants/services";
import { cn } from "@/lib/utils/cn";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const tServices = useTranslations("services.items");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");

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
      // NOTE — NOT WIRED TO A BACKEND YET: this project has no API route
      // or email service configured. This handler currently only
      // simulates a network call so the submitting/success/error UI
      // states can be built and reused. Before shipping, replace this
      // with a real call to an API route (e.g. app/api/contact/route.ts
      // sending via Resend/Nodemailer) or a third-party form backend
      // (e.g. Formspree). `values` is already validated and typed.
      await new Promise((resolve) => setTimeout(resolve, 900));
      void values;
      setSubmitState("success");
      reset();
    } catch {
      setSubmitState("error");
    }
  }

  const inputClass = (hasError: boolean) =>
    cn(
      "w-full rounded-[10px] border bg-bg-elevated px-4 py-[14px] text-[15px] text-text-primary placeholder:text-text-tertiary",
      "transition-colors duration-200 focus:outline-none focus:ring-[3px]",
      hasError
        ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/15"
        : "border-white/[0.08] focus:border-accent-primary focus:ring-accent-primary/15"
    );

  return (
    <div className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-md md:p-10">
      <h2 className="font-heading text-2xl text-text-primary">{t("title")}</h2>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="name" className="mb-2 block text-[13px] font-medium text-text-secondary">
            {t("name")}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
            className={inputClass(Boolean(errors.name))}
            placeholder={t("namePlaceholder")}
          />
          {errors.name && (
            <p id="name-error" role="alert" className="mt-1.5 text-[13px] text-red-400">
              {t(`errors.${errors.name.message}`)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-[13px] font-medium text-text-secondary">
            {t("email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
            className={inputClass(Boolean(errors.email))}
            placeholder={t("emailPlaceholder")}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="mt-1.5 text-[13px] text-red-400">
              {t(`errors.${errors.email.message}`)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="service" className="mb-2 block text-[13px] font-medium text-text-secondary">
            {t("service")}
          </label>
          <select
            id="service"
            defaultValue=""
            aria-invalid={errors.service ? "true" : "false"}
            aria-describedby={errors.service ? "service-error" : undefined}
            {...register("service")}
            className={cn(inputClass(Boolean(errors.service)), "appearance-none")}
          >
            <option value="" disabled>
              {t("servicePlaceholder")}
            </option>
            {SERVICES.map((service) => (
              <option key={service.slug} value={service.slug}>
                {tServices(`${service.key}.title`)}
              </option>
            ))}
            <option value="other">{t("serviceOther")}</option>
          </select>
          {errors.service && (
            <p id="service-error" role="alert" className="mt-1.5 text-[13px] text-red-400">
              {t(`errors.${errors.service.message}`)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="message" className="mb-2 block text-[13px] font-medium text-text-secondary">
            {t("message")}
          </label>
          <textarea
            id="message"
            rows={5}
            aria-invalid={errors.message ? "true" : "false"}
            aria-describedby={errors.message ? "message-error" : undefined}
            {...register("message")}
            className={cn(inputClass(Boolean(errors.message)), "resize-none")}
            placeholder={t("messagePlaceholder")}
          />
          {errors.message && (
            <p id="message-error" role="alert" className="mt-1.5 text-[13px] text-red-400">
              {t(`errors.${errors.message.message}`)}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitState === "submitting"}
          className="mt-2 inline-flex w-full items-center justify-center rounded-[10px] bg-gradient-to-br from-accent-primary to-gold-muted px-8 py-[14px] text-[15px] font-semibold text-charcoal shadow-[0_4px_20px_rgba(201,162,75,0.35)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_28px_rgba(201,162,75,0.5)] hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          {submitState === "submitting" ? t("sending") : t("send")}
        </button>

        {/* Submission feedback — role="status" with aria-live so screen
            reader users are notified when the outcome appears, since this
            is a DOM mutation that wouldn't otherwise be announced. */}
        <div role="status" aria-live="polite">
          {submitState === "success" && (
            <p className="flex items-center gap-2 text-[14px] font-medium text-emerald-400">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5.5 9.5l2 2 5-5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("successMessage")}
            </p>
          )}
          {submitState === "error" && (
            <p className="text-[14px] font-medium text-red-400">{t("errorMessage")}</p>
          )}
        </div>
      </form>
    </div>
  );
}
