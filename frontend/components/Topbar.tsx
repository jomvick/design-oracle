"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Topbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <div className="logo">◆</div>
          <h1>Design Oracle</h1>
          <span className="tag">Design Intelligence</span>
        </Link>
      </div>
      {!isHome && (
        <button
          className="preset-btn"
          onClick={() => { window.location.href = "/"; }}
          style={{ display: "inline-flex" }}
        >
          ← Home
        </button>
      )}
    </div>
  );
}
