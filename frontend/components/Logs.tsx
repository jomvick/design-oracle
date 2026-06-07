"use client";

import { useEffect, useRef } from "react";
import type { PipelineLog } from "@/hooks/useAnalysisPipeline";
import AiInsightCard from "@/components/ui/AiInsightCard";
import { ShimmerText } from "@/components/ui/Shimmer";
import { cn } from "@/lib/cn";
import { Activity, Radio } from "lucide-react";

interface LogsProps {
  logs: PipelineLog[];
  status: string;
}

export default function Logs({ logs, status }: LogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [logs]);

  const isRunning = status === "running";
  const isComplete = status === "complete";
  const isError = status === "error";

  const statusLabel = isRunning
    ? "Running"
    : isComplete
      ? "Done"
      : isError
        ? "Error"
        : "Idle";

  const statusColor = isRunning
    ? "text-violet-400"
    : isComplete
      ? "text-emerald-400"
      : isError
        ? "text-red-400"
        : "text-zinc-600";

  const copyAllLogs = async () => {
    const text = logs.map((l) => `[+${l.ts.toFixed(1)}s] ${l.msg}`).join("\n");
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-white/[0.06] bg-[#0D1117]/50">
      {/* Header — statut live, pas de bordure lourde */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <Radio className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.75} />
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
            AI Stream
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Activity className="h-3 w-3 animate-pulse text-violet-400" strokeWidth={2} />
          )}
          <span className={cn("text-[10px] font-semibold uppercase tracking-wider", statusColor)}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {logs.length === 0 ? (
          /* Skeleton au lieu d'un message texte brut */
          <div className="space-y-3 p-1">
            <ShimmerText lines={4} />
            <p className="text-center text-[11px] text-zinc-600">
              Initializing analysis engine…
            </p>
          </div>
        ) : (
          logs.map((log, i) => {
            const isLatest = i === logs.length - 1 && isRunning;
            const variant =
              log.type === "error"
                ? "error"
                : log.type === "done"
                  ? "success"
                  : isLatest
                    ? "active"
                    : "default";

            return (
              <AiInsightCard
                key={`${log.ts}-${i}`}
                title={log.type === "error" ? "Error" : log.type === "done" ? "Success" : "Insight"}
                timestamp={`+${log.ts.toFixed(1)}s`}
                variant={variant}
                ai={isLatest || log.type === "active"}
                onCopy={
                  i === logs.length - 1
                    ? () => navigator.clipboard.writeText(log.msg)
                    : undefined
                }
              >
                <span
                  className={cn(
                    "font-mono text-[12px] leading-relaxed",
                    log.type === "error" && "text-red-300/90",
                    log.type === "done" && "text-emerald-300/90",
                    log.type === "active" && "text-zinc-200",
                    !log.type && "text-zinc-400"
                  )}
                >
                  {log.msg}
                </span>
              </AiInsightCard>
            );
          })
        )}

        {logs.length > 1 && (
          <AiInsightCard
            title="Session"
            variant="default"
            ai={false}
            onCopy={copyAllLogs}
            onExport={copyAllLogs}
          >
            <span className="text-xs text-zinc-500">
              {logs.length} events captured · export full session log
            </span>
          </AiInsightCard>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
