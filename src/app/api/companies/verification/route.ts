import { NextResponse } from "next/server";
import { companyVerificationRequestSchema, verificationReviewSchema } from "@/features/employers/schemas/verification-v2";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { getEmployerByAuthUserId } from "@/lib/server/employers";

const BUCKET = "company-verification-documents";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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
    return NextResponse.json({ success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } }, { status: 404 });
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
    return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid verification payload" } }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("company_verification_requests")
    .insert({
      employer_id: employer.id,
      ...parsed.data,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: { code: "VERIFICATION_CREATE_FAILED", message: error.message } }, { status: 400 });
  }

  const files = formData.getAll("documents");
  for (const file of files) {
    if (!(file instanceof File)) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `${auth.userId}/${data.id}/${Date.now()}-${file.name}`;

    await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

    await supabase.from("company_verification_documents_v2").insert({
      verification_request_id: data.id,
      document_type: "government_document",
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });
  }

  await supabase.from("employers").update({ verification_status: "documents_submitted" }).eq("id", employer.id);

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
