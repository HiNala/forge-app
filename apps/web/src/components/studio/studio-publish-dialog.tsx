"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { listPages, type PageOut, patchPage, publishPage } from "@/lib/api";
import { slugifyPageTitle } from "@/lib/slugify-page";
import { cn } from "@/lib/utils";

type StudioPublishDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  getToken: () => Promise<string | null>;
  activeOrgId: string | null;
  pageId: string;
  initialTitle: string;
  currentSlug: string;
  onPublished: (out: { public_url: string }) => void;
};

type FormProps = Omit<StudioPublishDialogProps, "open">;

/** Mounted only when `open` so slug/error state resets without setState-in-effect. */
function StudioPublishDialogForm({
  onOpenChange,
  getToken,
  activeOrgId,
  pageId,
  initialTitle,
  currentSlug,
  onPublished,
}: FormProps) {
  const [slug, setSlug] = React.useState(currentSlug);
  const [busy, setBusy] = React.useState(false);
  const [pages, setPages] = React.useState<PageOut[] | null>(null);
  const [slugError, setSlugError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!activeOrgId) return;
    void listPages(getToken, activeOrgId).then(setPages).catch(() => setPages([]));
  }, [getToken, activeOrgId]);

  const slugTaken = React.useMemo(() => {
    if (!pages || !slug.trim()) return false;
    return pages.some((p) => p.slug === slug.trim() && p.id !== pageId);
  }, [pages, slug, pageId]);

  async function onConfirm() {
    if (!activeOrgId || slugTaken) return;
    setBusy(true);
    try {
      const nextSlug = slugifyPageTitle(slug);
      if (nextSlug !== currentSlug) {
        await patchPage(getToken, activeOrgId, pageId, { slug: nextSlug });
      }
      const out = await publishPage(getToken, activeOrgId, pageId);
      onPublished({ public_url: out.public_url });
      onOpenChange(false);
    } catch (e) {
      if (e instanceof Error && e.message.includes("409")) {
        setSlugError("That slug is already taken in this workspace.");
      } else {
        setSlugError(e instanceof Error ? e.message : "Could not publish.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">Publish your page</DialogTitle>
        <DialogDescription className="font-body text-text-muted">
          Pick the URL slug for your live page. You can change it later.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-muted font-body" htmlFor="pub-slug">
          Slug
        </label>
        <Input
          id="pub-slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugError(null);
          }}
          placeholder={slugifyPageTitle(initialTitle)}
          className={cn(slugTaken && "border-danger")}
          aria-invalid={slugTaken}
        />
        <p className="text-xs text-text-muted font-body">
          Live URL preview:{" "}
          <span className="text-text">
            /p/…/{slugifyPageTitle(slug) || slugifyPageTitle(initialTitle)}
          </span>
        </p>
        {slugTaken ? (
          <p className="text-xs text-danger font-body" role="status">
            That slug is already used by another page here.
          </p>
        ) : null}
        {slugError ? (
          <p className="text-xs text-danger font-body" role="status">
            {slugError}
          </p>
        ) : null}
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={busy || slugTaken}
          onClick={() => void onConfirm()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Publish
        </Button>
      </DialogFooter>
    </>
  );
}

export function StudioPublishDialog({
  open,
  onOpenChange,
  getToken,
  activeOrgId,
  pageId,
  initialTitle,
  currentSlug,
  onPublished,
}: StudioPublishDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open ? (
          <StudioPublishDialogForm
            key={`${pageId}-${currentSlug}`}
            onOpenChange={onOpenChange}
            getToken={getToken}
            activeOrgId={activeOrgId}
            pageId={pageId}
            initialTitle={initialTitle}
            currentSlug={currentSlug}
            onPublished={onPublished}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
