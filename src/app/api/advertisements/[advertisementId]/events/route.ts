import { NextResponse } from "next/server";
import { z } from "zod";
import { advertisementAnalyticsEventSchema } from "@/features/advertisements/schemas";
import { enforceRateLimit, parseJsonBody } from "@/lib/server/http";
import { createAdvertisementAnalyticsEvent } from "@/lib/server/advertisements/repository";
import { hashAnonymousSessionId } from "@/lib/server/advertisements/analytics";

const idSchema = z.string().uuid();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ advertisementId: string }> }
) {
  const rateLimitResult = enforceRateLimit(request, "advertisement-event-post", 240);
  if (rateLimitResult) return rateLimitResult;

  const { advertisementId } = await params;
  if (!idSchema.safeParse(advertisementId).success) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid advertisement id" } },
      { status: 400 }
    );
  }

  const parsed = await parseJsonBody(request, advertisementAnalyticsEventSchema);
  if (parsed.error) return parsed.error;

  await createAdvertisementAnalyticsEvent({
    advertisementId,
    eventType: parsed.data.eventType,
    locale: parsed.data.locale,
    sessionHash: hashAnonymousSessionId(parsed.data.sessionId),
    metadata: {
      source: "homepage",
    },
  });

  return NextResponse.json({ success: true });
}
