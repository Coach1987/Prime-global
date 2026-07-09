/**
 * Canonical site URL, used for metadataBase, sitemap.xml, robots.txt, and
 * JSON-LD structured data. Reads from NEXT_PUBLIC_SITE_URL so the same
 * codebase produces correct URLs whether running on the production
 * domain, a Vercel preview deployment, or localhost — without this, a
 * hardcoded production URL would leak into preview deployments' sitemaps
 * and canonical tags, which actively confuses search engines during
 * testing (a preview URL claiming a totally different domain as its own
 * canonical/sitemap origin).
 *
 * Vercel automatically provides NEXT_PUBLIC_VERCEL_URL for preview
 * deployments (no scheme, e.g. "my-app-git-branch.vercel.app") — this is
 * used as a fallback when NEXT_PUBLIC_SITE_URL isn't explicitly set, so
 * preview deployments self-report their own correct URL automatically.
 * The NEXT_PUBLIC_ prefix matters here (over the unprefixed VERCEL_URL)
 * since this constant may be imported by Client Components, and only
 * NEXT_PUBLIC_-prefixed variables are statically inlined into the client
 * bundle by Next.js at build time.
 *
 * Set NEXT_PUBLIC_SITE_URL=https://www.primeglobal.tn in the Vercel
 * project's Production environment variables once the real domain is
 * live. See README.md for the full deployment checklist.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "https://www.primeglobal.tn");
