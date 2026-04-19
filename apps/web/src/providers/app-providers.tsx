"use client";

import * as React from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/theme-provider";
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
            <ThemeProvider>{children}</ThemeProvider>
          </CommandPaletteProvider>
        </SessionProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
