# Prime Global — Website

A bilingual (English/Arabic) marketing website for Prime Global, a Tunisian business-support services company. Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, GSAP, Framer Motion, and Swiper.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.1.12 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 3 |
| i18n | next-intl 3.x (locale-prefixed routing: `/en`, `/ar`) |
| Animation | GSAP 3 (ScrollTrigger, MotionPathPlugin) + Framer Motion |
| Smooth scroll | Lenis, driven by GSAP's ticker |
| Carousel | Swiper (Testimonials) |
| Forms | react-hook-form + Zod |

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/en` (the default locale). Switch to Arabic via the language toggle in the header, or visit `/ar` directly.

### Available scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript in check-only mode (no emit) |

## Project structure

```
src/
├── app/
│   ├── [locale]/            # Every real page lives under the locale segment
│   │   ├── layout.tsx       # Root document shell: <html>, fonts, metadata, JSON-LD
│   │   ├── page.tsx         # Homepage (Hero -> Services -> ... -> Contact)
│   │   ├── about/
│   │   ├── services/
│   │   ├── contact/
│   │   ├── privacy-policy/  # Placeholder -- see "Known gaps" below
│   │   ├── terms/           # Placeholder -- see "Known gaps" below
│   │   └── opengraph-image.tsx  # Dynamically generated OG image per locale
│   ├── sitemap.ts           # Multilingual sitemap with hreflang alternates
│   └── robots.ts
├── components/
│   ├── layout/               # Header, Footer
│   ├── sections/             # One folder per homepage section
│   ├── shared/                # SmoothScrollProvider
│   └── ui/                    # Reusable primitives (IconBadge, SectionHeading, AnimatedCounter)
├── i18n/                      # next-intl routing + request config
├── lib/
│   ├── constants/              # Site content as typed data (services, FAQ, contact info, etc.)
│   ├── hooks/
│   ├── utils/
│   └── validations/             # Zod schemas
└── middleware.ts               # Locale detection/redirect

messages/
├── en.json
└── ar.json
```

## Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Recommended for production | Canonical site URL used in metadata, sitemap, robots.txt, and JSON-LD. Falls back to Vercel's own preview URL, then to `https://www.primeglobal.tn`, if unset. |
| `SUPABASE_URL` | Required for careers submission API | Supabase project URL used by backend API routes. |
| `SUPABASE_ANON_KEY` | Optional in current server flow | Reserved for client-side Supabase usage if enabled later. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for careers submission API | Service role key used server-side to upload CVs and insert applications securely. |
| `SUPABASE_CV_BUCKET` | Required for careers submission API | Storage bucket name for uploaded CVs (`prime-global-cv` for current migration). |

For migration/deployment steps, see `docs/SUPABASE_DEPLOYMENT.md`.

### Local setup

Create `.env.local` (already gitignored):

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_URL=https://nqfcnkufpeevisfpjttu.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_CV_BUCKET=prime-global-cv
```

## Deploying to Vercel

This project needs no special Vercel configuration beyond the standard Next.js auto-detection.

1. **Push to a Git repository** (GitHub/GitLab/Bitbucket).
2. **Import the repository** in the Vercel dashboard -> "Add New Project."
3. Vercel will auto-detect Next.js and use `npm run build` / `.next` output — no build command overrides needed.
4. **Set the environment variable** `NEXT_PUBLIC_SITE_URL` in Project Settings -> Environment Variables, scoped to **Production**, set to your real domain (e.g. `https://www.primeglobal.tn`). Preview deployments will automatically fall back to their own generated `*.vercel.app` URL if you leave this unset for the Preview scope.
5. **Deploy.** Every push to a non-production branch creates a Preview Deployment; merges to the production branch (commonly `main`) deploy to production automatically.
6. Once on your real domain, connect it under Project Settings -> Domains.

### Post-deploy checklist

- [ ] Verify `/sitemap.xml` and `/robots.txt` resolve correctly and reference the right domain.
- [ ] Verify `/en/opengraph-image` and `/ar/opengraph-image` render correctly (test by pasting a page URL into a social share debugger).
- [ ] Submit the sitemap to Google Search Console once the real domain is live.
- [ ] Confirm `<html lang>` and `dir` switch correctly between `/en` and `/ar` (view source).

## Known gaps — read before shipping to production

These were deliberately left as placeholders or flagged rather than silently guessed at, since inventing the content would be worse than leaving it clearly marked:

1. **Testimonials are placeholder content.** The brochure this site was built from contains no real client testimonials. Every quote/name/role in `messages/*.json` under `testimonials.items` is explicitly marked as placeholder text — replace with real, permissioned client quotes.
2. **Privacy Policy and Terms of Service pages are placeholders**, not real legal documents, and are intentionally marked `robots: { index: false }` and excluded from the sitemap so they aren't indexed in their current state. Have real legal content drafted (ideally with legal review) before removing the noindex flag.
3. **No individual service detail pages.** `/services` (the index) exists, but `/services/[slug]` detail pages don't. Service cards currently link to `/contact` as an interim measure rather than a 404.
4. **Statistics are placeholder numbers.** The "10+ years," "150+ clients," etc. figures in the Hero and Why-Us sections were invented to demonstrate the animated-counter component and are not real company data — replace with actual figures in `src/lib/constants/whyUs.ts` and `messages/*.json`.
5. **Header uses the real logo mark image + text wordmark, not the full lockup.** The real Prime Global logo artwork (`public/images/logo/prime-global-logo.png`, cropped to just the icon for `prime-global-mark.png`) is now used throughout — Hero uses the full lockup (globe + ring + arrow + wordmark, exactly as provided), Header/Footer pair the cropped mark with a styled text wordmark since the full square lockup's text would be illegible at ~36px. The favicon (`src/app/favicon.ico`) is a separately-generated approximation, not derived from the real logo file, since it needs to work as a tiny multi-resolution icon.
6. **Contact map is approximate.** The brochure gives only "Sousse, Tunisia," not a street address, so the embedded Google Map centers on the city, not a precise office location.
7. **Per-page hreflang alternates are incomplete.** The sitemap (`sitemap.ts`) correctly generates hreflang alternates for every locale/page combination, but individual page `<head>` metadata only sets `alternates.canonical`, not `alternates.languages`. Search engines will still discover translations via the sitemap, but adding explicit per-page `alternates.languages` would be a further improvement.

## Accessibility & i18n notes

- Full RTL support: `dir="rtl"` is set on `<html>` for Arabic, and layout/spacing throughout uses logical properties (`start`/`end`) rather than physical `left`/`right` where it matters.
- Arabic headings render in Tajawal, not Poppins (which has no Arabic glyph coverage) — controlled via a CSS custom property set per-locale in the root layout.
- The mobile navigation menu implements a focus trap and Escape-to-close per the WAI-ARIA APG dialog pattern.
- The contact form wires `aria-invalid`/`aria-describedby` on every field and uses a live region for submit feedback.
- All animations respect `prefers-reduced-motion` at both the global CSS level and per-component JS checks.

## License

Private/proprietary — not licensed for reuse.
