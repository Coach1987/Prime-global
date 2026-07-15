import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuditLog } from "@/lib/server/security/audit";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { readOptionalEnv, readSupabaseUrl } from "@/lib/server/config/env";
import { generateCandidateProfileDraft } from "@/lib/server/candidates/profile-generation";

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

const DEFAULT_CV_BUCKET = "candidate-private-documents";

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

function createPrivateStoragePath(candidateId: string, kind: "cv" | "document", fileName: string, mimeType: string) {
  const extension = inferExtension(fileName, mimeType);
  const safeName = sanitizeFileName(fileName.replace(/\.[^.]+$/, "")) || "cv";
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const timestamp = String(now.getTime());
  return `candidate-private/${candidateId}/${kind}/${year}/${month}/${timestamp}-${safeName}.${extension}`;
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
    const supportingDocuments = ["documents", "supportingDocuments", "certificates"]
      .flatMap((fieldName) => formData.getAll(fieldName))
      .filter((entry): entry is File => entry instanceof File);

    if (!(cvFile instanceof File)) {
      return NextResponse.json({ error: "CV file is required." }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(cvFile.type)) {
      return NextResponse.json({ error: "Unsupported CV file type." }, { status: 400 });
    }

    if (cvFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "CV file exceeds 5 MB limit." }, { status: 400 });
    }

    for (const document of supportingDocuments) {
      if (!ALLOWED_MIME_TYPES.has(document.type)) {
        return NextResponse.json({ error: "Unsupported supporting document file type." }, { status: 400 });
      }

      if (document.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "Supporting document exceeds 5 MB limit." }, { status: 400 });
      }
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
    const privateDocsBucket = getCvBucketName();
    const envSnapshot = getRuntimeEnvSnapshot(privateDocsBucket);
    const applicationId = crypto.randomUUID();
    const candidateId = crypto.randomUUID();

    console.info("[careers:upload] resolved storage bucket", {
      resolvedUploadBucket: privateDocsBucket,
      configuredBucket: envSnapshot.SUPABASE_CV_BUCKET,
      serviceRoleConfigured: envSnapshot.SUPABASE_SERVICE_ROLE_KEY.isSet,
    });

    const supabase = createSupabaseAdminClient();

    const cvStoragePath = createPrivateStoragePath(candidateId, "cv", cvFile.name, cvFile.type);
    const fileBuffer = Buffer.from(await cvFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(privateDocsBucket).upload(cvStoragePath, fileBuffer, {
      contentType: cvFile.type,
      upsert: false,
    });

    if (uploadError) {
      const parsedUploadError = toObjectError(uploadError);
      console.error("[careers:upload] storage upload failed", {
        bucket: privateDocsBucket,
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
                  bucket: privateDocsBucket,
                  env: envSnapshot,
                },
              }
            : {}),
        },
        { status: 500 }
      );
    }

    console.info("[careers:upload] file upload succeeded, proceeding to insert database row", {
      bucket: privateDocsBucket,
      applicationId,
    });

    const supportingDocumentStoragePaths: string[] = [];
    for (const [index, document] of supportingDocuments.entries()) {
      const documentStoragePath = createPrivateStoragePath(candidateId, "document", document.name, document.type);
      const documentBuffer = Buffer.from(await document.arrayBuffer());
      const { error: documentUploadError } = await supabase.storage.from(privateDocsBucket).upload(documentStoragePath, documentBuffer, {
        contentType: document.type,
        upsert: false,
      });

      if (documentUploadError) {
        const parsedDocumentUploadError = toObjectError(documentUploadError);
        console.error("[careers:upload] supporting document upload failed", {
          bucket: privateDocsBucket,
          index,
          ...parsedDocumentUploadError,
        });
        await supabase.storage.from(privateDocsBucket).remove([cvStoragePath, ...supportingDocumentStoragePaths]);
        return NextResponse.json(
          {
            error: "Failed to upload supporting document.",
            details: parsedDocumentUploadError.message,
            code: parsedDocumentUploadError.code,
            statusCode: parsedDocumentUploadError.statusCode,
            ...(debugMode
              ? {
                  debug: {
                    bucket: privateDocsBucket,
                    env: envSnapshot,
                  },
                }
              : {}),
          },
          { status: 500 }
        );
      }

      supportingDocumentStoragePaths.push(documentStoragePath);
    }

    const jobApplicationPayload = {
      id: applicationId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      country_city: countryCity,
      desired_position: data.desiredPosition,
      years_of_experience: data.yearsOfExperience,
      professional_message: data.coverLetter,
      cv_storage_path: cvStoragePath,
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
          cv_url: cvStoragePath,
          cv_filename: cvFile.name.slice(0, 255),
          status: "pending",
        });

        if (!legacyInsertError) {
          insertError = null;
          insertedTable = "applications";
          console.warn("[careers:insert] fell back to legacy applications table", {
            applicationId,
            bucket: privateDocsBucket,
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
        bucket: privateDocsBucket,
        applicationId,
        insertedTable,
        ...parsedInsertError,
      });

      await supabase.storage.from(privateDocsBucket).remove([cvStoragePath, ...supportingDocumentStoragePaths]);
      return NextResponse.json(
        {
          error: "Failed to save application.",
          details: parsedInsertError.message,
          code: parsedInsertError.code,
          statusCode: parsedInsertError.statusCode,
          ...(debugMode
            ? {
                debug: {
                  bucket: privateDocsBucket,
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
      bucket: privateDocsBucket,
      insertedTable,
    });

    let profileReference: string | null = null;
    try {
      const profileDraft = await generateCandidateProfileDraft({
        candidateId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        location: data.location,
        desiredPosition: data.desiredPosition,
        yearsOfExperience: data.yearsOfExperience,
        coverLetter: data.coverLetter,
        originalCvPath: cvStoragePath,
        originalDocumentPaths: supportingDocumentStoragePaths,
        locale,
        supportingNotes: supportingDocumentStoragePaths.length > 0 ? ["Supporting documents uploaded privately"] : [],
      });

      const { error: privateProfileError } = await supabase.from("candidate_private_profiles").insert({
        candidate_id: candidateId,
        full_name: data.fullName,
        email: data.email,
        phone: data.phone,
        address: countryCity,
        original_cv_path: cvStoragePath,
        original_documents_paths: supportingDocumentStoragePaths,
        restricted_to_prime_global: true,
      });

      if (privateProfileError) {
        throw privateProfileError;
      }

      const { data: publicProfile, error: publicProfileError } = await supabase
        .from("candidate_public_profiles")
        .insert({
          candidate_id: candidateId,
          professional_title: profileDraft.professionalTitle,
          professional_summary: profileDraft.professionalSummary,
          years_of_experience: profileDraft.yearsOfExperience,
          skills: profileDraft.skills,
          employment_history: profileDraft.employmentHistory,
          education: profileDraft.education,
          certifications: profileDraft.certifications,
          languages: profileDraft.languages,
          general_location: profileDraft.generalLocation,
          availability: profileDraft.availability,
          desired_role: profileDraft.desiredRole,
          expected_salary: profileDraft.expectedSalary,
          ai_summary: profileDraft.aiSummary,
          profile_status: "pending_review",
          generated_at: new Date().toISOString(),
        })
        .select("candidate_reference")
        .single();

      if (publicProfileError) {
        throw publicProfileError;
      }

      profileReference = publicProfile?.candidate_reference ?? null;

      const generatedContent = {
        ...profileDraft.generatedContent,
        candidateReference: profileReference ?? profileDraft.generatedContent.candidateReference,
      };

      const { error: versionError } = await supabase.from("candidate_profile_versions").insert({
        candidate_id: candidateId,
        version_number: 1,
        generated_content: generatedContent,
        generated_by: profileDraft.generatedBy,
      });

      if (versionError) {
        throw versionError;
      }

      const { error: reviewError } = await supabase.from("candidate_profile_reviews").insert({
        candidate_id: candidateId,
        reviewed_by_prime_global_user_id: null,
        status: "pending",
        notes: null,
        reviewed_at: null,
      });

      if (reviewError) {
        throw reviewError;
      }

      await createAuditLog({
        actorRole: "candidate",
        action: "candidate.careers_submission.created",
        targetType: "candidate_public_profile",
        targetId: candidateId,
        metadata: {
          applicationId,
          locale,
          profileReference,
          hasSupportingDocuments: supportingDocumentStoragePaths.length > 0,
        },
      });
    } catch (profileError) {
      console.error("[careers:profile] candidate profile creation failed", {
        candidateId,
        applicationId,
        error: profileError instanceof Error ? profileError.message : String(profileError),
      });

      await supabase
        .from("candidate_profile_reviews")
        .delete()
        .eq("candidate_id", candidateId);

      await supabase.from("candidate_profile_versions").delete().eq("candidate_id", candidateId);
      await supabase.from("candidate_public_profiles").delete().eq("candidate_id", candidateId);
      await supabase.from("candidate_private_profiles").delete().eq("candidate_id", candidateId);
    }

    return NextResponse.json(
      {
        success: true,
        id: applicationId,
        ...(profileReference ? { candidateReference: profileReference } : {}),
        ...(debugMode
          ? {
              debug: {
              bucket: privateDocsBucket,
                env: envSnapshot,
                insertedTable,
              profileReference,
              profileCreated: Boolean(profileReference),
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
