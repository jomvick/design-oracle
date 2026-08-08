# Design Extractor-style Landing Redesign

**Date:** 2026-08-08
**Status:** Approved
**Scope:** Landing page (`/`) + `Topbar` only. `/analysis`, `/dashboard`, and the rest of the app keep their current styling.

## 1. Goal

Restyle the Design Oracle landing page to the visual standard of design-extractor.com — a dark, sleek, AI-agent-oriented presentation. The landing becomes a marketing surface that leads with the **DESIGN.md** format and its use by AI coding agents, while preserving the existing inspiration grid as the "Featured Gallery".

## 2. Message & Content Decisions (approved)

- **Pivot DESIGN.md:** primary headline is "Get a DESIGN.md from any website". Subtitle: "Paste a URL to extract a design system. Get a DESIGN.md plus Tailwind v4 and design tokens for your AI agent."
- **Quota badge is visual only** — a static pill `••• 3 / 3 free this week` under the search bar. No backend, no counter.
- **Newsletter email input is fake** — local success state only, no backend submission.
- **Topbar:** restyled to the dark palette, no new nav links, no theme toggle (dark-only design).
- **Portée:** landing + Topbar only. Other routes untouched.

## 3. Visual System

- **Background:** near-black `#080808` for the landing. Fine grid overlay (80px cells, `rgba(255,255,255,0.03)` lines) reinforcing the technical/engineering look.
- **Surfaces:** `#0e0e0e` (section), `#111111` (cards), `#121215` (input group). Borders `white/10`, `rounded-2xl`/`rounded-3xl`.
- **Accent:** keep the AI violet `#8B5CF6` for actions; platform badges keep their colors.
- **Typography:** keep the existing font stack; headings use `tracking-tight` + `font-bold`/`extrabold`.
- **SCOPING DECISION:** the near-black background + strengthened grid are applied to the landing only (scoped classes on `.home-shell` / `home-*` components), NOT globally, to keep `/analysis` and `/dashboard` unchanged.

## 4. Landing Structure (top to bottom)

### 4.1 Topbar (restyled)
Keep current `Topbar.tsx` structure (logo + "Design Intelligence" tagline + contextual Home link), restyled to `#080808`-compatible colors.

### 4.2 Hero (`HeroSearch.tsx` restyled, logic unchanged)
- Badge pill: "Built for AI coding agents" (pulsing violet dot). Replaces "Design Intelligence" eyebrow.
- Title: "Get a DESIGN.md from any website" — `DESIGN.md` rendered with a white→gray text gradient.
- Subtitle: as in §2.
- Search bar: pill-shaped (`rounded-full`), dark `#121215`, border `white/10`, placeholder "Paste paypal.com...", round white submit button with "↑" arrow.
- Quota badge: `••• 3 / 3 free this week` (three white dots) below the input — static.
- Platform filters: kept below the quota badge (they belong to the Gallery section visually).
- Logic unchanged: `detectPlatform`, `resolveGalleryUrl`, guide modal for non-resolvable platforms, error states.

### 4.3 Workflow "How it works" (`WorkflowSection.tsx` — NEW)
- Eyebrow: "WORKS WITH YOUR AGENT" (uppercase, letter-spaced).
- Heading: "Drop DESIGN.md into your repo. Your agent does the rest."
- 3 bento cards (`#101014`, border `white/10`, `rounded-2xl`, mono step number top-right):
  1. **01 — Extract any site** — Paste a URL. Get a DESIGN.md with colors, typography, components, and layout specs.
  2. **02 — Save it anywhere** — Drop DESIGN.md directly into your repo root alongside your existing prompt files.
  3. **03 — Point your agent at it** — Tell your AI coding agent to use DESIGN.md as its visual style guide. That's it.
- New CSS classes prefixed `work-*`.

### 4.4 Featured Gallery (existing `InspirationGrid.tsx` restyled)
- New header: eyebrow "FEATURED GALLERY" + title "Explore design systems".
- Existing Inspirations/Récents tabs and the 12-preset grid remain functional, restyled to the dark theme (borders `white/10`, `rounded-2xl`).

### 4.5 Newsletter & FAQ (`NewsletterSection.tsx` / `FaqSection.tsx` — NEW)
- Newsletter: "Something big is brewing" heading + email input + "Join the waitlist" button. Local success state on submit (no backend).
- FAQ: accordion with 4-5 questions, e.g.:
  - What is a DESIGN.md?
  - Which sites can I analyze? (Awwwards/SiteInspire resolution, others)
  - Is Design Oracle free?
  - Which AI coding agents does it work with?
  - How are design tokens generated?

## 5. Architecture

- **No backend changes.** No new API endpoints. The quota badge and newsletter are static/local.
- **Components:**
  - `frontend/components/HeroSearch.tsx` — restyled (JSX text/structure, resolver logic unchanged).
  - `frontend/components/InspirationGrid.tsx` — add section header, restyle.
  - `frontend/components/WorkflowSection.tsx` — NEW, presentational only.
  - `frontend/components/NewsletterSection.tsx` — NEW, local state only.
  - `frontend/components/FaqSection.tsx` — NEW, accordion via local state.
  - `frontend/components/Topbar.tsx` — restyled only.
  - `frontend/app/page.tsx` — compose new sections in order.
  - `frontend/app/globals.css` — palette/scoped dark styles + `work-*`, `news-*`, `faq-*`, `gallery-*` classes.
- **Data flow:** no new data. Presets still come from `inspirations.json`; designs from `getDesigns()`; filter state in `page.tsx` as today.

## 6. Testing

- `npm run lint` clean.
- `npm run build` succeeds; `/` prerenders static.
- Backend unaffected (no changes) — existing `python -m unittest discover -s tests` must still pass.
- Manual: hero renders, filter badges work, workflow/newsletter/FAQ render, accordion toggles, email submit shows success, `/analysis` and `/dashboard` visually unchanged.

## 7. Out of Scope

- Real quota enforcement, auth, billing, newsletters, email sending.
- Theme toggle / light mode.
- Styling changes to `/analysis`, `/dashboard`, or any non-landing page.
- Backend resolver changes (already shipped).
