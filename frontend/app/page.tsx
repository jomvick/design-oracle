"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDesigns } from "@/lib/api";
import type { DesignSummary } from "@/lib/types";
import HeroSearch from "@/components/HeroSearch";
import InspirationGrid from "@/components/InspirationGrid";
import WorkflowSection from "@/components/WorkflowSection";
import NewsletterSection from "@/components/NewsletterSection";
import FaqSection from "@/components/FaqSection";
import type { FilterValue } from "@/components/InspirationFilter";
import inspirations from "@/lib/inspirations.json";
import type { InspirationPreset } from "@/lib/types";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const router = useRouter();

  useEffect(() => {
    getDesigns().then(setDesigns).catch(() => {});
  }, []);

  const handleAnalyze = (url: string) => {
    setLoading(true);
    router.push(`/analysis?url=${encodeURIComponent(url)}`);
  };

  const visiblePresets =
    filter === "all"
      ? (inspirations as InspirationPreset[])
      : (inspirations as InspirationPreset[]).filter(
          (p) => p.source_platform === filter,
        );

  return (
    <main className="home-shell">
      <HeroSearch
        onAnalyze={handleAnalyze}
        loading={loading}
        filter={filter}
        onFilterChange={setFilter}
      />
      <InspirationGrid
        presets={visiblePresets}
        designs={designs}
        onDelete={(id) => setDesigns((prev) => prev.filter((x) => x.id !== id))}
        onAnalyze={handleAnalyze}
      />
      <WorkflowSection />
      <NewsletterSection />
      <FaqSection />
    </main>
  );
}
