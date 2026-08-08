# Inspiration Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the home dashboard into an inspiration entry point — gallery-URL resolution (Awwwards/SiteInspire), a platform filter bar, and a 12-card inspiration grid with one-click analysis — while reusing the existing Playwright/FastAPI pipeline unchanged.

**Architecture:** A new backend endpoint `POST /api/resolve` classifies pasted URLs by platform and (for Awwwards/SiteInspire) extracts the real site URL via `httpx` + `BeautifulSoup`. The frontend gets four new components (`HeroSearch`, `InspirationFilter`, `InspirationGrid`, `InspirationCard`), a static `inspirations.json` (12 presets), and a `urlResolver.ts` helper. Non-resolvable gallery links (Behance/Dribbble/Mobbin/Designspiration) show an explanatory modal.

**Tech Stack:** FastAPI, httpx, BeautifulSoup4 (backend — all already in `backend/requirements.txt`); Next.js 15 App Router, React 19, Tailwind v4, Framer Motion v12 (frontend — all already installed).

## Global Constraints

- Backend deps: `httpx>=0.28`, `beautifulsoup4==4.*` (already pinned in `backend/requirements.txt`). Do not add new deps.
- Frontend deps: `framer-motion@^12.6.0`, `lucide-react` (already in `frontend/package.json`). Do not add new deps.
- The analysis pipeline (`backend/analyzer/core.py`, `backend/worker.py`) must NOT be modified.
- No test runner exists for frontend; frontend tasks verify with `npm run lint` (per task) and `npm run build` (final task).
- Backend tests use `unittest` (stdlib) — no pytest dependency.
- `frontend/public/` must exist with a `.gitkeep` (already created) or the Docker build's `COPY --from=builder /app/public` fails.
- The 6 platform keys (used across backend, frontend, and JSON) are: `awwwards`, `siteinspire`, `mobbin`, `behance`, `dribbble`, `designspiration`.
- Resolvable gallery platforms: `awwwards`, `siteinspire`. Non-resolvable: `mobbin`, `behance`, `dribbble`, `designspiration`. Everything else: `unknown` (analyzed directly).
- Copy text must stay in French for the resolve hints/modal (matches existing app copy).

---

### Task 1: Backend resolver + endpoint + tests

**Files:**
- Create: `backend/resolver.py`
- Modify: `backend/server.py` (import + endpoint after `api_analyze`)
- Create: `tests/test_resolve.py`
- Create: `tests/__init__.py` (empty, so `unittest discover` finds the module)
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `classify_url(url: str) -> tuple[str, bool]` — returns `(platform_key, resolvable)`
- Produces: `resolve_url(url: str) -> dict` — returns one of:
  - `{"platform": str, "resolvable": True, "target_url": str}`
  - `{"platform": str, "resolvable": False}`
  - `{"platform": str, "resolvable": False, "message": str}`
- Produces: `POST /api/resolve` accepting `{ "url": str }`, returning the `resolve_url` dict (400 on missing/invalid URL).

- [ ] **Step 1: Write the failing tests**

`tests/__init__.py`:
```python
```
(empty file)

