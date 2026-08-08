"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { InspirationPreset } from "@/lib/types";
import { PLATFORM_META } from "@/lib/urlResolver";
import { cn } from "@/lib/cn";

interface InspirationCardProps {
  preset: InspirationPreset;
  onAnalyze: (url: string) => void;
}

/**
 * Carte preset — miniature avec fallback d'image en cascade, tag plateforme,
 * titre/catégorie, tags et CTA d'analyse en 1-clic.
 */
export default function InspirationCard({ preset, onAnalyze }: InspirationCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const sources = [preset.preview_image, preset.fallback_image];
  const showPlaceholder = imgIdx >= sources.length;
  const platform = PLATFORM_META[preset.source_platform];

  return (
    <article className="home-insp-card">
      <div className="home-insp-media">
        {showPlaceholder ? (
          <div className="home-insp-placeholder">
            <Sparkles size={22} strokeWidth={1.25} />
            <span>{preset.title}</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- external CDN images with onError fallback chain
          <img
            src={sources[imgIdx]}
            alt={`${preset.title} — ${platform.label}`}
            loading="lazy"
            onError={() => setImgIdx((i) => i + 1)}
            className="home-insp-img"
          />
        )}

        <span className={cn("home-insp-platform", `platform-${preset.source_platform}`)}>
          {platform.label}
        </span>
      </div>

      <div className="home-insp-body">
        <h3 className="home-insp-title">{preset.title}</h3>
        <p className="home-insp-category">{preset.category}</p>

        <div className="home-insp-tags">
          {preset.tags.map((tag) => (
            <span key={tag} className="home-insp-tag">
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="home-insp-cta"
          onClick={() => onAnalyze(preset.target_url)}
        >
          Analyser le Design System
        </button>
      </div>
    </article>
  );
}
