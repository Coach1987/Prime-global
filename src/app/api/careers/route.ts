import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { readOptionalEnv, readSupabaseUrl } from "@/lib/server/config/env";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MIME_EXTENSION_MAP: Record<string, "pdf" | "doc" | "docx"> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

const DEFAULT_CV_BUCKET = "prime-global-cv";

const applicationPayloadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(24),
  location: z.string().trim().min(2).max(120),
  desiredPosition: z.string().trim().min(2).max(120),
  yearsOfExperience: z.coerce.number().int().min(0).max(80),
  coverLetter: z.string().trim().min(10).max(2000),
  acceptedTerms: z.literal("true"),
  locale: z.enum(["en", "ar"]).optional(),
});

function getString(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : "";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function inferExtension(fileName: string, mimeType: string) {
  const mapped = MIME_EXTENSION_MAP[mimeType];
  if (mapped) {
    return mapped;
  }

  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "pdf";
  if (lowerName.endsWith(".doc")) return "doc";
  return "docx";
}

function inferLocale(request: Request, formLocale?: string) {
  if (formLocale === "en" || formLocale === "ar") {
    return formLocale;
  }

  const referer = request.headers.get("referer") ?? "";
  if (referer.includes("/ar/")) {
    return "ar";
  }
  if (referer.includes("/en/")) {
    return "en";
  }

  const header = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return header.includes("ar") ? "ar" : "en";
}

function parseCountryCity(location: string) {
  return location.trim().slice(0, 160);
}

function parseLegacyCountryAndCity(location: string) {
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const city = parts[0].slice(0, 120) || "Unknown City";
    const country = parts.slice(1).join(", ").slice(0, 100) || "Unknown Country";
    return { country, city };
  }

  const fallback = location.trim().slice(0, 100) || "Unknown";
  return { country: fallback, city: fallback.slice(0, 120) };
}

function createStoragePath(applicationId: string, fileName: string, mimeType: string) {
  const extension = inferExtension(fileName, mimeType);
  const safeName = sanitizeFileName(fileName.replace(/\.[^.]+$/, "")) || "cv";
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const timestamp = String(now.getTime());
  return `job-applications/${year}/${month}/${applicationId}-${timestamp}-${safeName}.${extension}`;
}

function getCvBucketName() {
  return readOptionalEnv("SUPABASE_CV_BUCKET") ?? DEFAULT_CV_BUCKET;
}

function maskSecret(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 10) return `${trimmed.slice(0, 2)}***`;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}

function toObjectError(error: unknown) {
  if (!error || typeof error !== "object") {
    return {
      code: null,
      statusCode: null,
      message: String(error ?? "Unknown error"),
      name: "UnknownError",
    };
  }

  const record = error as Record<string, unknown>;
  return {
    code:
      (typeof record.code === "string" && record.code) ||
      (typeof record.error === "string" && record.error) ||
      (typeof record.statusCode === "string" && record.statusCode) ||
      (typeof record.statusCode === "number" ? String(record.statusCode) : null),
    statusCode:
      typeof record.statusCode === "number"
        ? record.statusCode
        : typeof record.status === "number"
          ? record.status
          : null,
    message:
      (typeof record.message === "string" && record.message) ||
      (typeof record.error_description === "string" && record.error_description) ||
      JSON.stringify(record),
    name: (typeof record.name === "string" && record.name) || "StorageError",
  };
}

function getDebugMode(request: Request) {
  const url = new URL(request.url);
  const debugParam = url.searchParams.get("debug");
  const debugHeader = request.headers.get("x-debug-careers");
  return debugParam === "1" || debugHeader === "1";
}

