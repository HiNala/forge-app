"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type CreditConfirmEstimate = {
  estimatedCredits: number;
  estimatedSeconds: number;
  estimatedCostDisplay: string;
  confidenceLabel: string;
  sessionCap: number;
  sessionUsedBefore: number;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  estimate: CreditConfirmEstimate | null;
  /** Called with optional new `credit_confirm_skip_under_credits` when user checks the box. */
  onConfirm: (opts: { raiseSkipUnderCreditsTo: number | null }) => void;
};

export function CreditConfirmDialog({ open, onOpenChange, estimate, onConfirm }: Props) {
  const [dontAsk, setDontAsk] = React.useState(false);

  if (!estimate) return null;

  const remainingAfter =
    estimate.sessionCap > 0
      ? Math.max(0, estimate.sessionCap - estimate.sessionUsedBefore - estimate.estimatedCredits)
      : null;

  const suggestedSkip = Math.max(estimate.estimatedCredits + 5, 75);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>This action uses about {estimate.estimatedCredits} credits</DialogTitle>
          <DialogDescription className="space-y-2 font-body">
            <p>
              Estimated spend: <span className="text-text">{estimate.estimatedCostDisplay}</span> · ~{estimate.estimatedSeconds}s ·{" "}
              {estimate.confidenceLabel} confidence — actual usage may vary.
            </p>
            {estimate.sessionCap > 0 && remainingAfter !== null ? (
              <p>
                After this, roughly <strong>{remainingAfter}</strong> of your {estimate.sessionCap} session credits remain.
              </p>
            ) : (
              <p>Session-cap details will appear once your workspace reports usage.</p>
            )}
          </DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer gap-2 text-sm text-text-muted font-body">
          <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} />
          Don&apos;t ask again for prompts under {suggestedSkip} credits
        </label>
        <DialogFooter className="gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onConfirm({ raiseSkipUnderCreditsTo: dontAsk ? suggestedSkip : null });
              onOpenChange(false);
            }}
          >
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
