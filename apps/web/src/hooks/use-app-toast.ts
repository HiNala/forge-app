"use client";

import * as React from "react";
import { toast as sonner } from "sonner";

/**
 * App-level toast API — P-09 durations: info 4s, success 6s, warning 8s, errors until dismissed.
 * For ad-hoc toasts, still use `toast` from `sonner` with explicit `duration` when needed.
 */
export function useToast() {
  return React.useMemo(
    () => ({
      success: (message: string) => sonner.success(message, { duration: 6000 }),
      info: (message: string) => sonner.info(message, { duration: 4000 }),
      warning: (message: string) => sonner.warning(message, { duration: 8000 }),
      error: (message: string) => sonner.error(message, { duration: Infinity }),
    }),
    [],
  );
}
