# V1 Launch Finalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finalize V1 by wiring the gallery URL resolver into `/api/analyze`, exposing curated presets via MCP/HTTP, adding automated robustness tests, shipping a Cloudflare Tunnel launch script, and drafting launch content.

**Architecture:** Port the existing resolver from `feature/inspiration-dashboard` (`backend/resolver.py` + `tests/test_resolve.py`) unchanged, then hook `resolve_url` into `api_analyze` before rate limiting. Add a shared `backend/data/inspirations.json` consumed by a new `get_presets` MCP tool and `GET /api/presets`. Add robustness tests for browser-close-on-timeout and the export chain. Add `start-public.sh` + README section, and `docs/launch/*` content. All work on `feature/pipeline-mcp`.

**Tech Stack:** Python 3.12+, FastAPI, FastMCP, ARQ, httpx, BeautifulSoup (beautifulsoup4 already a dep), pytest, shell.

## Global Constraints

- No new backend dependencies (beautifulsoup4, httpx already in `backend/requirements.txt`).
- `backend/resolver.py` and `tests/test_resolve.py` are ported verbatim from `feature/inspiration-dashboard` (same content, no edits).
- Non-resolvable galleries (behance, dribbble, mobbin, designspiration) → HTTP 400 with the French message: « Seuls les sites web en ligne sont analysables. Découvre nos presets ou entre l'URL du site final. »
- Network/parse errors on resolvable galleries → fallback to original URL, never blocking.
- All new tests use pytest (existing infra) unless noted.
- French copy for user-facing messages and docs (project convention).

---

### Task 1: Port resolver module + tests

**Files:**
- Create: `backend/resolver.py`
- Create: `tests/test_resolve.py`

**Interfaces:**
- Produces: `classify_url(url: str) -> tuple[str, bool]`, `resolve_url(url: str) -> dict` (`{"platform", "resolvable", "target_url"?}`). Used by Task 2.

- [ ] **Step 1: Create `backend/resolver.py`**

Copy the file verbatim from `feature/inspiration-dashboard`:

```bash
git show feature/inspiration-dashboard:backend/resolver.py > backend/resolver.py
```

Content is `classify_url` (6 gallery platforms + unknown), `_extract_target` (visit-label anchor → first external anchor → canonical), `resolve_url` (httpx GET with `RESOLVE_TIMEOUT = 10.0`, `follow_redirects=True`, parse errors → `{"platform", "resolvable": False}`).

- [ ] **Step 2: Create `tests/test_resolve.py`**

Copy verbatim:

```bash
git show feature/inspiration-dashboard:tests/test_resolve.py > tests/test_resolve.py
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `.venv/bin/python -m unittest tests.test_resolve -v`
Expected: all 10 tests pass (7 classify + 3 resolve, using unittest stdlib).

- [ ] **Step 4: Verify import**

Run: `.venv/bin/python -c "from backend.resolver import classify_url, resolve_url; print('OK')"`
Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add backend/resolver.py tests/test_resolve.py
git commit -m "feat: port gallery URL resolver with classification and extraction"
```

---

### Task 2: Hook resolver into `/api/analyze`

**Files:**
- Modify: `backend/server.py` (import + `api_analyze`)
- Create: `tests/test_analyze_resolver.py`

**Interfaces:**
- Consumes: `resolve_url` from Task 1.
- Produces: `target_url` used for the DB record and the ARQ job payload.

- [ ] **Step 1: Write failing tests**

