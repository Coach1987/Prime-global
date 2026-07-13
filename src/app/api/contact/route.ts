import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/server/supabase";

const contactPayloadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(320),
  service: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(2000),
});

function normalizeService(service: string) {
  return service.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function buildCoverLetter(message: string, service: string) {
  return [`Contact request submitted from website.`, `Service: ${normalizeService(service)}`, ``, message].join("\n");
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parseResult = contactPayloadSchema.safeParse(payload);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid contact payload.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;
    const supabase = createSupabaseAdminClient();

    const { error: insertError } = await supabase.from("applications").insert({
      full_name: data.name,
      email: data.email,
      phone: "N/A",
      country: "N/A",
      city: "N/A",
      position: `Contact: ${normalizeService(data.service)}`,
      experience: "contact",
      cover_letter: buildCoverLetter(data.message, data.service),
      cv_url: "contact-form",
      cv_filename: "contact-form",
      status: "pending",
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save contact request.", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: "Unexpected server error.", details: message }, { status: 500 });
  }
}
