"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DesignSummary, InspirationPreset } from "@/lib/types";
import InspirationCard from "@/components/InspirationCard";
import HistoryList from "@/components/HistoryList";
import { cn } from "@/lib/cn";

type Tab = "inspirations" | "recent";

interface InspirationGridProps {
  presets: InspirationPreset[];
  designs: DesignSummary[];
  onDelete: (id: string) => void;
  onAnalyze: (url: string) => void;
}

/**
 * Zone de contenu sous le hero — onglets [ Inspirations | Récents ].
 * La grille filtre/ref-low ses cartes via Framer Motion.
 */
export default function InspirationGrid({
  presets,
  designs,
  onDelete,
  onAnalyze,
}: InspirationGridProps) {
  const [tab, setTab] = useState<Tab>("inspirations");

  return (
    <section className="home-insp">
      <div className="home-gallery-head">
        <span className="home-eyebrow">
          <span>Design Oracle</span>
        </span>
        <h2 className="home-gallery-title">Hand-picked design systems</h2>
      </div>

      <div className="home-tabs">
        <button
          type="button"
          className={cn("home-tab", tab === "inspirations" && "is-active")}
          onClick={() => setTab("inspirations")}
        >
          Inspirations
        </button>
        <button
          type="button"
          className={cn("home-tab", tab === "recent" && "is-active")}
          onClick={() => setTab("recent")}
        >
          Récents
        </button>
      </div>

      {tab === "recent" ? (
        <HistoryList designs={designs} onDelete={onDelete} />
      ) : (
        <motion.div layout className="home-grid">
          <AnimatePresence mode="popLayout">
            {presets.map((preset) => (
              <motion.div
                key={preset.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <InspirationCard preset={preset} onAnalyze={onAnalyze} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
