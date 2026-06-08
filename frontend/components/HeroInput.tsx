"use client";

import { useState } from "react";
import { ArrowRight, ClipboardPaste, Sparkles } from "lucide-react";
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
    <section className="home-hero">
      <AiGlow active={focused} intensity="medium" className="home-glow" />

      <div className="home-hero-card">
        <div className="home-eyebrow">
          <Sparkles size={12} strokeWidth={2} />
          <span>
            Design Intelligence
          </span>
        </div>

        <h2 className="home-title">
          Understand the design
          <br />
          behind{" "}
          <span>
            any website
          </span>
        </h2>

        <p className="home-subtitle">
          Colors, typography, components, and UX patterns — extracted and
          reconstructed in seconds.
        </p>

        <div
          className={cn(
            "home-input-group",
            focused && "is-focused"
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
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !url.trim()}
          >
            {loading ? "Starting…" : "Analyze"}
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="home-presets">
          <span className="home-presets-label">
            Try
          </span>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setUrl(p)}
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
            className="home-paste"
          >
            <ClipboardPaste size={12} />
            Paste
          </button>
        </div>
      </div>
    </section>
  );
}
