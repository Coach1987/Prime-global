import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/server/supabase";
import { readOptionalEnv, readRequiredEnv } from "@/lib/server/config/env";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const applicationPayloadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(6).max(24),
  location: z.string().trim().min(2).max(120),
  desiredPosition: z.string().trim().min(2).max(120),
  yearsOfExperience: z.string().trim().min(1).max(16),
  coverLetter: z.string().trim().min(10).max(2000),
  acceptedTerms: z.literal("true"),
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
    .slice(0, 120);
}

function inferExtension(fileName: string, mimeType: string) {
  const cleanName = fileName.toLowerCase();
  if (cleanName.endsWith(".pdf")) return "pdf";
  if (cleanName.endsWith(".doc")) return "doc";
  if (cleanName.endsWith(".docx")) return "docx";

  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "application/msword") return "doc";
  return "docx";
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

function parseLocation(location: string) {
  const [country, ...cityParts] = location
    .split(/[,-]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const normalizedCountry = country ?? location.trim();
  const normalizedCity = cityParts.join(" ").trim() || location.trim();

  return {
    country: normalizedCountry.slice(0, 100),
    city: normalizedCity.slice(0, 120),
  };
}

export async function POST(request: Request) {
  try {
    if (!readOptionalEnv("SUPABASE_URL") || !readOptionalEnv("SUPABASE_SERVICE_ROLE_KEY") || !readOptionalEnv("SUPABASE_CV_BUCKET")) {
      return NextResponse.json(
        {
          error: "Application submission is being configured. Please contact us directly for now.",
        },
        { status: 503 }
      );
    }

    const cvBucket = readRequiredEnv("SUPABASE_CV_BUCKET");
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
  const location = parseLocation(data.location);
    const supabase = createSupabaseAdminClient();

    const applicationId = crypto.randomUUID();
    const extension = inferExtension(cvFile.name, cvFile.type);
    const safeName = sanitizeFileName(cvFile.name.replace(/\.[^.]+$/, "")) || "cv";
    const storagePath = `applications/${applicationId}/${Date.now()}-${safeName}.${extension}`;

    const fileBuffer = Buffer.from(await cvFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from(cvBucket).upload(storagePath, fileBuffer, {
      contentType: cvFile.type,
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: "Failed to upload CV.", details: uploadError.message }, { status: 500 });
    }

    const { error: insertError } = await supabase.from("applications").insert({
      id: applicationId,
      full_name: data.fullName,
      email: data.email,
      phone: data.phone,
      country: location.country,
      city: location.city,
      position: data.desiredPosition,
      experience: data.yearsOfExperience,
      cover_letter: data.coverLetter,
      cv_url: storagePath,
      cv_filename: cvFile.name,
      status: "pending",
    });

    if (insertError) {
      await supabase.storage.from(cvBucket).remove([storagePath]);
      return NextResponse.json({ error: "Failed to save application.", details: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: applicationId }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Unexpected server error.", details: message }, { status: 500 });
  }
}
