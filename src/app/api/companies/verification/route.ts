import { NextResponse } from "next/server";
import { companyVerificationRequestSchema, verificationReviewSchema } from "@/features/employers/schemas/verification-v2";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { buildCompanyVerificationRequestRow, mapZodFieldErrors } from "@/lib/server/employer-portal";

const BUCKET = "company-verification-documents";
const OPERATION_TIMEOUT_MS = 20_000;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

async function runWithTimeout<T>(operation: PromiseLike<T>, timeoutMessage: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), OPERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "company-verification-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json({ success: true, data: [] });
  }

  const { data, error } = await supabase
    .from("company_verification_requests")
    .select("*, company_verification_documents_v2(*)")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: { code: "VERIFICATION_LOAD_FAILED", message: error.message } }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "company-verification-post", 30);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const supabase = createSupabaseAdminClient();
  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json({ success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } }, { status: 404 });
  }

  const formData = await request.formData();
  const parsed = companyVerificationRequestSchema.safeParse({
    companyName: getString(formData, "companyName"),
    commercialRegistrationNumber: getString(formData, "commercialRegistrationNumber"),
    taxNumber: getString(formData, "taxNumber"),
    country: getString(formData, "country"),
    address: getString(formData, "address"),
    officialEmail: getString(formData, "officialEmail"),
    website: getString(formData, "website") || undefined,
    phoneNumber: getString(formData, "phoneNumber"),
    responsiblePerson: getString(formData, "responsiblePerson"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Please correct the highlighted verification fields." },
        details: {
          messageAr: "يرجى تصحيح حقول التحقق المحددة.",
          fieldErrors: mapZodFieldErrors(parsed.error),
        },
      },
      { status: 400 }
    );
  }

  const files = formData.getAll("documents").filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (files.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "DOCUMENT_REQUIRED", message: "At least one verification document is required." },
        details: {
          messageAr: "مطلوب مستند تحقق واحد على الأقل.",
          fieldErrors: { documents: "At least one verification document is required." },
        },
      },
      { status: 400 }
    );
  }

  const requestRow = buildCompanyVerificationRequestRow(employer.id, parsed.data);
  const { data: existingRequest, error: existingRequestError } = await supabase
    .from("company_verification_requests")
    .select("id, status")
    .eq("employer_id", employer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingRequestError) {
    return NextResponse.json(
      { success: false, error: { code: "VERIFICATION_LOOKUP_FAILED", message: existingRequestError.message } },
      { status: 500 }
    );
  }

  const mutation = existingRequest && existingRequest.status !== "approved"
    ? supabase.from("company_verification_requests").update(requestRow).eq("id", existingRequest.id)
    : supabase.from("company_verification_requests").insert(requestRow);

  const { data, error } = await mutation.select("*").single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: "VERIFICATION_CREATE_FAILED", message: error.message } }, { status: 400 });
  }

  const uploadedPaths: string[] = [];
  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storagePath = `${auth.userId}/${data.id}/${Date.now()}-${file.name}`;

      const uploadResult = (await runWithTimeout(
        Promise.resolve(supabase.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType: file.type,
          upsert: false,
        })),
        "Verification document upload timed out"
      )) as { error?: { message?: string } | null };
      const { error: uploadError } = uploadResult;

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      uploadedPaths.push(storagePath);

      const documentResult = (await runWithTimeout(
        Promise.resolve(supabase.from("company_verification_documents_v2").insert({
          verification_request_id: data.id,
          document_type: "government_document",
          storage_path: storagePath,
          original_filename: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        })),
        "Verification document record save timed out"
      )) as { error?: { message?: string } | null };
      const { error: documentError } = documentResult;

      if (documentError) {
        throw new Error(documentError.message);
      }
    }
  } catch (uploadError) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths);
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VERIFICATION_DOCUMENT_UPLOAD_FAILED",
          message: uploadError instanceof Error ? uploadError.message : "Unable to upload verification documents",
        },
        details: {
          messageAr: "تعذر رفع مستندات التحقق.",
          fieldErrors: { documents: "Unable to upload verification documents" },
        },
      },
      { status: 500 }
    );
  }

  await runWithTimeout(
    Promise.resolve(supabase.from("employers").update({ verification_status: "pending" }).eq("id", employer.id)),
    "Employer verification status update timed out"
  );
  await runWithTimeout(
    Promise.resolve(supabase.auth.admin.updateUserById(auth.userId, {
      app_metadata: { account_status: "pending_review", verification_status: "pending" },
      user_metadata: { account_status: "pending_review", verification_status: "pending" },
    })),
    "Auth user verification status update timed out"
  );

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "company-verification-patch", 40);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const parsed = await parseJsonBody(request, verificationReviewSchema);
  if (parsed.error) return parsed.error;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("company_verification_requests")
    .update({
      status: parsed.data.status,
      reviewer_notes: parsed.data.reviewerNotes ?? null,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: "VERIFICATION_REVIEW_FAILED", message: error.message } }, { status: 400 });
  }

  await supabase.from("employers").update({ verification_status: parsed.data.status }).eq("id", data.employer_id);

  return NextResponse.json({ success: true, data });
}
