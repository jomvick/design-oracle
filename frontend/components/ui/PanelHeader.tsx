import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelHeaderProps {
  title: string;
  action?: ReactNode;
  className?: string;
}

/** En-tête uniforme pour les panneaux latéraux — même hauteur, même rythme */
export default function PanelHeader({ title, action, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-11 shrink-0 items-center justify-between border-b border-white/[0.06] px-4",
        className
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {title}
      </span>
      {action}
    </div>
  );
}
