"use client";

import { cn } from "@/lib/cn";
import GlassPanel from "./GlassPanel";
import MicroActions from "./MicroActions";
import { Sparkles } from "lucide-react";

interface AiInsightCardProps {
  children: React.ReactNode;
  title?: string;
  timestamp?: string;
  variant?: "default" | "success" | "error" | "active";
  className?: string;
  onCopy?: () => void | Promise<void>;
  onRegenerate?: () => void;
  onExport?: () => void;
  /** Affiche l'icône IA violette — réservé aux sorties intelligentes */
  ai?: boolean;
}

/**
 * Enveloppe les sorties IA dans une carte interactive, pas du texte brut.
 * Micro-actions au hover pour copier / exporter sans quitter le flux.
 */
export default function AiInsightCard({
  children,
  title,
  timestamp,
  variant = "default",
  className,
  onCopy,
  onRegenerate,
  onExport,
  ai = true,
}: AiInsightCardProps) {
  const variantStyles = {
    default: "border-white/[0.06]",
    active: "border-violet-500/25 shadow-[0_0_40px_-12px_rgba(139,92,246,0.35)]",
    success: "border-emerald-500/20",
    error: "border-red-500/20",
  };

  const hasActions = onCopy || onRegenerate || onExport;

  return (
    <GlassPanel
      className={cn(
        "group relative p-4 transition-all duration-300",
        variantStyles[variant],
        className
      )}
    >
      {(title || timestamp || hasActions) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {ai && (
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            )}
            {title && (
              <span className="truncate text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {title}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {timestamp && (
              <span className="font-mono text-[10px] text-zinc-600">{timestamp}</span>
            )}
            {hasActions && (
              <MicroActions
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                onExport={onExport}
              />
            )}
          </div>
        </div>
      )}
      <div className="text-sm leading-relaxed text-zinc-300">{children}</div>
    </GlassPanel>
  );
}
