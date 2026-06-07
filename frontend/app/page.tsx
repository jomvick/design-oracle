"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDesigns } from "@/lib/api";
import type { DesignSummary } from "@/lib/types";
import HeroInput from "@/components/HeroInput";
import HistoryList from "@/components/HistoryList";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const router = useRouter();

  useEffect(() => {
    getDesigns().then(setDesigns).catch(() => {});
  }, []);

  const handleAnalyze = (url: string) => {
    setLoading(true);
    router.push(`/analysis?url=${encodeURIComponent(url)}`);
  };

  return (
    <main className="flex min-h-[calc(100vh-60px)] flex-col items-center">
      <HeroInput onAnalyze={handleAnalyze} loading={loading} />
      <HistoryList
        designs={designs}
        onDelete={(id) => setDesigns((prev) => prev.filter((x) => x.id !== id))}
      />
    </main>
  );
}
