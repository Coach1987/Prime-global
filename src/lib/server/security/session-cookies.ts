import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/server/security/auth";

export const ACCESS_TOKEN_COOKIE = "pg_access_token";
export const REFRESH_TOKEN_COOKIE = "pg_refresh_token";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const THIRTY_DAYS_SECONDS = ONE_DAY_SECONDS * 30;

function getBaseCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function readAuthCookies(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const entries = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0) return ["", ""] as const;
      return [part.slice(0, separatorIndex), decodeURIComponent(part.slice(separatorIndex + 1))] as const;
    });

  const map = new Map(entries);
  return {
    accessToken: map.get(ACCESS_TOKEN_COOKIE) ?? "",
    refreshToken: map.get(REFRESH_TOKEN_COOKIE) ?? "",
  };
}

export function setAuthCookies(
  response: NextResponse,
  session: { accessToken: string; refreshToken?: string | null; expiresAt?: number | null }
) {
  const accessTokenMaxAge =
    typeof session.expiresAt === "number" && Number.isFinite(session.expiresAt)
      ? Math.max(ONE_DAY_SECONDS, Math.floor(session.expiresAt - Date.now() / 1000))
      : ONE_DAY_SECONDS;

  response.cookies.set(ACCESS_TOKEN_COOKIE, session.accessToken, getBaseCookieOptions(accessTokenMaxAge));

  if (session.refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, session.refreshToken, getBaseCookieOptions(THIRTY_DAYS_SECONDS));
  }
}

export function clearAuthCookies(response: NextResponse) {
  const base = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 };
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", base);
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", base);
}

export function persistRefreshedSession(response: NextResponse, auth: AuthContext) {
  if (!auth.refreshedSession) return;
  setAuthCookies(response, {
    accessToken: auth.refreshedSession.accessToken,
    refreshToken: auth.refreshedSession.refreshToken,
    expiresAt: auth.refreshedSession.expiresAt,
  });
}
