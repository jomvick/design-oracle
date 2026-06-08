"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import { ArrowLeft, Loader2 } from "lucide-react";

interface AnalysisToolbarProps {
  url: string;
  progress: number;
  detail: string;
  status: "idle" | "running" | "complete" | "error";
  sessionId: string | null;
}

export default function AnalysisToolbar({
  url,
  progress,
  detail,
  status,
  sessionId,
}: AnalysisToolbarProps) {
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url || "—";
    }
  })();

  const statusConfig = {
    idle: { label: "Idle", color: "text-zinc-500", dot: "bg-zinc-600" },
    running: { label: "Running", color: "text-violet-400", dot: "bg-violet-400" },
    complete: { label: "Complete", color: "text-emerald-400", dot: "bg-emerald-400" },
    error: { label: "Error", color: "text-red-400", dot: "bg-red-400" },
  }[status];

  return (
    <div className="shrink-0 border-b border-white/[0.06] bg-[#0B0F19]/80 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-zinc-600 transition-colors hover:bg-white/[0.04] hover:text-zinc-400 sm:inline-flex"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-zinc-200">{hostname}</p>
            {sessionId && (
              <span className="hidden shrink-0 font-mono text-[10px] text-zinc-600 sm:inline">
                {sessionId}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[10px] text-zinc-600">
            {detail || "Waiting to start…"}
          </p>
        </div>

        <div className="hidden w-48 shrink-0 flex-col gap-1.5 md:flex">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
              Progress
            </span>
            <span className="font-mono text-[10px] font-medium text-violet-400">
              {progress}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${Math.max(progress, status === "running" ? 2 : 0)}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {status === "running" && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" strokeWidth={2} />
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
              statusConfig.color
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
            {statusConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}
