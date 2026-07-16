import { NextResponse } from "next/server";
import { getPhase10FeatureFlagSnapshot } from "@/lib/server/phase10";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      version: "v1",
      subsystem: "phase10",
      featureFlags: getPhase10FeatureFlagSnapshot(),
    },
  });
}