`tests/test_analyze_resolver.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient


def _client():
    from backend.server import app
    client = TestClient(app)
    app.state.redis_client = AsyncMock()
    app.state.redis_client.get = AsyncMock(return_value=None)
    app.state.redis_pool = MagicMock()
    app.state.redis_pool.enqueue_job = AsyncMock()
    return client


def test_gallery_url_resolves_target_before_enqueue():
    client = _client()
    with patch("backend.server.resolve_url", new=AsyncMock(return_value={
        "platform": "awwwards", "resolvable": True, "target_url": "https://press.stripe.com",
    }), create=True), patch("backend.server.is_safe_url", return_value=True):
        r = client.post("/api/analyze", json={"url": "https://www.awwwards.com/sites/stripe-press"})
    assert r.status_code == 200
    enqueue = client.app.state.redis_pool.enqueue_job
    assert enqueue.call_count == 1
    assert enqueue.call_args.args[2] == "https://press.stripe.com"


def test_non_gallery_url_passthrough():
    client = _client()
    with patch("backend.server.resolve_url", new=AsyncMock(return_value={
        "platform": "unknown", "resolvable": True, "target_url": "https://stripe.com",
    }), create=True), patch("backend.server.is_safe_url", return_value=True):
        r = client.post("/api/analyze", json={"url": "https://stripe.com"})
    assert r.status_code == 200
    enqueue = client.app.state.redis_pool.enqueue_job
    assert enqueue.call_args.args[2] == "https://stripe.com"


def test_non_resolvable_gallery_rejected_400():
    client = _client()
    with patch("backend.server.resolve_url", new=AsyncMock(return_value={
        "platform": "behance", "resolvable": False,
    }), create=True), patch("backend.server.is_safe_url", return_value=True):
        r = client.post("/api/analyze", json={"url": "https://www.behance.net/gallery/12345/Foo"})
    assert r.status_code == 400
    assert "Seuls les sites web en ligne" in r.json()["detail"]
    assert client.app.state.redis_pool.enqueue_job.call_count == 0
```

**Note:** no `with client:` block — that would run the FastAPI lifespan and try
to connect to real Redis. Setting `app.state` manually and issuing plain
`client.post(...)` avoids that. `create=True` on the `resolve_url` patch lets
the test import before the wiring exists (fail-first).

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/test_analyze_resolver.py -v`
Expected: FAIL — `enqueue_job` receives the original gallery URL
(`https://www.awwwards.com/...`), not the resolved target.

- [ ] **Step 3: Wire resolver into `api_analyze`**

In `backend/server.py`:

1. Add import near the other backend imports (after line ~40):
```python
from backend.resolver import resolve_url
```

2. In `api_analyze`, after the `is_safe_url` check (currently line ~190) and before the rate-limit block, insert:

```python
    # 1b. Resolve gallery URLs (Awwwards/SiteInspire) to the real site
    resolved = await resolve_url(url)
    if not resolved.get("resolvable") and resolved.get("platform") in (
        "behance", "dribbble", "mobbin", "designspiration"
    ):
        raise HTTPException(
            status_code=400,
            detail="Seuls les sites web en ligne sont analysables. Découvre nos presets ou entre l'URL du site final.",
        )
    target_url = resolved.get("target_url") or url
```

3. Replace `url` with `target_url` in the DB record and the enqueue call (lines ~221 and ~232):

```python
        url=target_url,
...
    await app.state.redis_pool.enqueue_job('run_analysis_task', analyze_id, target_url)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/pytest tests/test_analyze_resolver.py -v`
Expected: PASS.

- [ ] **Step 5: Run full suite + import check**

Run: `.venv/bin/pytest tests/ -q` and `.venv/bin/python -c "from backend.server import app; print('OK')"`
Expected: all green; `OK`.

- [ ] **Step 6: Commit**

```bash
git add backend/server.py tests/test_analyze_resolver.py
git commit -m "feat: resolve gallery URLs in /api/analyze before enqueue"
```

---

### Task 3: Shared presets file + `GET /api/presets`

**Files:**
- Create: `backend/data/inspirations.json`
- Modify: `backend/server.py` (new endpoint)
- Create: `tests/test_presets.py`

**Interfaces:**
- Produces: `backend/data/inspirations.json` (12 presets), `GET /api/presets` → JSON array. Consumed by Task 4 (MCP tool reads the file) and Task 4b (PyPI tool calls the endpoint).

- [ ] **Step 1: Write failing test**

`tests/test_presets.py`:

```python
from fastapi.testclient import TestClient

def test_api_presets_returns_list():
    from backend.server import app
    client = TestClient(app)
    r = client.get("/api/presets")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 12
    assert {"id", "title", "category", "target_url"} <= set(data[0])
```

Note: no `with client:` block — that would run the FastAPI lifespan and try to
connect to Redis. Plain `client.get(...)` avoids it.

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_presets.py -v`
Expected: FAIL — 404 (endpoint missing).

- [ ] **Step 3: Create `backend/data/inspirations.json`**

Copy the 12-preset file from the other branch:

```bash
mkdir -p backend/data
git show feature/inspiration-dashboard:frontend/lib/inspirations.json > backend/data/inspirations.json
```

- [ ] **Step 4: Add `GET /api/presets`**

In `backend/server.py`, add near the other GET routes (e.g., before `/api/designs`):

```python
PRESETS_FILE = Path(__file__).resolve().parent / "data" / "inspirations.json"

