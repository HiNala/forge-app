import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Forge — Examples & templates";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function ExamplesOgImage() {
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
            fontSize: 64,
            fontWeight: 600,
            fontFamily: "Georgia, serif",
            color: "#1a1714",
            textAlign: "center",
          }}
        >
          Examples
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 26,
            color: "#0d9488",
            fontFamily: "ui-sans-serif, system-ui",
          }}
        >
          Bookings, RSVPs, menus, proposals
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
