import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      { source: "/employers", destination: "/en/employers", permanent: false },
      { source: "/employers/login", destination: "/en/employers/login", permanent: false },
      { source: "/employers/register", destination: "/en/employers/register", permanent: false },
      { source: "/employers/dashboard", destination: "/en/employers/dashboard", permanent: false },
      { source: "/jobs", destination: "/en/jobs", permanent: false },
      { source: "/candidate/dashboard", destination: "/en/candidate/dashboard", permanent: false },
      { source: "/admin/dashboard", destination: "/en/admin/dashboard", permanent: false },
    ];
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Add remote image hosts here if/when content is served externally
      // (e.g. a CMS or asset CDN). Empty for now — all current images are
      // local under /public.
    ],
  },

  // Security headers applied to every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
