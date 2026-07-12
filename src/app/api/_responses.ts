import { NextResponse } from "next/server";
import { createApiPlaceholder } from "@/features/shared/utils";

export function notImplemented(moduleName: string) {
  return NextResponse.json(
    createApiPlaceholder(`${moduleName} API module is scaffolded but not implemented yet.`),
    { status: 501 }
  );
}