function getRuntimeEnvSnapshot(cvBucket: string) {
  const nextPublicSupabaseUrl = readOptionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const nextPublicSupabaseAnonKey = readOptionalEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY");
  const configuredBucket = readOptionalEnv("SUPABASE_CV_BUCKET");
  const resolvedSupabaseUrl = readSupabaseUrl() ?? null;

  return {
    NEXT_PUBLIC_SUPABASE_URL: nextPublicSupabaseUrl ?? null,
    RESOLVED_SUPABASE_URL: resolvedSupabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: maskSecret(nextPublicSupabaseAnonKey),
    SUPABASE_SERVICE_ROLE_KEY: {
      isSet: Boolean(serviceRoleKey),
      masked: maskSecret(serviceRoleKey),
      length: serviceRoleKey?.length ?? 0,
    },
    SUPABASE_CV_BUCKET: configuredBucket ?? null,
    resolvedUploadBucket: cvBucket,
  };
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    const debugMode = getDebugMode(request);

    if (!readSupabaseUrl() || !readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY")) {
      const cvBucket = getCvBucketName();
      const envSnapshot = getRuntimeEnvSnapshot(cvBucket);
      console.error("[careers:config] missing Supabase server configuration", envSnapshot);

      return NextResponse.json(
        {
          error: "Application submission is being configured. Please contact us directly for now.",
          ...(debugMode ? { debug: envSnapshot } : {}),
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const cvFile = formData.get("cv");

    if (!(cvFile instanceof File)) {
      return NextResponse.json({ error: "CV file is required." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(cvFile.type)) {
      return NextResponse.json({ error: "Unsupported CV file type." }, { status: 400 });
    }

    if (cvFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "CV file exceeds 5 MB limit." }, { status: 400 });
    }

    const parseResult = applicationPayloadSchema.safeParse({
      fullName: getString(formData, "fullName"),
      email: getString(formData, "email"),
      phone: getString(formData, "phone"),
      location: getString(formData, "location"),
      desiredPosition: getString(formData, "desiredPosition"),
      yearsOfExperience: getString(formData, "yearsOfExperience"),
      coverLetter: getString(formData, "coverLetter"),
      acceptedTerms: getString(formData, "acceptedTerms"),
      locale: getString(formData, "locale") || undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid application payload.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const locale = inferLocale(request, data.locale);
    const countryCity = parseCountryCity(data.location);
    const cvBucket = getCvBucketName();
    const envSnapshot = getRuntimeEnvSnapshot(cvBucket);

    console.info("[careers:upload] resolved storage bucket", {
      resolvedUploadBucket: cvBucket,
      configuredBucket: envSnapshot.SUPABASE_CV_BUCKET,
      serviceRoleConfigured: envSnapshot.SUPABASE_SERVICE_ROLE_KEY.isSet,
    });

    const supabase = createSupabaseAdminClient();

    const applicationId = crypto.randomUUID();
    const storagePath = createStoragePath(applicationId, cvFile.name, cvFile.type);
    const fileBuffer = Buffer.from(await cvFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(cvBucket).upload(storagePath, fileBuffer, {
      contentType: cvFile.type,
      upsert: false,
    });

    if (uploadError) {
      const parsedUploadError = toObjectError(uploadError);
      console.error("[careers:upload] storage upload failed", {
        bucket: cvBucket,
        storagePath,
        ...parsedUploadError,
      });

      return NextResponse.json(
        {
          error: "Failed to upload CV.",
          details: parsedUploadError.message,
          code: parsedUploadError.code,
          statusCode: parsedUploadError.statusCode,
          ...(debugMode
            ? {
                debug: {
                  bucket: cvBucket,
                  storagePath,
                  env: envSnapshot,
                },
              }
            : {}),
        },
        { status: 500 }
      );
    }

    console.info("[careers:upload] file upload succeeded, proceeding to insert database row", {
      bucket: cvBucket,
      storagePath,
      applicationId,
    });

    const jobApplicationPayload = {
      id: applicationId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      country_city: countryCity,
      desired_position: data.desiredPosition,
      years_of_experience: data.yearsOfExperience,
      professional_message: data.coverLetter,
      cv_storage_path: storagePath,
      original_cv_filename: cvFile.name.slice(0, 255),
      cv_mime_type: cvFile.type,
      cv_size_bytes: cvFile.size,
      consent_accepted: true,
      status: "new",
      locale,
    };

    const { error: jobInsertError } = await supabase.from("job_applications").insert(jobApplicationPayload);

    let insertError = jobInsertError;
    let insertedTable = "job_applications";

    if (jobInsertError) {
      const parsedJobInsertError = toObjectError(jobInsertError);
      const shouldTryLegacyApplicationsTable =
        parsedJobInsertError.code === "PGRST205" ||
        parsedJobInsertError.message.toLowerCase().includes("job_applications");

      if (shouldTryLegacyApplicationsTable) {
        const { country, city } = parseLegacyCountryAndCity(data.location);
        const { error: legacyInsertError } = await supabase.from("applications").insert({
          id: applicationId,
          full_name: data.fullName,
          email: data.email,
          phone: data.phone,
          country,
          city,
          position: data.desiredPosition,
          experience: String(data.yearsOfExperience),
          cover_letter: data.coverLetter,
          cv_url: storagePath,
          cv_filename: cvFile.name.slice(0, 255),
          status: "pending",
        });

        if (!legacyInsertError) {
          insertError = null;
          insertedTable = "applications";
          console.warn("[careers:insert] fell back to legacy applications table", {
            applicationId,
            bucket: cvBucket,
            storagePath,
          });
        } else {
          insertError = legacyInsertError;
          insertedTable = "applications";
        }
      }
    }

    if (insertError) {
      const parsedInsertError = toObjectError(insertError);
      console.error("[careers:insert] insert failed, removing uploaded file", {
        bucket: cvBucket,
        storagePath,
        applicationId,
        insertedTable,
        ...parsedInsertError,
      });

      await supabase.storage.from(cvBucket).remove([storagePath]);
      return NextResponse.json(
        {
          error: "Failed to save application.",
          details: parsedInsertError.message,
          code: parsedInsertError.code,
          statusCode: parsedInsertError.statusCode,
          ...(debugMode
            ? {
                debug: {
                  bucket: cvBucket,
                  storagePath,
                  env: envSnapshot,
                  insertedTable,
                },
              }
            : {}),
        },
        { status: 500 }
      );
    }

    console.info("[careers:insert] application insert succeeded", {
      applicationId,
      bucket: cvBucket,
      storagePath,
      insertedTable,
    });

    return NextResponse.json(
      {
        success: true,
        id: applicationId,
        ...(debugMode
          ? {
              debug: {
                bucket: cvBucket,
                storagePath,
                env: envSnapshot,
                insertedTable,
              },
            }
          : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Unexpected server error.", details: message }, { status: 500 });
  }
}
