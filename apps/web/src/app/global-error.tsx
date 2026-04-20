"use client";

/**
 * Self-contained root error boundary — no `globals.css` import (avoids Next 16 prerender workStore
 * issues during `next build` when CSS pipeline touches the request store).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest =
    typeof error.digest === "string" && error.digest.length > 0 ? error.digest : null;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1rem",
          fontFamily: "system-ui, sans-serif",
          background: "#f9f7f3",
          color: "#1a1714",
        }}
      >
        <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>We hit a wall</p>
        <p style={{ marginTop: "0.75rem", maxWidth: "28rem", textAlign: "center", fontSize: "0.875rem", color: "#5c5348" }}>
          Something went wrong while loading the app. Try reloading — if it keeps happening, contact support and share
          the error reference below.
        </p>
        {digest ? (
          <p style={{ marginTop: "1rem", fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#6b6560" }}>
            Error reference: <span style={{ userSelect: "all" }}>{digest}</span>
          </p>
        ) : null}
        <button
          type="button"
          style={{
            marginTop: "2rem",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "#1a1714",
            color: "#f9f7f3",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => reset()}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