`tests/test_resolve.py`:
```python
import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from backend.resolver import classify_url, resolve_url


def run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


class TestClassifyUrl(unittest.TestCase):
    def test_awwwards_resolvable(self):
        platform, resolvable = classify_url("https://www.awwwards.com/sites/stripe-press")
        self.assertEqual(platform, "awwwards")
        self.assertTrue(resolvable)

    def test_siteinspire_resolvable(self):
        platform, resolvable = classify_url("https://www.siteinspire.com/websites/1234")
        self.assertEqual(platform, "siteinspire")
        self.assertTrue(resolvable)

    def test_behance_not_resolvable(self):
        platform, resolvable = classify_url("https://www.behance.net/gallery/12345/Foo")
        self.assertEqual(platform, "behance")
        self.assertFalse(resolvable)

    def test_dribbble_not_resolvable(self):
        platform, resolvable = classify_url("https://dribbble.com/shots/12345-Foo")
        self.assertEqual(platform, "dribbble")
        self.assertFalse(resolvable)

    def test_mobbin_not_resolvable(self):
        platform, resolvable = classify_url("https://mobbin.com/apps/airbnb/ios")
        self.assertEqual(platform, "mobbin")
        self.assertFalse(resolvable)

    def test_designspiration_not_resolvable(self):
        platform, resolvable = classify_url("https://www.designspiration.net/search/palettes")
        self.assertEqual(platform, "designspiration")
        self.assertFalse(resolvable)

    def test_unknown_url(self):
        platform, resolvable = classify_url("https://stripe.com")
        self.assertEqual(platform, "unknown")
        self.assertTrue(resolvable)


class TestResolveUrl(unittest.TestCase):
    def test_unknown_returns_self_as_target(self):
        result = run(resolve_url("https://stripe.com"))
        self.assertEqual(
            result,
            {"platform": "unknown", "resolvable": True, "target_url": "https://stripe.com"},
        )

    def test_behance_not_resolvable(self):
        result = run(resolve_url("https://www.behance.net/gallery/12345/Foo"))
        self.assertEqual(result, {"platform": "behance", "resolvable": False})

    @patch("backend.resolver.httpx.AsyncClient")
    def test_awwwards_extracts_visit_site_link(self, MockClient):
        html = '<html><body><a class="btn" href="https://press.stripe.com">Visit Site</a></body></html>'
        resp = MagicMock()
        resp.text = html
        resp.url = "https://www.awwwards.com/sites/stripe-press"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        MockClient.return_value = client

        result = run(resolve_url("https://www.awwwards.com/sites/stripe-press"))
        self.assertTrue(result["resolvable"])
        self.assertEqual(result["target_url"], "https://press.stripe.com")

    @patch("backend.resolver.httpx.AsyncClient")
    def test_network_error_returns_not_resolvable(self, MockClient):
        client = AsyncMock()
        client.get.side_effect = httpx.ConnectError("boom")
        client.__aenter__.return_value = client
        MockClient.return_value = client

        result = run(resolve_url("https://www.awwwards.com/sites/foo"))
        self.assertFalse(result["resolvable"])
        self.assertEqual(result["platform"], "awwwards")

    @patch("backend.resolver.httpx.AsyncClient")
    def test_no_external_link_returns_not_resolvable(self, MockClient):
        html = "<html><body><h1>Project</h1></body></html>"
        resp = MagicMock()
        resp.text = html
        resp.url = "https://www.awwwards.com/sites/foo"
        client = AsyncMock()
        client.get.return_value = resp
        client.__aenter__.return_value = client
        MockClient.return_value = client

        result = run(resolve_url("https://www.awwwards.com/sites/foo"))
        self.assertFalse(result["resolvable"])


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `python -m unittest discover -s tests -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'backend.resolver'`

- [ ] **Step 3: Write `backend/resolver.py`**

```python
import logging
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

GALLERY_PLATFORMS = {
    "awwwards": {"host": "awwwards.com", "path": "/sites/", "resolvable": True},
    "siteinspire": {"host": "siteinspire.com", "path": "/websites/", "resolvable": True},
    "behance": {"host": "behance.net", "path": "/gallery/", "resolvable": False},
    "dribbble": {"host": "dribbble.com", "path": "/shots/", "resolvable": False},
    "mobbin": {"host": "mobbin.com", "path": "", "resolvable": False},
    "designspiration": {"host": "designspiration.net", "path": "", "resolvable": False},
}

VISIT_LABELS = ("visit site", "live site", "view website", "launch site")

RESOLVE_TIMEOUT = 10.0


