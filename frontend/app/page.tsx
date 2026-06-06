"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDesigns, deleteAnalysis } from "@/lib/api";

const PRESETS = [
  "https://stripe.com",
  "https://vercel.com",
  "https://linear.app",
  "https://tailwindcss.com",
];

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    getDesigns().then(setDesigns).catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    router.push(`/analysis?url=${encodeURIComponent(url.trim())}`);
  };

  return (
    <div className="view active hero-view">
      <div className="hero-card">
        <div className="eyebrow">✦ Design Intelligence</div>
        <h2>
          Understand the design<br />
          behind <span>any website</span>
        </h2>
        <p className="sub">
          Extract colors, typography, components, and UX patterns.
          <br />
          Reconstruct with AI in seconds.
        </p>
        <div className="input-group">
          <input
            type="url"
            placeholder="https://stripe.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            autoFocus
          />
          <button onClick={handleAnalyze} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        <div className="presets">
          <span
            style={{
              fontSize: 10,
              color: "var(--muted2)",
              letterSpacing: ".05em",
              textTransform: "uppercase",
              alignSelf: "center",
            }}
          >
            Try
          </span>
          {PRESETS.map((p) => (
            <button
              key={p}
              className="preset-btn"
              onClick={() => setUrl(p)}
            >
              {new URL(p).hostname}
            </button>
          ))}
          <button
            className="preset-btn paste"
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                setUrl(text);
              } catch {}
            }}
          >
            📋 Paste URL
          </button>
        </div>
        <div className="history">
          <div className="history-header">
            <h3>Recent analyses</h3>
          </div>
          <div id="historyList">
            {designs.length === 0 ? (
              <div className="history-empty">No analyses yet</div>
            ) : (
              designs.map((d) => (
                <div key={d.id} className="history-item">
                  <div
                    className="info"
                    style={{ flex: 1, cursor: "pointer" }}
                    onClick={() => router.push(`/dashboard/overview?id=${d.id}`)}
                  >
                    {d.title || d.url || d.id}{" "}
                    <small>{d.style || ""}</small>
                  </div>
                  <span className="badge">{d.visual_score || ""}</span>
                  <button
                    className="delete-btn"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await deleteAnalysis(d.id);
                      setDesigns((prev) => prev.filter((x) => x.id !== d.id));
                    }}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
