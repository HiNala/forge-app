import { ImageResponse } from "next/og";
export const runtime = "edge";

export const alt = "GlideDesign — Examples & templates";

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
          background: "#fff8e8",
          padding: 64,
          gap: 28,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 20,
          }}
        >
          {["#b6f45f", "#93e6ff", "#ff6d4d", "#cfc4ff"].map((color, index) => (
            <div
              key={color}
              style={{
                width: 178,
                height: 212,
                borderRadius: 34,
                background: color,
                transform: `rotate(${[-5, 3, -2, 5][index]}deg)`,
                border: "4px solid #141026",
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            fontFamily: "Inter, ui-sans-serif, system-ui",
            color: "#141026",
            textAlign: "center",
            letterSpacing: "-0.07em",
          }}
        >
          Templates that ship.
        </div>
        <div
          style={{
            fontSize: 26,
            color: "#6651ff",
            fontWeight: 700,
            fontFamily: "Inter, ui-sans-serif, system-ui",
          }}
        >
          Websites · apps · decks · forms · proposals
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
