# Design-Extractor Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Design Oracle landing page (`/`) to the design-extractor.com visual standard — near-black `#080808` background with grid overlay, DESIGN.md-focused hero, workflow section, featured gallery, newsletter + FAQ — without touching `/analysis` or `/dashboard`.

**Architecture:** CSS-first approach. The existing `home-*` class system in `globals.css` is extended (not rewritten in Tailwind). New presentational components (`WorkflowSection`, `NewsletterSection`, `FaqSection`) are added with their own `work-*`/`news-*`/`faq-*` CSS classes. `HeroSearch.tsx` and `InspirationGrid.tsx` get JSX restyled but their resolver/filter logic is unchanged. Zero backend changes.

**Tech Stack:** Next.js (App Router), React, framer-motion, lucide-react, CSS custom classes in `globals.css`, Tailwind v4 (already imported, used only where already in use like `Topbar`).

## Global Constraints

- Scope is the landing page (`/`) and `Topbar` ONLY. Do NOT modify `/analysis`, `/dashboard`, or any non-landing component styling.
- Do NOT change the global `--bg` CSS variable (`#0B0F19`) — the near-black `#080808` background and grid must be scoped to the landing via `.home-shell` and landing sections.
- Quota badge `••• 3 / 3 free this week` is purely visual (3 white dots + text). No backend, no counter.
- Newsletter email field is fake: local success state only, no fetch/submission.
- Backend untouched — `python -m unittest discover -s tests` must still pass (no backend files modified).
- Verify with `npm run lint` (clean) and `npm run build` (succeeds, `/` prerenders static).
- Commit after every task with the exact message given.
- Work in the main repo at `/home/jomvick/Bureau/Kc_Folder/projet/design-oracle` (frontend code under `frontend/`). No worktree needed (feature is additive to `main`).

---

### Task 1: Landing-scoped dark background + grid

**Files:**
- Modify: `frontend/app/globals.css` (append new scoped styles; do NOT touch lines 12-38 `:root`/`body`)

**Interfaces:**
- Produces: CSS classes used by later tasks: `.home-shell`, `.home-hero`, `.home-hero-card`, `.home-hero-badge`, `.home-title`, `.home-title-gradient`, `.home-subtitle`, `.home-input-group`, `.home-quota`, `.home-insp`, `.home-gallery-head`, `.home-eyebrow`, `.work-section`, `.work-card`, `.news-section`, `.news-card`, `.faq-section`, `.faq-item`, `.faq-question`, `.faq-answer`.

- [ ] **Step 1: Append landing background + gallery header styles**

Append to the END of `frontend/app/globals.css`:

```css
/* ─── Design-Extractor landing dark theme ─── */
.home-shell{
  position:relative;
  background:#080808;
}
.home-shell::before{
  content:'';
  position:fixed;
  inset:0;
  z-index:0;
  pointer-events:none;
  background-image:
    linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
  background-size:80px 80px;
  background-position:center top;
}
.home-shell > *{
  position:relative;
  z-index:1;
}
.home-gallery-head{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:8px;
  margin-bottom:22px;
  text-align:center;
}
.home-eyebrow{
  display:inline-flex;
  align-items:center;
  gap:8px;
  margin-bottom:0;
  padding:5px 11px;
  border-radius:999px;
  border:1px solid rgba(139,92,246,.22);
  background:rgba(139,92,246,.11);
  color:#bda8ff;
}
.home-eyebrow span{
  font-size:10px;
  line-height:1;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.home-gallery-title{
  margin:0;
  color:#fafafa;
  font-size:clamp(28px,4vw,40px);
  line-height:1.1;
  font-weight:800;
  letter-spacing:-.02em;
}
```

- [ ] **Step 2: Verify CSS syntax**

