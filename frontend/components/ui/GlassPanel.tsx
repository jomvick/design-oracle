import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
  /** Halo IA optionnel derrière le panneau */
  glow?: boolean;
  as?: "div" | "section" | "article";
}

/**
 * Panneau glassmorphism — fond translucide, blur, séparateur subtil.
 * Remplace les cartes à bordures dures par de la profondeur organique.
 */
export default function GlassPanel({
  children,
  className,
  glow = false,
  as: Tag = "div",
  ...props
}: GlassPanelProps) {
  return (
    <Tag
      {...props}
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-white/[0.06] bg-white/[0.03]",
        "backdrop-blur-md backdrop-saturate-150",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        glow && "before:pointer-events-none before:absolute before:-inset-px before:-z-10 before:rounded-2xl before:bg-gradient-to-br before:from-violet-500/10 before:to-indigo-500/5",
        className
      )}
    >
      {children}
    </Tag>
  );
}