def classify_url(url: str) -> tuple[str, bool]:
    """Return (platform_key, resolvable). 'unknown' platforms are analyzed directly."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().replace("www.", "")
    for platform, cfg in GALLERY_PLATFORMS.items():
        if host == cfg["host"] or host.endswith("." + cfg["host"]):
            if not cfg["path"] or cfg["path"] in parsed.path.lower():
                return platform, cfg["resolvable"]
    return "unknown", True


def _extract_target(soup, base_url: str):
    """Extract the real site URL from a gallery page, by priority. Returns str or None."""
    gallery_host = (urlparse(base_url).hostname or "").lower()

    # 1. Anchor whose text / aria-label / class mentions a visit label
    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True).lower()
        aria = (a.get("aria-label") or "").lower()
        classes = " ".join(a.get("class") or []).lower()
        haystack = f"{text} {aria} {classes}"
        if any(label in haystack for label in VISIT_LABELS):
            href = urljoin(base_url, a["href"])
            host = (urlparse(href).hostname or "").lower()
            if host and host != gallery_host:
                return href

    # 2. First external anchor
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        host = (urlparse(href).hostname or "").lower()
        if host and host != gallery_host:
            return href

    # 3. Canonical link with a different domain
    canonical = soup.find("link", rel="canonical")
    if canonical and canonical.get("href"):
        href = urljoin(base_url, canonical["href"])
        host = (urlparse(href).hostname or "").lower()
        if host and host != gallery_host:
            return href

    return None


async def resolve_url(url: str) -> dict:
    platform, resolvable = classify_url(url)
    if not resolvable:
        return {"platform": platform, "resolvable": False}
    if platform == "unknown":
        return {"platform": platform, "resolvable": True, "target_url": url}

    try:
        async with httpx.AsyncClient(timeout=RESOLVE_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        target = _extract_target(soup, str(resp.url))
        if target:
            return {"platform": platform, "resolvable": True, "target_url": target}
        return {"platform": platform, "resolvable": False}
    except Exception as e:
        logger.warning("Resolve failed for %s: %s", url, e)
        return {"platform": platform, "resolvable": False, "message": "Résolution impossible"}
```

- [ ] **Step 4: Add the endpoint to `backend/server.py`**

Insert after the `api_analyze` route (line 227). Also add the import at the top of the file.

Import (after line 27, next to the other `from backend...` imports):
```python
from backend.resolver import resolve_url
```

Endpoint (insert after the `api_analyze` function, i.e. after line 227):
```python
@app.post("/api/resolve")
async def api_resolve(payload: AnalyzePayload):
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL manquante")
    if not is_safe_url(url):
        raise HTTPException(status_code=400, detail="URL invalide ou non autorisée")
    return await resolve_url(url)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `python -m unittest discover -s tests -v`
Expected: PASS — all test cases green.

- [ ] **Step 6: Update CI to run backend tests**

Modify `.github/workflows/ci.yml` — in the `backend` job, add a test step after the install step (before the import check):
```yaml
      - run: python -m unittest discover -s tests
```

- [ ] **Step 7: Verify the endpoint with a live check**

Run:
```bash
python -c "from backend.server import app; print('server imports OK')"
```
Expected: `server imports OK`

- [ ] **Step 8: Commit**

```bash
git add backend/resolver.py backend/server.py tests/test_resolve.py tests/__init__.py .github/workflows/ci.yml
git commit -m "feat: add /api/resolve gallery URL resolver"
```

---

### Task 2: Frontend data layer — types, inspirations.json, urlResolver.ts

**Files:**
- Modify: `frontend/lib/types.ts`
- Create: `frontend/lib/inspirations.json`
- Create: `frontend/lib/urlResolver.ts`

**Interfaces:**
- Produces: `InspirationPreset` type (consumed by `InspirationCard`, `InspirationGrid`, `page.tsx`)
- Produces: `ResolveResult` type (consumed by `HeroSearch`)
- Produces: `PlatformKey` type (consumed by `InspirationFilter`, `page.tsx`)
- Produces: `PLATFORM_META` map (consumed by `InspirationFilter`, `InspirationCard`)
- Produces: `detectPlatform(url: string): PlatformKey | "unknown"` (consumed by `HeroSearch`)
- Produces: `resolveGalleryUrl(url: string): Promise<ResolveResult>` (consumed by `HeroSearch`)

- [ ] **Step 1: Add types to `frontend/lib/types.ts`**

Append at the end of the file:
```ts
export type PlatformKey =
  | "awwwards"
  | "siteinspire"
  | "mobbin"
  | "behance"
  | "dribbble"
  | "designspiration";

export interface InspirationPreset {
  id: string;
  title: string;
  category: string;
  target_url: string;
  gallery_url: string;
  source_platform: PlatformKey;
  preview_image: string;
  fallback_image: string;
  tags: string[];
}

export interface ResolveResult {
  platform: string;
  resolvable: boolean;
  target_url?: string;
  message?: string;
}
```

- [ ] **Step 2: Create `frontend/lib/inspirations.json`**

12 presets (2 per platform). `preview_image` uses the WordPress mShot service (stable, renders the real site); swap these for platform CDN URLs later if desired — the `fallback_image` swap chain in the card handles failures.
```json
[
  {
    "id": "stripe-press",
    "title": "Stripe Press",
    "category": "SaaS / Editorial",
    "target_url": "https://press.stripe.com",
    "gallery_url": "https://www.awwwards.com/sites/stripe-press",
    "source_platform": "awwwards",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fpress.stripe.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fpress.stripe.com?w=400&h=300",
    "tags": ["Minimal", "Typography", "Dark"]
  },
  {
    "id": "linear",
    "title": "Linear",
    "category": "SaaS / Product",
    "target_url": "https://linear.app",
    "gallery_url": "https://www.awwwards.com/sites/linear",
    "source_platform": "awwwards",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Flinear.app?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Flinear.app?w=400&h=300",
    "tags": ["Dark Mode", "SaaS", "Clean"]
  },
  {
    "id": "vercel",
    "title": "Vercel",
    "category": "Developer Tools",
    "target_url": "https://vercel.com",
    "gallery_url": "https://www.siteinspire.com/websites/6249-vercel",
    "source_platform": "siteinspire",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fvercel.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fvercel.com?w=400&h=300",
    "tags": ["Developer", "Minimal", "Branding"]
  },
  {
    "id": "raycast",
    "title": "Raycast",
    "category": "Developer Tools",
    "target_url": "https://www.raycast.com",
    "gallery_url": "https://www.siteinspire.com/websites/raycast",
    "source_platform": "siteinspire",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.raycast.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.raycast.com?w=400&h=300",
    "tags": ["Dark Mode", "SaaS", "Clean"]
  },
  {
    "id": "airbnb",
    "title": "Airbnb",
    "category": "Marketplace / Mobile",
    "target_url": "https://www.airbnb.com",
    "gallery_url": "https://mobbin.com/apps/airbnb",
    "source_platform": "mobbin",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.airbnb.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.airbnb.com?w=400&h=300",
    "tags": ["Marketplace", "Mobile", "UX"]
  },
  {
    "id": "spotify",
    "title": "Spotify",
    "category": "Entertainment / Mobile",
    "target_url": "https://open.spotify.com",
    "gallery_url": "https://mobbin.com/apps/spotify",
    "source_platform": "mobbin",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fopen.spotify.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fopen.spotify.com?w=400&h=300",
    "tags": ["Dark Mode", "Mobile", "Playlists"]
  },
  {
    "id": "figma",
    "title": "Figma",
    "category": "Design Tools",
    "target_url": "https://www.figma.com",
    "gallery_url": "https://www.behance.net/gallery/figma-design-tool",
    "source_platform": "behance",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.figma.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.figma.com?w=400&h=300",
    "tags": ["Collaboration", "SaaS", "Design"]
  },
  {
    "id": "notion",
    "title": "Notion",
    "category": "Productivity",
    "target_url": "https://www.notion.so",
    "gallery_url": "https://www.behance.net/gallery/notion-brand",
    "source_platform": "behance",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.notion.so?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.notion.so?w=400&h=300",
    "tags": ["Productivity", "Minimal", "Branding"]
  },
  {
    "id": "framer",
    "title": "Framer",
    "category": "Design Tools",
    "target_url": "https://www.framer.com",
    "gallery_url": "https://dribbble.com/shots/framer-website",
    "source_platform": "dribbble",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.framer.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.framer.com?w=400&h=300",
    "tags": ["Interactive", "SaaS", "Motion"]
  },
  {
    "id": "loom",
    "title": "Loom",
    "category": "Productivity / Video",
    "target_url": "https://www.loom.com",
    "gallery_url": "https://dribbble.com/shots/loom-website",
    "source_platform": "dribbble",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.loom.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.loom.com?w=400&h=300",
    "tags": ["Video", "SaaS", "Clean"]
  },
  {
    "id": "apple",
    "title": "Apple",
    "category": "Consumer / Branding",
    "target_url": "https://www.apple.com",
    "gallery_url": "https://www.designspiration.net/search/apple-brand",
    "source_platform": "designspiration",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.apple.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.apple.com?w=400&h=300",
    "tags": ["Minimal", "E-commerce", "Premium"]
  },
  {
    "id": "openai",
    "title": "OpenAI",
    "category": "AI / Branding",
    "target_url": "https://openai.com",
    "gallery_url": "https://www.designspiration.net/search/openai",
    "source_platform": "designspiration",
    "preview_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fopenai.com?w=800&h=600",
    "fallback_image": "https://s0.wp.com/mshots/v1/https%3A%2F%2Fopenai.com?w=400&h=300",
    "tags": ["AI", "Minimal", "Typography"]
  }
]
```

- [ ] **Step 3: Create `frontend/lib/urlResolver.ts`**

```ts
import type { PlatformKey, ResolveResult } from "./types";

export const PLATFORM_META: Record<PlatformKey, { label: string; tagline: string }> = {
  awwwards: { label: "Awwwards", tagline: "Sites web ultra-créatifs & interactifs" },
  mobbin: { label: "Mobbin", tagline: "UI/UX Apps Web & Mobile" },
  siteinspire: { label: "SiteInspire", tagline: "Design minimaliste & épuré" },
  behance: { label: "Behance", tagline: "Études de cas complètes & branding" },
  dribbble: { label: "Dribbble", tagline: "Concepts visuels & animations" },
  designspiration: {
    label: "Designspiration",
    tagline: "Recherche par palettes de couleurs",
  },
};

export function detectPlatform(url: string): PlatformKey | "unknown" {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.endsWith("awwwards.com") && path.includes("/sites/")) return "awwwards";
    if (host.endsWith("siteinspire.com") && path.includes("/websites/")) return "siteinspire";
    if (host.endsWith("behance.net") && path.includes("/gallery/")) return "behance";
    if (host.endsWith("dribbble.com") && path.includes("/shots/")) return "dribbble";
    if (host.endsWith("mobbin.com")) return "mobbin";
    if (host.endsWith("designspiration.net") || host.endsWith("designspiration.com")) {
      return "designspiration";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function resolveGalleryUrl(url: string): Promise<ResolveResult> {
  const res = await fetch("/api/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    return {
      platform: detectPlatform(url),
      resolvable: false,
      message: "Résolution impossible, vérifie l'URL",
    };
  }
  return res.json();
}
```

- [ ] **Step 4: Verify with lint**

Run (from `frontend/`): `npm run lint`
Expected: PASS — no lint errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/types.ts frontend/lib/inspirations.json frontend/lib/urlResolver.ts
git commit -m "feat: add inspiration presets and URL resolver helper"
```

---

### Task 3: InspirationFilter component

**Files:**
- Create: `frontend/components/InspirationFilter.tsx`

**Interfaces:**
- Consumes: `PLATFORM_META` from `@/lib/urlResolver`, `PlatformKey` from `@/lib/types`
- Produces: `export type FilterValue = "all" | PlatformKey`
- Produces: `InspirationFilter` with props `{ active: FilterValue; onChange: (value: FilterValue) => void }` (consumed by `HeroSearch` and `page.tsx`)

- [ ] **Step 1: Write the component**

`frontend/components/InspirationFilter.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { PLATFORM_META } from "@/lib/urlResolver";
import type { PlatformKey } from "@/lib/types";
import { cn } from "@/lib/cn";

export type FilterValue = "all" | PlatformKey;

interface InspirationFilterProps {
  active: FilterValue;
  onChange: (value: FilterValue) => void;
}

const ORDER: PlatformKey[] = [
  "awwwards",
  "mobbin",
  "siteinspire",
  "behance",
  "dribbble",
  "designspiration",
];

/**
 * Rangée de badges plateformes — filtre la grille d'inspiration.
 */
export default function InspirationFilter({ active, onChange }: InspirationFilterProps) {
  return (
    <div className="home-filter">
      <button
        type="button"
        className={cn("home-filter-badge", active === "all" && "is-active")}
        onClick={() => onChange("all")}
      >
        <span className="home-filter-dot" />
        All
      </button>

      {ORDER.map((key) => (
        <button
          key={key}
          type="button"
          className={cn("home-filter-badge", active === key && "is-active")}
          onClick={() => onChange(key)}
          title={PLATFORM_META[key].tagline}
        >
          <motion.span
            className="home-filter-dot"
            layoutId={key === active ? "filter-dot" : undefined}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          />
          {PLATFORM_META[key].label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify with lint**

Run (from `frontend/`): `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/InspirationFilter.tsx
git commit -m "feat: add InspirationFilter platform badges"
```

---

### Task 4: InspirationCard component

**Files:**
- Create: `frontend/components/InspirationCard.tsx`

**Interfaces:**
- Consumes: `InspirationPreset` from `@/lib/types`, `PLATFORM_META` from `@/lib/urlResolver`
- Produces: `InspirationCard` with props `{ preset: InspirationPreset; onAnalyze: (url: string) => void }` (consumed by `InspirationGrid`)

- [ ] **Step 1: Write the component**

`frontend/components/InspirationCard.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { InspirationPreset } from "@/lib/types";
import { PLATFORM_META } from "@/lib/urlResolver";
import { cn } from "@/lib/cn";

interface InspirationCardProps {
  preset: InspirationPreset;
  onAnalyze: (url: string) => void;
}

/**
 * Carte preset — miniature avec fallback d'image en cascade, tag plateforme,
 * titre/catégorie, tags et CTA d'analyse en 1-clic.
 */
export default function InspirationCard({ preset, onAnalyze }: InspirationCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const sources = [preset.preview_image, preset.fallback_image];
  const showPlaceholder = imgIdx >= sources.length;
  const platform = PLATFORM_META[preset.source_platform];

  return (
    <article className="home-insp-card">
      <div className="home-insp-media">
        {showPlaceholder ? (
          <div className="home-insp-placeholder">
            <Sparkles size={22} strokeWidth={1.25} />
            <span>{preset.title}</span>
          </div>
        ) : (
          <img
            src={sources[imgIdx]}
            alt={`${preset.title} — ${platform.label}`}
            loading="lazy"
            onError={() => setImgIdx((i) => i + 1)}
            className="home-insp-img"
          />
        )}

        <span className={cn("home-insp-platform", `platform-${preset.source_platform}`)}>
          {platform.label}
        </span>
      </div>

      <div className="home-insp-body">
        <h3 className="home-insp-title">{preset.title}</h3>
        <p className="home-insp-category">{preset.category}</p>

        <div className="home-insp-tags">
          {preset.tags.map((tag) => (
            <span key={tag} className="home-insp-tag">
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          className="home-insp-cta"
          onClick={() => onAnalyze(preset.target_url)}
        >
          Analyser le Design System
        </button>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify with lint**

Run (from `frontend/`): `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/InspirationCard.tsx
git commit -m "feat: add InspirationCard preset card"
```

---

### Task 5: InspirationGrid component

**Files:**
- Create: `frontend/components/InspirationGrid.tsx`

**Interfaces:**
- Consumes: `InspirationPreset`, `DesignSummary` from `@/lib/types`, `InspirationCard`, `HistoryList`
- Produces: `InspirationGrid` with props `{ presets: InspirationPreset[]; designs: DesignSummary[]; onDelete: (id: string) => void; onAnalyze: (url: string) => void }` (consumed by `page.tsx`)

- [ ] **Step 1: Write the component**

`frontend/components/InspirationGrid.tsx`:
```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { DesignSummary, InspirationPreset } from "@/lib/types";
import InspirationCard from "@/components/InspirationCard";
import HistoryList from "@/components/HistoryList";
import { cn } from "@/lib/cn";

type Tab = "inspirations" | "recent";

interface InspirationGridProps {
  presets: InspirationPreset[];
  designs: DesignSummary[];
  onDelete: (id: string) => void;
  onAnalyze: (url: string) => void;
}

/**
 * Zone de contenu sous le hero — onglets [ Inspirations | Récents ].
 * La grille filtre/ref-low ses cartes via Framer Motion.
 */
export default function InspirationGrid({
  presets,
  designs,
  onDelete,
  onAnalyze,
}: InspirationGridProps) {
  const [tab, setTab] = useState<Tab>("inspirations");

  return (
    <section className="home-insp">
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

      {tab === "recent" ? (
        <HistoryList designs={designs} onDelete={onDelete} />
      ) : (
        <motion.div layout className="home-grid">
          <AnimatePresence mode="popLayout">
            {presets.map((preset) => (
              <motion.div
                key={preset.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <InspirationCard preset={preset} onAnalyze={onAnalyze} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify with lint**

Run (from `frontend/`): `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/InspirationGrid.tsx
git commit -m "feat: add InspirationGrid with tabs and animated grid"
```

---

### Task 6: HeroSearch component

**Files:**
- Create: `frontend/components/HeroSearch.tsx`
- Delete (replaced): `frontend/components/HeroInput.tsx` — only after `page.tsx` no longer imports it (Task 7)

**Interfaces:**
- Consumes: `detectPlatform`, `resolveGalleryUrl`, `PLATFORM_META` from `@/lib/urlResolver`; `AiGlow`, `InspirationFilter` and its `FilterValue` type
- Produces: `HeroSearch` with props `{ onAnalyze: (url: string) => void; loading?: boolean; filter: FilterValue; onFilterChange: (value: FilterValue) => void }` (consumed by `page.tsx`)

- [ ] **Step 1: Write the component**

`frontend/components/HeroSearch.tsx`:
```tsx
"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import AiGlow from "@/components/ui/AiGlow";
import InspirationFilter, { type FilterValue } from "@/components/InspirationFilter";
import { detectPlatform, resolveGalleryUrl } from "@/lib/urlResolver";
import { cn } from "@/lib/cn";

interface HeroSearchProps {
  onAnalyze: (url: string) => void;
  loading?: boolean;
  filter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
}

const NON_RESOLVABLE = new Set(["behance", "dribbble", "mobbin", "designspiration"]);

/**
 * Barre de recherche principale — détecte la plateforme collée, résout les
 * galeries Awwwards/SiteInspire, guide l'utilisateur pour les autres.
 */
export default function HeroSearch({
  onAnalyze,
  loading,
  filter,
  onFilterChange,
}: HeroSearchProps) {
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const submit = async () => {
    const trimmed = url.trim();
    if (!trimmed || loading || resolving) return;
    setError("");

    const platform = detectPlatform(trimmed);
    if (platform === "unknown") {
      onAnalyze(trimmed);
      return;
    }

    if (NON_RESOLVABLE.has(platform)) {
      setShowGuide(true);
      return;
    }

    setResolving(true);
    try {
      const result = await resolveGalleryUrl(trimmed);
      if (result.resolvable && result.target_url) {
        onAnalyze(result.target_url);
      } else {
        setError(result.message || "Résolution impossible, vérifie l'URL");
      }
    } catch {
      setError("Résolution impossible, vérifie l'URL");
    } finally {
      setResolving(false);
    }
  };

  return (
    <section className="home-hero">
      <AiGlow active={focused} intensity="medium" className="home-glow" />

      <div className="home-hero-card">
        <div className="home-eyebrow">
          <Sparkles size={12} strokeWidth={2} />
          <span>Design Intelligence</span>
        </div>

        <h2 className="home-title">
          Understand the design
          <br />
          behind <span>any website</span>
        </h2>

        <p className="home-subtitle">
          Colors, typography, components, and UX patterns — extracted and
          reconstructed in seconds.
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
          >
            {resolving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Résolution…
              </>
            ) : loading ? (
              "Starting…"
            ) : (
              <>
                Analyze
                <ArrowRight size={16} />
              </>
            )}
          </button>
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
              presets ou entre l'URL du site final !
            </p>
            <button type="button" onClick={() => setShowGuide(false)}>
              Compris
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verify with lint**

Run (from `frontend/`): `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/components/HeroSearch.tsx
git commit -m "feat: add HeroSearch with gallery URL resolution and guide modal"
```

---

### Task 7: Wire into page.tsx + CSS + full build

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/globals.css`
- Delete: `frontend/components/HeroInput.tsx` (now orphaned)

**Interfaces:**
- Consumes: `HeroSearch` (+ `FilterValue`), `InspirationGrid`, `inspirations.json`, `getDesigns`/`DesignSummary`

- [ ] **Step 1: Rewrite `frontend/app/page.tsx`**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDesigns } from "@/lib/api";
import type { DesignSummary } from "@/lib/types";
import HeroSearch from "@/components/HeroSearch";
import InspirationGrid from "@/components/InspirationGrid";
import type { FilterValue } from "@/components/InspirationFilter";
import inspirations from "@/lib/inspirations.json";

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const router = useRouter();

  useEffect(() => {
    getDesigns().then(setDesigns).catch(() => {});
  }, []);

  const handleAnalyze = (url: string) => {
    setLoading(true);
    router.push(`/analysis?url=${encodeURIComponent(url)}`);
  };

  const visiblePresets =
    filter === "all"
      ? inspirations
      : inspirations.filter((p) => p.source_platform === filter);

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
    </main>
  );
}
```

- [ ] **Step 2: Add CSS to `frontend/app/globals.css`**

Append at the end of the file:
```css
/* ─── Inspiration filter ─── */
.home-filter{
  margin-top:18px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex-wrap:wrap;
  gap:8px;
}
.home-filter-badge{
  display:inline-flex;
  align-items:center;
  gap:6px;
  min-height:28px;
  padding:0 11px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.025);
  color:rgba(161,161,170,.82);
  font-size:11px;
  font-family:var(--font);
  cursor:pointer;
  transition:border-color .15s ease,color .15s ease,background .15s ease;
}
.home-filter-badge:hover{
  border-color:rgba(255,255,255,.14);
  background:rgba(255,255,255,.045);
  color:#e4e4e7;
}
.home-filter-badge.is-active{
  border-color:rgba(139,92,246,.36);
  background:rgba(139,92,246,.12);
  color:#d3c6ff;
}
.home-filter-dot{
  width:6px;
  height:6px;
  border-radius:999px;
  background:currentColor;
  opacity:.55;
}
.home-filter-badge.is-active .home-filter-dot{
  opacity:1;
}
.home-error{
  margin-top:10px;
  color:#f87171;
  font-size:12px;
  text-align:center;
}

/* ─── Inspiration section ─── */
.home-insp{
  width:100%;
  max-width:1080px;
  margin-top:26px;
}
.home-tabs{
  display:flex;
  align-items:center;
  gap:6px;
  margin-bottom:14px;
  padding:4px;
  border-radius:12px;
  background:rgba(18,22,31,.6);
  border:1px solid rgba(255,255,255,.06);
  width:fit-content;
}
.home-tab{
  min-height:30px;
  padding:0 16px;
  border:0;
  border-radius:9px;
  background:transparent;
  color:rgba(161,161,170,.82);
  font-size:12px;
  font-weight:650;
  font-family:var(--font);
  cursor:pointer;
  transition:color .15s ease,background .15s ease;
}
.home-tab:hover{ color:#e4e4e7; }
.home-tab.is-active{
  background:rgba(139,92,246,.16);
  color:#d3c6ff;
}
.home-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}

/* ─── Inspiration card ─── */
.home-insp-card{
  overflow:hidden;
  border-radius:16px;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(18,22,31,.75);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
  transition:border-color .15s ease,transform .15s ease,box-shadow .15s ease;
}
.home-insp-card:hover{
  border-color:rgba(255,255,255,.12);
  transform:translateY(-2px);
  box-shadow:0 18px 40px rgba(0,0,0,.28);
}
.home-insp-media{
  position:relative;
  aspect-ratio:16/10;
  overflow:hidden;
  background:rgba(8,12,22,.6);
}
.home-insp-img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
  transition:transform .3s ease;
}
.home-insp-card:hover .home-insp-img{
  transform:scale(1.03);
}
.home-insp-placeholder{
  height:100%;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  color:rgba(161,161,170,.7);
  font-size:12px;
}
.home-insp-platform{
  position:absolute;
  top:10px;
  left:10px;
  padding:4px 9px;
  border-radius:999px;
  background:rgba(8,12,22,.72);
  border:1px solid rgba(255,255,255,.1);
  color:#e4e4e7;
  font-size:10px;
  font-weight:700;
  backdrop-filter:blur(6px);
}
.home-insp-body{
  padding:14px 14px 16px;
}
.home-insp-title{
  margin:0;
  color:#fafafa;
  font-size:15px;
  line-height:1.25;
  font-weight:750;
}
.home-insp-category{
  margin:3px 0 0;
  color:rgba(113,113,122,.78);
  font-size:11px;
  line-height:1.3;
}
.home-insp-tags{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin:10px 0 12px;
}
.home-insp-tag{
  padding:3px 8px;
  border-radius:999px;
  background:rgba(255,255,255,.05);
  border:1px solid rgba(255,255,255,.06);
  color:rgba(161,161,170,.82);
  font-size:10px;
  line-height:1.2;
}
.home-insp-cta{
  width:100%;
  min-height:36px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:10px;
  color:white;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  box-shadow:0 10px 22px rgba(91,69,232,.2);
  font-size:12px;
  font-weight:700;
  font-family:var(--font);
  cursor:pointer;
  transition:transform .15s ease,box-shadow .15s ease;
}
.home-insp-cta:hover{
  box-shadow:0 12px 28px rgba(91,69,232,.3);
}
.home-insp-cta:active{
  transform:scale(.97);
}

/* ─── Guide modal ─── */
.home-modal{
  position:fixed;
  inset:0;
  z-index:60;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:rgba(4,6,12,.7);
  backdrop-filter:blur(6px);
}
.home-modal-card{
  width:100%;
  max-width:380px;
  padding:24px;
  border-radius:18px;
  border:1px solid rgba(255,255,255,.09);
  background:linear-gradient(180deg,rgba(34,31,64,.96),rgba(18,22,36,.97));
  text-align:center;
  box-shadow:0 24px 70px rgba(0,0,0,.4);
}
.home-modal-card h3{
  margin:0 0 8px;
  color:#fafafa;
  font-size:16px;
  font-weight:800;
}
.home-modal-card p{
  margin:0 0 18px;
  color:rgba(161,161,170,.82);
  font-size:13px;
  line-height:1.55;
}
.home-modal-card button{
  min-height:36px;
  padding:0 22px;
  border:0;
  border-radius:10px;
  color:white;
  background:linear-gradient(135deg,#7c3aed,#4f46e5);
  font-size:13px;
  font-weight:700;
  font-family:var(--font);
  cursor:pointer;
}

@media(max-width:1024px){
  .home-grid{
    grid-template-columns:repeat(2,1fr);
  }
}
@media(max-width:720px){
  .home-grid{
    grid-template-columns:1fr;
  }
}
```

- [ ] **Step 3: Delete the now-orphaned `HeroInput.tsx`**

Run: `rm frontend/components/HeroInput.tsx`
Verify no remaining references: `grep -rn "HeroInput" frontend/` → no matches.

- [ ] **Step 4: Full build to verify types + JSON import**

Run (from `frontend/`): `npm run build`
Expected: `✓ Compiled successfully` — the home route prerenders, `inspirations.json` import resolves.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/page.tsx frontend/app/globals.css
git rm frontend/components/HeroInput.tsx
git commit -m "feat: wire inspiration dashboard into home page"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Run backend tests**

Run: `python -m unittest discover -s tests -v`
Expected: PASS.

- [ ] **Step 2: Start services and verify the endpoint live**

With the stack running (`./start.sh` or the Docker compose stack), run:
```bash
curl -s -X POST http://localhost:5000/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.awwwards.com/sites/stripe-press"}'
```
Expected: `{"platform":"awwwards","resolvable":true,"target_url":"https://press.stripe.com"}` (or another real external link — the exact URL depends on the live Awwwards page).

```bash
curl -s -X POST http://localhost:5000/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.behance.net/gallery/12345/Foo"}'
```
Expected: `{"platform":"behance","resolvable":false}`

```bash
curl -s -X POST http://localhost:5000/api/resolve \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://stripe.com"}'
```
Expected: `{"platform":"unknown","resolvable":true,"target_url":"https://stripe.com"}`

- [ ] **Step 3: Manual UI verification**

In the browser at `http://localhost:3000`:
1. Home shows compact hero + filter badges + grid of 12 cards (default tab Inspirations).
2. Click an Awwwards preset card → navigates to `/analysis?url=...` and the pipeline runs.
3. Paste `https://www.awwwards.com/sites/stripe-press` → shows « Résolution… » then launches analysis of the resolved site.
4. Paste `https://www.behance.net/gallery/12345/Foo` → guide modal appears; « Compris » closes it.
5. Paste `https://stripe.com` → launches analysis directly.
6. Switch to « Récents » tab → existing history (or empty state) shows.
7. Click filter badges → grid filters with animated re-flow; « All » restores.

- [ ] **Step 4: Confirm commit history is clean**

Run: `git status --short`
Expected: no unexpected files; only tracked changes committed.
