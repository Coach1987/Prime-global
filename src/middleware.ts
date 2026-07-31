import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { DEFAULT_LOCALE, isLocale } from "./lib/constants/locales";

const intlMiddleware = createMiddleware(routing);

function resolvePreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value ?? "";
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const tokens = acceptLanguage
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase() ?? "")
    .filter(Boolean);

  for (const token of tokens) {
    if (token === "ar" || token.startsWith("ar-")) {
      return "ar";
    }
    if (token === "en" || token.startsWith("en-")) {
      return "en";
    }
  }

  return DEFAULT_LOCALE;
}

export default function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login" || request.nextUrl.pathname === "/admin/login/") {
    const locale = resolvePreferredLocale(request);
    const redirectUrl = new URL(`/${locale}/admin/login`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (request.nextUrl.pathname === "/auth/recovery") {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except API routes, Next.js internals, files with
  // an extension (favicon.ico, sitemap.xml, robots.txt), and the
  // dynamically-generated opengraph-image route (which needs to resolve
  // to app/[locale]/opengraph-image.tsx directly, not be rewritten).
  matcher: ["/((?!api|_next|_vercel|.*/opengraph-image|.*\\..*).*)"],
};
