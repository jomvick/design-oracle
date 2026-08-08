"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Topbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-[60px] items-center justify-between px-8",
        "border-b border-white/[0.08] bg-[#0B0F19]/70 backdrop-blur-xl"
      )}
    >
      {/* Marque minimaliste — accent violet réservé à l'IA */}
      <Link
        href="/"
        className="group flex items-center gap-3 text-inherit no-underline"
      >
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            "bg-gradient-to-br from-violet-500/20 to-indigo-600/10",
            "border border-violet-500/20 text-violet-400",
            "transition-all group-hover:border-violet-500/40 group-hover:shadow-[0_0_20px_-4px_rgba(139,92,246,0.4)]"
          )}
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </div>
        <div className="flex items-baseline gap-3">
          <h1 className="text-sm font-bold tracking-tight text-zinc-100">
            Design Oracle
          </h1>
          <span className="hidden border-l border-white/[0.08] pl-3 text-[11px] font-medium text-zinc-500 sm:inline">
            Design Intelligence
          </span>
        </div>
      </Link>

      {/* Navigation contextuelle déplacée dans AnalysisToolbar sur /analysis */}
      {!isHome && !pathname.startsWith("/analysis") && (
        <Link
          href="/"
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2",
            "text-xs font-medium text-zinc-500 transition-all",
            "hover:bg-white/[0.04] hover:text-zinc-300"
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          Home
        </Link>
      )}
    </header>
  );
}
