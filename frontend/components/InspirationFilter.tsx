"use client";

import { motion } from "framer-motion";
import { PLATFORM_META } from "@/lib/urlResolver";
import type { PlatformKey } from "@/lib/types";
import { cn } from "@/lib/cn";

export type FilterValue = "all" | PlatformKey;

interface InspirationFilterProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}

const ORDER: PlatformKey[] = [
  "awwwards",
  "mobbin",
  "siteinspire",
  "behance",
  "dribbble",
  "designspiration",
];

/**
 * Rangée de badges plateformes — filtre la grille d'inspiration.
 */
export default function InspirationFilter({ active, onChange }: InspirationFilterProps) {
  return (
    <div className="home-filter">
      <button
        type="button"
        className={cn("home-filter-badge", active === "all" && "is-active")}
        onClick={() => onChange("all")}
      >
        <span className="home-filter-dot" />
        All
      </button>

      {ORDER.map((key) => (
        <button
          key={key}
          type="button"
          className={cn("home-filter-badge", active === key && "is-active")}
          onClick={() => onChange(key)}
          title={PLATFORM_META[key].tagline}
        >
          <motion.span
            className="home-filter-dot"
            layoutId={key === active ? "filter-dot" : undefined}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
          {PLATFORM_META[key].label}
        </button>
      ))}
    </div>
  );
}
