"use client";

import { PIPELINE_STEPS } from "@/hooks/useAnalysisPipeline";
import { cn } from "@/lib/cn";
import PanelHeader from "@/components/ui/PanelHeader";
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

export default function Pipeline({ currentStage, progress }: PipelineProps) {
  const isComplete = currentStage === "complete";
  const isError = currentStage === "error";
  const currentIndex =
    isComplete || isError
      ? PIPELINE_STEPS.length
      : PIPELINE_STEPS.indexOf(currentStage);
  const isRunning = currentIndex >= 0 && !isComplete && !isError;

  return (
    <div className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0D1117]/40">
      <PanelHeader title="Pipeline" />

      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-0.5">
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
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-200",
                  isActive && "bg-violet-500/[0.08]",
                  isStepError && "bg-red-500/[0.06]"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    isActive && "bg-violet-500/15 text-violet-400",
                    isDone && !isActive && "text-emerald-500/80",
                    !isActive && !isDone && !isStepError && "text-zinc-600",
                    isStepError && "text-red-400"
                  )}
                >
                  {isDone && !isActive ? (
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-3 w-3" strokeWidth={1.75} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    isActive && "text-zinc-100",
                    isDone && !isActive && "text-zinc-500",
                    !isActive && !isDone && !isStepError && "text-zinc-600",
                    isStepError && "text-red-400"
                  )}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress mobile — visible quand la toolbar cache la barre */}
      <div className="border-t border-white/[0.06] p-3 md:hidden">
        <div className="mb-1 flex justify-between font-mono text-[10px] text-zinc-600">
          <span>Progress</span>
          <span className="text-violet-400">{progress}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
