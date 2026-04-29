import { ImageResponse } from "next/og";
export const runtime = "edge";

export const alt = "GlideDesign — Describe what you need. Get a page.";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OgImage() {
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
          background: "linear-gradient(135deg, #6651ff 0%, #ff6d4d 55%, #b6f45f 100%)",
          padding: 64,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 54,
            left: 62,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            color: "white",
            fontFamily: "Inter, ui-sans-serif, system-ui",
          }}
        >
          GlideDesign
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            fontFamily: "Inter, ui-sans-serif, system-ui",
            color: "white",
            textAlign: "center",
            lineHeight: 0.96,
            letterSpacing: "-0.07em",
            textShadow: "0 24px 80px rgba(20,16,38,0.28)",
          }}
        >
          Glide from idea
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 88,
            fontWeight: 800,
            fontFamily: "Inter, ui-sans-serif, system-ui",
            color: "#141026",
            lineHeight: 0.96,
            letterSpacing: "-0.07em",
          }}
        >
          to product.
        </div>
        <div
          style={{
            marginTop: 40,
            borderRadius: 999,
            background: "#141026",
            padding: "16px 28px",
            fontSize: 26,
            fontWeight: 700,
            color: "white",
            fontFamily: "Inter, ui-sans-serif, system-ui",
          }}
        >
          AI product design, screens, code, and next moves
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
