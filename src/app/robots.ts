import type { MetadataRoute } from "next";
import { SITE_URL as BASE_URL } from "@/lib/constants/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Placeholder legal pages are excluded from crawling entirely
        // until real content replaces them (they're also individually
        // marked noindex in their own metadata as a second layer).
        disallow: ["/*/privacy-policy", "/*/terms"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
