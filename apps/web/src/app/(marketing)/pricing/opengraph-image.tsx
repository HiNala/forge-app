import { ImageResponse } from "next/og";
export const runtime = "edge";

export const alt = "GlideDesign — Simple pricing";

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
          background: "linear-gradient(135deg, #141026 0%, #33236f 52%, #6651ff 100%)",
          padding: 64,
          gap: 24,
        }}
      >
        <div
          style={{
            fontSize: 84,
            fontWeight: 800,
            fontFamily: "Inter, ui-sans-serif, system-ui",
            color: "white",
            textAlign: "center",
            letterSpacing: "-0.07em",
          }}
        >
          Simple pricing.
        </div>
        <div
          style={{
            display: "flex",
            gap: 18,
          }}
        >
          {["Free", "Pro $50", "Max $100"].map((label) => (
            <div
              key={label}
              style={{
                borderRadius: 28,
                background: label.startsWith("Pro") ? "#ff6d4d" : "rgba(255,255,255,0.13)",
                border: "2px solid rgba(255,255,255,0.28)",
                padding: "28px 34px",
                fontSize: 34,
                fontWeight: 800,
                color: "white",
                fontFamily: "Inter, ui-sans-serif, system-ui",
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div
          style={{
            fontSize: 26,
            color: "rgba(255,255,255,0.76)",
            fontFamily: "Inter, ui-sans-serif, system-ui",
          }}
        >
          Clear limits. No mystery credits. Upgrade when you are ready.
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
