"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex min-h-[40vh] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-border bg-bg-elevated/50 px-4 py-12 text-center"
          role="alert"
        >
          <p className="font-display text-xl font-bold text-text">Something broke here</p>
          <p className="mt-2 max-w-md text-sm text-text-muted font-body">
            This panel crashed unexpectedly. Your other tabs are fine — reload this view to keep going.
          </p>
          <Button
            type="button"
            variant="primary"
            className="mt-6"
            onClick={() => this.setState({ error: null })}
          >
            Reload this panel
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