Run: `npx tailwindcss -i app/globals.css -o /tmp/opencode/tw-check.css` (from `frontend/`)
Expected: succeeds without error, output file written.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: landing dark background with grid overlay and gallery header styles"
```

---

### Task 2: Restyle HeroSearch (DESIGN.md pivot)

**Files:**
- Modify: `frontend/components/HeroSearch.tsx`
- Modify: `frontend/app/globals.css` (append hero-specific styles)

**Interfaces:**
- Consumes: `onAnalyze: (url: string) => void`, `loading?: boolean`, `filter: FilterValue`, `onFilterChange`, `detectPlatform`, `resolveGalleryUrl` (all unchanged).
- Produces: restyled JSX using classes from Task 1 + `.home-hero-badge`, `.home-title-gradient`, `.home-quota`, `.home-pill-input`, `.home-pill-btn`. Resolver logic, `submit`, guide modal, `NON_RESOLVABLE`, states all preserved verbatim.

- [ ] **Step 1: Rewrite the JSX return block of `HeroSearch.tsx`**

Replace the `return (...)` block (lines 66-140) with:

```tsx
  return (
    <section className="home-hero">
      <AiGlow active={focused} intensity="medium" className="home-glow" />

      <div className="home-hero-card">
        <div className="home-eyebrow">
          <span className="home-hero-dot" />
          <span>Built for AI coding agents</span>
        </div>

        <h2 className="home-title">
          Get a{" "}
          <span className="home-title-gradient">DESIGN.md</span> from any
          website
        </h2>

        <p className="home-subtitle">
          Paste a URL to extract a design system. Get a DESIGN.md plus
          Tailwind v4 and design tokens for your AI agent.
        </p>

        <div className={cn("home-input-group", focused && "is-focused")}>
          <input
            type="url"
            placeholder="Paste paypal.com..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
            disabled={resolving}
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !url.trim() || resolving}
            className="home-pill-btn"
            aria-label="Analyze"
          >
            {resolving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              "↑"
            )}
          </button>
        </div>

        <div className="home-quota">
          <span className="home-quota-dot" />
          <span className="home-quota-dot" />
          <span className="home-quota-dot" />
          <span>3 / 3 free this week</span>
        </div>

        {error && <p className="home-error">{error}</p>}
      </div>

      <InspirationFilter active={filter} onChange={onFilterChange} />

      {showGuide && (
        <div className="home-modal" role="dialog" aria-modal="true">
          <div className="home-modal-card">
            <h3>Étude de cas détectée</h3>
            <p>
              Seuls les sites web en ligne sont analysables en v1. Découvre nos
              presets ou entre l&apos;URL du site final&nbsp;!
            </p>
            <button type="button" onClick={() => setShowGuide(false)}>
              Compris
            </button>
          </div>
        </div>
      )}
    </section>
  );
```

Note: `Sparkles` import is no longer used in `HeroSearch.tsx`. Remove `Sparkles` from the lucide-react import on line 4 (`import { ArrowRight, Loader2, Sparkles } from "lucide-react"` → `import { Loader2 } from "lucide-react"`). `ArrowRight` is also unused now — remove it too.

- [ ] **Step 2: Append hero styles to `globals.css`**

Append to the END of `frontend/app/globals.css`:

```css
/* ─── Hero DESIGN.md styles ─── */
.home-hero{
  width:100%;
  max-width:760px;
  position:relative;
  display:flex;
  flex-direction:column;
  align-items:center;
}
.home-hero-card{
  width:100%;
  position:relative;
  z-index:1;
  overflow:hidden;
  border-radius:24px;
  border:1px solid rgba(255,255,255,.1);
  background:linear-gradient(180deg,rgba(20,20,20,.9),rgba(10,10,10,.95));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 24px 70px rgba(0,0,0,.45);
  backdrop-filter:blur(18px);
  -webkit-backdrop-filter:blur(18px);
  padding:44px 40px 34px;
  text-align:center;
}
.home-hero-dot{
  width:6px;
  height:6px;
  border-radius:999px;
  background:#a855f7;
  animation:pulse-glow 2s ease-in-out infinite;
}
.home-title{
  margin:0 auto;
  max-width:640px;
  color:#fafafa;
  font-size:clamp(38px,5.5vw,60px);
  line-height:1.05;
  font-weight:800;
  letter-spacing:-.03em;
}
.home-title-gradient{
  background:linear-gradient(90deg,#fff 0%,#d4d4d8 55%,#71717a 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
.home-subtitle{
  max-width:520px;
  margin:16px auto 28px;
  color:rgba(161,161,170,.78);
  font-size:15px;
  line-height:1.6;
}
.home-input-group{
  width:100%;
  max-width:520px;
  margin:0 auto;
  display:flex;
  align-items:center;
  gap:8px;
  padding:7px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.1);
  background:#121215;
  transition:border-color .2s ease,box-shadow .2s ease;
}
.home-input-group.is-focused{
  border-color:rgba(255,255,255,.2);
  box-shadow:0 0 0 3px rgba(255,255,255,.06);
}
.home-input-group input{
  min-width:0;
  flex:1;
  height:44px;
  border:0;
  outline:0;
  background:transparent;
  color:var(--text);
  padding:0 18px;
  font-size:14px;
  font-family:var(--font);
}
.home-input-group input::placeholder{
  color:rgba(113,113,122,.75);
}
.home-pill-btn{
  width:44px;
  height:44px;
  flex-shrink:0;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:999px;
  background:#fff;
  color:#000;
  font-size:18px;
  font-weight:700;
  cursor:pointer;
  transition:background .15s ease,transform .15s ease,opacity .15s ease;
}
.home-pill-btn:hover{
  background:#e4e4e7;
}
.home-pill-btn:active{
  transform:scale(.94);
}
.home-pill-btn:disabled{
  opacity:.4;
  cursor:not-allowed;
}
.home-quota{
  margin:14px auto 0;
  display:inline-flex;
  align-items:center;
  gap:4px;
  padding:5px 12px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.06);
  background:rgba(0,0,0,.4);
  color:rgba(161,161,170,.8);
  font-size:11px;
}
.home-quota-dot{
  width:5px;
  height:5px;
  border-radius:999px;
  background:#fff;
  opacity:.9;
}
```

- [ ] **Step 3: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/HeroSearch.tsx frontend/app/globals.css
git commit -m "feat: redesign hero with DESIGN.md headline, pill input and quota badge"
```

