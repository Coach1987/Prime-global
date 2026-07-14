import { NextResponse } from "next/server";
import { createCsrfToken, getCsrfCookieName, getCsrfHeaderName } from "@/lib/server/security/csrf";

export async function GET() {
  const token = createCsrfToken();
  const response = NextResponse.json({
    success: true,
    data: { csrfToken: token, headerName: getCsrfHeaderName() },
  });

  response.headers.append(
    "Set-Cookie",
    `${getCsrfCookieName()}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure`
  );

  return response;
}
