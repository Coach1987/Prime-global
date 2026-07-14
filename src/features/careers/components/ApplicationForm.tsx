"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { careerApplicationSchema, type CareerApplicationSchema } from "../schemas";
import { FilePreview } from "./FilePreview";
import { UploadZone } from "./UploadZone";
import { toUploadPreview, validateUploadFile } from "./UploadValidation";

type FieldName = keyof CareerApplicationSchema;

function getFieldError(
  error: ReturnType<typeof useForm<CareerApplicationSchema>>["formState"]["errors"][FieldName],
  t: ReturnType<typeof useTranslations>
) {
  if (!error) {
    return undefined;
  }

  switch (error.type) {
    case "invalid_type":
      return t("errors.required");
    case "too_small":
      return t("errors.tooShort");
    case "too_big":
      return t("errors.tooLong");
    case "invalid_string":
      return t("errors.invalid");
    default:
      return t("errors.invalid");
  }
}

function Field({
  label,
  name,
  type = "text",
  register,
  error,
}: {
  label: string;
  name: FieldName;
  type?: "text" | "email";
  register: ReturnType<typeof useForm<CareerApplicationSchema>>["register"];
  error?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        type={type}
        {...register(name)}
        className="w-full rounded-xl border border-white/15 bg-[#0f1a2b] px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-blue-300/60 focus:outline-none"
      />
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </label>
  );
}

export function ApplicationForm() {
  const t = useTranslations("careers.apply");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CareerApplicationSchema>({
    resolver: zodResolver(careerApplicationSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      location: "",
      desiredPosition: "",
      yearsOfExperience: "",
      coverLetter: "",
      acceptedTerms: false,
    },
  });

  const preview = useMemo(() => {
    if (!selectedFile) {
      return null;
    }
    return toUploadPreview(selectedFile);
  }, [selectedFile]);

  async function onSubmit(values: CareerApplicationSchema) {
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!selectedFile) {
      setUploadError(t("upload.errors.required"));
      return;
    }

    const formData = new FormData();
    for (const [key, value] of Object.entries(values)) {
      formData.append(key, typeof value === "boolean" ? String(value) : value ?? "");
    }
    formData.append("cv", selectedFile);

    try {
      const response = await fetch("/api/careers", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || t("submitFailed"));
      }

      reset();
      setSelectedFile(null);
      setUploadError(null);
      setSubmitSuccess(true);
    } catch (error) {
      setSubmitSuccess(false);
      setSubmitError(error instanceof Error ? error.message : t("submitFailed"));
    }
  }

  function handleSelectFile(file: File | null) {
    if (!file) {
      setUploadError(null);
      setSelectedFile(null);
      return;
    }

    const result = validateUploadFile(file);
    if (!result.valid) {
      setSelectedFile(null);
      setUploadError(result.reason === "invalidType" ? t("upload.errors.type") : t("upload.errors.size"));
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setValue("coverLetter", watch("coverLetter"), { shouldValidate: true });
  }

  return (
    <section className="mx-auto max-w-5xl rounded-[26px] border border-white/10 bg-[#0d1624]/88 p-5 shadow-[0_24px_74px_rgba(0,0,0,0.42)] sm:p-8" aria-labelledby="careers-apply-heading">
      <header className="mb-6 sm:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold/90">{t("eyebrow")}</p>
        <h1 id="careers-apply-heading" className="mt-2 font-heading text-[32px] text-white sm:text-[44px]">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">{t("description")}</p>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("fields.fullName")} name="fullName" register={register} error={getFieldError(errors.fullName, t)} />
          <Field label={t("fields.email")} name="email" type="email" register={register} error={getFieldError(errors.email, t)} />
          <Field label={t("fields.phone")} name="phone" register={register} error={getFieldError(errors.phone, t)} />
          <Field label={t("fields.location")} name="location" register={register} error={getFieldError(errors.location, t)} />
          <Field label={t("fields.desiredPosition")} name="desiredPosition" register={register} error={getFieldError(errors.desiredPosition, t)} />
          <Field label={t("fields.yearsOfExperience")} name="yearsOfExperience" register={register} error={getFieldError(errors.yearsOfExperience, t)} />
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">{t("fields.coverLetter")}</span>
          <textarea
            {...register("coverLetter")}
            rows={6}
            className="w-full rounded-xl border border-white/15 bg-[#0f1a2b] px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-blue-300/60 focus:outline-none"
          />
          {errors.coverLetter && <span className="text-xs text-rose-300">{getFieldError(errors.coverLetter, t)}</span>}
        </label>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-200">{t("fields.uploadCv")}</h2>
          <UploadZone onSelect={handleSelectFile} />
          <FilePreview file={preview} onClear={() => setSelectedFile(null)} />
          {uploadError && <p className="text-xs text-rose-300">{uploadError}</p>}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.02] p-4">
          <input
            type="checkbox"
            {...register("acceptedTerms")}
            className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent text-gold focus:ring-gold"
          />
          <span className="text-sm leading-6 text-slate-200">{t("fields.acceptTerms")}</span>
        </label>
        {errors.acceptedTerms && <p className="text-xs text-rose-300">{t("errors.acceptTerms")}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-gold/40 bg-gradient-to-r from-[#C9A24B] via-[#D6B66A] to-[#A77F2F] px-7 py-3 text-sm font-semibold text-[#081220] transition-all duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>

          {submitSuccess && <p className="text-sm text-emerald-300">{t("success")}</p>}
          {submitError && <p className="text-sm text-rose-300">{submitError}</p>}
        </div>
      </form>
    </section>
  );
}