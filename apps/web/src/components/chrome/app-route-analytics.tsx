"use client";

import { useUser } from "@/providers/forge-auth-provider";

import { useAnalytics } from "@/lib/analytics/tracker";

/**
 * In-app telemetry (`dashboard_view`). Only mounted when the user is signed in
 * so marketing routes never hit authenticated analytics ingest.
 */
function AnalyticsBeacon() {
  useAnalytics();
  return null;
}

export function AppRouteAnalytics() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded || !isSignedIn) return null;
  return <AnalyticsBeacon />;
}
