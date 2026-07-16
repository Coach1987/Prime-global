"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useLocale, useTranslations } from "next-intl";
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
  const locale = useLocale();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);
  const [supportingUploadError, setSupportingUploadError] = useState<string | null>(null);
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
    formData.append("locale", locale === "ar" ? "ar" : "en");
    formData.append("cv", selectedFile);
    for (const file of supportingFiles) {
      formData.append("documents", file);
    }

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
      setSupportingFiles([]);
      setUploadError(null);
      setSupportingUploadError(null);
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

  function handleSelectSupportingFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      setSupportingFiles([]);
      setSupportingUploadError(null);
      return;
    }

    const nextFiles = Array.from(files);
    const invalidFile = nextFiles.find((file) => !validateUploadFile(file).valid);
    if (invalidFile) {
      setSupportingFiles([]);
      setSupportingUploadError(t("upload.errors.type"));
      return;
    }

    setSupportingUploadError(null);
    setSupportingFiles(nextFiles);
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

        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-blue-200">Certificates and supporting documents</h2>
          <label className="block rounded-2xl border border-dashed border-blue-300/35 bg-[#101d31]/60 p-5 text-sm text-slate-200">
            <span className="block text-xs uppercase tracking-[0.14em] text-slate-400">Optional</span>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
              className="mt-3 block w-full text-sm text-slate-200 file:mr-4 file:rounded-full file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              onChange={(event) => handleSelectSupportingFiles(event.target.files)}
            />
          </label>

          {supportingFiles.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-200">
              {supportingFiles.map((file) => {
                const previewFile = toUploadPreview(file);
                return (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3">
                    <span>{previewFile.name}</span>
                    <span className="text-xs text-slate-400">{previewFile.sizeLabel}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {supportingUploadError && <p className="text-xs text-rose-300">{supportingUploadError}</p>}
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
            className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-blue-100/45 bg-gradient-to-r from-[#2a85eb] via-[#4fa8ff] to-[#1d66c8] px-7 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(67,149,246,0.3)] transition-all duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-65"
          >
            {isSubmitting ? t("submitting") : t("submit")}
          </button>

          <div role="status" aria-live="polite" className="min-h-6">
            {submitSuccess && <p className="text-sm text-emerald-300">{t("success")}</p>}
            {submitError && <p className="text-sm text-rose-300">{submitError}</p>}
          </div>
        </div>
      </form>
    </section>
  );
}