@app.get("/api/presets")
async def api_presets():
    if not PRESETS_FILE.exists():
        return []
    return json.loads(PRESETS_FILE.read_text(encoding="utf-8"))
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/bin/pytest tests/test_presets.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/data/inspirations.json backend/server.py tests/test_presets.py
git commit -m "feat: shared presets file and GET /api/presets"
```

---

### Task 4: MCP `get_presets` tool + PyPI client

**Files:**
- Modify: `backend/mcp_server.py` (tool)
- Modify: `clients/design-oracle-mcp/design_oracle_mcp/server.py` (tool)
- Modify: `tests/test_mcp.py` (add test)
- Modify: `tests/test_cli_package.py` (add test)

**Interfaces:**
- Consumes: `backend/data/inspirations.json` (Task 3), `GET /api/presets` (Task 3).
- Produces: `get_presets()` MCP tool in both servers.

- [ ] **Step 1: Write failing tests**

In `tests/test_mcp.py`, add:

```python
def test_mcp_has_presets_tool():
    from backend import mcp_server as ms
    import asyncio
    async def _names():
        return {t.name for t in await ms.mcp.list_tools()}
    assert "get_presets" in asyncio.run(_names())
```

In `tests/test_cli_package.py`, add:

```python
def test_cli_has_presets_tool():
    import asyncio
    from design_oracle_mcp import server as s
    async def _names():
        return {t.name for t in await s.mcp.list_tools()}
    assert "get_presets" in asyncio.run(_names())
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/test_mcp.py::test_mcp_has_presets_tool tests/test_cli_package.py::test_cli_has_presets_tool -v`
Expected: FAIL — `get_presets` not in tool names.

- [ ] **Step 3: Add tool to `backend/mcp_server.py`**

```python
from pathlib import Path

PRESETS_FILE = Path(__file__).resolve().parent / "data" / "inspirations.json"

@mcp.tool()
def get_presets() -> str:
    """List curated inspiration presets (title, category, target_url, tags)"""
    try:
        if not PRESETS_FILE.exists():
            return "[]"
        return PRESETS_FILE.read_text(encoding="utf-8")
    except Exception as e:
        logger.error("Failed to read presets: %s", e)
        return "[]"
```

(`from pathlib import Path` already imported in `mcp_server.py`.)

- [ ] **Step 4: Add tool to `clients/design-oracle-mcp/design_oracle_mcp/server.py`**

```python
@mcp.tool()
def get_presets() -> str:
    """List curated inspiration presets from the backend"""
    r = httpx.get(_api_url("/api/presets"), timeout=10)
    r.raise_for_status()
    return r.text
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `.venv/bin/pytest tests/test_mcp.py::test_mcp_has_presets_tool tests/test_cli_package.py::test_cli_has_presets_tool -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/mcp_server.py clients/design-oracle-mcp/design_oracle_mcp/server.py tests/test_mcp.py tests/test_cli_package.py
git commit -m "feat: get_presets MCP tool in backend and PyPI client"
```

---

### Task 5: Robustness tests — browser close + export chain

**Files:**
- Modify: `tests/test_timeouts.py` (add browser-close test)
- Create: `tests/test_exports.py`

**Interfaces:**
- Consumes: `backend.analyzer.core.run_analysis` (browser lifecycle), export routes on `backend.server`.

- [ ] **Step 1: Write failing tests**

In `tests/test_timeouts.py`, add:

```python
import asyncio
import importlib
import sys
from unittest.mock import AsyncMock, MagicMock, patch


def test_browser_closed_on_navigation_timeout():
    import backend.analyzer.core as c

    browser = MagicMock()
    browser.close = AsyncMock()
    context = MagicMock()
    browser.new_context = AsyncMock(return_value=context)
    page = MagicMock()
    context.new_page = AsyncMock(return_value=page)
    page.goto = AsyncMock(side_effect=Exception("timeout"))

    class FakePW:
        chromium = MagicMock()
        chromium.launch = AsyncMock(return_value=browser)

    class FakeCM:
        def __init__(self, pw):
            self.pw = pw
        async def __aenter__(self):
            return self.pw
        async def __aexit__(self, *args):
            return False

    fake = MagicMock(async_playwright=lambda: FakeCM(FakePW()))

    with patch.dict(sys.modules, {"playwright.async_api": fake}):
        importlib.reload(c)
        asyncio.run(c.run_analysis("https://slow.example"))

    assert browser.close.await_count >= 1
```

