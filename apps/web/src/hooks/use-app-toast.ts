"use client";

import { toast as sonner } from "sonner";

const DEFAULT_MS = 4000;

/**
 * Global toast pipe — errors stay until dismissed; success/info auto-dismiss.
 */
export function useAppToast() {
  return {
    success: (msg: string) => sonner.success(msg, { duration: DEFAULT_MS }),
    info: (msg: string) => sonner.message(msg, { duration: DEFAULT_MS }),
    error: (msg: string) => sonner.error(msg, { duration: Infinity }),
  };
}
