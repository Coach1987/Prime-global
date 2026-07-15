import { NextResponse } from "next/server";
import { getPhase10FeatureFlagSnapshot } from "@/lib/server/phase10";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      subsystem: "Prime Global Shield Core Foundation",
      featureFlags: getPhase10FeatureFlagSnapshot(),
      ready: true,
      notes: ["Stage 1 foundation only", "All risky capabilities remain disabled by default"],
    },
  });
}
