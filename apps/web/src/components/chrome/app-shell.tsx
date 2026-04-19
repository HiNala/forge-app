"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/chrome/command-palette";
import { OfflineBanner } from "@/components/chrome/offline-banner";
import { OnboardingGate } from "@/components/chrome/onboarding-gate";
import { ShortcutsDialog } from "@/components/chrome/shortcuts-dialog";
import { SkipToContentLink } from "@/components/chrome/skip-link";
import { Sidebar } from "@/components/chrome/sidebar";
import { TopBar } from "@/components/chrome/top-bar";
import { AppErrorBoundary } from "@/components/error-boundary/app-error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { fadeIn, fadeInReduced } from "@/lib/motion";
import { useAppShortcuts } from "@/hooks/use-shortcuts";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { BrandThemeProvider } from "@/providers/brand-theme-provider";
import { useForgeSession } from "@/providers/session-provider";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUIStore } from "@/stores/ui";
import { SIDEBAR_AUTO_COLLAPSE_EVENT } from "@/lib/shell-events";

function AppChromeSkeleton() {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden h-screen w-[220px] shrink-0 border-r border-border p-3 md:block">
        <Skeleton className="mb-6 h-10 w-full rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      </div>
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Skeleton className="h-14 w-full rounded-none border-b border-border" />
        <div className="flex-1 space-y-4 p-6 md:p-8">
          <Skeleton className="h-10 w-2/3 max-w-md rounded-lg" />
          <Skeleton className="h-32 w-full rounded-[10px]" />
          <Skeleton className="h-32 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  const { isLoading } = useForgeSession();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reducedMotion = useReducedMotion();
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const setSidebarCollapsed = useUIStore((s) => s.setSidebarCollapsed);
  useAppShortcuts(setShortcutsOpen);
  const routeVariants = reducedMotion ? fadeInReduced : fadeIn;

  React.useEffect(() => {
    const onAutoCollapse = () => setSidebarCollapsed(true);
    window.addEventListener(SIDEBAR_AUTO_COLLAPSE_EVENT, onAutoCollapse);
    return () => window.removeEventListener(SIDEBAR_AUTO_COLLAPSE_EVENT, onAutoCollapse);
  }, [setSidebarCollapsed]);

  const showAppSkeleton =
    !isLoaded || (isSignedIn && isLoading);

  if (showAppSkeleton) {
    return <AppChromeSkeleton />;
  }

  return (
    <BrandThemeProvider>
      <SkipToContentLink />
      <CommandPalette />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <OnboardingGate />
      <div className="flex min-h-screen bg-bg">
        {isDesktop ? <Sidebar /> : null}
        <div className="flex min-w-0 min-h-screen flex-1 flex-col">
          <OfflineBanner />
          <TopBar />
          <motion.main
            id="main-content"
            tabIndex={-1}
            key={pathname}
            variants={routeVariants}
            initial="hidden"
            animate="show"
            className="flex-1 overflow-auto p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:p-8"
          >
            <AppErrorBoundary>{children}</AppErrorBoundary>
          </motion.main>
        </div>
      </div>
    </BrandThemeProvider>
  );
}
