"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getBrand, postBrandLogo, putBrand, type BrandKitOut } from "@/lib/api";
import { useForgeSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";

const GOOGLE_FONTS = [
  "Inter",
  "DM Sans",
  "Fraunces",
  "Playfair Display",
  "Libre Baskerville",
  "Source Serif 4",
  "Space Grotesk",
  "IBM Plex Sans",
  "Newsreader",
] as const;

const DEFAULT_PRIMARY = "#2a9d8f";

export default function BrandSettingsPage() {
  const { activeOrganizationId } = useForgeSession();
  return <BrandSettingsInner key={activeOrganizationId ?? "none"} />;
}

function BrandSettingsInner() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const { activeOrganizationId, activeRole } = useForgeSession();
  const canEdit = activeRole === "owner" || activeRole === "editor";

  const q = useQuery({
    queryKey: ["brand", activeOrganizationId],
    enabled: !!activeOrganizationId,
    queryFn: () => getBrand(getToken, activeOrganizationId),
  });

  const [overrides, setOverrides] = React.useState<Partial<BrandKitOut>>({});

  const draft = React.useMemo((): BrandKitOut | null => {
    if (!q.data) return null;
    return { ...q.data, ...overrides };
  }, [q.data, overrides]);

  const displayFontOptions = React.useMemo(() => {
    const d = draft?.display_font?.trim();
    if (d && !(GOOGLE_FONTS as readonly string[]).includes(d)) {
      return [d, ...GOOGLE_FONTS] as string[];
    }
    return [...GOOGLE_FONTS];
  }, [draft?.display_font]);

  const bodyFontOptions = React.useMemo(() => {
    const b = draft?.body_font?.trim();
    if (b && !(GOOGLE_FONTS as readonly string[]).includes(b)) {
      return [b, ...GOOGLE_FONTS] as string[];
    }
    return [...GOOGLE_FONTS];
  }, [draft?.body_font]);

  const saveMut = useMutation({
    mutationFn: async (next: Partial<BrandKitOut>) => {
      if (!activeOrganizationId) throw new Error("No workspace");
      const cur = qc.getQueryData<BrandKitOut>(["brand", activeOrganizationId]);
      const primary = next.primary_color ?? cur?.primary_color ?? draft?.primary_color ?? DEFAULT_PRIMARY;
      const secondary = next.secondary_color ?? cur?.secondary_color ?? draft?.secondary_color ?? primary;
      return putBrand(getToken, activeOrganizationId, {
        primary_color: primary,
        secondary_color: secondary,
        display_font: next.display_font ?? cur?.display_font ?? draft?.display_font ?? null,
        body_font: next.body_font ?? cur?.body_font ?? draft?.body_font ?? null,
        voice_note: next.voice_note ?? cur?.voice_note ?? draft?.voice_note ?? null,
      });
    },
    onSuccess: (data) => {
      qc.setQueryData(["brand", activeOrganizationId], data);
      setOverrides({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logoMut = useMutation({
    mutationFn: async (file: File) => {
      if (!activeOrganizationId) throw new Error("No workspace");
      return postBrandLogo(getToken, activeOrganizationId, file);
    },
    onSuccess: () => {
      toast.success("Logo updated");
      void qc.invalidateQueries({ queryKey: ["brand", activeOrganizationId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  if (!draft && q.isLoading) {
    return (
      <div className="text-sm text-text-muted font-body" aria-busy>
        Loading brand kit…
      </div>
    );
  }

  if (!draft) {
    return null;
  }

  const primary = draft.primary_color ?? DEFAULT_PRIMARY;
  const secondary = draft.secondary_color ?? primary;
  const primaryIsHex = primary.trim().startsWith("#");

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text">Brand kit</h1>
        <p className="mt-2 text-text-muted font-body">
          Colors and type apply to the Forge app while you work. Published pages use their own
          snapshots.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text">Colors</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="primary">Primary</Label>
            <div className="mt-2 flex items-center gap-3">
              {primaryIsHex ? (
                <input
                  id="primary"
                  type="color"
                  disabled={!canEdit}
                  className="h-12 w-14 cursor-pointer rounded-md border border-border bg-surface p-1 disabled:opacity-50"
                  value={primary.slice(0, 7)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setOverrides((o) => ({
                      ...o,
                      primary_color: v,
                      secondary_color: v,
                    }));
                  }}
                  onBlur={() => saveMut.mutate({})}
                />
              ) : null}
              <Input
                className="font-mono text-sm"
                disabled={!canEdit}
                value={primary}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, primary_color: e.target.value }))
                }
                onBlur={() => saveMut.mutate({})}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="secondary">Secondary</Label>
            <div className="mt-2 flex items-center gap-3">
              {secondary.trim().startsWith("#") ? (
                <input
                  id="secondary"
                  type="color"
                  disabled={!canEdit}
                  className="h-12 w-14 cursor-pointer rounded-md border border-border bg-surface p-1 disabled:opacity-50"
                  value={secondary.slice(0, 7)}
                  onChange={(e) =>
                    setOverrides((o) => ({ ...o, secondary_color: e.target.value }))
                  }
                  onBlur={() => saveMut.mutate({})}
                />
              ) : null}
              <Input
                className="font-mono text-sm"
                disabled={!canEdit}
                value={secondary}
                onChange={(e) =>
                  setOverrides((o) => ({ ...o, secondary_color: e.target.value }))
                }
                onBlur={() => saveMut.mutate({})}
              />
            </div>
          </div>
        </div>
        {saveMut.isPending ? (
          <p className="text-xs text-text-muted font-body">Saving…</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-text">Typography</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label>Display / headings</Label>
            <Select
              disabled={!canEdit}
              value={draft.display_font?.trim() || GOOGLE_FONTS[0]!}
              onValueChange={(v) => {
                setOverrides((o) => ({ ...o, display_font: v }));
                saveMut.mutate({ display_font: v });
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayFontOptions.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Body</Label>
            <Select
              disabled={!canEdit}
              value={draft.body_font?.trim() || GOOGLE_FONTS[0]!}
              onValueChange={(v) => {
                setOverrides((o) => ({ ...o, body_font: v }));
                saveMut.mutate({ body_font: v });
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bodyFontOptions.map((f) => (
                  <SelectItem key={`b-${f}`} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text">Logo</h2>
        {draft.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={draft.logo_url}
            alt="Workspace logo"
            className="h-20 w-20 rounded-md border border-border object-contain bg-bg-elevated p-1"
          />
        ) : null}
        <div
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-bg-elevated/50 px-6 py-10 text-center text-sm text-text-muted font-body transition-colors",
            dragOver && "border-accent bg-accent-light/30",
            !canEdit && "pointer-events-none opacity-50",
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) logoMut.mutate(f);
          }}
          onClick={() => canEdit && fileInputRef.current?.click()}
          role="presentation"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) logoMut.mutate(f);
            }}
          />
          {logoMut.isPending ? "Uploading…" : "Drop a logo here, or click to browse (max 2MB)"}
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="voice">Voice & tone note</Label>
        <Textarea
          id="voice"
          disabled={!canEdit}
          rows={5}
          placeholder="How should AI sound when writing for this brand?"
          value={draft.voice_note ?? ""}
          onChange={(e) =>
            setOverrides((o) => ({ ...o, voice_note: e.target.value }))
          }
          onBlur={(e) => saveMut.mutate({ voice_note: e.target.value })}
          className="resize-y"
        />
      </section>

      {!canEdit ? (
        <p className="text-sm text-text-muted font-body">
          Viewers can see brand settings but cannot edit. Ask an owner or editor to make changes.
        </p>
      ) : null}
    </div>
  );
}
