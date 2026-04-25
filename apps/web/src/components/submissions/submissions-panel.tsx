"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import * as React from "react";
import { toast } from "sonner";
import { Archive, ChevronDown, Download, Loader2, Mail } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSubmission,
  exportSubmissionsCsv,
  getBrand,
  listPageSubmissions,
  patchSubmission,
  postSubmissionDraftReply,
  postSubmissionReply,
  type SubmissionOut,
} from "@/lib/api";
import { MOTION_TRANSITIONS } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useForgeSession } from "@/providers/session-provider";
import { usePageDetail } from "@/providers/page-detail-provider";
import { motion, AnimatePresence } from "framer-motion";

const FILTERS = [
  { id: "", label: "All" },
  { id: "new", label: "New" },
  { id: "read", label: "Read" },
  { id: "replied", label: "Replied" },
  { id: "archived", label: "Archived" },
] as const;

function firstNameField(payload: Record<string, unknown>): string {
  const keys = ["name", "full_name", "fullName", "first_name", "firstName"];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const vals = Object.values(payload);
  const s = vals.find((v) => typeof v === "string" && String(v).length < 80);
  if (typeof s === "string") return s;
  return "—";
}

export function SubmissionsPanel() {
  const { page } = usePageDetail();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = searchParams.get("status") ?? "";
  const qFromUrl = searchParams.get("q") ?? "";
  const expandFromUrl = searchParams.get("expand");

  const { getToken } = useAuth();
  const { activeOrganizationId } = useForgeSession();
  const qc = useQueryClient();

  const [q, setQ] = React.useState(qFromUrl);
  React.useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep input aligned with URL on browser history navigation
    setQ(qFromUrl);
  }, [qFromUrl]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = q.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const qs = next.toString();
      if (qs !== searchParams.toString()) {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, router, pathname, searchParams]);

  const debouncedQ = qFromUrl;

  const setFilter = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (!id) next.delete("status");
    else next.set("status", id);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const expanded = expandFromUrl;

  const setExpandedAndUrl = React.useCallback(
    (id: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (id) next.set("expand", id);
      else next.delete("expand");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const [highlightIdx, setHighlightIdx] = React.useState<number | null>(null);

  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replySub, setReplySub] = React.useState<SubmissionOut | null>(null);
  const [replySubject, setReplySubject] = React.useState("");
  const [replyBody, setReplyBody] = React.useState("");
  const [exporting, setExporting] = React.useState(false);
  const [rawJsonOpen, setRawJsonOpen] = React.useState(false);
  const [rawPayload, setRawPayload] = React.useState<Record<string, unknown> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState("");
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const brandQ = useQuery({
    queryKey: ["brand", activeOrganizationId],
    queryFn: () => getBrand(getToken, activeOrganizationId),
    enabled: !!activeOrganizationId && replyOpen,
  });

  const listQ = useQuery({
    queryKey: ["submissions", activeOrganizationId, page.id, filter, debouncedQ],
    queryFn: () =>
      listPageSubmissions(getToken, activeOrganizationId, page.id, {
        limit: 50,
        status: filter || null,
        q: debouncedQ.trim() || null,
      }),
    enabled: !!activeOrganizationId,
    refetchInterval: 30_000,
  });

  const rows = React.useMemo(() => listQ.data?.items ?? [], [listQ.data]);

  const pollPulseRef = React.useRef(false);
  const seenRowIds = React.useRef<Set<string>>(new Set());
  const [pulseIds, setPulseIds] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    if (!rows.length) return;
    if (!pollPulseRef.current) {
      pollPulseRef.current = true;
      rows.forEach((r) => seenRowIds.current.add(r.id));
      return;
    }
    const newcomers = rows.filter((r) => !seenRowIds.current.has(r.id));
    rows.forEach((r) => seenRowIds.current.add(r.id));
    if (newcomers.length > 0) {
      setPulseIds(new Set(newcomers.map((n) => n.id)));
      const t = window.setTimeout(() => setPulseIds(new Set()), 2200);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [rows]);

  const replyMut = useMutation({
    mutationFn: async () => {
      if (!replySub) throw new Error("No submission selected");
      await postSubmissionReply(getToken, activeOrganizationId, replySub.id, {
        subject: replySubject,
        body: replyBody,
      });
    },
    onSuccess: async () => {
      const email = replySub?.submitter_email;
      toast.success(email ? `Reply sent to ${email}` : "Reply sent");
      setReplyOpen(false);
      setReplySub(null);
      await qc.invalidateQueries({ queryKey: ["submissions"] });
      await qc.invalidateQueries({ queryKey: ["submissions-count"] });
    },
    onError: (e: Error) => {
      toast.error(e.message, {
        action: { label: "Try again", onClick: () => void replyMut.mutate() },
      });
    },
  });

  const bulkPatch = async (status: string) => {
    const ids = [...selected];
    for (const id of ids) {
      await patchSubmission(getToken, activeOrganizationId, id, { status });
    }
    toast.success("Updated submissions");
    setSelected(new Set());
    await qc.invalidateQueries({ queryKey: ["submissions"] });
    await qc.invalidateQueries({ queryKey: ["submissions-count"] });
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    const n = ids.length;
    if (n >= 10 && deleteConfirm.trim().toLowerCase() !== "delete") {
      toast.error('Type "delete" to confirm removing this many submissions.');
      return;
    }
    setBulkDeleting(true);
    try {
      for (const id of ids) {
        await deleteSubmission(getToken, activeOrganizationId, id);
      }
      toast.success(n === 1 ? "Submission removed" : `${n} submissions removed`);
      setSelected(new Set());
      setDeleteDialogOpen(false);
      setDeleteConfirm("");
      await qc.invalidateQueries({ queryKey: ["submissions"] });
      await qc.invalidateQueries({ queryKey: ["submissions-count"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBulkDeleting(false);
    }
  };

  async function onExport() {
    setExporting(true);
    try {
      const { blob, filename } = await exportSubmissionsCsv(getToken, activeOrganizationId, page.id, {
        status: filter || null,
        q: debouncedQ.trim() || null,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started", { description: filename });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (replyOpen || rawJsonOpen || deleteDialogOpen) return;
      const t = e.target as HTMLElement | null;
      if (
        t?.closest(
          "input:not([readonly]), textarea, select, [contenteditable=true], [role=combobox]",
        )
      ) {
        return;
      }

      if (e.key === "Escape" && expanded) {
        e.preventDefault();
        setExpandedAndUrl(null);
        return;
      }

      if (!rows.length) return;

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => {
          if (prev === null) return 0;
          if (e.key === "ArrowDown") return Math.min(rows.length - 1, prev + 1);
          return Math.max(0, prev - 1);
        });
        return;
      }

      if (e.key === "Enter" && highlightIdx !== null && rows[highlightIdx]) {
        e.preventDefault();
        const sid = rows[highlightIdx].id;
        setExpandedAndUrl(expanded === sid ? null : sid);
        return;
      }

      const ex = expanded
        ? rows.find((r) => r.id === expanded)
        : rows[highlightIdx ?? -1];
      if (!ex) return;

      if ((e.key === "r" || e.key === "R") && expanded === ex.id) {
        e.preventDefault();
        setReplySub(ex);
        setReplySubject("Re: your submission");
        setReplyBody("");
        setReplyOpen(true);
        void postSubmissionDraftReply(getToken, activeOrganizationId, ex.id)
          .then((d) => {
            setReplySubject(d.subject);
            setReplyBody(d.body);
          })
          .catch(() => {
            /* template only */
          });
        return;
      }

      if ((e.key === "a" || e.key === "A") && expanded === ex.id) {
        e.preventDefault();
        void patchSubmission(getToken, activeOrganizationId, ex.id, {
          status: "archived",
        }).then(() => {
          toast.success("Archived");
          void qc.invalidateQueries({ queryKey: ["submissions"] });
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    rows,
    expanded,
    highlightIdx,
    replyOpen,
    rawJsonOpen,
    deleteDialogOpen,
    getToken,
    activeOrganizationId,
    qc,
    setExpandedAndUrl,
  ]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = rows.some((r) => selected.has(r.id));

  return (
    <div className="space-y-3">
      {/* Top row: count + export */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-body text-[13px] font-semibold text-text">
          {listQ.isLoading ? "…" : rows.length}{" "}
          <span className="font-normal text-text-muted">response{rows.length === 1 ? "" : "s"}</span>
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={exporting}
          onClick={() => void onExport()}
          className="gap-1.5 shrink-0"
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Export
        </Button>
      </div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id || "all"}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium font-body transition-colors",
              filter === f.id
                ? "border-accent bg-accent-light text-accent"
                : "border-border bg-surface text-text-muted hover:border-accent/40",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Search */}
      <Input
        placeholder="Search submissions…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search submissions"
      />

      {listQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-bg-elevated" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <p className="font-body text-sm text-text-muted">No submissions yet.</p>
          <p className="mt-1 font-body text-xs text-text-subtle">Share your live page to collect responses.</p>
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-border">
          <table className="min-w-[540px] w-full text-left text-sm font-body">
            <thead className="border-b border-border bg-bg-elevated text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="w-10 p-3">
                  <Checkbox
                    checked={
                      allSelected ? true : someSelected ? ("indeterminate" as const) : false
                    }
                    onCheckedChange={(v) => {
                      if (v === true) {
                        setSelected(new Set(rows.map((r) => r.id)));
                      } else {
                        setSelected(new Set());
                      }
                    }}
                    aria-label="Select all rows"
                  />
                </th>
                <th className="p-3">From</th>
                <th className="p-3">Email</th>
                <th className="p-3">Submitted</th>
                <th className="p-3">Status</th>
                <th className="w-10 p-3" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.map((s, idx) => (
                <SubmissionRow
                  key={s.id}
                  s={s}
                  expanded={expanded === s.id}
                  pulse={pulseIds.has(s.id)}
                  highlighted={highlightIdx === idx}
                  checked={selected.has(s.id)}
                  onToggleCheck={(c) => {
                    setSelected((prev) => {
                      const n = new Set(prev);
                      if (c) n.add(s.id);
                      else n.delete(s.id);
                      return n;
                    });
                  }}
                  onToggleExpand={() => {
                    setHighlightIdx(idx);
                    setExpandedAndUrl(expanded === s.id ? null : s.id);
                  }}
                  onReply={() => {
                    setReplySub(s);
                    setReplySubject("Re: your submission");
                    setReplyBody("");
                    setReplyOpen(true);
                    void (async () => {
                      try {
                        const d = await postSubmissionDraftReply(getToken, activeOrganizationId, s.id);
                        setReplySubject(d.subject);
                        setReplyBody(d.body);
                      } catch {
                        /* template only */
                      }
                    })();
                  }}
                  onMarkRead={() => {
                    void patchSubmission(getToken, activeOrganizationId, s.id, {
                      status: s.status === "read" ? "new" : "read",
                    }).then(() => {
                      void qc.invalidateQueries({ queryKey: ["submissions"] });
                    });
                  }}
                  onArchive={() => {
                    void patchSubmission(getToken, activeOrganizationId, s.id, { status: "archived" }).then(() => {
                      toast.success("Archived");
                      void qc.invalidateQueries({ queryKey: ["submissions"] });
                    });
                  }}
                  onRawJson={() => {
                    setRawPayload(s.payload ?? {});
                    setRawJsonOpen(true);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {selected.size > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={MOTION_TRANSITIONS.fadeUp}
            className="fixed inset-x-4 bottom-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-lg md:left-auto md:right-8 md:max-w-2xl"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <span className="text-sm font-medium font-body">{selected.size} selected</span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => void bulkPatch("read")}>
                Mark read
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => void bulkPatch("archived")}>
                Archive
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setDeleteConfirm("");
                  setDeleteDialogOpen(true);
                }}
              >
                Delete
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted font-body">Subject</label>
              <Input value={replySubject} onChange={(e) => setReplySubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-muted font-body">Message</label>
              <Textarea rows={8} value={replyBody} onChange={(e) => setReplyBody(e.target.value)} />
            </div>
            {brandQ.data ? (
              <div
                className="rounded-2xl border border-border bg-bg-elevated p-3 text-xs font-body"
                style={{
                  borderLeftWidth: 4,
                  borderLeftColor: brandQ.data.primary_color ?? "#6366f1",
                }}
              >
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Preview</p>
                {brandQ.data.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brandQ.data.logo_url}
                    alt=""
                    className="mb-2 mt-1 h-8 w-auto object-contain"
                  />
                ) : null}
                <p className="font-medium text-text">{replySubject || "Subject"}</p>
                <p className="mt-2 whitespace-pre-wrap text-text-muted">{replyBody || "…"}</p>
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (!replySub) return;
                void postSubmissionDraftReply(getToken, activeOrganizationId, replySub.id).then((d) => {
                  setReplySubject(d.subject);
                  setReplyBody(d.body);
                });
              }}
            >
              Regenerate draft
            </Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setReplyOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={replyMut.isPending}
              onClick={() => replyMut.mutate()}
            >
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rawJsonOpen}
        onOpenChange={(o) => {
          setRawJsonOpen(o);
          if (!o) setRawPayload(null);
        }}
      >
        <DialogContent className="max-w-2xl font-mono text-xs">
          <DialogHeader>
            <DialogTitle>Submission payload (JSON)</DialogTitle>
          </DialogHeader>
          <pre className="max-h-[min(60vh,480px)] overflow-auto rounded-md bg-bg-elevated p-3 text-left">
            {rawPayload ? JSON.stringify(rawPayload, null, 2) : ""}
          </pre>
          <DialogFooter>
            <Button type="button" variant="secondary" size="sm" onClick={() => void navigator.clipboard.writeText(JSON.stringify(rawPayload))}>
              Copy
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => setRawJsonOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete submissions</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-muted font-body">
            {selected.size >= 10
              ? `This will permanently remove ${selected.size} submissions. Type delete to confirm.`
              : `Remove ${selected.size} submission(s)? This cannot be undone.`}
          </p>
          {selected.size >= 10 ? (
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='Type "delete" to confirm'
              autoComplete="off"
            />
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" loading={bulkDeleting} onClick={() => void bulkDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubmissionRow({
  s,
  expanded,
  pulse,
  highlighted,
  checked,
  onToggleCheck,
  onToggleExpand,
  onReply,
  onMarkRead,
  onArchive,
  onRawJson,
}: {
  s: SubmissionOut;
  expanded: boolean;
  pulse: boolean;
  highlighted: boolean;
  checked: boolean;
  onToggleCheck: (v: boolean) => void;
  onToggleExpand: () => void;
  onReply: () => void;
  onMarkRead: () => void;
  onArchive: () => void;
  onRawJson: () => void;
}) {
  const payload = s.payload ?? {};
  const [showAll, setShowAll] = React.useState(false);
  const entries = Object.entries(payload);
  const visible = showAll ? entries : entries.slice(0, 6);

  return (
    <>
      <tr
        data-highlighted={highlighted ? "true" : undefined}
        className={cn(
          "cursor-pointer border-b border-border transition-colors hover:bg-bg-elevated/80",
          expanded && "bg-bg-elevated/60",
          highlighted && "ring-1 ring-inset ring-accent/50",
          pulse && "animate-highlight-pulse",
        )}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("input,button,a")) return;
          onToggleExpand();
        }}
      >
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={checked} onCheckedChange={(v) => onToggleCheck(!!v)} aria-label="Select row" />
        </td>
        <td className="p-3 font-medium text-text">{firstNameField(payload)}</td>
        <td className="p-3 text-text-muted">{s.submitter_email ?? "—"}</td>
        <td className="p-3 text-text-muted">
          {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
        </td>
        <td className="p-3">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn("size-2 rounded-full", {
                "bg-emerald-500": s.status === "replied",
                "bg-amber-400": s.status === "new",
                "bg-blue-400": s.status === "read",
                "bg-zinc-400": s.status === "archived",
              })}
            />
            {s.status}
          </span>
        </td>
        <td className="p-3 text-text-muted">
          <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </td>
      </tr>
      {expanded ? (
        <tr className="bg-bg-elevated/40">
          <td colSpan={6} className="p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {visible.map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="text-text-muted">{k}: </span>
                  <span className="text-text">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
            {entries.length > 6 ? (
              <button
                type="button"
                className="mt-2 text-xs text-accent underline font-body"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Show less" : "See all fields"}
              </button>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button type="button" size="sm" variant="primary" className="gap-1" onClick={onReply}>
                <Mail className="size-3.5" />
                Reply
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={onMarkRead}>
                Mark read / unread
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={onArchive}>
                <Archive className="size-3.5" />
                Archive
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onRawJson}>
                Raw JSON
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