---

### Task 3: WorkflowSection component

**Files:**
- Create: `frontend/components/WorkflowSection.tsx`
- Modify: `frontend/app/globals.css` (append workflow styles)

**Interfaces:**
- Consumes: nothing (presentational).
- Produces: `WorkflowSection` (default export, no props) — a full-bleed section with 3 cards. Used by `page.tsx` in Task 6.

- [ ] **Step 1: Create `frontend/components/WorkflowSection.tsx`**

```tsx
const STEPS = [
  {
    num: "01",
    title: "Extract any site",
    desc: "Paste a URL. Get a DESIGN.md with colors, typography, components, and layout specs.",
  },
  {
    num: "02",
    title: "Save it anywhere",
    desc: "Drop DESIGN.md directly into your repo root alongside your existing prompt files.",
  },
  {
    num: "03",
    title: "Point your agent at it",
    desc: "Tell your AI coding agent to use DESIGN.md as its visual style guide. That's it.",
  },
];

/**
 * Section « How it works » — 3 étapes Extract / Save / Point your agent.
 */
export default function WorkflowSection() {
  return (
    <section className="work-section">
      <div className="work-head">
        <span className="home-eyebrow">
          <span>Works with your agent</span>
        </span>
        <h2 className="work-title">
          Drop DESIGN.md into your repo.
          <br />
          Your agent does the rest.
        </h2>
      </div>

      <div className="work-grid">
        {STEPS.map((step) => (
          <article key={step.num} className="work-card">
            <span className="work-num">{step.num}</span>
            <h3 className="work-card-title">{step.title}</h3>
            <p className="work-card-desc">{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Append workflow styles to `globals.css`**

Append to the END of `frontend/app/globals.css`:

```css
/* ─── Workflow section ─── */
.work-section{
  width:100%;
  max-width:1080px;
  margin:0 auto;
  padding:96px 0 24px;
}
.work-head{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:16px;
  margin-bottom:48px;
  text-align:center;
}
.work-title{
  margin:0;
  color:#fafafa;
  font-size:clamp(30px,4.5vw,46px);
  line-height:1.12;
  font-weight:800;
  letter-spacing:-.02em;
}
.work-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:20px;
}
.work-card{
  position:relative;
  overflow:hidden;
  padding:32px 28px;
  border-radius:20px;
  border:1px solid rgba(255,255,255,.1);
  background:#101014;
  transition:border-color .18s ease,transform .18s ease;
}
.work-card:hover{
  border-color:rgba(255,255,255,.2);
  transform:translateY(-2px);
}
.work-num{
  position:absolute;
  top:20px;
  right:22px;
  font-family:var(--mono);
  font-size:12px;
  color:rgba(161,161,170,.55);
}
.work-card-title{
  margin:0 0 10px;
  padding-top:18px;
  color:#fafafa;
  font-size:18px;
  font-weight:700;
  letter-spacing:-.01em;
}
.work-card-desc{
  margin:0;
  color:rgba(161,161,170,.75);
  font-size:13px;
  line-height:1.6;
}
```

- [ ] **Step 3: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/WorkflowSection.tsx frontend/app/globals.css
git commit -m "feat: add WorkflowSection with Extract/Save/Agent steps"
```

