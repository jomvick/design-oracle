import { cn } from "@/lib/cn";
import { Loader2 } from "lucide-react";

interface ShimmerProps {
  className?: string;
  lines?: number;
}

export function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.04]",
        "before:absolute before:inset-0",
        "before:-translate-x-full before:animate-[shimmer_1.8s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/[0.08] before:to-transparent",
        className
      )}
    />
  );
}

export function ShimmerText({ lines = 3, className }: ShimmerProps) {
  const widths = ["w-full", "w-[92%]", "w-[78%]", "w-[65%]"];
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerBlock key={i} className={cn("h-3", widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** Carte de chargement unique — statut intégré, pas de texte flottant en dessous */
export function ShimmerScreenshot({
  className,
  status = "Extracting design…",
}: {
  className?: string;
  status?: string;
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <ShimmerBlock className="aspect-[16/10] w-full rounded-2xl" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400/80" strokeWidth={1.5} />
        <p className="max-w-xs text-center text-sm font-medium text-zinc-400">
          {status}
        </p>
      </div>
    </div>
  );
}
