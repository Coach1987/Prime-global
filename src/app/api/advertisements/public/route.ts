import { NextResponse } from "next/server";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/server/http";
import { listPublicAdvertisements } from "@/lib/server/advertisements/repository";

const querySchema = z.object({
  locale: z.enum(["en", "ar"]).default("en"),
});

export async function GET(request: Request) {
  const rateLimitResult = enforceRateLimit(request, "advertisements-public-get", 240);
  if (rateLimitResult) return rateLimitResult;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ locale: url.searchParams.get("locale") ?? "en" });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_LOCALE", message: "Invalid locale" } },
      { status: 400 }
    );
  }

  const data = await listPublicAdvertisements(parsed.data.locale);
  return NextResponse.json({ success: true, data });
}
