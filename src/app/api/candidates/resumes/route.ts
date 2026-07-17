import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const CANDIDATE_RESUMES_BUCKET = process.env.SUPABASE_CANDIDATE_RESUMES_BUCKET ?? "candidate-resumes";

const setPrimarySchema = z.object({
  resumeId: z.string().uuid(),
});

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function inferExtension(fileName: string, mimeType: string) {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/msword") return "doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (fileName.toLowerCase().endsWith(".pdf")) return "pdf";
  if (fileName.toLowerCase().endsWith(".doc")) return "doc";
  return "docx";
}

async function getCandidateProfileId(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id as string;
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-resumes-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const candidateId = await getCandidateProfileId(auth.userId);
  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_resumes")
    .select("*")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "RESUMES_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-resumes-post", 50);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const candidateId = await getCandidateProfileId(auth.userId);
  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_REQUIRED", message: "Resume file is required" } },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_FILE_TYPE", message: "Unsupported resume format" } },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_TOO_LARGE", message: "Resume exceeds 5 MB" } },
      { status: 400 }
    );
  }

  const extension = inferExtension(file.name, file.type);
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, "")) || "resume";
  const storagePath = `${auth.userId}/${candidateId}/${Date.now()}-${safeName}.${extension}`;

  const supabase = createSupabaseAdminClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(CANDIDATE_RESUMES_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_FAILED", message: uploadError.message } },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("candidate_resumes")
    .insert({
      candidate_id: candidateId,
      storage_path: storagePath,
      filename: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      is_primary: true,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(CANDIDATE_RESUMES_BUCKET).remove([storagePath]);

    return NextResponse.json(
      { success: false, error: { code: "RESUME_SAVE_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  await supabase
    .from("candidate_resumes")
    .update({ is_primary: false })
    .eq("candidate_id", candidateId)
    .neq("id", data.id);

  const { data: candidateProfile } = await supabase
    .from("candidate_profiles")
    .select("full_name, email, phone_number, country, city")
    .eq("id", candidateId)
    .maybeSingle();

  const { data: privateProfile } = await supabase
    .from("candidate_private_profiles")
    .select("candidate_id, original_documents_paths")
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (privateProfile?.candidate_id) {
    await supabase
      .from("candidate_private_profiles")
      .update({ original_cv_path: storagePath })
      .eq("candidate_id", candidateId);
  } else {
    await supabase.from("candidate_private_profiles").insert({
      candidate_id: candidateId,
      full_name: String(candidateProfile?.full_name ?? "Candidate"),
      email: String(candidateProfile?.email ?? auth.email),
      phone: String(candidateProfile?.phone_number ?? "+000000000"),
      address: [candidateProfile?.country, candidateProfile?.city].filter(Boolean).join(", ") || null,
      original_cv_path: storagePath,
      original_documents_paths: [],
      restricted_to_prime_global: true,
    });
  }

  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-resumes-patch", 80);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const candidateId = await getCandidateProfileId(auth.userId);
  if (!candidateId) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const payload = await request.json().catch(() => null);
  const parsed = setPrimarySchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "resumeId is required" } },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  await supabase.from("candidate_resumes").update({ is_primary: false }).eq("candidate_id", candidateId);
  const { data, error } = await supabase
    .from("candidate_resumes")
    .update({ is_primary: true })
    .eq("candidate_id", candidateId)
    .eq("id", parsed.data.resumeId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PRIMARY_RESUME_UPDATE_FAILED", message: error.message } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data });
}
