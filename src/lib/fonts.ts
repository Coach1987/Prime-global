import { DM_Serif_Display, Inter, Tajawal } from "next/font/google";

// next/font self-hosts these at build time — no render-blocking request to
// fonts.googleapis.com, automatic font-display: swap, and zero layout
// shift via automatic fallback metric matching.

// Luxury serif for headings (spec: "Canela, IvyPresto, Cormorant Garamond,
// Bodoni Moda, DM Serif Display"). DM Serif Display is the only one of
// these available on Google Fonts — the others are commercial/foundry
// fonts not distributable via next/font/google, so this is the closest
// spec-compliant option without a paid license.
export const displaySerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display-serif",
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});
