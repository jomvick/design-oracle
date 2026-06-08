"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import AiGlow from "@/components/ui/AiGlow";
import { ShimmerScreenshot } from "@/components/ui/Shimmer";
import GlassPanel from "@/components/ui/GlassPanel";
import { cn } from "@/lib/cn";
import { ArrowRight, ExternalLink, Monitor, Smartphone, Tablet } from "lucide-react";

interface AnalysisStageProps {
  status: "idle" | "running" | "complete" | "error";
  pipelineDetail: string;
  screenshotUrl: string;
  currentId: string | null;
  device: string;
  onDeviceChange: (d: string) => void;
}

const DEVICES = [
  { id: "desktop", icon: Monitor, label: "Desktop" },
  { id: "tablet", icon: Tablet, label: "Tablet" },
  { id: "mobile", icon: Smartphone, label: "Mobile" },
] as const;

export default function AnalysisStage({
  status,
  pipelineDetail,
  screenshotUrl,
  currentId,
  device,
  onDeviceChange,
}: AnalysisStageProps) {
  const router = useRouter();
  const isRunning = status === "running";
  const isComplete = status === "complete" && screenshotUrl;

  const loadingLabel =
    pipelineDetail ||
    (isRunning ? "Analyzing website…" : "Preparing session…");

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0B0F19]">
      {/* Device switcher — discret, aligné à droite */}
      <div className="flex shrink-0 justify-end border-b border-white/[0.06] px-4 py-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.03] p-0.5">
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onDeviceChange(id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium transition-all",
                device === id
                  ? "bg-white/[0.08] text-zinc-200"
                  : "text-zinc-600 hover:text-zinc-400"
              )}
            >
              <Icon className="h-3 w-3" strokeWidth={1.75} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stage centré — une seule carte, glow derrière */}
      <div className="relative flex flex-1 items-center justify-center overflow-auto p-6 md:p-10">
        <AiGlow active={isRunning} intensity="medium" className="opacity-70" />

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="screenshot"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-3xl"
            >
              <GlassPanel glow className="overflow-hidden p-1">
                <Image
                  src={screenshotUrl}
                  alt="Analyzed website screenshot"
                  width={1200}
                  height={900}
                  unoptimized
                  className="w-full cursor-zoom-in rounded-xl"
                  onClick={() => window.open(screenshotUrl, "_blank")}
                />
              </GlassPanel>

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.open(screenshotUrl, "_blank")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-medium text-zinc-400 transition-all hover:border-white/[0.12] hover:text-zinc-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </button>
                <button
                  type="button"
                  onClick={() =>
                    currentId && router.push(`/dashboard/overview?id=${currentId}`)
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_0_20px_-6px_rgba(139,92,246,0.5)]"
                >
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="relative z-10 w-full max-w-2xl"
            >
              <GlassPanel glow className="p-4">
                <ShimmerScreenshot status={loadingLabel} />
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
