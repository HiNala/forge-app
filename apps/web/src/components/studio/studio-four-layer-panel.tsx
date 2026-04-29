"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ForgeFourLayerPayload } from "@/lib/forge-four-layer";
import { cn } from "@/lib/utils";

export type { ForgeFourLayerPayload };

type StudioFourLayerPanelProps = {
  payload: ForgeFourLayerPayload | null;
  compact?: boolean;
};

export function StudioFourLayerPanel({ payload, compact }: StudioFourLayerPanelProps) {
  const [tab, setTab] = React.useState("reasoning");
  if (!payload) return null;

  const specJson = JSON.stringify(payload.layer2_design_spec_json ?? {}, null, 2);
  const codeJson = JSON.stringify(payload.layer3_code ?? {}, null, 2);
  const bullets = payload.layer4_suggestions ?? [];

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border border-white/10 bg-black/20",
        compact ? "text-[11px]" : "text-xs",
      )}
    >
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <TabsList className="h-auto w-full flex-wrap rounded-none border-b border-white/10 bg-transparent p-1">
          <TabsTrigger value="reasoning" className="text-[10px] px-2 py-1">
            Reasoning
          </TabsTrigger>
          <TabsTrigger value="spec" className="text-[10px] px-2 py-1">
            Spec
          </TabsTrigger>
          <TabsTrigger value="code" className="text-[10px] px-2 py-1">
            Code
          </TabsTrigger>
          <TabsTrigger value="next" className="text-[10px] px-2 py-1">
            Next moves
          </TabsTrigger>
        </TabsList>
        <TabsContent value="reasoning" className="m-0 max-h-48 overflow-auto px-3 py-2 text-white/80 font-body">
          {payload.layer1_reasoning?.trim() ? payload.layer1_reasoning : "Reasoning will appear here."}
        </TabsContent>
        <TabsContent value="spec" className="m-0 max-h-48 overflow-auto px-3 py-2">
          <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-emerald-100/90">{specJson}</pre>
        </TabsContent>
        <TabsContent value="code" className="m-0 max-h-48 overflow-auto px-3 py-2">
          <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-sky-100/90">{codeJson}</pre>
        </TabsContent>
        <TabsContent value="next" className="m-0 max-h-40 overflow-auto px-3 py-2 text-white/80 font-body">
          <ul className="list-disc space-y-1 pl-4">
            {(bullets.length ? bullets : ["No suggestions yet."]).map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
          {payload.memory_why && payload.memory_why.length > 0 ? (
            <div className="mt-3 rounded-md border border-white/10 bg-white/[0.04] p-2">
              <p className="mb-1 font-medium text-[10px] uppercase tracking-wide text-white/55">
                Why this looks this way
              </p>
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-white/70">
                {payload.memory_why.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
