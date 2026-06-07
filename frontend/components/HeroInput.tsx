"use client";

import { useState } from "react";
import { ArrowRight, ClipboardPaste, Sparkles } from "lucide-react";
import GlassPanel from "@/components/ui/GlassPanel";
import AiGlow from "@/components/ui/AiGlow";
import { cn } from "@/lib/cn";

const PRESETS = [
  "https://stripe.com",
  "https://vercel.com",
  "https://linear.app",
  "https://tailwindcss.com",
];

interface HeroInputProps {
  onAnalyze: (url: string) => void;
  loading?: boolean;
}

/**
 * Point d'entrée principal — halo IA + input glass, pas une boîte de chat vide.
 */
export default function HeroInput({ onAnalyze, loading }: HeroInputProps) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    const trimmed = url.trim();
    if (!trimmed || loading) return;
    onAnalyze(trimmed);
  };

  return (
    <div className="relative flex w-full max-w-2xl flex-col items-center px-6 py-16">
      <AiGlow active={focused} intensity="medium" className="top-[30%]" />

      <GlassPanel glow className="relative z-10 w-full p-10 md:p-12">
        {/* Eyebrow — seul élément avec dégradé violet explicite */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-3 py-1.5">
          <Sparkles className="h-3 w-3 text-violet-400" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-300/90">
            Design Intelligence
          </span>
        </div>

        <h2 className="mb-4 text-center text-4xl font-black leading-[1.1] tracking-tight text-zinc-50 md:text-5xl">
          Understand the design
          <br />
          behind{" "}
          <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-300 bg-clip-text text-transparent">
            any website
          </span>
        </h2>

        <p className="mx-auto mb-10 max-w-md text-center text-[15px] leading-relaxed text-zinc-500">
          Colors, typography, components, and UX patterns — extracted and
          reconstructed in seconds.
        </p>

        {/* Input group — glass inset, focus ring violet */}
        <div
          className={cn(
            "flex gap-2 rounded-2xl border bg-[#0B0F19]/60 p-2 transition-all duration-300",
            focused
              ? "border-violet-500/30 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]"
              : "border-white/[0.08]"
          )}
        >
          <input
            type="url"
            placeholder="https://linear.app"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
            className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !url.trim()}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-6 py-3",
              "bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white",
              "shadow-[0_0_20px_-4px_rgba(139,92,246,0.45)]",
              "transition-all hover:shadow-[0_0_28px_-4px_rgba(139,92,246,0.6)]",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            {loading ? "Starting…" : "Analyze"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Presets — pills discrètes */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Try
          </span>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setUrl(p)}
              className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-zinc-500 transition-all hover:border-white/[0.12] hover:text-zinc-300"
            >
              {new URL(p).hostname}
            </button>
          ))}
          <button
            type="button"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setUrl(text);
              } catch {
                /* clipboard denied */
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/[0.08] px-3 py-1.5 text-[11px] text-zinc-600 transition-all hover:text-zinc-400"
          >
            <ClipboardPaste className="h-3 w-3" />
            Paste
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
