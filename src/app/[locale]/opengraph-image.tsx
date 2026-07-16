import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hero" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A0E14 0%, #10151D 60%, #161C26 100%)",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4fa8ff, #1a2a45)",
              border: "2px solid rgba(170,214,255,0.45)",
              display: "flex",
            }}
          />
          <span style={{ fontSize: 40, fontWeight: 800, color: "#F7F5F1" }}>
            PRIME <span style={{ color: "#7ec4ff" }}>GLOBAL</span>
          </span>
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#F7F5F1",
            textAlign: "center",
            lineHeight: 1.15,
            maxWidth: 900,
            display: "flex",
          }}
        >
          {t("headlineLine1")} {t("headlineLine2")} {t("headlineLine3")}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 26,
            color: "#A8ADB6",
            textAlign: "center",
            maxWidth: 800,
            display: "flex",
          }}
        >
          {t("eyebrow")}
        </div>
      </div>
    ),
    { ...size }
  );
}