---

### Task 4: Featured Gallery header in InspirationGrid

**Files:**
- Modify: `frontend/components/InspirationGrid.tsx`
- Modify: `frontend/app/globals.css` (restyle existing `home-insp-card` to dark theme — lines 1014-1020)

**Interfaces:**
- Consumes: same props as today (`presets`, `designs`, `onDelete`, `onAnalyze`), unchanged.
- Produces: section with a "FEATURED GALLERY" eyebrow + "Explore design systems" title above the tabs, using classes from Task 1 (`.home-gallery-head`, `.home-eyebrow`, `.home-gallery-title`).

- [ ] **Step 1: Add gallery header to `InspirationGrid.tsx`**

Replace the opening of the returned JSX (lines 32-48) so the section starts with a header before the tabs:

```tsx
  return (
    <section className="home-insp">
      <div className="home-gallery-head">
        <span className="home-eyebrow">
          <span>Featured gallery</span>
        </span>
        <h2 className="home-gallery-title">Explore design systems</h2>
      </div>

      <div className="home-tabs">
        <button
          type="button"
          className={cn("home-tab", tab === "inspirations" && "is-active")}
          onClick={() => setTab("inspirations")}
        >
          Inspirations
        </button>
        <button
          type="button"
          className={cn("home-tab", tab === "recent" && "is-active")}
          onClick={() => setTab("recent")}
        >
          Récents
        </button>
      </div>
```

(The rest of the component — the `motion.div` grid, `AnimatePresence`, `HistoryList` branch — stays unchanged.)

- [ ] **Step 2: Darken inspiration card styles**

In `globals.css`, replace the `.home-insp-card` rule (lines 1014-1021):

```css
.home-insp-card{
  overflow:hidden;
  border-radius:20px;
  border:1px solid rgba(255,255,255,.1);
  background:#111111;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
  transition:border-color .15s ease,transform .15s ease,box-shadow .15s ease;
}
```

Also replace the `.home-insp-media` background (line 1031) `rgba(8,12,22,.6)` → `rgba(0,0,0,.6)`.

- [ ] **Step 3: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/InspirationGrid.tsx frontend/app/globals.css
git commit -m "feat: add featured gallery header and darken inspiration cards"
```

---

### Task 5: Newsletter + FAQ sections

**Files:**
- Create: `frontend/components/NewsletterSection.tsx`
- Create: `frontend/components/FaqSection.tsx`
- Modify: `frontend/app/globals.css` (append newsletter + FAQ styles)

**Interfaces:**
- Consumes: nothing.
- Produces: `NewsletterSection` (default export, no props), `FaqSection` (default export, no props). Composed in `page.tsx` in Task 6.

- [ ] **Step 1: Create `frontend/components/NewsletterSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Check } from "lucide-react";

/**
 * Waitlist newsletter — email factice, état de succès local uniquement.
 */
