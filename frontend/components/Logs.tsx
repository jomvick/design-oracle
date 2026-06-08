"use client";

import { useEffect, useRef } from "react";
import type { PipelineLog } from "@/hooks/useAnalysisPipeline";
import PanelHeader from "@/components/ui/PanelHeader";
import GlassPanel from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface LogsProps {
  logs: PipelineLog[];
  status: string;
}

/**
 * Flux d'activité en style terminal — une seule carte, lignes compactes.
 * Évite la surcharge de cartes "INSIGHT" empilées.
 */
export default function Logs({ logs, status }: LogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [logs]);

  const isRunning = status === "running";

  const copyAll = async () => {
    const text = logs.map((l) => `[+${l.ts.toFixed(1)}s] ${l.msg}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full min-h-0 w-[260px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0D1117]/40 xl:w-[280px]">
      <PanelHeader
        title="Activity"
        action={
          logs.length > 0 ? (
            <button
              type="button"
              onClick={copyAll}
              className="rounded-md p-1.5 text-zinc-600 transition-colors hover:bg-white/[0.05] hover:text-zinc-400"
              title="Copy log"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col p-3 min-h-0">
        <GlassPanel className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3">
            {logs.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-zinc-600">
                Waiting for events…
              </p>
            ) : (
              <div className="space-y-0.5">
                {logs.map((log, i) => {
                  const isLatest = i === logs.length - 1 && isRunning;
                  return (
                    <div
                      key={`${log.ts}-${i}`}
                      className={cn(
                        "flex gap-2.5 rounded-md px-2 py-1.5 font-mono text-[11px] leading-relaxed",
                        isLatest && "border-l-2 border-violet-500/60 bg-violet-500/[0.04] pl-[6px]",
                        log.type === "error" && "text-red-400/90",
                        log.type === "done" && "text-emerald-400/90",
                        !log.type && !isLatest && "text-zinc-500",
                        log.type === "active" && "text-zinc-300",
                        isLatest && !log.type && "text-zinc-300"
                      )}
                    >
                      <span className="shrink-0 tabular-nums text-zinc-600">
                        +{log.ts.toFixed(1)}s
                      </span>
                      <span className="min-w-0 break-words">{log.msg}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {logs.length > 0 && (
            <div className="shrink-0 border-t border-white/[0.04] px-3 py-2">
              <p className="font-mono text-[10px] text-zinc-600">
                {logs.length} event{logs.length > 1 ? "s" : ""}
              </p>
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
