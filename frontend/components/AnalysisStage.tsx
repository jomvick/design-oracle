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
  url: string;
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

/**
 * Zone centrale d'analyse — halo IA + skeleton shimmer pendant le chargement.
 * La capture apparaît en fondu, pas en flash brutal.
 */
export default function AnalysisStage({
  url,
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex flex-1 flex-col overflow-hidden bg-[#0B0F19]"
    >
      {/* Toolbar épurée */}
      <div className="flex shrink-0 items-center gap-4 border-b border-white/[0.06] px-6 py-3">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-500">
          {url || "Waiting for URL…"}
        </span>
        <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] p-1">
          {DEVICES.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onDeviceChange(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all",
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

      {/* Stage avec glow organique */}
      <div className="relative flex flex-1 items-start justify-center overflow-auto p-8">
        <AiGlow active={isRunning} intensity="strong" />

        <AnimatePresence mode="wait">
          {isComplete ? (
            <motion.div
              key="screenshot"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-4xl"
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

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 translate-y-full gap-3 pt-6"
              >
                <button
                  type="button"
                  onClick={() => window.open(screenshotUrl, "_blank")}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0B0F19]/90 px-5 py-2.5 text-xs font-semibold text-zinc-300 backdrop-blur-md transition-all hover:border-white/[0.14] hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </button>
                <button
                  type="button"
                  onClick={() =>
                    currentId && router.push(`/dashboard/overview?id=${currentId}`)
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_-4px_rgba(139,92,246,0.5)] transition-all hover:shadow-[0_0_32px_-4px_rgba(139,92,246,0.65)]"
                >
                  Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6"
            >
              <ShimmerScreenshot />
              <motion.p
                key={pipelineDetail}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-sm font-medium text-zinc-500"
              >
                {isRunning
                  ? pipelineDetail || "Analyzing…"
                  : "Preparing session…"}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
