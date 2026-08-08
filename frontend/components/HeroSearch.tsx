"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import AiGlow from "@/components/ui/AiGlow";
import InspirationFilter, { type FilterValue } from "@/components/InspirationFilter";
import { detectPlatform, resolveGalleryUrl } from "@/lib/urlResolver";
import { cn } from "@/lib/cn";

interface HeroSearchProps {
  onAnalyze: (url: string) => void;
  loading?: boolean;
  filter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
}

const NON_RESOLVABLE = new Set(["behance", "dribbble", "mobbin", "designspiration"]);

/**
 * Barre de recherche principale — détecte la plateforme collée, résout les
 * galeries Awwwards/SiteInspire, guide l'utilisateur pour les autres.
 */
export default function HeroSearch({
  onAnalyze,
  loading,
  filter,
  onFilterChange,
}: HeroSearchProps) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed || loading || resolving) return;
    setError("");

    const platform = detectPlatform(trimmed);
    if (platform === "unknown") {
      onAnalyze(trimmed);
      return;
    }

    if (NON_RESOLVABLE.has(platform)) {
      setShowGuide(true);
      return;
    }

    setResolving(true);
    try {
      const result = await resolveGalleryUrl(trimmed);
      if (result.resolvable && result.target_url) {
        onAnalyze(result.target_url);
      } else {
        setError(result.message || "Résolution impossible, vérifie l'URL");
      }
    } catch {
      setError("Résolution impossible, vérifie l'URL");
    } finally {
      setResolving(false);
    }
  };

  return (
    <section className="home-hero">
      <AiGlow active={focused} intensity="medium" className="home-glow" />

      <div className="home-hero-card">
        <div className="home-eyebrow">
          <span className="home-hero-dot" />
          <span>Built for AI coding agents</span>
        </div>

        <h2 className="home-title">
          Get a{" "}
          <span className="home-title-gradient">DESIGN.md</span> from any
          website
        </h2>

        <p className="home-subtitle">
          Paste a URL to extract a design system. Get a DESIGN.md plus
          Tailwind v4 and design tokens for your AI agent.
        </p>

        <div className={cn("home-input-group", focused && "is-focused")}>
          <input
            type="url"
            placeholder="Paste paypal.com..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
            disabled={resolving}
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !url.trim() || resolving}
            className="home-pill-btn"
            aria-label="Analyze"
          >
            {resolving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "↑"
            )}
          </button>
        </div>

        <div className="home-quota">
          <span className="home-quota-dot" />
          <span className="home-quota-dot" />
          <span className="home-quota-dot" />
          <span>3 / 3 free this week</span>
        </div>

        {error && <p className="home-error">{error}</p>}
      </div>

      <InspirationFilter active={filter} onChange={onFilterChange} />

      {showGuide && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div className="home-modal-card">
            <h3>Étude de cas détectée</h3>
            <p>
              Seuls les sites web en ligne sont analysables en v1. Découvre nos
              presets ou entre l&apos;URL du site final&nbsp;!
            </p>
            <button type="button" onClick={() => setShowGuide(false)}>
              Compris
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
