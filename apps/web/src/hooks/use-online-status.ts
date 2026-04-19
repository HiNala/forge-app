"use client";

import * as React from "react";

/** `true` when the browser reports online; updates on `online` / `offline` events. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = React.useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  return online;
}
