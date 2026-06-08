"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { deleteAnalysis } from "@/lib/api";
import type { DesignSummary } from "@/lib/types";
import { ChevronRight, Trash2, History } from "lucide-react";

interface HistoryListProps {
  designs: DesignSummary[];
  onDelete: (id: string) => void;
}

/**
 * Historique en cartes glass — chaque analyse est cliquable, pas une liste brute.
 */
export default function HistoryList({ designs, onDelete }: HistoryListProps) {
  const router = useRouter();

  if (designs.length === 0) {
    return (
      <section className="home-history">
        <p className="home-section-label">
          Recent analyses
        </p>
        <div className="home-history-empty">
          <History size={32} strokeWidth={1.25} />
          <p>No analyses yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="home-history">
      <p className="home-section-label">
        Recent analyses
      </p>
      <div className="home-history-list">
        {designs.map((d) => (
          <article
            key={d.id}
            className={cn(
              "home-history-card",
              "group"
            )}
            onClick={() => router.push(`/dashboard/overview?id=${d.id}`)}
          >
            <div className="home-history-info">
              <p>
                {d.title || d.url || d.id}
              </p>
              {d.style && (
                <small>{d.style}</small>
              )}
            </div>

            {d.visual_score && (
              <span className="home-score">
                {d.visual_score}
              </span>
            )}

            <ChevronRight
              className="home-chevron"
              strokeWidth={1.75}
            />

            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await deleteAnalysis(d.id);
                onDelete(d.id);
              }}
              className="home-delete"
              title="Delete"
            >
              <Trash2 size={14} strokeWidth={1.75} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
