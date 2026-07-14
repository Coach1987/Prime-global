import { NextResponse } from "next/server";
import { employerVerificationDocumentTypeSchema } from "@/features/employers/schemas/portal";
import { createAuditLog } from "@/lib/server/security/audit";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceRateLimit, getRequestContext } from "@/lib/server/http";
import { getEmployerByAuthUserId } from "@/lib/server/employers";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const BUCKET = process.env.SUPABASE_COMPANY_DOCS_BUCKET ?? "company-documents";

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function inferExtension(file: File) {
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  return "webp";
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "employer-verification-upload", 24);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const formData = await request.formData();
  const rawDocumentType = formData.get("documentType");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_REQUIRED", message: "Document file is required" } },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_TOO_LARGE", message: "Document exceeds 10 MB" } },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported document type" } },
      { status: 400 }
    );
  }

  const parsedType = employerVerificationDocumentTypeSchema.safeParse(rawDocumentType);
  if (!parsedType.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_DOCUMENT_TYPE", message: "Invalid document type" } },
      { status: 400 }
    );
  }

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "document";
  const extension = inferExtension(file);
  const storagePath = `${auth.userId}/${employer.id}/${parsedType.data}/${Date.now()}-${safeName}.${extension}`;

  const supabase = createSupabaseAdminClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_FAILED", message: uploadError.message } },
      { status: 500 }
    );
  }

  const { data: docRow, error: dbError } = await supabase
    .from("employer_verification_documents")
    .insert({
      employer_id: employer.id,
      document_type: parsedType.data,
      storage_path: storagePath,
      original_filename: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_by: auth.userId,
    })
    .select("*")
    .single();

  if (dbError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);

    return NextResponse.json(
      { success: false, error: { code: "DOCUMENT_SAVE_FAILED", message: dbError.message } },
      { status: 500 }
    );
  }

  await supabase
    .from("employers")
    .update({ verification_status: "admin_review" })
    .eq("id", employer.id)
    .in("verification_status", ["documents_submitted", "pending"]);

  const { ipAddress, userAgent } = getRequestContext(request);
  await createAuditLog({
    actorAuthUserId: auth.userId,
    actorRole: auth.role,
    action: "employer.verification.document.upload",
    targetType: "employer_document",
    targetId: docRow.id,
    metadata: { documentType: parsedType.data },
    ipAddress,
    userAgent,
  });

  return NextResponse.json({ success: true, data: docRow }, { status: 201 });
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const roleCheck = requireRole(auth, ["employer", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const employer = await getEmployerByAuthUserId(auth.userId);
  if (!employer) {
    return NextResponse.json(
      { success: false, error: { code: "EMPLOYER_NOT_FOUND", message: "Employer profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("employer_verification_documents")
    .select("*")
    .eq("employer_id", employer.id)
    .order("uploaded_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "DOCUMENTS_LOAD_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
