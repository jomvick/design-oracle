"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
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
          <Sparkles size={12} strokeWidth={2} />
          <span>Design Intelligence</span>
        </div>

        <h2 className="home-title">
          Understand the design
          <br />
          behind <span>any website</span>
        </h2>

        <p className="home-subtitle">
          Colors, typography, components, and UX patterns — extracted and
          reconstructed in seconds.
        </p>

        <div className={cn("home-input-group", focused && "is-focused")}>
          <input
            type="url"
            placeholder="https://linear.app"
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
          >
            {resolving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Résolution…
              </>
            ) : loading ? (
              "Starting…"
            ) : (
              <>
                Analyze
                <ArrowRight size={16} />
              </>
            )}
          </button>
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
