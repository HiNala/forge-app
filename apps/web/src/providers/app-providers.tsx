"use client";

import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPaletteProvider } from "@/contexts/command-palette-context";
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
    <ClerkProvider
      signInUrl="/signin"
      signUpUrl="/signup"
      afterSignOutUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <CommandPaletteProvider>
            <ThemeProvider>
              <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
            </ThemeProvider>
          </CommandPaletteProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
