import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/server/security/auth";
import { enforceCsrf, enforceRateLimit } from "@/lib/server/http";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const PRIVATE_BUCKET = "candidate-private-documents";
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

async function getCandidateProfile(authUserId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_profiles")
    .select("id, full_name, email, phone_number, country, city")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-private-documents-get", 120);
  if (rateLimitResult) return rateLimitResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const profile = await getCandidateProfile(auth.userId);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("candidate_private_profiles")
    .select("original_documents_paths")
    .eq("candidate_id", profile.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: "PRIVATE_DOCUMENTS_FETCH_FAILED", message: error.message } },
      { status: 500 }
    );
  }

  const documents = Array.isArray(data?.original_documents_paths) ? data.original_documents_paths : [];

  return NextResponse.json({ success: true, data: documents });
}

export async function POST(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "candidate-private-documents-post", 60);
  if (rateLimitResult) return rateLimitResult;

  const csrfResult = enforceCsrf(request);
  if (csrfResult) return csrfResult;

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const roleCheck = requireRole(auth, ["candidate", "admin", "super_admin"]);
  if (roleCheck) return roleCheck;

  const profile = await getCandidateProfile(auth.userId);
  if (!profile) {
    return NextResponse.json(
      { success: false, error: { code: "CANDIDATE_NOT_FOUND", message: "Candidate profile missing" } },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "FILE_REQUIRED", message: "At least one document is required" } },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();
  const uploadedPaths: string[] = [];

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_FILE_TYPE", message: `Unsupported file type: ${file.type}` } },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: `${file.name} exceeds 10 MB` } },
        { status: 400 }
      );
    }

    const safeName = sanitizeFileName(file.name) || "document";
    const path = `${auth.userId}/${profile.id}/document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (uploadError) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PRIVATE_BUCKET).remove(uploadedPaths).catch(() => undefined);
      }
      return NextResponse.json(
        { success: false, error: { code: "UPLOAD_FAILED", message: uploadError.message } },
        { status: 500 }
      );
    }

    uploadedPaths.push(path);
  }

  const { data: existingPrivate, error: privateLoadError } = await supabase
    .from("candidate_private_profiles")
    .select("candidate_id, original_cv_path, original_documents_paths")
    .eq("candidate_id", profile.id)
    .maybeSingle();

  if (privateLoadError) {
    return NextResponse.json(
      { success: false, error: { code: "PRIVATE_PROFILE_LOAD_FAILED", message: privateLoadError.message } },
      { status: 500 }
    );
  }

  const existingPaths = Array.isArray(existingPrivate?.original_documents_paths)
    ? (existingPrivate?.original_documents_paths as string[])
    : [];
  const nextPaths = [...existingPaths, ...uploadedPaths];

  if (existingPrivate?.candidate_id) {
    const { error: updateError } = await supabase
      .from("candidate_private_profiles")
      .update({ original_documents_paths: nextPaths })
      .eq("candidate_id", profile.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { code: "PRIVATE_PROFILE_UPDATE_FAILED", message: updateError.message } },
        { status: 500 }
      );
    }
  } else {
    const { error: insertError } = await supabase.from("candidate_private_profiles").insert({
      candidate_id: profile.id,
      full_name: profile.full_name ?? "Candidate",
      email: profile.email ?? auth.email,
      phone: profile.phone_number ?? "+000000000",
      address: [profile.country, profile.city].filter(Boolean).join(", ") || null,
      original_cv_path: "pending",
      original_documents_paths: nextPaths,
      restricted_to_prime_global: true,
    });

    if (insertError) {
      return NextResponse.json(
        { success: false, error: { code: "PRIVATE_PROFILE_INSERT_FAILED", message: insertError.message } },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true, data: uploadedPaths }, { status: 201 });
}
