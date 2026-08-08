# Design Oracle Landing Identity Adaptation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-root the landing page in Design Oracle's own identity — night-blue `#0B0F19` palette, violet IA accent, and "Design Intelligence" voice — while keeping the current section structure (Hero, Workflow, Featured Gallery, Newsletter, FAQ).

**Architecture:** CSS-first, appending scoped overrides at the end of `globals.css` (later rules win over the extractor-styled rules already appended). Copy changes in the JSX components. No structural/layout changes, no backend changes.

**Tech Stack:** Next.js (App Router), React, framer-motion, lucide-react, CSS custom classes in `globals.css`, Tailwind v4 (already imported).

## Global Constraints

- Scope is the landing page (`/`) and `Topbar` ONLY. Do NOT modify `/analysis`, `/dashboard`, or non-landing styling.
- Do NOT change the global `:root` `--bg` variable (`#0B0F19` stays). All palette changes are scoped via `.home-shell` and landing component classes.
- Night-blue background: `.home-shell` → `#0B0F19` (NOT `#080808`).
- Search button: violet gradient `#7c3aed → #4f46e5` with "→" arrow. NOT white circle.
- DESIGN.md gradient in title: violet IA `#8B5CF6 → #6366F1`. NOT white→gray.
- Copy is English, rewritten — do NOT use design-extractor verbatim phrases ("Built for AI coding agents", "Paste paypal.com...", "3 / 3 free this week", "Something big is brewing", "Drop DESIGN.md into your repo. Your agent does the rest.").
- Quota badge + Newsletter stay, rephrased. Backend untouched.
- Verify with `npm run lint` (clean) and `npm run build` (succeeds). Backend tests `python -m unittest discover -s tests` still pass.
- Work directly on `main` (user explicitly consented to inline execution on main).
- Commit after every task with the exact message given.
- Work dir: `/home/jomvick/Bureau/Kc_Folder/projet/design-oracle`; frontend code under `frontend/`.

---

### Task 1: Landing background + surfaces back to night-blue

**Files:**
- Modify: `frontend/app/globals.css` (append scoped overrides at END of file)

**Interfaces:**
- Produces: `.home-shell` background `#0B0F19`, dimmed grid `rgba(255,255,255,0.02)`, card surfaces `#12161F`, input `#0D1117`, Topbar via Tailwind in Task 6.
- Replaces (wins over) the `#080808`/`#101014` values appended by the design-extractor redesign tasks.

- [ ] **Step 1: Append night-blue scoped styles**

Append to the END of `frontend/app/globals.css`:

```css
/* ─── Design Oracle identity — night-blue landing ─── */
.home-shell{
  background:#0B0F19;
}
.home-shell::before{
  background-image:
    linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px);
}
.home-hero-card,
.news-card{
  border-color:rgba(255,255,255,.07);
  background:linear-gradient(180deg,rgba(18,22,31,.92),rgba(13,17,23,.96));
}
.home-input-group{
  border-color:rgba(255,255,255,.08);
  background:#0D1117;
}
.home-insp-card,
.work-card,
.faq-item{
  background:#12161F;
}
```

- [ ] **Step 2: Verify no global palette change**

Run (from `frontend/`): `grep -c "0B0F19" app/globals.css`
Expected: at least 1 match (the `:root` `--bg`). Confirm `:root` line unchanged.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat: night-blue landing background and surfaces"
```

---

### Task 2: Hero copy + violet button

**Files:**
- Modify: `frontend/components/HeroSearch.tsx`
- Modify: `frontend/app/globals.css` (append button + gradient + quota overrides)

**Interfaces:**
- Consumes: same props/logic as today (unchanged resolver, submit, modal, states).
- Produces: updated JSX strings + `.home-pill-btn` violet gradient, `.home-title-gradient` violet, `.home-quota-dot` violet.

- [ ] **Step 1: Update JSX copy + button in `HeroSearch.tsx`**

Replace lines 71-119 (the eyebrow through quota) with:

```tsx
        <div className="home-eyebrow">
          <span className="home-hero-dot" />
          <span>Design Intelligence</span>
        </div>

        <h2 className="home-title">
          Extract the{" "}
          <span className="home-title-gradient">design system</span> behind
          any website
        </h2>

        <p className="home-subtitle">
          Colors, typography, components, and UX patterns — extracted into a
          DESIGN.md your AI agent can follow.
        </p>

        <div className={cn("home-input-group", focused && "is-focused")}>
          <input
            type="url"
            placeholder="https://linear.app"
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
              "→"
            )}
          </button>
        </div>

        <div className="home-quota">
          <span className="home-quota-dot" />
          <span className="home-quota-dot" />
          <span className="home-quota-dot" />
          <span>3 free analyses / week</span>
        </div>
