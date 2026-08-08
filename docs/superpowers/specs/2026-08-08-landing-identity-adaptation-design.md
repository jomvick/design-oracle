# Design Oracle Landing — Identity Adaptation

**Date:** 2026-08-08
**Status:** Approved
**Scope:** Landing page (`/`) + `Topbar` only. `/analysis`, `/dashboard`, and the rest of the app keep their current styling.

## 1. Goal

The previous redesign copied the design-extractor.com direction too literally (near-black `#080808`, white round "↑" button, white→gray DESIGN.md gradient, and its exact marketing copy). This change re-roots the landing in Design Oracle's own identity — the night-blue `#0B0F19` palette, the violet AI accent `#8B5CF6`, and the "Design Intelligence" voice — while keeping the strong section structure (Hero, Workflow, Featured Gallery, Newsletter, FAQ) already in place.

## 2. Identity Decisions (approved)

- **Background:** night-blue `#0B0F19` (our root palette, scoped to the landing). NOT the extractor near-black.
- **Search button:** violet gradient (`#7c3aed → #4f46e5`) with arrow, matching our other CTAs. NOT the white circle.
- **DESIGN.md gradient in title:** violet IA gradient (`#8B5CF6 → #6366F1`). NOT white→gray.
- **Copy language:** English, rewritten in our tone. No verbatim design-extractor phrases.
- **Quota badge + Newsletter:** kept, but rephrased in our voice.
- **Structure preserved:** Hero, Workflow (3 steps), Featured Gallery, Newsletter, FAQ all stay as-is layout-wise.

## 3. Visual System (adapted)

- **Background:** `.home-shell` → `#0B0F19`. Grid overlay stays but dimmed to `rgba(255,255,255,0.02)` (subtle, engineering feel without the extractor contrast).
- **Surfaces:** cards (`home-insp-card`, `work-card`, `news-card`, `faq-item`) → `#12161F`, borders `rgba(255,255,255,0.07)`, matching the app's existing surface language (`--card:#12161F`).
- **Input group:** `#0D1117` background (our `--surface`), thin border.
- **Topbar:** `bg-[#0B0F19]/70` (revert from `#080808`).
- **Accent:** violet `#8B5CF6` for the badge dot, DESIGN.md gradient, CTA button, quota dots.
- **Typography:** unchanged font stack; headings keep `tracking-tight` + heavy weight.

## 4. Copy Rewrites (exact strings)

### 4.1 Hero
- Badge: **"Design Intelligence"** (pulsing violet dot). Replaces "Built for AI coding agents".
- Title: **"Extract the design system behind any website"** — the word pair is not gradient-only; apply violet gradient to **"design system"**.
  - Rendering: `Extract the <span class="home-title-gradient">design system</span> behind any website`
- Subtitle: **"Colors, typography, components, and UX patterns — extracted into a DESIGN.md your AI agent can follow."**
- Placeholder: **"https://linear.app"** (our original example). Replaces "Paste paypal.com...".
- Quota: **"3 free analyses / week"** with 3 violet dots. Replaces "3 / 3 free this week".

### 4.2 Workflow
- Eyebrow: **"DESIGN INTELLIGENCE"**.
- Heading: **"From URL to design system in minutes"**.
- Steps (same 01/02/03 structure, rewritten):
  1. **01 — Extract** — Paste a URL. We pull colors, typography, components, and layout specs into a DESIGN.md.
  2. **02 — Export** — Download DESIGN.md, design tokens, and Tailwind config for your repo.
  3. **03 — Point your agent** — Drop them in your project and let your AI agent match your design system.

### 4.3 Featured Gallery
- Eyebrow: **"DESIGN ORACLE"**.
- Title: **"Hand-picked design systems"**.

### 4.4 Newsletter
- Title: **"First access to agent-ready design extraction"**.
- Desc: **"Join the waitlist for private access and early experiments."**
- Button: **"Join the waitlist"** (keep).
- Success: **"You're on the list. We'll be in touch."** (keep).

### 4.5 FAQ
Rewrite the five answers to match our tone (same questions as now, lightly rephrased answers):
- Q1 What is a DESIGN.md? — "A Markdown file describing a website's design system — colors, typography, components, spacing, and layout — so an AI coding agent can match your app's visual style."
- Q2 Which sites can I analyze? — "Any live website URL. Awwwards and SiteInspire gallery pages are auto-resolved to the real site; Behance, Dribbble, Mobbin, and Designspiration links show a guide."
- Q3 Is Design Oracle free? — "The first analyses each week are free — the badge under the search bar shows where you stand."
- Q4 Which AI coding agents does it work with? — "Anything that reads a file — opencode, Codex, Cursor, and more. Export the DESIGN.md and point your agent at it."
- Q5 How are design tokens generated? — "Colors, typography, spacing, and component styles are extracted and written as Tailwind config and design tokens."

## 5. Architecture

- No backend changes. No new API endpoints. Quota and newsletter remain static/local.
- Files modified (all in `frontend/`):
  - `app/globals.css` — landing-scoped palette overrides (background, surfaces, grid opacity, gradients, input, button, quota dots).
  - `components/HeroSearch.tsx` — badge text, title, subtitle, placeholder, quota text; button becomes violet gradient with arrow.
  - `components/WorkflowSection.tsx` — eyebrow, heading, step copy.
  - `components/InspirationGrid.tsx` — gallery eyebrow + title copy.
  - `components/NewsletterSection.tsx` — title + desc copy.
  - `components/FaqSection.tsx` — answer copy.
  - `components/Topbar.tsx` — `#080808` → `#0B0F19` background.
- CSS approach: append scoped overrides at the end of `globals.css` (later rules win over the extractor-styled rules), consistent with the previous tasks' pattern. Reuse existing class names (`home-*`, `work-*`, `news-*`, `faq-*`).

## 6. Testing

- `npm run lint` clean.
- `npm run build` succeeds; `/` prerenders static.
- Backend unchanged — `python -m unittest discover -s tests` still passes.
- Manual: hero badge/title/subtitle/placeholder/quota updated; button violet; DESIGN.md gradient violet; workflow/gallery/newsletter/FAQ copy updated; background `#0B0F19`; `/analysis` and `/dashboard` unchanged.

## 7. Out of Scope

- Any structural/layout change to the landing sections.
- Real quota enforcement, auth, billing, newsletters.
- Theme toggle / light mode.
- Changes to `/analysis`, `/dashboard`, or the backend.
