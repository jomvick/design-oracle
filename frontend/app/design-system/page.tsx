"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAnalysisResult } from "@/lib/api";

function DesignSystemContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) { setError("No analysis ID provided"); return; }
    getAnalysisResult(id)
      .then(setData)
      .catch(() => setError("Analysis not found"));
  }, [id]);

  if (error) {
    return (
      <div className="ds-empty" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ fontSize: 40, opacity: 0.3 }}>✕</div>
        <div style={{ fontSize: 14, color: "var(--muted2)" }}>{error}</div>
        <Link href="/" className="zen-btn-outline" style={{ marginTop: 8 }}>← Home</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ds-loading">
        <div className="spinner"></div>
        <span>Loading design system...</span>
      </div>
    );
  }

  const dna = data.dna || {};
  const colors = data.colors || {};
  const palette = colors.palette || {};
  const typography = data.typography || {};
  const components = data.components || [];
  const patterns = data.patterns || [];
  const layout = data.layout || {};
  const spacing = data.spacing || {};
  const radius = data.radius || {};
  const rules = dna.visual_rules || [];
  const cp = colors.custom_properties || {};
  const allColors = colors.all || [];

  const colorEntries = [
    ["Primary", palette.primary],
    ["Secondary", palette.secondary],
    ["Accent", palette.accent],
    ["Success", palette.success],
    ["Warning", palette.warning],
    ["Error", palette.error],
    ["Background", palette.background_light],
    ["Dark BG", palette.background_dark],
    ["Text", palette.text_primary],
  ].filter((e) => e[1]);

  const isLightColor = (hex: string) => {
    if (!hex) return false;
    const h = hex.replace("#", "");
    if (h.length !== 6) return false;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 2), 16);
    const b = parseInt(h.substring(4, 2), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 155;
  };

  return (
    <div className="ds-main">
      <div className="ds-hero">
        <h2>{dna.style || "Design System"}</h2>
        <div className="sub">{data.url || ""}</div>
        <div className="meta">
          <span>Style <span className="badge">{dna.style || "N/A"}</span></span>
          <span>Confidence {dna.style_confidence || 0}%</span>
          <span>Score {dna.visual_score || "N/A"}</span>
          <span>{dna.accessibility || ""}</span>
          <span>{dna.complexity || ""} complexity</span>
        </div>
      </div>

      <div className="ds-section">
        <div className="ds-section-header">
          <h3>Color Palette</h3>
          <span className="count">{colors.count || 0} total</span>
        </div>
        <div className="ds-palette">
          {colorEntries.map(([name, hex]) => {
            const light = isLightColor(hex as string);
            return (
              <div key={name as string} className="ds-swatch-card" onClick={() => navigator.clipboard.writeText(hex as string)}>
                <div className="ds-swatch-bar" style={{ background: hex as string }}>
                  <span className={`ds-swatch-hex ${light ? "light-bg" : "dark-bg"}`}>{hex as string}</span>
                </div>
                <div className="ds-swatch-info">
                  <span className="ds-swatch-name">{name as string}</span>
                  <span className="ds-swatch-role">{(name as string).toLowerCase()}</span>
                </div>
              </div>
            );
          })}
        </div>
        {allColors.length > 0 && (
          <div className="ds-all-colors">
            {allColors.map((c: any, i: number) => (
              <div
                key={i}
                className="ds-mini-swatch"
                style={{ background: c.hex, ...(c.tone === "light" ? { border: "1px solid #333" } : {}) }}
                title={`${c.hex} (${c.tone})`}
              />
            ))}
          </div>
        )}
      </div>

      {Object.keys(cp).length > 0 && (
        <div className="ds-section">
          <div className="ds-section-header">
            <h3>CSS Custom Properties</h3>
            <span className="count">{Object.keys(cp).length}</span>
          </div>
          <div className="ds-card">
            <div className="ds-prop-grid">
              {Object.entries(cp).map(([k, v]) => (
                <div key={k} className="ds-prop-chip">
                  <span className="dot" style={{ background: v as string, ...(v === "#ffffff" ? { border: "1px solid #333" } : {}) }} />
                  --{k} <span style={{ color: "var(--muted2)" }}>{v as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="ds-section">
        <div className="ds-section-header">
          <h3>Typography</h3>
          <span className="count">{(typography.families || []).length} families</span>
        </div>
        <div className="ds-card">
          <div className="ds-type-grid">
            {(typography.families || []).map((fn: string) => {
              const det = (typography.details || {})[fn] || {};
              const sizes = (det.sizes || []).slice(0, 4).join(", ");
              const weights = (det.weights || []).slice(0, 3).join(", ");
              const isPrimary = fn === typography.primary_font;
              const isSecondary = fn === typography.secondary_font;
              const tag = isPrimary ? "Primary" : isSecondary ? "Secondary" : "Web";
              return (
                <div key={fn} className="ds-type-card">
                  <div className="left">
                    <div className="name" style={{ fontFamily: `'${fn}', sans-serif` }}>{fn}</div>
                    <div className="details">{sizes ? sizes + "px" : ""}{weights ? " · w" + weights : ""}</div>
                  </div>
                  <span className="tag">{tag}</span>
                </div>
              );
            })}
          </div>
        </div>
        {(() => {
          const hh = typography.headings || {};
          const hk = Object.keys(hh).filter((k) => hh[k] && hh[k].size);
          if (!hk.length) return null;
          return (
            <div className="ds-card">
              <div className="ds-section-header" style={{ marginBottom: 12 }}>
                <h4 style={{ fontSize: 12, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".06em" }}>Heading Scale</h4>
                <span className="count">{hk.length}</span>
              </div>
              <div className="ds-type-hierarchy">
                {hk.map((t) => {
                  const h = hh[t];
                  return (
                    <div key={t} className="ds-h-level">
                      <span className="tag">{t}</span>
                      <span className="sample" style={{ fontSize: h.size, fontWeight: h.weight, fontFamily: `'${h.family}', sans-serif` }}>
                        {t}. The quick brown fox
                      </span>
                      <span className="details">{h.size} / {h.weight}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
        {typography.body && (
          <div className="ds-card">
            <div className="ds-section-header" style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".06em" }}>Body Text</h4>
            </div>
            <div className="ds-h-level">
              <span className="sample" style={{ fontSize: typography.body.size, fontWeight: typography.body.weight, fontFamily: `'${typography.body.family}', sans-serif`, lineHeight: typography.body.lineHeight }}>
                The quick brown fox jumps over the lazy dog. Body text set in {typography.body.family} at {typography.body.size}.
              </span>
              <span className="details">{typography.body.size} / {typography.body.lineHeight}</span>
            </div>
          </div>
        )}
      </div>

      <div className="ds-section">
        <div className="ds-section-header"><h3>Layout</h3></div>
        <div className="ds-card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
            {[
              ["Responsive", layout.responsive ? "✓ Yes" : "✗ No"],
              ["CSS Grid", layout.uses_grid ? "✓ Yes" : "✗ No"],
              ["Flexbox", layout.uses_flexbox ? "✓ Yes" : "✗ No"],
              ["Sections", layout.sections_count || "0"],
              ...(layout.max_container_width ? [["Container", layout.max_container_width + "px"]] : []),
              ...(layout.viewport ? [["Viewport", layout.viewport.width + "×" + layout.viewport.height]] : []),
              ...((layout.sticky_elements || []).length ? [["Sticky", (layout.sticky_elements as string[]).join(", ")]] : []),
            ].map(([k, v]) => (
              <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted2)" }}>{k as string}</span>
                <span style={{ fontWeight: 500 }}>{v as string}</span>
              </div>
            ))}
          </div>
        </div>
        {(spacing.scale || []).length > 0 && (
          <div className="ds-card">
            <div className="ds-section-header" style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".06em" }}>Spacing Scale</h4>
              <span className="count">{(spacing.scale || []).length}</span>
            </div>
            <div className="ds-spacing-scale">
              {(spacing.scale as number[]).map((v, i) => (
                <div key={i} className="ds-spacing-bar">
                  <div className="bar" style={{ width: Math.max(4, Math.min(v, 80)), height: Math.max(4, Math.min(v, 80)) }} />
                  <span className="val">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(radius.radii || []).length > 0 && (
          <div className="ds-card">
            <div className="ds-section-header" style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".06em" }}>Border Radius</h4>
              <span className="count">{(radius.radii || []).length}</span>
            </div>
            <div className="ds-radius-grid">
              {(radius.radii as number[]).map((v, i) => (
                <div key={i} className="ds-radius-chip" style={{ borderRadius: v + "px" }}>
                  <span style={{ color: "var(--muted2)" }}>r-</span>{v}px
                </div>
              ))}
            </div>
          </div>
        )}
        {(radius.shadows || []).length > 0 && (
          <div className="ds-card">
            <div className="ds-section-header" style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 12, color: "var(--muted2)", textTransform: "uppercase", letterSpacing: ".06em" }}>Box Shadows</h4>
              <span className="count">{(radius.shadows || []).length}</span>
            </div>
            <div className="ds-shadows">
              {(radius.shadows as string[]).slice(0, 6).map((s, i) => (
                <div key={i} className="ds-shadow-row">{s}</div>
              ))}
              {(radius.shadows || []).length > 6 && (
                <div style={{ fontSize: 10, color: "var(--muted2)", textAlign: "center" }}>+{(radius.shadows || []).length - 6} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ds-section">
        <div className="ds-section-header">
          <h3>Components</h3>
          <span className="count">{(components || []).length}</span>
        </div>
        <div className="ds-comp-grid">
          {(components || []).filter((c: any) => c && c.type).length > 0 ? (
            (components as any[]).filter((c) => c && c.type).map((c, i) => (
              <div key={i} className="ds-comp-card">
                <div className="name">{c.type.replace(/-/g, " ")}</div>
                <div className="meta">{c.selector || c.tag || ""}</div>
                <div className="bar"><div className="fill" style={{ width: `${c.confidence || 0}%` }} /></div>
              </div>
            ))
          ) : (
            <div className="ds-empty">No components detected</div>
          )}
        </div>
      </div>

      <div className="ds-section">
        <div className="ds-section-header">
          <h3>UX Patterns</h3>
          <span className="count">{(patterns || []).length}</span>
        </div>
        <div className="ds-pattern-list">
          {(patterns || []).length > 0 ? (
            (patterns as any[]).map((p, i) => {
              const cls = p.confidence >= 60 ? "high" : p.confidence >= 40 ? "medium" : "low";
              const icon = p.confidence >= 60 ? "✓" : "○";
              return (
                <div key={i} className="ds-pattern-row">
                  <div className={`check ${cls}`}>{icon}</div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div className="desc">{p.description || ""}</div>
                  </div>
                  <span className="conf">{p.confidence}%</span>
                </div>
              );
            })
          ) : (
            <div className="ds-empty">No patterns detected</div>
          )}
        </div>
      </div>

      {rules.length > 0 && (
        <div className="ds-section">
          <div className="ds-section-header">
            <h3>Visual Analysis</h3>
            <span className="count">{rules.length}</span>
          </div>
          <div className="ds-card">
            <div className="ds-rules-list">
              {rules.map((r: string, i: number) => (
                <div key={i} className="ds-rule">{r}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="ds-section">
        <div className="ds-section-header"><h3>Export Design Tokens</h3></div>
        <div className="ds-token-export">
          <button className="ds-token-btn" onClick={() => window.open(`/api/analyze/${id}/export/tailwind`)}>
            <span className="icon">🌊</span> tailwind.config.js
          </button>
          <button className="ds-token-btn" onClick={() => window.open(`/api/analyze/${id}/export/components`)}>
            <span className="icon">⚛</span> components.jsx
          </button>
          <button className="ds-token-btn" onClick={() => window.open(`/api/analyze/${id}/export/design.md`)}>
            <span className="icon">📄</span> DESIGN.md
          </button>
          <button className="ds-token-btn" onClick={() => window.open(`/api/analyze/${id}/export/tokens`)}>
            <span className="icon">✦</span> design-tokens.json
          </button>
          <button className="ds-token-btn" onClick={() => window.open(`/api/analyze/${id}/screenshot/overlay`)}>
            <span className="icon">🖼</span> Screenshot Overlay
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <Suspense fallback={<div className="ds-loading">
      <div className="spinner"></div>
      <span>Loading design system...</span>
    </div>}>
      <DesignSystemContent />
    </Suspense>
  );
}
