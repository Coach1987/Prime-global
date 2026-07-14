import crypto from "node:crypto";

const CSRF_COOKIE_NAME = "prime_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function parseCookieHeader(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, item) => {
      const [name, ...rest] = item.split("=");
      if (!name || rest.length === 0) return acc;
      acc[name] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

export function createCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function getCsrfCookieName() {
  return CSRF_COOKIE_NAME;
}

export function getCsrfHeaderName() {
  return CSRF_HEADER_NAME;
}

export function verifyCsrf(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = parseCookieHeader(cookieHeader);
  const cookieToken = cookies[CSRF_COOKIE_NAME] ?? "";
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? "";

  if (!cookieToken || !headerToken) {
    return false;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (cookieBuffer.length !== headerBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(cookieBuffer, headerBuffer);
}
