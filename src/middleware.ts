import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
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
