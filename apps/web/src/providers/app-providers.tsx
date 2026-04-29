"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPaletteProvider } from "@/contexts/command-palette-context";
import { ForgeAuthProvider } from "@/providers/forge-auth-provider";
import { SessionProvider } from "@/providers/session-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ForgeAuthProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <CommandPaletteProvider>
            <ThemeProvider>
              <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
            </ThemeProvider>
          </CommandPaletteProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ForgeAuthProvider>
  );
}
