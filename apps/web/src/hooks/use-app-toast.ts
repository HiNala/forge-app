"use client";

import * as React from "react";
import { toast as sonner } from "sonner";

/**
 * App-level toast API — success/info auto-dismiss (~4s); errors stay until dismissed (Mission FE-03).
 * For ad-hoc toasts, still use `toast` from `sonner` with explicit `duration` when needed.
 */
export function useToast() {
  return React.useMemo(
    () => ({
      success: (message: string) => sonner.success(message, { duration: 4000 }),
      info: (message: string) => sonner.info(message, { duration: 4000 }),
      error: (message: string) => sonner.error(message, { duration: Infinity }),
    }),
    [],
  );
}
