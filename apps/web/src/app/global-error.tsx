"use client";

/**
 * Root-level error UI — no globals.css / theme imports: Next 16 can prerender `/_global-error`
 * during `next build` and importing the full CSS pipeline has caused framework issues in some versions.
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
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
          background: "#faf8f5",
          color: "#1c1917",
        }}
      >
        <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>We hit a wall</p>
        <p style={{ marginTop: "0.75rem", maxWidth: "28rem", textAlign: "center", fontSize: "0.875rem", color: "#57534e" }}>
          Something went wrong while loading the app. Try reloading — if it keeps happening, contact support and share
          the error reference below (we use it the same way as a Sentry event ID).
        </p>
        {digest ? (
          <p style={{ marginTop: "1rem", fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#78716c" }}>
            Error reference: <span style={{ userSelect: "all" }}>{digest}</span>
          </p>
        ) : null}
        <button
          type="button"
          style={{
            marginTop: "2rem",
            borderRadius: "0.75rem",
            border: "none",
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
            background: "#1c1917",
            color: "#faf8f5",
          }}
          onClick={() => reset()}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
