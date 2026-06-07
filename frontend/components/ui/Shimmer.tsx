import { cn } from "@/lib/cn";

interface ShimmerProps {
  className?: string;
  /** Nombre de lignes skeleton pour un bloc texte */
  lines?: number;
}

/** Skeleton avec balayage lumineux — chargement fluide, pas de texte brut */
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

/** Preview screenshot en cours de capture */
export function ShimmerScreenshot({ className }: { className?: string }) {
  return (
    <div className={cn("relative w-full max-w-3xl", className)}>
      <ShimmerBlock className="aspect-[4/3] w-full rounded-2xl" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 rounded-full border border-violet-500/30 border-t-violet-400 animate-spin" />
        <p className="text-sm font-medium text-zinc-500">Extracting design…</p>
      </div>
    </div>
  );
}