```

(The rest of the component — `home-error`, `InspirationFilter`, guide modal — stays unchanged.)

- [ ] **Step 2: Append violet gradient + button + quota overrides**

Append to the END of `frontend/app/globals.css`:

```css
/* ─── Design Oracle identity — hero accents ─── */
.home-title-gradient{
  background:linear-gradient(90deg,#8B5CF6 0%,#6366F1 100%);
  -webkit-background-clip:text;
  background-clip:text;
  color:transparent;
}
.home-pill-btn{
  border-radius:999px;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  color:#fff;
  box-shadow:0 10px 24px rgba(91,69,232,.28);
  font-size:16px;
}
.home-pill-btn:hover{
  background:linear-gradient(135deg,#8b5cf6,#5f5bf0);
  box-shadow:0 12px 28px rgba(91,69,232,.36);
}
.home-input-group .home-pill-btn{
  border-radius:999px;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  color:#fff;
}
.home-input-group .home-pill-btn:hover{
  background:linear-gradient(135deg,#8b5cf6,#5f5bf0);
}
.home-quota-dot{
  background:#a78bfa;
}
```

- [ ] **Step 3: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/HeroSearch.tsx frontend/app/globals.css
git commit -m "feat: hero Design Intelligence copy with violet button and gradient"
```

---

### Task 3: Workflow copy

**Files:**
- Modify: `frontend/components/WorkflowSection.tsx`

**Interfaces:**
- Consumes: nothing (presentational, no props).
- Produces: updated `STEPS` array + eyebrow + heading strings.

- [ ] **Step 1: Rewrite `WorkflowSection.tsx` copy**

Replace the `STEPS` array (lines 1-17) and the `work-head` block (lines 25-34) with:

```tsx
const STEPS = [
  {
    num: "01",
    title: "Extract",
    desc: "Paste a URL. We pull colors, typography, components, and layout specs into a DESIGN.md.",
  },
  {
    num: "02",
    title: "Export",
    desc: "Download DESIGN.md, design tokens, and Tailwind config for your repo.",
  },
  {
    num: "03",
    title: "Point your agent",
    desc: "Drop them in your project and let your AI agent match your design system.",
  },
];
```

and

```tsx
      <div className="work-head">
        <span className="home-eyebrow">
          <span>Design Intelligence</span>
        </span>
        <h2 className="work-title">
          From URL to design system in minutes
        </h2>
      </div>
```

Also update the doc comment (line 19-21) to:
```tsx
/**
 * Section « How it works » — 3 étapes Extract / Export / Point your agent.
 */
```

- [ ] **Step 2: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/WorkflowSection.tsx
git commit -m "feat: workflow section Design Intelligence copy"
```

---

### Task 4: Featured Gallery copy

**Files:**
- Modify: `frontend/components/InspirationGrid.tsx`

**Interfaces:**
- Consumes: same props (`presets`, `designs`, `onDelete`, `onAnalyze`), unchanged.
- Produces: updated gallery eyebrow + title strings.

- [ ] **Step 1: Update gallery header copy**

Replace lines 34-37 in `frontend/components/InspirationGrid.tsx`:

```tsx
        <span className="home-eyebrow">
          <span>Design Oracle</span>
        </span>
        <h2 className="home-gallery-title">Hand-picked design systems</h2>
```

- [ ] **Step 2: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/InspirationGrid.tsx
git commit -m "feat: gallery Design Oracle eyebrow and title"
```

---

### Task 5: Newsletter + FAQ copy

**Files:**
- Modify: `frontend/components/NewsletterSection.tsx`
- Modify: `frontend/components/FaqSection.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: updated copy strings (structure, state, and behavior unchanged).

- [ ] **Step 1: Update `NewsletterSection.tsx` title + desc**

Replace lines 21-27 with:

```tsx
        <h2 className="news-title">
          First access to{" "}
          <span>agent-ready design extraction</span>
        </h2>
        <p className="news-desc">
          Join the waitlist for private access and early experiments.
        </p>
```

- [ ] **Step 2: Update `FaqSection.tsx` answers**

Replace the `FAQS` array (lines 7-28) with:

```tsx
const FAQS = [
  {
    q: "What is a DESIGN.md?",
    a: "A Markdown file describing a website's design system — colors, typography, components, spacing, and layout — so an AI coding agent can match your app's visual style.",
  },
  {
    q: "Which sites can I analyze?",
    a: "Any live website URL. Awwwards and SiteInspire gallery pages are auto-resolved to the real site; Behance, Dribbble, Mobbin, and Designspiration links show a guide.",
  },
  {
    q: "Is Design Oracle free?",
    a: "The first analyses each week are free — the badge under the search bar shows where you stand.",
  },
  {
    q: "Which AI coding agents does it work with?",
    a: "Anything that reads a file — opencode, Codex, Cursor, and more. Export the DESIGN.md and point your agent at it.",
  },
  {
    q: "How are design tokens generated?",
    a: "Colors, typography, spacing, and component styles are extracted and written as Tailwind config and design tokens.",
  },
];
```

- [ ] **Step 3: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/NewsletterSection.tsx frontend/components/FaqSection.tsx
git commit -m "feat: newsletter and FAQ Design Intelligence copy"
```

---

### Task 6: Topbar background

**Files:**
- Modify: `frontend/components/Topbar.tsx`

**Interfaces:**
- Consumes: nothing (presentational).
- Produces: `bg-[#0B0F19]/70` instead of `bg-[#080808]/70`.

- [ ] **Step 1: Update Topbar background**

In `frontend/components/Topbar.tsx`, replace `"border-b border-white/[0.08] bg-[#080808]/70 backdrop-blur-xl"` with:

```tsx
        "border-b border-white/[0.08] bg-[#0B0F19]/70 backdrop-blur-xl"
```

- [ ] **Step 2: Run lint**

Run (from `frontend/`): `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/Topbar.tsx
git commit -m "feat: topbar night-blue background"
```

---

### Task 7: Full build + verification

**Files:** none (verification only)

- [ ] **Step 1: Run backend tests (unchanged)**

Run (from repo root): `python -m unittest discover -s tests`
Expected: `Ran 12 tests ... OK`.

- [ ] **Step 2: Run full build**

Run (from `frontend/`): `npm run build`
Expected: `✓ Compiled successfully` — `/` route listed as `○ (Static) prerendered as static content`.

- [ ] **Step 3: Verify built CSS**

Run (from `frontend/`): `grep -o "background:#0b0f19" .next/static/css/*.css`
Expected: match found (night-blue on `.home-shell`). Also `grep -o "8B5CF6" .next/static/css/*.css` finds the violet gradient.

- [ ] **Step 4: Rebuild + restart the frontend container**

Run (from repo root):
```bash
podman compose up -d --build frontend
```
Then verify `http://localhost:3000` returns 200.

- [ ] **Step 5: Manual UI verification**

At `http://localhost:3000`:
1. Landing background is night-blue `#0B0F19` (not near-black).
2. Badge: "Design Intelligence". Title: "Extract the design system behind any website" with "design system" in violet gradient.
3. Search bar: placeholder "https://linear.app", violet gradient round button with "→".
4. Quota: "3 free analyses / week" with violet dots.
5. Workflow: eyebrow "Design Intelligence", heading "From URL to design system in minutes", steps Extract / Export / Point your agent.
6. Gallery: eyebrow "Design Oracle", title "Hand-picked design systems".
7. Newsletter: "First access to agent-ready design extraction"; success state on submit.
8. FAQ: answers updated; accordion works.
9. No design-extractor phrases remain ("Built for AI coding agents", "Paste paypal.com", "3 / 3 free this week", "Something big is brewing").
10. `/analysis` and `/dashboard` visually unchanged.

- [ ] **Step 6: Confirm git status clean**

Run: `git status --short`
Expected: no unexpected untracked/modified files.
