"use client";

import { cn } from "@/lib/cn";
import { Copy, Download, RefreshCw, Check } from "lucide-react";
import { useState } from "react";

interface MicroActionsProps {
  onCopy?: () => void | Promise<void>;
  onRegenerate?: () => void;
  onExport?: () => void;
  className?: string;
}

/**
 * Actions contextuelles au survol — pattern Linear / wabi.ai.
 * Évite les barres d'outils permanentes qui alourdissent l'UI.
 */
export default function MicroActions({
  onCopy,
  onRegenerate,
  onExport,
  className,
}: MicroActionsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!onCopy) return;
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-all hover:bg-white/[0.08] hover:text-zinc-200";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-[#0B0F19]/80 p-1 backdrop-blur-md",
        "opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0",
        className
      )}
    >
      {onCopy && (
        <button type="button" onClick={handleCopy} className={btn} title="Copy">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      {onRegenerate && (
        <button type="button" onClick={onRegenerate} className={btn} title="Regenerate">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
      {onExport && (
        <button type="button" onClick={onExport} className={btn} title="Export">
          <Download className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
