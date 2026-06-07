"use client";

import { PIPELINE_STEPS } from "@/hooks/useAnalysisPipeline";
import { cn } from "@/lib/cn";
import GlassPanel from "@/components/ui/GlassPanel";
import {
  Rocket,
  Globe,
  Camera,
  FileCode2,
  Palette,
  Type,
  Boxes,
  LayoutGrid,
  Shapes,
  Dna,
  Check,
  type LucideIcon,
} from "lucide-react";

interface PipelineProps {
  currentStage: string;
  progress: number;
  detail: string;
}

const STAGE_META: Record<string, { label: string; icon: LucideIcon }> = {
  launch: { label: "Capture", icon: Rocket },
  navigate: { label: "Navigation", icon: Globe },
  screenshot: { label: "Screenshot", icon: Camera },
  dom: { label: "DOM", icon: FileCode2 },
  colors: { label: "Colors", icon: Palette },
  typography: { label: "Typography", icon: Type },
  components: { label: "Components", icon: Boxes },
  layout: { label: "Layout", icon: LayoutGrid },
  patterns: { label: "Patterns", icon: Shapes },
  dna: { label: "Design DNA", icon: Dna },
};

export default function Pipeline({
  currentStage,
  progress,
  detail,
}: PipelineProps) {
  const isComplete = currentStage === "complete";
  const isError = currentStage === "error";
  const currentIndex =
    isComplete || isError
      ? PIPELINE_STEPS.length
      : PIPELINE_STEPS.indexOf(currentStage);
  const isRunning = currentIndex >= 0 && !isComplete && !isError;

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-white/[0.06] bg-[#0D1117]/50">
      <div className="flex-1 overflow-y-auto p-5">
        <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
          AI Pipeline
        </p>

        <div className="flex flex-col gap-1">
          {PIPELINE_STEPS.map((step, i) => {
            const meta = STAGE_META[step] ?? { label: step, icon: Dna };
            const Icon = meta.icon;
            const isActive = i === currentIndex && isRunning;
            const isDone = i < currentIndex || isComplete;
            const isStepError = isError && i === currentIndex;

            return (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300",
                  isActive && "bg-violet-500/[0.08] text-zinc-100",
                  isDone && !isActive && "text-emerald-400/90",
                  !isActive && !isDone && !isStepError && "text-zinc-600",
                  isStepError && "bg-red-500/[0.06] text-red-400"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                    isActive &&
                      "bg-violet-500/15 text-violet-400 shadow-[0_0_16px_-4px_rgba(139,92,246,0.5)]",
                    isDone && !isActive && "bg-emerald-500/10 text-emerald-400",
                    !isActive && !isDone && "bg-white/[0.03] text-zinc-600",
                    isStepError && "bg-red-500/10 text-red-400"
                  )}
                >
                  {isDone && !isActive ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  )}
                </span>
                <span className="text-xs font-medium">{meta.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Barre de progression — dégradé violet = activité IA */}
      <div className="border-t border-white/[0.06] p-5">
        <GlassPanel className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Progress
            </span>
            <span className="font-mono text-[11px] font-medium text-violet-400">
              {progress}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-400 transition-all duration-500 ease-out shadow-[0_0_12px_rgba(139,92,246,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 line-clamp-2 font-mono text-[10px] leading-relaxed text-zinc-500">
            {detail || "Waiting…"}
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
