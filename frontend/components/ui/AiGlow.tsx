import { cn } from "@/lib/cn";

interface AiGlowProps {
  active?: boolean;
  className?: string;
  intensity?: "soft" | "medium" | "strong";
}

/**
 * Halo lumineux organique — symbolise l'activité IA sans spinner agressif.
 * Positionné en absolute derrière le contenu de génération.
 */
export default function AiGlow({
  active = true,
  className,
  intensity = "medium",
}: AiGlowProps) {
  const size =
    intensity === "soft"
      ? "h-[280px] w-[280px]"
      : intensity === "strong"
        ? "h-[520px] w-[520px]"
        : "h-[400px] w-[400px]";

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        size,
        "rounded-full blur-[100px]",
        "bg-gradient-to-br from-violet-600/25 via-indigo-500/15 to-cyan-500/10",
        "transition-opacity duration-700 ease-out",
        active ? "opacity-100 animate-[pulse-glow_4s_ease-in-out_infinite]" : "opacity-0",
        className
      )}
    />
  );
}
