import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Forge — Simple pricing";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function PricingOgImage() {
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
          background: "linear-gradient(165deg, #f9f7f3 0%, #eeebe4 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            fontSize: 68,
            fontWeight: 600,
            fontFamily: "Georgia, serif",
            color: "#1a1714",
            textAlign: "center",
          }}
        >
          Simple pricing
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 26,
            color: "#5c5650",
            fontFamily: "ui-sans-serif, system-ui",
          }}
        >
          Starter · Pro · Enterprise
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
