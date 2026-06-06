"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { getAnalysisResult } from "@/lib/api";
import { motion } from "framer-motion";
import {
  Sparkles,
  BarChart3,
  Eye,
  Box,
  Palette,
  Type,
  Layers,
  Sun,
  Grid3X3,
  Download,
  Copy,
  Check,
} from "lucide-react";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeDsTab, setActiveDsTab] = useState("colors");
  const [activeQeTab, setActiveQeTab] = useState("design-md");
  const [qeContent, setQeContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    getAnalysisResult(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !activeQeTab) return;
    const tabEl = document.querySelector(`.qe-tab[data-qe="${activeQeTab}"]`);
    const url = tabEl?.getAttribute("data-url");
    if (url) {
      fetch(url)
        .then((r) => r.text())
        .then(setQeContent)
        .catch(() => setQeContent("Could not load content."));
    }
  }, [id, activeQeTab]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  if (!id) {
    return (
      <div className="view active" style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
        <div style={{ color: "var(--muted2)", fontSize: 14 }}>No analysis ID provided</div>
        <button className="zen-btn-outline" style={{ marginTop: 16 }} onClick={() => router.push("/")}>
          ← Home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="view active" style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
        <div className="loader">
          <div className="spinner" />
          <span style={{ color: "var(--muted2)", fontSize: 14 }}>Loading analysis...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="view active" style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
        <div style={{ color: "var(--muted2)", fontSize: 14 }}>Analysis not found</div>
        <button className="zen-btn-outline" style={{ marginTop: 16 }} onClick={() => router.push("/")}>
          ← Home
        </button>
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
  const boxes = data.component_boxes || [];

  const qeTabs = [
    { id: "design-md", label: "DESIGN.md", icon: <FileText size={14} />, url: `/api/analyze/${id}/export/design.md` },
    { id: "tailwind", label: "Tailwind v4", icon: <Wind size={14} />, url: `/api/analyze/${id}/export/tailwind`, ext: ".js" },
    { id: "tokens", label: "Tokens", icon: <Sun size={14} />, url: `/api/analyze/${id}/export/tokens`, ext: ".json" },
    { id: "components", label: "Components", icon: <Box size={14} />, url: `/api/analyze/${id}/export/components`, ext: ".jsx" },
  ];

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "design-system", label: "Design System" },
    { id: "components", label: "Components" },
    { id: "patterns", label: "Patterns" },
    { id: "dna", label: "DNA" },
    { id: "exports", label: "Exports" },
  ];

  return (
    <div className="view active dash-view">
      <div className="dash-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`dash-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="dash-content">
        {/* ─── OVERVIEW ─── */}
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="zen-overview"
          >
            <div className="zen-header">
              <div className="zen-title-group">
                <h2 className="zen-title">{dna.style || "Design"}</h2>
                <a href={data.url} target="_blank" className="zen-url" rel="noreferrer">
                  {data.url} <span>↗</span>
                </a>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  className="zen-btn-outline"
                  onClick={() => {
                    setActiveTab("exports");
                    const el = document.querySelector(`[data-tab="exports"]`);
                    if (el) (el as HTMLElement).click();
                  }}
                >
                  → Exports
                </button>
                <button className="zen-btn-outline" onClick={() => router.push("/")}>
                  ← Back
                </button>
              </div>
            </div>

            {dna.summary && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="zen-summary-card glass-card"
              >
                <div className="zen-icon">
                  <Sparkles size={22} />
                </div>
                <p>{dna.summary}</p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="zen-metrics-grid"
            >
              <div className="zen-metric-card glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div className="metric-label">Confidence</div>
                  <BarChart3 size={16} style={{ color: "var(--accent)" }} />
                </div>
                <div className="metric-value accent">
                  {dna.style_confidence || 0}
                  <span className="unit">%</span>
                </div>
                <div className="metric-bar">
                  <div
                    className="fill accent-bg"
                    style={{ width: `${dna.style_confidence || 0}%` }}
                  />
                </div>
              </div>
              <div className="zen-metric-card glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div className="metric-label">Visual Score</div>
                  <Eye size={16} style={{ color: "var(--blue)" }} />
                </div>
                <div className="metric-value blue">
                  {dna.visual_score || "N/A"}
                  <span className="unit">/10</span>
                </div>
                <div className="metric-bar">
                  <div
                    className="fill blue-bg"
                    style={{ width: `${parseInt(dna.visual_score || "0") * 10}%` }}
                  />
                </div>
              </div>
              <div className="zen-metric-card glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div className="metric-label">Accessibility</div>
                  <Eye size={16} style={{ color: "var(--green)" }} />
                </div>
                <div className="metric-value green">{dna.accessibility || "N/A"}</div>
              </div>
              <div className="zen-metric-card glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div className="metric-label">Complexity</div>
                  <Box size={16} style={{ color: "var(--muted2)" }} />
                </div>
                <div className="metric-value" style={{ fontSize: 22 }}>
                  {dna.complexity || "N/A"}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              className="zen-preview-section"
            >
              <div className="zen-preview-card glass-card">
                <div className="preview-header">
                  <h3>Design Preview</h3>
                  {boxes.length ? (
                    <a
                      className="zen-btn-small"
                      href={`/api/analyze/${id}/screenshot/overlay`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Overlay ({boxes.length})
                    </a>
                  ) : null}
                </div>
                <div className="preview-image-container">
                  <Image
                    src={`/api/analyze/${id}/screenshot`}
                    alt="Preview"
                    width={1200}
                    height={900}
                    unoptimized
                    style={{ width: "100%", height: "auto", cursor: "pointer" }}
                    onClick={() => window.open(`/api/analyze/${id}/screenshot`)}
                  />
                </div>
              </div>

              <div className="zen-sidebar-column">
                {rules.length ? (
                  <div className="zen-rules-card glass-card">
                    <h3>Visual Rules</h3>
                    <ul className="zen-rules-list">
                      {rules.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="qe-panel glass-card">
                  <div className="qe-header">
                    <div className="qe-tabs">
                      {qeTabs.map((t) => (
                        <button
                          key={t.id}
                          className={`qe-tab ${activeQeTab === t.id ? "active" : ""}`}
                          data-qe={t.id}
                          data-url={t.url}
                          onClick={() => {
                            setActiveQeTab(t.id);
                          }}
                        >
                          <span className="qe-tab-icon">{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="qe-actions">
                      <button
                        className="qe-action-btn"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(qeContent);
                            setCopied(true);
                            showToast("Copied to clipboard ✓");
                            setTimeout(() => setCopied(false), 2000);
                          } catch {
                            showToast("Failed to copy");
                          }
                        }}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <a
                        className="qe-action-btn"
                        href={qeTabs.find((t) => t.id === activeQeTab)?.url || "#"}
                        download
                      >
                        <Download size={13} />
                        {qeTabs.find((t) => t.id === activeQeTab)?.ext || ".md"}
                      </a>
                    </div>
                  </div>
                  <div className="qe-body">
                    <pre className="qe-code">{qeContent || "Loading..."}</pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ─── DESIGN SYSTEM ─── */}
        {activeTab === "design-system" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <a
                className="zen-btn-small"
                href={`/design-system?id=${id}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 11 }}
              >
                Open Dedicated Page ↗
              </a>
            </div>
            <div className="ds-container">
              <div className="ds-sidebar">
                {[
                  { id: "colors", label: "Colors", icon: <Palette size={15} /> },
                  { id: "typography", label: "Typography", icon: <Type size={15} /> },
                  { id: "elevation", label: "Elevation & Radius", icon: <Layers size={15} /> },
                  { id: "spacing", label: "Spacing & Layout", icon: <Grid3X3 size={15} /> },
                ].map((t) => (
                  <div
                    key={t.id}
                    className={`ds-nav-item ${activeDsTab === t.id ? "active" : ""}`}
                    onClick={() => setActiveDsTab(t.id)}
                  >
                    {t.icon}
                    {t.label}
                  </div>
                ))}
              </div>
              <div className="ds-main">
                {/* COLORS */}
                {activeDsTab === "colors" && (
                  <div className="ds-pane active" style={{ display: "flex" }}>
                    <div className="ds-pane-header">
                      <h3>Color Palette</h3>
                      <p>Extracted design system colors and custom properties</p>
                    </div>
                    <div className="ds-card-grid">
                      {[
                        ["Primary", palette.primary, "Primary color used for key elements"],
                        ["Secondary", palette.secondary, "Secondary accent/supporting color"],
                        ["Accent", palette.accent, "Interactive accent, links, and highlights"],
                        ["Background", palette.background_light, "Main canvas background"],
                        ["Dark BG", palette.background_dark, "Dark mode/footer canvas background"],
                        ["Text", palette.text_primary, "Primary body text"],
                        ["Success", palette.success, "Green status color"],
                        ["Warning", palette.warning, "Yellow status color"],
                        ["Error", palette.error, "Red error/critical color"],
                      ]
                        .filter(([, hex]) => hex)
                        .map(([name, hex, desc]) => (
                          <div
                            key={name as string}
                            className="ds-color-card glass-card"
                            onClick={() => {
                              navigator.clipboard.writeText(hex as string);
                              showToast(`Color ${hex} copied`);
                            }}
                            title="Click to copy HEX"
                          >
                            <div
                              className="color-preview"
                              style={{
                                background: hex as string,
                                ...(hex === "#ffffff" ? { border: "1px solid rgba(255,255,255,0.1)" } : {}),
                              }}
                            >
                              <span className="copy-hint">Copy HEX</span>
                            </div>
                            <div className="color-info">
                              <span className="color-name">{name as string}</span>
                              <span className="color-hex">{hex as string}</span>
                              <span className="color-desc">{desc as string}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {colors.all && colors.all.length > 0 && (
                      <>
                        <h4 className="ds-sub-title">All Detected Colors</h4>
                        <div className="ds-card-grid">
                          {colors.all
                            .filter(
                              (c: any) =>
                                c.hex !== palette.primary &&
                                c.hex !== palette.secondary &&
                                c.hex !== palette.accent
                            )
                            .map((c: any, i: number) => (
                              <div
                                key={i}
                                className="ds-color-card glass-card"
                                onClick={() => {
                                  navigator.clipboard.writeText(c.hex);
                                  showToast(`Color ${c.hex} copied`);
                                }}
                                title="Click to copy HEX"
                              >
                                <div className="color-preview" style={{ background: c.hex }}>
                                  <span className="copy-hint">Copy HEX</span>
                                </div>
                                <div className="color-info">
                                  <span className="color-name">Color {i + 1}</span>
                                  <span className="color-hex">{c.hex}</span>
                                  <span className="color-desc">Tone: {c.tone}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                    {colors.custom_properties && Object.keys(colors.custom_properties).length > 0 && (
                      <>
                        <h4 className="ds-sub-title">CSS Variables</h4>
                        <div className="ds-card-grid">
                          {Object.entries(colors.custom_properties).map(([k, v]) => (
                            <div
                              key={k}
                              className="ds-color-card glass-card"
                              onClick={() => {
                                navigator.clipboard.writeText(v as string);
                                showToast(`Color ${v} copied`);
                              }}
                              title="Click to copy HEX"
                            >
                              <div className="color-preview" style={{ background: v as string }}>
                                <span className="copy-hint">Copy HEX</span>
                              </div>
                              <div className="color-info">
                                <span className="color-name" style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                                  --{k}
                                </span>
                                <span className="color-hex">{v as string}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TYPOGRAPHY */}
                {activeDsTab === "typography" && (
                  <div className="ds-pane active" style={{ display: "flex" }}>
                    <div className="ds-pane-header">
                      <h3>Typography</h3>
                      <p>Font families and heading scales</p>
                    </div>
                    <div className="ds-typo-container glass-card">
                      {(typography.families || []).length > 0 ? (
                        (typography.families as string[]).map((fn: string) => {
                          const det = (typography.details || {})[fn] || {};
                          const ss = (det.sizes || []).slice(0, 3).join(", ");
                          return (
                            <div key={fn} className="ds-font-specimen">
                              <div className="ds-font-preview" style={{ fontFamily: `'${fn}', sans-serif` }}>
                                <div className="alphabet">
                                  AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
                                </div>
                                <div className="family-name">{fn}</div>
                              </div>
                              <div className="ds-font-meta">
                                <span className="ds-tag">
                                  {fn === typography.primary_font
                                    ? "Primary"
                                    : fn === typography.secondary_font
                                      ? "Secondary"
                                      : "Web Font"}
                                </span>
                                {ss ? (
                                  <div className="sizes">
                                    Sizes used: <code>{ss}</code>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="ds-empty">No font families detected</div>
                      )}
                    </div>
                    {(() => {
                      const hh = typography.headings || {};
                      const hk = Object.keys(hh).filter((k) => hh[k] && hh[k].size);
                      if (hk.length === 0) return null;
                      return (
                        <>
                          <h4 className="ds-sub-title">Heading Scale</h4>
                          <div className="ds-typo-scale glass-card">
                            {hk.map((t) => {
                              const h = hh[t];
                              return (
                                <div key={t} className="ds-scale-row">
                                  <div className="ds-scale-label">{t.toUpperCase()}</div>
                                  <div
                                    className="ds-scale-preview"
                                    style={{
                                      fontSize: h.size,
                                      fontWeight: h.weight,
                                      fontFamily: `'${h.family}', sans-serif`,
                                    }}
                                  >
                                    The quick brown fox jumps over the lazy dog
                                  </div>
                                  <div className="ds-scale-properties">
                                    <div>
                                      Size: <code>{h.size}</code>
                                    </div>
                                    <div>
                                      Weight: <code>{h.weight}</code>
                                    </div>
                                    <div>
                                      Family: <code>{h.family}</code>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* ELEVATION */}
                {activeDsTab === "elevation" && (
                  <div className="ds-pane active" style={{ display: "flex" }}>
                    <div className="ds-pane-header">
                      <h3>Elevation & Border Radius</h3>
                      <p>Shadows and border radiuses used for UI depth</p>
                    </div>
                    <div className="ds-elevation-grid">
                      <div>
                        <h4 className="ds-sub-title" style={{ marginTop: 0 }}>
                          Border Radius
                        </h4>
                        <div className="ds-radius-showcase glass-card">
                          {(radius.radii || []).length > 0 ? (
                            (radius.radii as number[]).map((v, i) => (
                              <div key={i} className="ds-radius-item">
                                <div
                                  className="ds-radius-box"
                                  style={{ borderRadius: `${v}px` }}
                                >
                                  <span className="radius-label">{v}px</span>
                                </div>
                                <code>border-radius: {v}px</code>
                              </div>
                            ))
                          ) : (
                            <div className="ds-empty">No border radius scale detected</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="ds-sub-title" style={{ marginTop: 0 }}>
                          Box Shadows
                        </h4>
                        <div className="ds-shadows-showcase">
                          {(radius.shadows || []).length > 0 ? (
                            (radius.shadows as string[]).map((s, i) => (
                              <div key={i} className="ds-shadow-card glass-card">
                                <div
                                  className="ds-shadow-preview"
                                  style={{ boxShadow: s }}
                                >
                                  Shadow {i + 1}
                                </div>
                                <div className="ds-shadow-code">
                                  <code>box-shadow: {s}</code>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="ds-empty glass-card" style={{ padding: 20 }}>
                              No box shadows detected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SPACING */}
                {activeDsTab === "spacing" && (
                  <div className="ds-pane active" style={{ display: "flex" }}>
                    <div className="ds-pane-header">
                      <h3>Spacing & Layout</h3>
                      <p>Margin/padding scales and layout system settings</p>
                    </div>
                    <div className="ds-layout-grid">
                      <div>
                        <h4 className="ds-sub-title" style={{ marginTop: 0 }}>
                          Spacing Scale
                        </h4>
                        <div className="ds-spacing-showcase glass-card">
                          {(spacing.scale || []).length > 0 ? (
                            (spacing.scale as number[]).map((v, i) => (
                              <div key={i} className="ds-spacing-row">
                                <span className="spacing-val">{v}px</span>
                                <div className="spacing-bar-container">
                                  <div
                                    className="spacing-bar"
                                    style={{
                                      width: `${Math.max(4, Math.min(v, 120))}px`,
                                      height: 16,
                                    }}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="ds-empty">No spacing scale detected</div>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4 className="ds-sub-title" style={{ marginTop: 0 }}>
                          Layout System
                        </h4>
                        <div className="ds-layout-properties glass-card">
                          <div className="ds-prop-row">
                            <span className="prop-name">Responsive Design</span>
                            <span className={`prop-val ${layout.responsive ? "yes" : "no"}`}>
                              {layout.responsive ? "✓ Enabled" : "✗ Disabled"}
                            </span>
                          </div>
                          <div className="ds-prop-row">
                            <span className="prop-name">CSS Grid Usage</span>
                            <span className="prop-val">{layout.uses_grid ? "✓ Yes" : "✗ No"}</span>
                          </div>
                          <div className="ds-prop-row">
                            <span className="prop-name">Flexbox Usage</span>
                            <span className="prop-val">{layout.uses_flexbox ? "✓ Yes" : "✗ No"}</span>
                          </div>
                          <div className="ds-prop-row">
                            <span className="prop-name">Document Sections</span>
                            <span className="prop-val">{layout.sections_count || 0} sections</span>
                          </div>
                          {layout.max_container_width && (
                            <div className="ds-prop-row">
                              <span className="prop-name">Max Container Width</span>
                              <span className="prop-val">{layout.max_container_width}px</span>
                            </div>
                          )}
                          {(layout.sticky_elements || []).length > 0 && (
                            <div
                              className="ds-prop-row"
                              style={{
                                flexDirection: "column",
                                alignItems: "flex-start",
                                gap: 6,
                              }}
                            >
                              <span className="prop-name">Sticky Elements</span>
                              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                                {(layout.sticky_elements as string[]).map((el: string, i: number) => (
                                  <span key={i} className="ds-tag">{el}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── COMPONENTS ─── */}
        {activeTab === "components" && (
          <div>
            {(components || []).filter((c: any) => c && c.type).length > 0 ? (
              <div className="comp-grid">
                {(components as any[])
                  .filter((c) => c && c.type)
                  .map((c, i) => (
                    <div key={i} className="comp-card">
                      <div className="name">{c.type.replace(/-/g, " ")}</div>
                      <div className="sel">
                        {c.selector || c.tag || ""} · {c.confidence || 0}%
                      </div>
                      <div className="conf-track">
                        <div
                          className="conf-fill"
                          style={{ width: `${c.confidence || 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 24px",
                  color: "var(--muted2)",
                  fontSize: 14,
                }}
              >
                No components detected
              </div>
            )}
          </div>
        )}

        {/* ─── PATTERNS ─── */}
        {activeTab === "patterns" && (
          <div>
            {(patterns || []).length > 0 ? (
              <div className="pattern-list">
                {(patterns as any[]).map((p, i) => {
                  const ok = p.confidence >= 60;
                  return (
                    <div key={i} className="pattern-row">
                      <div className={`check ${ok ? "yes" : "maybe"}`}>
                        {ok ? <Check size={12} /> : <span>○</span>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div className="desc">
                          {p.description} · {p.confidence}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 24px",
                  color: "var(--muted2)",
                  fontSize: 14,
                }}
              >
                No UX patterns detected
              </div>
            )}
          </div>
        )}

        {/* ─── DNA ─── */}
        {activeTab === "dna" && (
          <div>
            <div className="dna-hero" style={{ marginBottom: 16 }}>
              <div className="dna-grid">
                <div className="dna-cell">
                  <div className="label">Classification</div>
                  <div className="value" style={{ fontSize: 16 }}>
                    {dna.style || "Unknown"}
                  </div>
                </div>
                <div className="dna-cell">
                  <div className="label">Confidence</div>
                  <div className="value gauge">
                    {dna.style_confidence || 0}%
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: `${dna.style_confidence || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="dna-cell">
                  <div className="label">Complexity</div>
                  <div className="value">{dna.complexity || "N/A"}</div>
                </div>
                <div className="dna-cell">
                  <div className="label">Density</div>
                  <div className="value">{dna.density || "N/A"}</div>
                </div>
                <div className="dna-cell">
                  <div className="label">Accessibility</div>
                  <div className="value green">{dna.accessibility || "N/A"}</div>
                </div>
                <div className="dna-cell">
                  <div className="label">Visual Score</div>
                  <div className="value gauge">
                    {dna.visual_score || "N/A"}
                    <div className="bar">
                      <div
                        className="bar-fill"
                        style={{ width: `${parseInt(dna.visual_score || "0") * 10}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              {dna.summary && <div className="summary">{dna.summary}</div>}
            </div>
            {rules.length > 0 && (
              <div className="section-card">
                <h3>Visual Analysis</h3>
                <ul className="rules-list">
                  {rules.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="section-card">
              <h3>Design Token Summary</h3>
              <div className="layout-grid">
                <div className="item">
                  Fonts <span className="val">{(typography.families || []).length}</span>
                </div>
                <div className="item">
                  Colors <span className="val">{colors.count || 0}</span>
                </div>
                <div className="item">
                  Spacing Values{" "}
                  <span className="val">{(spacing.scale || []).length}</span>
                </div>
                <div className="item">
                  Border Radii{" "}
                  <span className="val">{(radius.radii || []).length}</span>
                </div>
                <div className="item">
                  Shadows{" "}
                  <span className="val">{(radius.shadows || []).length}</span>
                </div>
                <div className="item">
                  Components{" "}
                  <span className="val">
                    {(components || []).filter((c: any) => c && c.type).length}
                  </span>
                </div>
                <div className="item">
                  UX Patterns{" "}
                  <span className="val">{(patterns || []).length}</span>
                </div>
                <div className="item">
                  Headings{" "}
                  <span className="val">
                    {Object.keys(typography.headings || {}).filter(
                      (k) => typography.headings[k] && typography.headings[k].size
                    ).length}
                  </span>
                </div>
                <div className="item">
                  Custom Props{" "}
                  <span className="val">
                    {Object.keys(colors.custom_properties || {}).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── EXPORTS ─── */}
        {activeTab === "exports" && (
          <div>
            <div className="export-section">
              <h3>Downloads</h3>
              <div className="export-grid">
                {[
                  { label: "DESIGN.md", sub: "Full report", icon: "md", url: `/api/analyze/${id}/export/design.md`, cls: "" },
                  { label: "tailwind.config.js", sub: "Theme config", icon: "tailwind", url: `/api/analyze/${id}/export/tailwind`, cls: "" },
                  { label: "components.jsx", sub: "React components", icon: "react", url: `/api/analyze/${id}/export/components`, cls: "" },
                  { label: "screenshot.png", sub: "Full page", icon: "img", url: `/api/analyze/${id}/screenshot`, cls: "" },
                  { label: "overlay.png", sub: "With component boxes", icon: "img", url: `/api/analyze/${id}/screenshot/overlay`, cls: "" },
                  { label: "design-tokens.json", sub: "Design tokens", icon: "json", url: `/api/analyze/${id}/export/tokens`, cls: "" },
                  { label: "result.json", sub: "Raw data", icon: "json", url: `/api/analyze/${id}/result`, cls: "" },
                ].map((item, i) => (
                  <a key={i} className="export-card" href={item.url} download={!item.url.endsWith("/result")}>
                    <span className={`icon ${item.icon}`}>
                      {item.icon === "md" ? <FileText size={16} /> :
                       item.icon === "tailwind" ? <Wind size={16} /> :
                       item.icon === "react" ? <Box size={16} /> :
                       item.icon === "img" ? <Eye size={16} /> :
                       <Sun size={16} />}
                    </span>
                    <div>
                      <div className="label">{item.label}</div>
                      <div className="sublabel">{item.sub}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
            <div className="export-section">
              <h3>MCP Server — Connect AI Agents</h3>
              <div className="destinations">
                <div
                  className="dest-card hint-card"
                  style={{
                    gridColumn: "1 / -1",
                    border: "1px solid var(--border)",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      MCP Server Available
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.5 }}>
                      First start the MCP server (stdin/stdout) :
                    </div>
                    <pre
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        padding: "8px 10px",
                        borderRadius: 6,
                        fontSize: 11,
                        overflowX: "auto",
                        margin: 0,
                      }}
                    >
                      source .venv/bin/activate
                      {"\n"}python3 backend/mcp_server.py
                    </pre>
                    <div style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.5 }}>
                      Then configure your tool :
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        fontSize: 11,
                      }}
                    >
                      <div>
                        <b>opencode</b> → add to{" "}
                        <code
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          opencode.json
                        </code>{" "}
                        :
                        <pre
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            padding: "6px 8px",
                            borderRadius: 4,
                            fontSize: 10,
                            overflowX: "auto",
                            margin: "4px 0 0 0",
                          }}
                        >
                          {`{"mcpServers":{"design-oracle":{"command":"python3","args":["backend/mcp_server.py"]}}}`}
                        </pre>
                      </div>
                      <div>Claude Code / Codex / Cursor → same in their MCP config</div>
                      <div>
                        With Docker :{" "}
                        <code
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            padding: "1px 5px",
                            borderRadius: 4,
                          }}
                        >
                          docker exec -i design-oracle python3 /app/backend/mcp_server.py
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="dest-card hint-card"
                  style={{
                    gridColumn: "1 / -1",
                    border: "1px solid var(--border)",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      Agent Prompt — Give this to any AI agent
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted2)", lineHeight: 1.5 }}>
                      Share this prompt with any MCP-compatible AI to let it autonomously use Design Oracle:
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="qe-action-btn"
                        onClick={async () => {
                          try {
                            const prompt = `You have access to the Design Oracle MCP server with these tools:
- analyze_website(url) — analyze a website's design system
- get_status(id) — check analysis progress
- get_result(id) — get complete analysis JSON
- list_analyses() — list all completed analyses
- export_design_md(id) — export DESIGN.md report
- export_tailwind(id) — export Tailwind v4 config
- export_components(id) — export React components JSX

Workflow: analyze_website(url) → poll get_status(id) until "complete" → get_result(id) → export as needed.`;
                            await navigator.clipboard.writeText(prompt);
                            showToast("Prompt copied ✓");
                          } catch {
                            showToast("Failed to copy");
                          }
                        }}
                      >
                        <Copy size={13} /> Copy Prompt
                      </button>
                      <a
                        className="qe-action-btn"
                        href="/AGENT_PROMPT.md"
                        target="_blank"
                      >
                        <Download size={13} /> View Full
                      </a>
                    </div>
                    <pre
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        padding: "10px 12px",
                        borderRadius: 6,
                        fontSize: 10,
                        overflowX: "auto",
                        margin: 0,
                        lineHeight: 1.6,
                        color: "var(--muted2)",
                      }}
                    >
{`You have access to the Design Oracle MCP server.

## Available Tools
- analyze_website(url) — Start analyzing a website
- get_status(id) — Check analysis progress
- get_result(id) — Get complete analysis JSON
- list_analyses() — List all completed analyses
- export_design_md(id) — Export DESIGN.md
- export_tailwind(id) — Export Tailwind v4 config
- export_components(id) — Export React components

## Workflow
1. analyze_website("https://example.com")
2. Poll get_status(id) until status is "complete"
3. get_result(id) for full data
4. export_* functions as needed

## Common Requests
- "Analyze [URL] and summarize its design system"
- "Extract colors and typography from [URL]"
- "Generate a Tailwind config from this site"
- "Create React components matching this UI"`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`toast show`}>{toast}</div>}
    </div>
  );
}

export default function DashboardOverviewPage() {
  return (
    <Suspense fallback={<div className="view active" style={{ alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div className="loader">
        <div className="spinner" />
        <span style={{ color: "var(--muted2)", fontSize: 14 }}>Loading dashboard...</span>
      </div>
    </div>}>
      <DashboardContent />
    </Suspense>
  );
}

function FileText({ size }: { size: number }) {
  return (
    <svg className="icon-svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function Wind({ size }: { size: number }) {
  return (
    <svg className="icon-svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  );
}
