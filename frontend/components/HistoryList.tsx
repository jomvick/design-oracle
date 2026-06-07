"use client";

import { useRouter } from "next/navigation";
import GlassPanel from "@/components/ui/GlassPanel";
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
      <div className="mt-12 w-full max-w-2xl px-6">
        <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
          Recent analyses
        </p>
        <GlassPanel className="px-6 py-10 text-center">
          <History className="mx-auto mb-3 h-8 w-8 text-zinc-700" strokeWidth={1.25} />
          <p className="text-sm text-zinc-500">No analyses yet</p>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="mt-12 w-full max-w-2xl px-6 pb-16">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
        Recent analyses
      </p>
      <div className="flex flex-col gap-2">
        {designs.map((d) => (
          <GlassPanel
            key={d.id}
            className={cn(
              "group flex cursor-pointer items-center gap-4 p-4 transition-all",
              "hover:border-white/[0.1] hover:bg-white/[0.04]"
            )}
            onClick={() => router.push(`/dashboard/overview?id=${d.id}`)}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-200">
                {d.title || d.url || d.id}
              </p>
              {d.style && (
                <p className="mt-0.5 text-[11px] text-zinc-600">{d.style}</p>
              )}
            </div>

            {d.visual_score && (
              <span className="shrink-0 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-bold text-violet-400">
                {d.visual_score}
              </span>
            )}

            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-700 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500"
              strokeWidth={1.75}
            />

            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await deleteAnalysis(d.id);
                onDelete(d.id);
              }}
              className="shrink-0 rounded-lg p-2 text-zinc-700 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
