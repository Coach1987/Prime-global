import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      status: "ok",
      apiVersion: "v1",
      subsystem: "phase10-foundation",
      timestamp: new Date().toISOString(),
    },
  });
}
