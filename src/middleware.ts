import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes, Next.js internals, files with
  // an extension (favicon.ico, sitemap.xml, robots.txt), and the
  // dynamically-generated opengraph-image route (which needs to resolve
  // to app/[locale]/opengraph-image.tsx directly, not be rewritten).
  matcher: ["/((?!api|_next|_vercel|.*/opengraph-image|.*\\..*).*)"],
};
