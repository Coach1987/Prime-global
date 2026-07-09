import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0A0E14",
          secondary: "#10151D",
          elevated: "#161C26",
        },
        charcoal: {
          DEFAULT: "#1A1F28",
          light: "#242B36",
        },
        gold: {
          DEFAULT: "#C9A24B",
          bright: "#E0C179",
          muted: "#9C8047",
        },
        accent: {
          primary: "#C9A24B",
          bright: "#E0C179",
        },
        metallic: {
          1: "#E8EDF2",
          2: "#8A97A6",
        },
        warmwhite: "#F7F5F1",
        text: {
          primary: "#F7F5F1",
          secondary: "#A8ADB6",
          tertiary: "#6B7280",
        },
        whatsapp: "#25D366",
      },
      fontFamily: {
        // Luxury serif for headings in LTR (English) contexts — resolves
        // to Tajawal in RTL (Arabic) contexts via --font-heading-active,
        // since DM Serif Display has no Arabic glyph coverage. See
        // app/[locale]/layout.tsx for how this variable is set per locale.
        // no Arabic glyph coverage, so without this override every
        // heading site-wide would silently fall back to the browser's
        // default Arabic font on the Arabic version of the site.
        heading: ["var(--font-heading-active)", "serif"],
        body: ["var(--font-inter)", "sans-serif"],
        arabic: ["var(--font-tajawal)", "sans-serif"],
      },
      backdropBlur: {
        header: "16px",
      },
      transitionTimingFunction: {
        "premium-out": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "spin-slow-reverse": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "ring-breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.06)" },
        },
        "rim-pulse": {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "0.9" },
        },
        "drift-1": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(24px, -18px) scale(1.08)" },
        },
        "drift-2": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-20px, 14px) scale(0.95)" },
        },
        "drift-3": {
          "0%, 100%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(14px, 20px) scale(1.05)" },
        },
        "grid-breathe": {
          "0%, 100%": { opacity: "0.03" },
          "50%": { opacity: "0.06" },
        },
        "gradient-shift": {
          "0%, 100%": { transform: "translate(-4%, -3%) rotate(0deg)" },
          "50%": { transform: "translate(4%, 3%) rotate(3deg)" },
        },
        "particle-float": {
          "0%, 100%": { transform: "translate(0, 0)", opacity: "0.3" },
          "50%": { transform: "translate(var(--px, 10px), var(--py, -14px))", opacity: "0.8" },
        },
        "bounce-chevron": {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.6" },
          "50%": { transform: "translateY(6px)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "spin-slow": "spin-slow 60s linear infinite",
        "spin-slow-reverse": "spin-slow-reverse 40s linear infinite",
        "ring-breathe": "ring-breathe 5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "rim-pulse": "rim-pulse 4s ease-in-out infinite",
        "drift-1": "drift-1 16s ease-in-out infinite",
        "drift-2": "drift-2 20s ease-in-out infinite",
        "drift-3": "drift-3 13s ease-in-out infinite",
        "grid-breathe": "grid-breathe 12s ease-in-out infinite",
        "gradient-shift": "gradient-shift 70s ease-in-out infinite",
        "bounce-chevron": "bounce-chevron 1.5s ease-in-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};

export default config;
