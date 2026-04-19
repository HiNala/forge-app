"use client";

import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { successSpring } from "@/lib/motion";
import { markOnboardingSeen } from "@/components/chrome/onboarding-gate";
import { patchOrg, patchUserPreferences, postBrandLogo, putBrand } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

type OnboardWorkflow = "contact_form" | "proposal" | "pitch_deck" | "unsure" | null;

const WORKFLOW_CARDS: {
  id: NonNullable<OnboardWorkflow>;
  title: string;
  description: string;
}[] = [
  {
    id: "contact_form",
    title: "Contact form",
    description: "Capture leads with booking-ready flows.",
  },
  {
    id: "proposal",
    title: "Proposal",
    description: "Send signed quotes clients can accept online.",
  },
  {
    id: "pitch_deck",
    title: "Pitch deck",
    description: "Turn your story into a polished slide deck.",
  },
  {
    id: "unsure",
    title: "I'll figure it out",
    description: "Start with a blank Studio and explore.",
  },
];

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
  const searchParams = useSearchParams();

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
  const workflowParam = searchParams.get("workflow");
  const workflowFromUrl = React.useMemo((): OnboardWorkflow | null => {
    const w = workflowParam;
    if (w === "contact_form" || w === "proposal" || w === "pitch_deck") return w;
    return null;
  }, [workflowParam]);

  const [workflowOverride, setWorkflowOverride] = React.useState<OnboardWorkflow | null>(null);
  const workflowChoice = workflowOverride ?? workflowFromUrl;

  const logoPreviewUrl = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    };
  }, [logoPreviewUrl]);

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
      const wfPref =
        workflowChoice && workflowChoice !== "unsure" ? workflowChoice : null;
      if (wfPref) {
        try {
          await patchUserPreferences(getToken, { onboarded_for_workflow: wfPref });
        } catch {
          /* non-fatal */
        }
      } else if (workflowChoice === "unsure") {
        try {
          await patchUserPreferences(getToken, { onboarded_for_workflow: "unsure" });
        } catch {
          /* ignore */
        }
      }
      setDone(true);
      const studioPath =
        workflowChoice === "contact_form"
          ? "/studio?workflow=contact_form"
          : workflowChoice === "proposal"
            ? "/studio?workflow=proposal"
            : workflowChoice === "pitch_deck"
              ? "/studio?workflow=pitch_deck"
              : "/dashboard";
      setTimeout(() => router.replace(studioPath), 700);
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
      <span className="section-label mb-4">Welcome</span>
      <h1 className="font-display text-[clamp(32px,5vw,48px)] font-bold leading-[0.95] tracking-tight text-text">
        {greeting()}, {first}.
        <br />
        <span className="text-accent">Let&apos;s build something.</span>
      </h1>
      <p className="mt-4 font-body text-base font-light leading-relaxed text-text-muted">
        Name your workspace and set a brand color. You can refine everything later in Settings.
      </p>

      <div className="mt-10 space-y-3">
        <p className="font-body text-sm font-semibold text-text">What will you build first?</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {WORKFLOW_CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setWorkflowOverride(c.id)}
              className={cn(
                "relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition-all duration-150",
                workflowChoice === c.id
                  ? "border-accent bg-accent-light shadow-sm ring-2 ring-accent/20"
                  : "border-border bg-surface hover:border-accent/40 hover:bg-bg-elevated",
              )}
            >
              {workflowChoice === c.id && (
                <span
                  className="absolute inset-x-0 top-0 h-0.5 rounded-t-2xl"
                  style={{ background: "var(--accent)" }}
                  aria-hidden
                />
              )}
              <span className="block font-display text-[15px] font-bold text-text">{c.title}</span>
              <span className="mt-1 block font-body text-xs font-light leading-relaxed text-text-muted">
                {c.description}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="font-body text-xs font-medium text-text-subtle underline-offset-4 hover:text-text-muted hover:underline"
          onClick={() => setWorkflowOverride("unsure")}
        >
          Skip this step
        </button>
      </div>

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
          <p className="mt-1 text-sm text-text-muted font-body">
            Optional — PNG, JPG, WebP, or SVG. You can replace or remove before finishing.
          </p>
          <label
            htmlFor="logo"
            className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-bg-elevated/50 px-6 py-8 text-center text-sm text-text-muted font-body hover:bg-bg-elevated"
          >
            <input
              id="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {logoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob preview before upload
              <img
                src={logoPreviewUrl}
                alt="Logo preview"
                className="max-h-28 max-w-full rounded-md object-contain"
              />
            ) : (
              <span>Drop a logo here, or click to browse</span>
            )}
          </label>
          {file ? (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="truncate text-xs text-text-subtle font-body">{file.name}</span>
              <button
                type="button"
                className="text-sm font-medium text-accent underline-offset-2 hover:underline font-body"
                onClick={() => setFile(null)}
              >
                Remove
              </button>
            </div>
          ) : null}
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