Verified working: `page.goto` raises → nav loop exhausts → early `return` →
`finally` still awaits `browser.close()` exactly once (T4's `try/finally`).

- [ ] **Step 2: Run test to verify it passes**

Run: `.venv/bin/pytest tests/test_timeouts.py::test_browser_closed_on_navigation_timeout -v`
Expected: PASS — this is a regression guard proving the T4 `finally` closes the
browser even when navigation fails. If it FAILS, the `finally` cleanup is broken
and must be fixed before continuing.

- [ ] **Step 3: Create `tests/test_exports.py`**

```python
import json
from pathlib import Path
from fastapi.testclient import TestClient

import pytest

ROOT = Path(__file__).resolve().parent.parent
ANALYSES = ROOT / "analyses"

@pytest.fixture
def fake_analysis(tmp_path, monkeypatch):
    import backend.server as s
    d = tmp_path / "test1234"
    d.mkdir(parents=True)
    (d / "DESIGN.md").write_text("# Design", encoding="utf-8")
    (d / "tailwind.config.js").write_text("module.exports = {}", encoding="utf-8")
    (d / "components.jsx").write_text("export default () => null", encoding="utf-8")
    (d / "design-tokens.json").write_text(json.dumps({"colors": {}}), encoding="utf-8")
    monkeypatch.setattr(s, "ANALYSES_DIR", tmp_path)
    return d.name

def test_export_chain_returns_all_files(fake_analysis):
    from backend.server import app
    client = TestClient(app)
    aid = fake_analysis
    for route in ["design.md", "tailwind", "components", "tokens"]:
        r = client.get(f"/api/analyze/{aid}/export/{route}")
        assert r.status_code == 200, route
```

Note: the analyze id must be ≥8 chars (`validate_analyze_id` rejects shorter),
hence `test1234`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/pytest tests/test_exports.py tests/test_timeouts.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/test_timeouts.py tests/test_exports.py
git commit -m "test: browser close on timeout and export chain"
```

---

### Task 6: Cloudflare Tunnel launch script + README

**Files:**
- Create: `start-public.sh`
- Modify: `README.md` (deployment section)

- [ ] **Step 1: Create `start-public.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "== Design Oracle — public launch (Cloudflare Tunnel) =="

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared introuvable. Installe-le :"
  echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo "Ou (Linux amd64) :"
  echo "  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared && chmod +x /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/"
  exit 1
fi

echo "[1/2] Lancement du stack backend (redis + api + worker)..."
docker compose up -d redis api worker

echo "[2/2] Ouverture du tunnel HTTPS vers http://localhost:3000..."
echo "   (Lance le frontend localement avec:  cd frontend && npm run dev)"
cloudflared tunnel --url http://localhost:3000
```

Make executable: `chmod +x start-public.sh`

- [ ] **Step 2: Add README deployment section**

Under `## MCP Server` (or a new `## Deploy to the public internet` section before `## Known limitations`):

```markdown
## Deploy to the public internet (free)

Serve the app from your machine with a free HTTPS URL via Cloudflare Tunnel:

```bash
./start-public.sh
```

- Starts the backend stack (`docker compose up -d redis api worker`).
- Opens a random public `https://<hash>.trycloudflare.com` URL pointed at
  `http://localhost:3000`.
- Run the frontend locally first: `cd frontend && npm run dev`.
- Stop with `Ctrl+C`. The URL changes each run (TryCloudflare ephemeral).

**Note:** the frontend Docker build currently requires the untracked
`frontend/public/` directory — until it's committed, serve the frontend via
`npm run dev`.
```

- [ ] **Step 3: Shell syntax check**

Run: `bash -n start-public.sh`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add start-public.sh README.md
git commit -m "feat: Cloudflare Tunnel launch script and README section"
```

---

### Task 7: Launch content (post + screencast guide)

**Files:**
- Create: `docs/launch/launch-post.md`
- Create: `docs/launch/screencast-guide.md`

- [ ] **Step 1: Create `docs/launch/launch-post.md`**

```markdown
# Post de lancement — Design Oracle V1

## Angle (X / LinkedIn / Reddit)

**Problème :** « Extraire à la main le design system d'un site prend des heures.
Couleurs, typographie, espacements, composants… il faut tout relever à l'œil. »

**Solution :** « Design Oracle analyse le site, extrait les tokens, génère le
code React/Tailwind et sert de serveur MCP pour vos agents IA. »

## Brouillon (courts)

> Extraire le design system d'un site à la main ? Des heures.
>
> Design Oracle analyse n'importe quelle URL → palette de couleurs,
> typographie, espacements, tokens → code React/Tailwind prêt à l'emploi.
>
> Et surtout : c'est un serveur MCP. Cursor, Claude Code et opencode peuvent
> l'appeler pour analyser un design à la volée, sans quitter l'éditeur.
>
> 🔗 <lien d'accès>
> 💬 Retours bienvenus, en direct ici !

## Variante LinkedIn (plus longue)

Ajoute : contexte (designers qui refont tout à la main), démo (lien GIF),
appel à tester les 10 premiers utilisateurs, et un exemple concret
(ex. analyser la page d'accueil de Linear → palette + Tailwind v4).

## Canaux

- **X :** 3-4 lignes + GIF + lien.
- **LinkedIn :** version longue + story.
- **Reddit** (r/web_design, r/Frontend) : version problème/solution + lien,
  format « Show HN ».
```

- [ ] **Step 2: Create `docs/launch/screencast-guide.md`**

```markdown
# Guide de capture — GIF / vidéo 20 s

## Scénario

1. **0-4 s** — Accueil : clic sur une carte d'inspiration (ex. *Linear*).
2. **4-10 s** — Chargement de l'analyse (barre de progression).
3. **10-20 s** — Résultat final : palette de couleurs, typographie, code
   Tailwind v4, puis démonstration de l'intégration Cursor / Claude Code
   via le serveur MCP (`analyze_website` appelé depuis l'éditeur).

## Outils

- macOS : `Cmd+Shift+5`, section vidéo 20 s, puis convertis en GIF
  (ex. Gifski / ffmpeg).
- Linux : OBS Studio ou `wf-recorder`.
- Fenêtre 1440×900, fond de page sur la fenêtre de l'app.

## Conseils

- Précharge l'analyse d'un site rapide (Linear) pour un GIF fluide.
- Montre 2 secondes de l'éditeur MCP à la fin — c'est le différenciateur.
- Exporte en 10-15 FPS, < 8 Mo pour X.
```

- [ ] **Step 3: Verify files exist**

Run: `ls docs/launch/`
Expected: `launch-post.md` `screencast-guide.md`

- [ ] **Step 4: Commit**

```bash
git add docs/launch/
git commit -m "docs: launch post and screencast guide"
```

---

### Task 8: Full verification pass

**Files:**
- None (verification only)

- [ ] **Step 1: Run full backend test suite**

Run: `.venv/bin/pytest tests/ -v`
Expected: all tests PASS (colors, layout filter, stealth, timeouts, mcp, cli, resolve, analyze-resolver, presets, exports).

- [ ] **Step 2: Import/CI check**

Run: `.venv/bin/python -c "from backend.server import app; from backend.worker import WorkerSettings; from backend.resolver import resolve_url; print('OK')"`
Expected: `OK`.

- [ ] **Step 3: Smoke — presets via API**

Run: `.venv/bin/python -c "from fastapi.testclient import TestClient; from backend.server import app; c=TestClient(app); print(len(c.get('/api/presets').json()))"`
Expected: `12`.

- [ ] **Step 4: Smoke — resolver end-to-end (network permitting)**

Run: `.venv/bin/python -c "
import asyncio
from backend.resolver import resolve_url
print(asyncio.run(resolve_url('https://www.awwwards.com/sites/stripe-press')))
"`
Expected: `{'platform': 'awwwards', 'resolvable': True, 'target_url': 'https://press.stripe.com'}` (requires network; if DNS unavailable, expect `resolvable: False` fallback — acceptable).

- [ ] **Step 5: No-op commit guard**

Run: `git status --short`
Expected: clean tree (only intended files).
