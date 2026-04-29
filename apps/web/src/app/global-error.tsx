"use client";

/**
 * Root-level error UI — avoids loading `globals.css` so `/_global-error` stays prerender-safe during `next build`.
 * Uses static GlideDesign fallback colors so the route remains prerender-safe.
 */
import { forgeFallbackHex as H } from "@/lib/design/forge-html-fallback-colors";

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
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: H.bone,
          color: H.graphiteInk,
        }}
      >
        <div
          aria-hidden
          style={{
            width: "min(20rem, 82vw)",
            aspectRatio: "640 / 420",
            marginBottom: "1.5rem",
            backgroundImage: "url('/brand/illustrations/error-glide.svg')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "contain",
            backgroundPosition: "center",
            filter: "drop-shadow(0 18px 36px rgba(26, 18, 56, 0.14))",
          }}
        />
        <p style={{ fontSize: "1.5rem", fontWeight: 700 }}>We hit a wall</p>
        <p
          style={{
            marginTop: "0.75rem",
            maxWidth: "28rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: H.slateCaption,
          }}
        >
          GlideDesign could not finish loading the app shell. Reload once — if it keeps happening, contact support and
          share the error reference below.
        </p>
        {digest ? (
          <p style={{ marginTop: "1rem", fontFamily: "ui-monospace, monospace", fontSize: "11px", color: H.mistSecondary }}>
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
            background: H.copperAccent,
            color: H.white,
          }}
          onClick={() => reset()}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
