"use client";

import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { CalendarClock, Check, FileSignature, Presentation, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { successSpring } from "@/lib/motion";
import { markOnboardingSeen } from "@/components/chrome/onboarding-gate";
import { patchOrg, patchUserPreferences, postBrandLogo, putBrand } from "@/lib/api";
import { WORKFLOW_PRIMERS } from "@/lib/workflow-config";
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

type OnboardWf = "contact-form" | "proposal" | "pitch_deck" | "undecided";

export default function OnboardingPage() {
  const session = useForgeSession();
  const { user, activeOrganizationId: activeOrgId } = session;
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = React.useState(0);
  const [workflowChoice, setWorkflowChoice] = React.useState<OnboardWf | null>(null);

  const workflowFromUrl = React.useMemo((): OnboardWf | null => {
    const w = searchParams.get("workflow");
    if (!w) return null;
    const x = w.toLowerCase().replace(/_/g, "-");
    if (x === "contact-form" || x === "contact") return "contact-form";
    if (x === "proposal") return "proposal";
    if (x === "pitch-deck" || x === "deck") return "pitch_deck";
    return null;
  }, [searchParams]);

  const effectiveWorkflow = workflowChoice ?? workflowFromUrl;

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
      setDone(true);
      const wf =
        effectiveWorkflow && effectiveWorkflow !== "undecided"
          ? effectiveWorkflow === "contact-form"
            ? "contact-form"
            : effectiveWorkflow === "proposal"
              ? "proposal"
              : "pitch-deck"
          : null;
      const next = wf ? `/studio?workflow=${encodeURIComponent(wf)}` : "/dashboard";
      setTimeout(() => router.replace(next), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  async function persistWorkflowPick(next: OnboardWf) {
    setWorkflowChoice(next);
    try {
      await patchUserPreferences(getToken, {
        onboarded_for_workflow:
          next === "undecided"
            ? "undecided"
            : next === "contact-form"
              ? "contact-form"
              : next === "proposal"
                ? "proposal"
                : "pitch_deck",
      });
    } catch {
      /* preferences are optional */
    }
    setStep(1);
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

      {step === 0 ? (
        <div className="mt-10 space-y-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-text">What do you want to build first?</h2>
            <p className="mt-1 text-sm text-text-muted font-body">We&apos;ll tune Studio — you can change this anytime.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["contact-form", WORKFLOW_PRIMERS["contact-form"], CalendarClock],
                ["proposal", WORKFLOW_PRIMERS.proposal, FileSignature],
                ["pitch_deck", WORKFLOW_PRIMERS.pitch_deck, Presentation],
              ] as const
            ).map(([id, wf, Icon]) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors",
                  effectiveWorkflow === id
                    ? "border-accent bg-accent-light"
                    : "border-border bg-surface hover:border-accent/40",
                )}
                onClick={() => setWorkflowChoice(id)}
              >
                <Icon className="size-7 text-accent" aria-hidden />
                <span className="font-medium text-text font-body">{wf.title}</span>
                <span className="text-xs text-text-muted font-body">{wf.description}</span>
              </button>
            ))}
            <button
              type="button"
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border p-4 text-left sm:col-span-2",
                workflowChoice === "undecided"
                  ? "border-accent bg-accent-light"
                  : "border-border bg-surface hover:border-accent/40",
              )}
              onClick={() => setWorkflowChoice("undecided")}
            >
              <Sparkles className="size-7 text-accent" aria-hidden />
              <span className="font-medium text-text font-body">I&apos;ll figure it out</span>
              <span className="text-xs text-text-muted font-body">
                Start from a neutral Studio canvas — no pressure.
              </span>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="primary"
              disabled={effectiveWorkflow == null}
              onClick={() => effectiveWorkflow && void persistWorkflowPick(effectiveWorkflow)}
              style={{ backgroundColor: color, borderColor: "transparent" }}
            >
              Continue
            </Button>
            <button
              type="button"
              className="text-sm font-medium text-text-muted underline-offset-4 hover:underline font-body"
              onClick={() => void persistWorkflowPick("undecided")}
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
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
      ) : null}

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