export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);

  const submit = () => {
    if (!email.trim()) return;
    setJoined(true);
  };

  return (
    <section className="news-section">
      <div className="news-card">
        <h2 className="news-title">
          Something big is <span>brewing</span>
        </h2>
        <p className="news-desc">
          Be first in line for agent-ready design extraction, private access,
          and a few things we're not ready to show yet.
        </p>

        {joined ? (
          <p className="news-success">
            <Check size={14} strokeWidth={2.5} />
            You're on the list. We'll be in touch.
          </p>
        ) : (
          <div className="news-form">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button type="button" onClick={submit} disabled={!email.trim()}>
              Join the waitlist
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Create `frontend/components/FaqSection.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

const FAQS = [
  {
    q: "What is a DESIGN.md?",
    a: "It's a Markdown file that describes a website's design system — colors, typography, components, spacing, and layout patterns — so an AI coding agent can match your app's visual style.",
  },
  {
    q: "Which sites can I analyze?",
    a: "Paste any live website URL. Gallery pages from Awwwards and SiteInspire are auto-resolved to the real site. Behance, Dribbble, Mobbin, and Designspiration links show a guide instead.",
  },
  {
    q: "Is Design Oracle free?",
    a: "The first analyses each week are free. The 3/3 badge under the search bar shows where you stand.",
  },
  {
    q: "Which AI coding agents does it work with?",
    a: "Anything that reads a file — opencode, Codex, Cursor, and more. Export the DESIGN.md and point your agent at it.",
  },
  {
    q: "How are design tokens generated?",
    a: "Colors, typography, spacing, and component styles are extracted from the page and written as Tailwind config and design tokens.",
  },
];

/**
 * FAQ accordéon — une seule réponse ouverte à la fois.
 */
export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="faq-section">
      <h2 className="faq-title">Frequently asked questions</h2>
      <div className="faq-list">
        {FAQS.map((item, i) => (
          <div key={i} className={cn("faq-item", open === i && "is-open")}>
            <button
              type="button"
              className="faq-question"
              onClick={() => setOpen(open === i ? null : i)}
              aria-expanded={open === i}
            >
              <span>{item.q}</span>
              <Plus
                size={16}
                strokeWidth={2}
                className={cn("faq-plus", open === i && "is-open")}
              />
            </button>
            <div className="faq-answer">
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Append newsletter + FAQ styles to `globals.css`**

Append to the END of `frontend/app/globals.css`:

```css
/* ─── Newsletter section ─── */
.news-section{
  width:100%;
  max-width:1080px;
  margin:0 auto;
  padding:96px 0 24px;
}
.news-card{
  position:relative;
  overflow:hidden;
  padding:56px 40px;
  border-radius:24px;
  border:1px solid rgba(255,255,255,.1);
  background:linear-gradient(180deg,rgba(20,20,20,.9),rgba(10,10,10,.95));
  text-align:center;
}
.news-title{
  margin:0 0 12px;
  color:#fafafa;
  font-size:clamp(30px,4.5vw,44px);
  line-height:1.1;
  font-weight:800;
  letter-spacing:-.02em;
}
.news-title span{
  background:linear-gradient(90deg,#a855f7,#6366f1);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
.news-desc{
  max-width:480px;
  margin:0 auto 28px;
  color:rgba(161,161,170,.75);
  font-size:14px;
  line-height:1.6;
}
.news-form{
  display:flex;
  gap:8px;
  max-width:420px;
  margin:0 auto;
}
.news-form input{
  min-width:0;
  flex:1;
  height:44px;
  border-radius:10px;
  border:1px solid rgba(255,255,255,.1);
  background:#121215;
  color:var(--text);
  padding:0 16px;
  font-size:13px;
  font-family:var(--font);
  outline:0;
}
.news-form input:focus{
  border-color:rgba(255,255,255,.2);
}
.news-form button{
  height:44px;
  flex-shrink:0;
  padding:0 18px;
  border:0;
  border-radius:10px;
  color:white;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  font-size:13px;
  font-weight:700;
  font-family:var(--font);
  cursor:pointer;
  transition:opacity .15s ease;
}
.news-form button:disabled{
  opacity:.45;
  cursor:not-allowed;
}
.news-success{
  display:inline-flex;
  align-items:center;
  gap:8px;
  margin:0;
  padding:10px 18px;
  border-radius:999px;
  border:1px solid rgba(52,211,153,.25);
  background:rgba(52,211,153,.08);
  color:#6ee7b7;
  font-size:13px;
  font-weight:600;
}

/* ─── FAQ section ─── */
.faq-section{
  width:100%;
  max-width:760px;
  margin:0 auto;
  padding:96px 0 40px;
}
.faq-title{
  margin:0 0 32px;
  color:#fafafa;
  font-size:clamp(26px,4vw,38px);
  line-height:1.12;
  font-weight:800;
  letter-spacing:-.02em;
  text-align:center;
}
.faq-list{
  display:flex;
  flex-direction:column;
  gap:10px;
}
.faq-item{
  border-radius:16px;
  border:1px solid rgba(255,255,255,.08);
  background:#101014;
  transition:border-color .18s ease;
}
.faq-item.is-open{
  border-color:rgba(255,255,255,.18);
}
.faq-question{
  width:100%;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:18px 20px;
  border:0;
  background:transparent;
  color:#e4e4e7;
  font-size:14px;
  font-weight:650;
  font-family:var(--font);
  text-align:left;
  cursor:pointer;
}
.faq-plus{
  flex-shrink:0;
  color:rgba(161,161,170,.7);
  transition:transform .2s ease;
}
.faq-plus.is-open{
  transform:rotate(45deg);
}
.faq-answer{
  max-height:0;
  overflow:hidden;
  transition:max-height .25s ease;
}
.faq-item.is-open .faq-answer{
  max-height:220px;
}
.faq-answer p{
  margin:0;
  padding:0 20px 18px;
  color:rgba(161,161,170,.75);
  font-size:13px;
  line-height:1.6;
}
```

- [ ] **Step 4: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/NewsletterSection.tsx frontend/components/FaqSection.tsx frontend/app/globals.css
git commit -m "feat: add newsletter and FAQ sections"
```

---

### Task 6: Compose page + restyle Topbar

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/components/Topbar.tsx`

**Interfaces:**
- Consumes: `HeroSearch`, `InspirationGrid`, `WorkflowSection`, `NewsletterSection`, `FaqSection` (default exports, composed in order).
- Produces: final landing composition. Order: HeroSearch → InspirationGrid → WorkflowSection → NewsletterSection → FaqSection, all inside `.home-shell`.

- [ ] **Step 1: Update `page.tsx` imports + JSX**

Replace the component imports (lines 7-11) with:

```tsx
import HeroSearch from "@/components/HeroSearch";
import InspirationGrid from "@/components/InspirationGrid";
import WorkflowSection from "@/components/WorkflowSection";
import NewsletterSection from "@/components/NewsletterSection";
import FaqSection from "@/components/FaqSection";
import type { FilterValue } from "@/components/InspirationFilter";
```

Replace the returned JSX (lines 36-49) with:

```tsx
  return (
    <main className="home-shell">
      <HeroSearch
        onAnalyze={handleAnalyze}
        loading={loading}
        filter={filter}
        onFilterChange={setFilter}
      />
      <InspirationGrid
        presets={visiblePresets}
        designs={designs}
        onDelete={(id) => setDesigns((prev) => prev.filter((x) => x.id !== id))}
        onAnalyze={handleAnalyze}
      />
      <WorkflowSection />
      <NewsletterSection />
      <FaqSection />
    </main>
  );
```

Note: `InspirationPreset` type import stays (used by `visiblePresets` cast on line 10/11). Keep `inspirations` import and `visiblePresets` logic unchanged.

- [ ] **Step 2: Restyle `Topbar.tsx`**

Change the header className (line 14-17) to the dark landing palette:

```tsx
      className={cn(
        "sticky top-0 z-50 flex h-[60px] items-center justify-between px-8",
        "border-b border-white/[0.08] bg-[#080808]/70 backdrop-blur-xl"
      )}
```

- [ ] **Step 3: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 4: Run full build**

Run (from `frontend/`): `npm run build`
Expected: `✓ Compiled successfully` — `/` route listed as `○ (Static) prerendered as static content`. Watch for any unused-import errors in `page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/page.tsx frontend/components/Topbar.tsx
git commit -m "feat: compose landing sections and restyle topbar to dark palette"
```

---

### Task 7: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run backend tests (unchanged)**

Run (from repo root): `python -m unittest discover -s tests`
Expected: `Ran 12 tests ... OK`.

- [ ] **Step 2: Verify built CSS contains scoped landing styles**

Run: `grep -o "home-shell::before" .next/static/css/*.css` (from `frontend/`, after build)
Expected: match found. Also confirm no global `--bg` change: `grep -c "0B0F19" .next/static/css/*.css` still finds the root variable.

- [ ] **Step 3: Rebuild + restart the frontend container**

Run (from repo root):
```bash
podman compose up -d --build frontend
```
Then verify `http://localhost:3000` returns 200.

- [ ] **Step 4: Manual UI verification**

At `http://localhost:3000`:
1. Landing shows near-black `#080808` background with visible grid lines.
2. Hero: badge "Built for AI coding agents", title "Get a DESIGN.md from any website" (DESIGN.md with white→gray gradient), pill input "Paste paypal.com...", round white ↑ button, quota "3/3 free this week".
3. Filters below quota; clicking filters re-flows the grid.
4. Featured gallery header "FEATURED GALLERY / Explore design systems" above tabs.
5. Workflow section: 3 cards (01 Extract / 02 Save / 03 Point your agent).
6. Newsletter: typing an email + click shows success state; no network call.
7. FAQ: one answer open by default; clicking a question toggles.
8. `/analysis` and `/dashboard` visually unchanged (no black background on those routes).

- [ ] **Step 5: Confirm git status clean**

Run: `git status --short`
Expected: no unexpected untracked/modified files.
```
