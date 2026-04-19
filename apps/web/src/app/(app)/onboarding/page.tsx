"use client";

import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { successSpring } from "@/lib/motion";
import { markOnboardingSeen } from "@/components/chrome/onboarding-gate";
import { patchOrg, postBrandLogo, putBrand } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

const CURATED_SWATCHES = [
  "#2a9d8f",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
  "#0d9488",
  "#4b5563",
] as const;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function suggestedWorkspaceName(email: string | undefined): string {
  if (!email) return "";
  const local = email.split("@")[0] ?? "";
  return local ? `${local.charAt(0).toUpperCase()}${local.slice(1)}` : "My workspace";
}

export default function OnboardingPage() {
  const session = useForgeSession();
  const { user, activeOrganizationId: activeOrgId } = session;
  const { getToken } = useAuth();
  const router = useRouter();

  const first = user?.display_name?.split(/\s+/)[0] ?? "there";
  const suggested = React.useMemo(
    () => suggestedWorkspaceName(user?.email),
    [user?.email],
  );
  /** Null = user has not edited yet; show server/email-derived suggestion. */
  const [workspaceDraft, setWorkspaceDraft] = React.useState<string | null>(null);
  const workspaceName = workspaceDraft ?? suggested;
  const [color, setColor] = React.useState("#2a9d8f");
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const previewStyle = React.useMemo(
    () =>
      ({
        ["--accent" as string]: color,
        ["--accent-light" as string]: `${color}33`,
        ["--accent-mid" as string]: `${color}55`,
      }) as React.CSSProperties,
    [color],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId) {
      setError("No active workspace. Try refreshing.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await patchOrg(getToken, activeOrgId, { name: workspaceName });
      await putBrand(getToken, activeOrgId, {
        primary_color: color,
        secondary_color: color,
      });
      if (file) {
        await postBrandLogo(getToken, activeOrgId, file);
      }
      markOnboardingSeen(activeOrgId);
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div
      className="mx-auto max-w-lg transition-[color] duration-300 ease-[var(--ease-out)]"
      style={previewStyle}
    >
      <h1 className="font-display text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        Let&apos;s get you set up
      </h1>
      <p className="mt-3 text-base leading-relaxed text-text-muted font-body">
        {greeting()}, {first} — name your workspace and set a first-pass brand. You can refine
        everything later in Settings.
      </p>

      <form className="mt-10 space-y-8" onSubmit={onSubmit}>
        {error ? (
          <p className="text-sm text-danger font-body" role="alert">
            {error}
          </p>
        ) : null}

        <div>
          <Label htmlFor="ws">Workspace name</Label>
          <Input
            id="ws"
            className="mt-2"
            value={workspaceName}
            onChange={(e) => setWorkspaceDraft(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Primary color</Label>
          <p className="mt-1 text-sm text-text-muted font-body">
            Pick a starting swatch or open the custom picker. Live preview updates accents below.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CURATED_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  "size-10 rounded-full border-2 transition-transform hover:scale-105",
                  color.toLowerCase() === c.toLowerCase()
                    ? "border-text ring-2 ring-offset-2 ring-offset-bg ring-accent"
                    : "border-transparent",
                )}
                style={{ backgroundColor: c }}
                aria-label={`Use ${c}`}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Label htmlFor="color-custom" className="sr-only">
              Custom color
            </Label>
            <input
              id="color-custom"
              type="color"
              className={cn(
                "h-12 w-14 cursor-pointer rounded-md border border-border bg-surface p-1",
                "transition-transform duration-200 ease-[var(--ease-spring)]",
                "hover:scale-[1.02] active:scale-[1.08]",
              )}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Pick custom color"
            />
            <span className="text-sm text-text-muted font-body">Custom</span>
          </div>
        </div>

        <div>
          <Label htmlFor="logo">Logo</Label>
          <label
            htmlFor="logo"
            className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-bg-elevated/50 px-6 py-10 text-center text-sm text-text-muted font-body hover:bg-bg-elevated"
          >
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? file.name : "Drop a logo here, or click to browse"}
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={done}
            className="shadow-sm"
            style={{ backgroundColor: color, borderColor: "transparent" }}
          >
            Finish setup
          </Button>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-text-muted underline-offset-4 hover:underline font-body"
            onClick={() => {
              if (activeOrgId) markOnboardingSeen(activeOrgId);
            }}
          >
            Skip for now
          </Link>
        </div>
      </form>

      {done ? (
        <motion.div
          className="pointer-events-none fixed inset-0 flex items-center justify-center bg-bg/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            variants={successSpring}
            initial="hidden"
            animate="show"
            className="flex size-16 items-center justify-center rounded-full bg-accent text-white shadow-lg"
            aria-hidden
          >
            <Check className="size-8" strokeWidth={2.5} />
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  );
}
