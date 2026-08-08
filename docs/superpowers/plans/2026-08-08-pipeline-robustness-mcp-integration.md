# Pipeline Robustness & MCP Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Playwright/ARQ analysis pipeline (stealth, timeout alignment, strict browser cleanup, getComputedStyle filtering, color normalization) and modernize MCP integration (SSE/HTTP transport, multi-editor configs, lightweight PyPI CLI).

**Architecture:** Two independent workstreams in one ordered plan. Backend workstream (Tasks 1-4) touches `backend/analyzer/*` and `backend/{worker,server}.py`; it adds a stealth init-script module and a shared JS filter helper, and reworks the browser lifecycle into a `try/finally`. MCP workstream (Tasks 5-7) adds a transport selector + `/mcp` mount, updates agent config docs, and ships a standalone `clients/design-oracle-mcp/` package.

**Tech Stack:** Python 3.12, FastAPI, ARQ, Playwright (async), FastMCP, httpx, pytest (new), PyPI tooling.

## Global Constraints

- Python 3.12+; existing deps pinned in `backend/requirements.txt` — add **no** new runtime dependency to the backend (stealth is a JS string, no pip package).
- Hierarchy must hold: `TIMEOUT_SECONDS` (Playwright) < `ARQ_JOB_TIMEOUT_SECONDS` (ARQ) < SSE/HTTP timeouts.
- `STEALTH_MODE` env default `false`; `DESIGN_ORACLE_TRANSPORT` default `stdio`; `DESIGN_ORACLE_URL` default `http://localhost:5000`.
- `normalize_color()` must keep returning a hex string (or `None`) — it has existing callers; richer parsing lives in the new `parse_color()`.
- The client package (`clients/design-oracle-mcp/`) must depend only on `fastmcp` + `httpx` — never Playwright/Chromium.
- Do not delete unrelated dead code; only orphans created by this work.
- Every task: write test first, run to confirm FAIL, implement, run to confirm PASS, commit.

---

### Task 1: Test infrastructure + color normalization (rgba/hsl)

**Files:**
- Create: `requirements-dev.txt`
- Create: `tests/conftest.py`
- Create: `tests/test_colors.py`
- Modify: `backend/analyzer/colors.py:55-81` (extend normalization)

**Interfaces:**
- Produces: `parse_color(raw: str) -> dict | None` returning `{"hex": str, "alpha": float | None, "raw": str}`; `normalize_color(raw: str) -> str | None` (unchanged signature, extended inputs); `hsl_to_rgb(h, s, l) -> tuple[int, int, int]`.
- Consumes: nothing new.

- [ ] **Step 1: Create test infra + failing tests**

`requirements-dev.txt`:
```
-r backend/requirements.txt
pytest>=8.0
```

`tests/conftest.py`:
```python
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "clients" / "design-oracle-mcp"))
```

`tests/test_colors.py`:
```python
from backend.analyzer.colors import normalize_color, parse_color

def test_normalize_rgb():
    assert normalize_color("rgb(37, 99, 235)") == "#2563eb"

def test_normalize_named():
    assert normalize_color("white") == "#ffffff"

def test_normalize_rgba_keeps_hex_and_alpha():
    assert normalize_color("rgba(37, 99, 235, 0.8)") == "#2563eb"
    c = parse_color("rgba(37, 99, 235, 0.8)")
    assert c["hex"] == "#2563eb"
    assert c["alpha"] == 0.8
    assert c["raw"] == "rgba(37, 99, 235, 0.8)"

def test_normalize_hex8_alpha():
    c = parse_color("#2563ebcc")
    assert c["hex"] == "#2563eb"
    assert c["alpha"] == 0.8

def test_normalize_hsl_primary():
    assert normalize_color("hsl(221, 83%, 53%)") == "#2463eb"

def test_normalize_hsl_edges():
    assert normalize_color("hsl(0, 0%, 100%)") == "#ffffff"
    assert normalize_color("hsl(120, 100%, 50%)") == "#00ff00"
    assert normalize_color("hsl(0, 0%, 0%)") == "#000000"

def test_normalize_hsla():
    c = parse_color("hsla(120, 100%, 50%, 0.5)")
    assert c["hex"] == "#00ff00"
    assert c["alpha"] == 0.5

def test_normalize_invalid_returns_none():
    assert normalize_color("not-a-color") is None
    assert parse_color("") is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `source .venv/bin/activate && pip install -q -r requirements-dev.txt && pytest tests/test_colors.py -v`
Expected: FAIL — `ImportError: cannot import name 'parse_color' from 'backend.analyzer.colors'`.

- [ ] **Step 3: Implement color parsing in colors.py**

Replace the `normalize_color` block (lines 62-81) with:

```python
def hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    h = h % 360
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return round((r + m) * 255), round((g + m) * 255), round((b + m) * 255)


def parse_color(raw: str) -> dict | None:
    raw = raw.strip().lower()
    if raw in COLOR_NAMES:
        raw = COLOR_NAMES[raw]

    m = RE_HEX.match(raw)
    if m:
        h = m.group(1)
        alpha = None
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) == 8:
            alpha = round(int(h[6:8], 16) / 255, 3)
            h = h[:6]
        return {"hex": f"#{h.lower()}", "alpha": alpha, "raw": raw}

    m = RE_RGB.match(raw)
    if m:
        parts = re.findall(r"[\d.]+", m.group(2))
        nums = [float(p) for p in parts[:3]]
        alpha = float(parts[3]) if len(parts) > 3 and m.group(1) else None
        return {
            "hex": f"#{int(nums[0]):02x}{int(nums[1]):02x}{int(nums[2]):02x}",
            "alpha": alpha,
            "raw": raw,
        }

    m = RE_HSL.match(raw)
    if m:
        parts = re.findall(r"[\d.]+", m.group(2))
        r, g, b = hsl_to_rgb(float(parts[0]), float(parts[1]) / 100, float(parts[2]) / 100)
        alpha = float(parts[3]) if len(parts) > 3 and m.group(1) else None
        return {"hex": f"#{r:02x}{g:02x}{b:02x}", "alpha": alpha, "raw": raw}

    return None


def normalize_color(raw: str) -> str | None:
    c = parse_color(raw)
    return c["hex"] if c else None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_colors.py -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add requirements-dev.txt tests/ backend/analyzer/colors.py
git commit -m "feat: parse rgba/hsl colors with alpha preservation"
```

---

### Task 2: getComputedStyle visibility/semantic filter across all passes

**Files:**
- Modify: `backend/analyzer/layout.py` (add `visible_element_filter_js`, use in 4 JS passes)
- Modify: `backend/analyzer/colors.py` (use filter in `extract_colors` JS)
- Modify: `backend/analyzer/typography.py` (use filter in fonts pass)
- Create: `tests/test_layout_filter.py`

**Interfaces:**
- Produces: `visible_element_filter_js() -> str` (module function in `layout.py`) that returns a JS snippet defining `isVisible(el)`, `isSemantic(el)`, `relevant(el)`. Imported by `colors.py` and `typography.py`.
- Consumes: `parse_color` (Task 1) indirectly via existing `extract_colors` flow.

- [ ] **Step 1: Write failing tests**

`tests/test_layout_filter.py`:
```python
from backend.analyzer.layout import visible_element_filter_js

def test_filter_defines_relevant():
    js = visible_element_filter_js()
    assert "isVisible" in js
    assert "isSemantic" in js
    assert "const relevant" in js

def test_filter_covers_semantic_tags():
    js = visible_element_filter_js()
    for tag in ["h1", "p", "button", "a", "input", "header", "nav", "main", "section", "article", "footer"]:
        assert tag in js

def test_filter_covers_card_containers():
    assert "card" in visible_element_filter_js()
    assert "panel" in visible_element_filter_js()

def test_filter_skips_hidden():
    js = visible_element_filter_js()
    assert "display" in js and "none" in js
    assert "offsetParent" in js
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_layout_filter.py -v`
Expected: FAIL — `AttributeError: module 'backend.analyzer.layout' has no attribute 'visible_element_filter_js'`.

- [ ] **Step 3: Add the helper to layout.py**

Add at the top of `backend/analyzer/layout.py`, after the imports:

```python
def visible_element_filter_js() -> str:
    return """const isVisible = (el) => {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return false;
        if (el.offsetParent !== null) return true;
        const pos = cs.position;
        return pos === 'fixed' || pos === 'absolute' || pos === 'sticky';
    };
    const isSemantic = (el) => {
        const tag = el.tagName.toLowerCase();
        if (['h1','h2','h3','h4','h5','h6','p','button','a','input',
             'header','nav','main','section','article','footer'].indexOf(tag) !== -1) return true;
        const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
        return /(card|panel|widget)/.test(cls);
    };
    const relevant = (el) => isVisible(el) && isSemantic(el);
    """
```

- [ ] **Step 4: Apply the filter in the 4 layout.py JS passes**

**extract_spacing_scale** — change line 11-12 from `js = """() => {` to `js = visible_element_filter_js() + """() => {`, and add the guard inside the loop right after `els.forEach(el => {` (line 17):

```python
async def extract_spacing_scale(page) -> dict:
    js = visible_element_filter_js() + """() => {
        const vals = {};
        const props = ['padding','margin','gap','paddingLeft','paddingRight','paddingTop','paddingBottom',
                       'marginLeft','marginRight','marginTop','marginBottom',
                       'columnGap','rowGap'];
        const els = document.querySelectorAll('*');
        els.forEach(el => {
            if (!relevant(el)) return;
            try {
                const cs = getComputedStyle(el);
                props.forEach(p => {
                    const v = parseFloat(cs[p]);
                    if (v && v > 0 && v < 200) {
                        const rounded = Math.round(v);
                        if (!vals[p]) vals[p] = [];
                        vals[p].push(rounded);
                    }
                });
            } catch(e) {}
        });
        return vals;
    }"""
```

**extract_radius_and_shadows** — same pattern, guard after the `forEach`:

```python
async def extract_radius_and_shadows(page) -> dict:
    js = visible_element_filter_js() + """() => {
        const radii = new Set();
        const shadows = [];
        const els = document.querySelectorAll('*');
        els.forEach(el => {
            if (!relevant(el)) return;
            try {
                const cs = getComputedStyle(el);
                const br = cs.borderRadius;
                if (br && br !== '0px' && !br.includes(' ')) {
                    const v = parseFloat(br);
                    if (v > 0 && v < 100) radii.add(Math.round(v));
                }
                const bs = cs.boxShadow;
                if (bs && bs !== 'none' && !shadows.includes(bs)) {
                    shadows.push(bs.substring(0, 100));
                }
            } catch(e) {}
        });
        return {
            radii: [...radii].sort((a,b) => a-b),
            shadows: shadows.slice(0, 10)
        };
    }"""
```

**analyze_layout** — the JS string starts at line 303. Change `js`/`page.evaluate("""() => {` to `page.evaluate(visible_element_filter_js() + """() => {`, and add the guard after `els.forEach(el => {` (line 316):

```python
async def analyze_layout(page, html: str) -> dict:
    layout_info = await page.evaluate(visible_element_filter_js() + """() => {
        const info = {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            hasGrid: false,
            hasFlexbox: false,
            containerWidths: [],
            sections: [],
            breakpoints: [],
            stickyElements: [],
            maxWidth: 0,
        };
        const els = document.querySelectorAll('*');
        let maxW = 0;
        els.forEach(el => {
            if (!relevant(el)) return;
            try {
                const cs = getComputedStyle(el);
                if (cs.display === 'grid' || cs.display?.includes('-grid')) info.hasGrid = true;
                if (cs.display === 'flex' || cs.display?.includes('-flex')) info.hasFlexbox = true;
                const w = parseFloat(cs.maxWidth);
                if (w && w > 100 && w < 2000) {
                    if (w > maxW) maxW = w;
                    if (!info.containerWidths.includes(w)) info.containerWidths.push(w);
                }
                if (cs.position === 'sticky' || cs.position === 'fixed') {
                    if (el.tagName === 'NAV' || el.tagName === 'HEADER' ||
                        (el.id && (el.id.includes('nav') || el.id.includes('header'))))
                        info.stickyElements.push(el.tagName + (el.id ? '#'+el.id : ''));
                }
            } catch(e) {}
        });
        info.containerWidths.sort((a,b) => a-b);
        info.maxWidth = maxW;
        return info;
    }""")
```

- [ ] **Step 5: Apply the filter in colors.py**

Add import at top of `backend/analyzer/colors.py`:

```python
from .layout import visible_element_filter_js
```

In `extract_colors`, change `js_colors = await page.evaluate("""() => {` to `js_colors = await page.evaluate(visible_element_filter_js() + """() => {`, and add the guard after `els.forEach(el => {` (line 203):

```python
async def extract_colors(page, html: str) -> dict:
    js_colors = await page.evaluate(visible_element_filter_js() + """() => {
        const colors = {};
        const props = ['color','background-color','background','border-color',
                       'border-top-color','border-bottom-color','border-left-color',
                       'border-right-color','outline-color','text-decoration-color',
                       'accent-color','caret-color','fill','stroke'];
        const els = document.querySelectorAll('*');
        const seen = new Set();
        els.forEach(el => {
            if (!relevant(el)) return;
            try {
                const cs = getComputedStyle(el);
                props.forEach(prop => {
                    const val = cs[prop];
                    if (val && val !== 'transparent' && val !== 'rgba(0,0,0,0)' &&
                        val !== 'initial' && val !== 'inherit' && val !== 'currentColor') {
                        if (!seen.has(val)) {
                            seen.add(val);
                            if (!colors[prop]) colors[prop] = [];
                            colors[prop].push(val);
                        }
                    }
                });
            } catch(e) {}
        });
        return colors;
    }""")
```

- [ ] **Step 6: Apply the filter in typography.py**

Add import at top of `backend/analyzer/typography.py`:

```python
from .layout import visible_element_filter_js
```

Change the first fonts pass (line 4) from `fonts = await page.evaluate("""() => {` to `fonts = await page.evaluate(visible_element_filter_js() + """() => {`, and add the guard after `els.forEach(el => {` (line 7):

```python
async def extract_typography(page) -> dict:
    fonts = await page.evaluate(visible_element_filter_js() + """() => {
        const fonts = {};
        const els = document.querySelectorAll('*');
        els.forEach(el => {
            if (!relevant(el)) return;
            try {
                const cs = getComputedStyle(el);
                const family = cs.fontFamily;
                const size = cs.fontSize;
                const weight = cs.fontWeight;
                const lh = cs.lineHeight;
                if (family && cs.display !== 'none') {
                    family.split(',').forEach(f => {
                        const name = f.replace(/['"]/g,'').trim();
                        if (name && name !== 'serif' && name !== 'sans-serif' &&
                            name !== 'monospace' && name !== 'cursive' && name !== 'fantasy') {
                            if (!fonts[name]) fonts[name] = {sizes:[],weights:[],lineHeights:[]};
                            if (size) fonts[name].sizes.push(parseFloat(size));
                            if (weight) fonts[name].weights.push(weight);
                            if (lh) fonts[name].lineHeights.push(lh);
                        }
                    });
                }
            } catch(e) {}
        });
        Object.keys(fonts).forEach(k => {
            fonts[k].sizes = [...new Set(fonts[k].sizes.map(s => Math.round(s*10)/10))].sort((a,b)=>a-b);
            fonts[k].weights = [...new Set(fonts[k].weights)].sort();
            fonts[k].lineHeights = [...new Set(fonts[k].lineHeights)].slice(0,5);
        });
        return fonts;
    }""")
```

- [ ] **Step 7: Run tests to verify they pass + import check**

Run: `pytest tests/test_layout_filter.py tests/test_colors.py -v && python -c "from backend.analyzer import core; print('OK')"`
Expected: PASS for all tests; `OK` printed (validates no import cycle between colors/layout/typography).

- [ ] **Step 8: Commit**

```bash
git add backend/analyzer/layout.py backend/analyzer/colors.py backend/analyzer/typography.py tests/test_layout_filter.py
git commit -m "feat: filter getComputedStyle passes to visible semantic elements"
```

---

### Task 3: Stealth mode via init script

**Files:**
- Create: `backend/analyzer/stealth.py`
- Modify: `backend/analyzer/core.py` (import + `add_init_script` when `STEALTH_MODE`)
- Modify: `.env.example` (add `STEALTH_MODE`)
- Create: `tests/test_stealth.py`

**Interfaces:**
- Produces: `stealth_init_script() -> str` (JS evasions string). `core.py` uses it before creating the page.
- Consumes: nothing.

- [ ] **Step 1: Write failing tests**

`tests/test_stealth.py`:
```python
from backend.analyzer.stealth import stealth_init_script

def test_stealth_removes_webdriver():
    assert "webdriver" in stealth_init_script()

def test_stealth_stubs_chrome():
    js = stealth_init_script()
    assert "window.chrome" in js
    assert "loadTimes" in js

def test_stealth_fakes_plugins():
    js = stealth_init_script()
    assert "plugins" in js
    assert "languages" in js

def test_stealth_patches_webgl():
    assert "WebGLRenderingContext" in stealth_init_script()

def test_stealth_uses_headless_proof_js_syntax():
    assert stealth_init_script().strip().endswith("}")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_stealth.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'backend.analyzer.stealth'`.

- [ ] **Step 3: Create stealth.py**

`backend/analyzer/stealth.py`:
```python
def stealth_init_script() -> str:
    return """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

window.chrome = window.chrome || {
  runtime: {},
  loadTimes: () => ({}),
  csi: () => ({})
};

Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'mimeTypes', { get: () => [1, 2, 3, 4, 5] });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' });

const _getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(param) {
  if (param === 37445) return 'Google Inc. (NVIDIA)';
  if (param === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)';
  return _getParameter.call(this, param);
};
"""
```

- [ ] **Step 4: Wire stealth into core.py**

Add import at top of `backend/analyzer/core.py`:

```python
import os
from .stealth import stealth_init_script
```

Add env read near the imports:

```python
STEALTH_MODE = os.getenv("STEALTH_MODE", "false").lower() in ("true", "1", "yes")
```

Inside `run_analysis`, after `context = await browser.new_context(...)` (line 33) and before `page = await context.new_page()` (line 41):

```python
        if STEALTH_MODE:
            await context.add_init_script(stealth_init_script())
```

- [ ] **Step 5: Add env var to .env.example**

Append to `backend/../.env.example` (repo root `.env.example`):

```
# Stealth mode: inject JS evasions to bypass basic bot protection (default false)
STEALTH_MODE=false
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pytest tests/test_stealth.py -v`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/analyzer/stealth.py backend/analyzer/core.py .env.example tests/test_stealth.py
git commit -m "feat: add STEALTH_MODE init-script evasions for basic bot protection"
```

---

### Task 4: Timeout alignment + strict browser cleanup

**Files:**
- Modify: `backend/analyzer/core.py` (env-driven nav timeouts; wrap browser lifecycle in `try/finally`)
- Modify: `backend/worker.py` (job_timeout, failed status on timeout)
- Modify: `backend/server.py` (SSE_MAX_POLLS derived from job timeout)
- Modify: `.env.example` (new timeout env vars)
- Create: `tests/test_timeouts.py`

**Interfaces:**
- Produces: `TIMEOUT_SECONDS` (int, default 30) in `core.py`; `WorkerSettings.job_timeout` (int, default 180); `SSE_MAX_POLLS` derived ≥ `ARQ_JOB_TIMEOUT_SECONDS / SSE_POLL_INTERVAL`; helper `_record_failed(ctx, analyze_id, message)` in `worker.py`.
- Consumes: `stealth_init_script` + `STEALTH_MODE` (Task 3).

- [ ] **Step 1: Write failing tests**

`tests/test_timeouts.py`:
```python
import os
import importlib

def test_worker_job_timeout_default():
    os.environ.pop("ARQ_JOB_TIMEOUT_SECONDS", None)
    import backend.worker as w
    importlib.reload(w)
    assert w.WorkerSettings.job_timeout == 180

def test_worker_job_timeout_env_override():
    os.environ["ARQ_JOB_TIMEOUT_SECONDS"] = "240"
    import backend.worker as w
    importlib.reload(w)
    assert w.WorkerSettings.job_timeout == 240
    os.environ.pop("ARQ_JOB_TIMEOUT_SECONDS", None)

def test_server_sse_max_polls_aligned():
    os.environ.pop("ARQ_JOB_TIMEOUT_SECONDS", None)
    import backend.server as s
    importlib.reload(s)
    assert s.SSE_MAX_POLLS * s.SSE_POLL_INTERVAL >= 180

def test_core_timout_seconds_default():
    os.environ.pop("TIMEOUT_SECONDS", None)
    import backend.analyzer.core as c
    importlib.reload(c)
    assert c.TIMEOUT_SECONDS == 30
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_timeouts.py -v`
Expected: FAIL — worker `job_timeout` attribute missing; `SSE_MAX_POLLS` is still hardcoded 3000 (3000*0.1=300 >= 180 passes, but the worker assertion fails first).

- [ ] **Step 3: Rework core.py with try/finally + env-driven timeouts**

Full replacement of `backend/analyzer/core.py`:

```python
import asyncio
import logging
import os
from .colors import extract_colors

logger = logging.getLogger(__name__)
from .typography import extract_typography
from .layout import (extract_spacing_scale, extract_radius_and_shadows,
                     get_component_boxes, overlay_screenshot,
                     detect_components, analyze_layout)
from .patterns import detect_ux_patterns
from .dna import generate_design_dna
from backend.generators.tokens import generate_design_tokens_json
from .stealth import stealth_init_script

TIMEOUT_SECONDS = int(os.getenv("TIMEOUT_SECONDS", "30"))
STEALTH_MODE = os.getenv("STEALTH_MODE", "false").lower() in ("true", "1", "yes")


async def run_analysis(url: str, progress_callback=None):
    from playwright.async_api import async_playwright

    def progress(stage, pct, detail=""):
        if progress_callback:
            progress_callback(stage, pct, detail)

    progress("launch", 0, "Launching browser engine...")
    async with async_playwright() as pw:
        browser = None
        try:
            browser = await pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu"
                ]
            )
            context = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
            )
            if STEALTH_MODE:
                await context.add_init_script(stealth_init_script())
            page = await context.new_page()

            progress("navigate", 8, "Navigating to page...")
            nav_success = False
            for wait_mode, label in [
                ("load", "full page load"),
                ("domcontentloaded", "DOM ready"),
                ("commit", "initial response"),
            ]:
                try:
                    progress("navigate", 8, f"Trying {label}...")
                    await page.goto(url, wait_until=wait_mode, timeout=TIMEOUT_SECONDS * 1000)
                    nav_success = True
                    break
                except Exception as e:
                    logger.debug("Navigation attempt %s failed: %s", label, e)

            if not nav_success:
                progress("error", 0, f"Navigation failed for {url} — unreachable or blocked")
                return {"error": f"Navigation failed: could not load {url}. The site may be blocking automated browsers."}

            try:
                await page.wait_for_load_state("domcontentloaded", timeout=10000)
            except Exception as e:
                logger.debug("wait_for_load_state after navigation failed: %s", e)
            await page.wait_for_timeout(2000)

            final_url = page.url
            progress("navigate", 15, "Page loaded successfully")

            progress("screenshot", 15, "Capturing screenshot...")
            screenshot_bytes = await page.screenshot(full_page=True)
            progress("screenshot", 20, "Screenshot captured")

            progress("dom", 20, "Scanning DOM...")
            html = await page.content()

            progress("dom", 25, "DOM scanned, extracting design tokens...")

            progress("colors", 25, "Detecting color system...")
            colors_data = await extract_colors(page, html)
            progress("colors", 40, f"{len(colors_data['all'])} colors detected")

            progress("typography", 40, "Detecting typography...")
            typography_data = await extract_typography(page)
            progress("typography", 55, "Typography analyzed")

            progress("components", 55, "Detecting components...")
            components_data = await detect_components(page, html)
            progress("components", 65, f"{len(components_data)} components identified")

            progress("components", 65, "Capturing component positions...")
            component_boxes = await get_component_boxes(page, components_data)
            try:
                overlay_bytes = overlay_screenshot(screenshot_bytes, component_boxes)
            except Exception:
                overlay_bytes = screenshot_bytes
            progress("components", 70, f"{len(component_boxes)} components mapped on screenshot")

            progress("layout", 70, "Analyzing layout...")
            layout_data = await analyze_layout(page, html)
            progress("layout", 75, "Layout analyzed")

            progress("layout", 75, "Extracting spacing scale...")
            spacing_data = await extract_spacing_scale(page)
            progress("layout", 78, f"{len(spacing_data.get('scale',[]))} spacing values found")

            progress("layout", 78, "Extracting radius & shadows...")
            radius_data = await extract_radius_and_shadows(page)
            progress("layout", 80, f"{len(radius_data.get('radii',[]))} radii, {len(radius_data.get('shadows',[]))} shadows")

            progress("patterns", 80, "Detecting UX patterns...")
            patterns_data = detect_ux_patterns(html)
            progress("patterns", 88, f"{len(patterns_data)} patterns found")

            progress("dna", 88, "Generating Design DNA...")
            dna = generate_design_dna(
                colors_data, typography_data, components_data, layout_data, patterns_data,
                spacing_data, radius_data,
            )
            design_tokens = generate_design_tokens_json(
                colors_data, typography_data, spacing_data, radius_data, dna
            )
            progress("dna", 95, "Design DNA generated")

            page_title = await page.title()
        finally:
            if browser is not None:
                try:
                    await browser.close()
                except Exception:
                    logger.exception("Failed to close browser cleanly")

    progress("complete", 100, "Analysis complete!")

    return {
        "url": url,
        "final_url": final_url,
        "title": page_title or "",
        "screenshot": screenshot_bytes,
        "screenshot_overlay": overlay_bytes,
        "component_boxes": component_boxes,
        "colors": colors_data,
        "typography": typography_data,
        "components": components_data,
        "layout": layout_data,
        "spacing": spacing_data,
        "radius": radius_data,
        "patterns": patterns_data,
        "dna": dna,
        "design_tokens": design_tokens,
    }
```

Note: `page_title`, `final_url`, `screenshot_bytes`, `overlay_bytes`, `component_boxes`, `colors_data`, etc. are only defined on the success path; if an exception propagates, the `finally` closes the browser and the exception re-raises to the worker — that is the desired behavior (no zombies).

- [ ] **Step 4: Add job_timeout + failed status to worker.py**

Add env read at top of `backend/worker.py` (after line 20):

```python
ARQ_JOB_TIMEOUT_SECONDS = int(os.getenv("ARQ_JOB_TIMEOUT_SECONDS", "180"))
```

Add a helper after `get_analysis_dir`:

```python
async def _record_failed(ctx, analyze_id: str, message: str):
    redis_conn = ctx.get('pubsub') or ctx['redis']
    try:
        async with AsyncSessionLocal() as session:
            db_analysis = await session.get(AnalysisModel, analyze_id)
            if db_analysis:
                db_analysis.status = "failed"
                db_analysis.error = message
                db_analysis.done = True
                await session.commit()
    except Exception as e:
        logger.error(f"Failed to record failed status for {analyze_id}: {e}")
    try:
        event_data = {"status": "error", "progress": 0, "error": message, "done": True}
        await redis_conn.publish(f"analysis_events:{analyze_id}", json.dumps(event_data))
    except Exception as e:
        logger.error(f"Failed to publish error event for {analyze_id}: {e}")
```

Add a new `except` branch in `run_analysis_task` between the end of the existing `try:` body and the existing `except Exception as e:` at line 164. The inserted block is:

```python
    except asyncio.CancelledError:
        logger.error(f"Analysis task cancelled/timed out for {analyze_id}")
        await asyncio.shield(_record_failed(ctx, analyze_id, "Analysis timed out (ARQ job_timeout exceeded)"))
        raise
```

The resulting control flow is:

```python
    try:
        # Run the async analysis pipeline
        result = await run_analysis(url, progress_callback)
        ...  # (existing body unchanged, lines 76-162)
    except asyncio.CancelledError:
        logger.error(f"Analysis task cancelled/timed out for {analyze_id}")
        await asyncio.shield(_record_failed(ctx, analyze_id, "Analysis timed out (ARQ job_timeout exceeded)"))
        raise
    except Exception as e:
        ...  # (existing handler unchanged, lines 165-184)
```

In `WorkerSettings`, add the field:

```python
class WorkerSettings:
    functions = [run_analysis_task]
    redis_settings = REDIS_SETTINGS
    on_startup = startup
    on_shutdown = shutdown
    job_timeout = ARQ_JOB_TIMEOUT_SECONDS
```

- [ ] **Step 5: Derive SSE_MAX_POLLS in server.py**

In `backend/server.py`, replace lines 35-36:

```python
SSE_POLL_INTERVAL = 0.1
SSE_MAX_POLLS = 3000
```

with:

```python
SSE_POLL_INTERVAL = 0.1
ARQ_JOB_TIMEOUT_SECONDS = int(os.getenv("ARQ_JOB_TIMEOUT_SECONDS", "180"))
SSE_MAX_POLLS = int(ARQ_JOB_TIMEOUT_SECONDS / SSE_POLL_INTERVAL) + 100
```

- [ ] **Step 6: Update .env.example**

Append:

```
# Analysis timeouts (must hold: TIMEOUT_SECONDS < ARQ_JOB_TIMEOUT_SECONDS)
TIMEOUT_SECONDS=30
ARQ_JOB_TIMEOUT_SECONDS=180
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pytest tests/test_timeouts.py -v`
Expected: all PASS.

- [ ] **Step 8: Verify no import regressions**

Run: `python -c "from backend.server import app; from backend.worker import WorkerSettings; print('OK', WorkerSettings.job_timeout)"`
Expected: `OK 180`.

- [ ] **Step 9: Commit**

```bash
git add backend/analyzer/core.py backend/worker.py backend/server.py .env.example tests/test_timeouts.py
git commit -m "feat: align timeouts across Playwright/ARQ/SSE and guarantee browser cleanup"
```

---

### Task 5: MCP SSE/HTTP transport + API-backed resources

**Files:**
- Modify: `backend/mcp_server.py` (transport selector, resource via HTTP API)
- Modify: `backend/server.py` (mount `/mcp`)
- Modify: `.env.example` (add `DESIGN_ORACLE_TRANSPORT`)
- Create: `tests/test_mcp.py`

**Interfaces:**
- Produces: `mcp` FastMCP instance in `backend/mcp_server.py`; `DESIGN_ORACLE_TRANSPORT` env (`stdio` | `sse`); resource `designoracle://{id}/{file}` resolved via HTTP.
- Consumes: nothing from prior tasks.

- [ ] **Step 1: Write failing tests**

`tests/test_mcp.py`:
```python
import httpx
from fastapi.testclient import TestClient

def test_server_mounts_mcp():
    from backend.server import app
    client = TestClient(app)
    paths = [getattr(r, "path", None) for r in app.routes]
    assert "/mcp" in paths

def test_resource_goes_through_api(monkeypatch):
    import backend.mcp_server as m
    calls = {}
    def fake_get(url, timeout):
        calls["url"] = url
        r = httpx.Response(200, text="* result *")
        r.request = httpx.Request("GET", url)
        return r
    monkeypatch.setattr(m.httpx, "get", fake_get)
    out = m.get_analysis_file("abc12345", "result.json")
    assert out == "* result *"
    assert "/api/analyze/abc12345/result" in calls["url"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pip install -q fastapi[standard] 2>/dev/null; pytest tests/test_mcp.py -v`
Expected: FAIL — `/mcp` not mounted; resource still reads local disk.

Note: `httpx` and `fastmcp` are already in `backend/requirements.txt`. `TestClient` needs `httpx` (already present).

- [ ] **Step 3: Add transport selector + API-backed resource to mcp_server.py**

Replace the resource handler (lines 35-44) in `backend/mcp_server.py`:

```python
@mcp.resource("designoracle://{analyze_id}/{filename}")
def get_analysis_file(analyze_id: str, filename: str) -> str:
    """Get a specific analysis file (DESIGN.md, tailwind.config.js, components.jsx, design-tokens.json, result.json)"""
    allowed = ("DESIGN.md", "tailwind.config.js", "components.jsx", "design-tokens.json", "result.json")
    if filename not in allowed:
        raise ValueError(f"Unauthorized or invalid filename: {filename}")

    if filename == "result.json":
        path = f"/api/analyze/{analyze_id}/result"
    elif filename == "design-tokens.json":
        path = f"/api/analyze/{analyze_id}/export/tokens"
    else:
        route = {
            "DESIGN.md": "design.md",
            "tailwind.config.js": "tailwind",
            "components.jsx": "components",
        }[filename]
        path = f"/api/analyze/{analyze_id}/export/{route}"

    r = httpx.get(_api_url(path), timeout=10)
    r.raise_for_status()
    return r.text
```

Add transport handling at the bottom, replacing the `__main__` block (lines 104-105):

```python
TRANSPORT = os.getenv("DESIGN_ORACLE_TRANSPORT", "stdio")


def sse_app():
    return mcp.sse_app()


if __name__ == "__main__":
    mcp.run(transport=TRANSPORT)
```

- [ ] **Step 4: Mount the MCP app in server.py**

Add import at top of `backend/server.py`:

```python
from backend.mcp_server import mcp as mcp_app
```

After `app.add_middleware(...)` block (line 168), add:

```python
app.mount("/mcp", mcp_app.sse_app())
```

- [ ] **Step 5: Add env var to .env.example**

Append:

```
# MCP transport: stdio (default) or sse (exposed at http://localhost:5000/mcp)
DESIGN_ORACLE_TRANSPORT=stdio
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pytest tests/test_mcp.py -v`
Expected: both PASS.

- [ ] **Step 7: Verify server boots with mount**

Run: `python -c "from backend.server import app; print(len(app.routes))"`
Expected: a number ≥ 1, no exceptions.

- [ ] **Step 8: Commit**

```bash
git add backend/mcp_server.py backend/server.py .env.example tests/test_mcp.py
git commit -m "feat: MCP SSE transport, /mcp mount, and API-backed resources"
```

---

### Task 6: Multi-editor MCP configuration

**Files:**
- Modify: `opencode.json.example`
- Modify: `AGENT_PROMPT.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: `/mcp` mount and `DESIGN_ORACLE_URL`/`DESIGN_ORACLE_TRANSPORT` env semantics (Task 5).
- Produces: doc-only; no code.

- [ ] **Step 1: Update opencode.json.example**

Replace the file contents with:

```json
{
  "mcpServers": {
    "design-oracle": {
      "type": "http",
      "url": "http://localhost:5000/mcp"
    }
  }
}
```

- [ ] **Step 2: Add multi-editor snippets to AGENT_PROMPT.md**

Replace the final JSON code block (lines 46-60) with the following section:

````markdown
## Configuration by tool

The MCP server ships with two transports. Prefer **HTTP (SSE)** when the
FastAPI backend is running (Docker or local), so no local paths are needed.

### opencode

`opencode.json` (project root):

```json
{
  "mcpServers": {
    "design-oracle": {
      "type": "http",
      "url": "http://localhost:5000/mcp"
    }
  }
}
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "design-oracle": {
      "type": "http",
      "url": "http://localhost:5000/mcp"
    }
  }
}
```

### Claude Code

```bash
claude mcp add design-oracle --transport http http://localhost:5000/mcp
```

### Local (stdio) alternative

Only if the backend is not reachable over HTTP:

```json
{
  "mcpServers": {
    "design-oracle": {
      "command": "uvx",
      "args": ["design-oracle-mcp"],
      "env": {
        "DESIGN_ORACLE_URL": "http://localhost:5000"
      }
    }
  }
}
```
````

- [ ] **Step 3: Update README.md MCP section**

Replace the `## MCP Server` section (lines 114-122) with:

````markdown
## MCP Server

The backend exposes the MCP server over HTTP (SSE) at `http://localhost:5000/mcp`,
or you can run it standalone in stdio mode:

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 backend/mcp_server.py
```

Configure in your AI tool with the HTTP URL (no local paths required):

| Tool | Location | Snippet |
|------|----------|---------|
| opencode | `opencode.json` | `{"type": "http", "url": "http://localhost:5000/mcp"}` under `mcpServers.design-oracle` |
| Cursor | `.cursor/mcp.json` | same shape as opencode |
| Claude Code | CLI | `claude mcp add design-oracle --transport http http://localhost:5000/mcp` |

Transport is selected with `DESIGN_ORACLE_TRANSPORT` (`stdio` default, `sse`).
The API base URL is `DESIGN_ORACLE_URL` (default `http://localhost:5000`).
See [AGENT_PROMPT.md](AGENT_PROMPT.md) for the full per-tool snippets.
````

- [ ] **Step 4: Add anti-bot limitations to README.md**

In the `## Known limitations` section (line 149), replace the line:

```
- Sites with bot protection (Cloudflare, etc.) may block Playwright
```

with:

```
- Sites with bot protection (Cloudflare, etc.) may block Playwright. The
  optional `STEALTH_MODE=true` mode injects JS evasions that bypass basic and
  intermediate protections, but Cloudflare Enterprise, Akamai, and Incapsula may
  still require CAPTCHA solving or paid residential proxies — not covered.
  Stealth slightly increases page load time.
```

- [ ] **Step 5: Verify docs render**

Run: `grep -n "claude mcp add" AGENT_PROMPT.md README.md && grep -n '"type": "http"' opencode.json.example`
Expected: matches in both files.

- [ ] **Step 6: Commit**

```bash
git add opencode.json.example AGENT_PROMPT.md README.md
git commit -m "docs: multi-editor MCP configs and honest anti-bot limitations"
```

---

### Task 7: Lightweight `design-oracle-mcp` PyPI package

**Files:**
- Create: `clients/design-oracle-mcp/pyproject.toml`
- Create: `clients/design-oracle-mcp/README.md`
- Create: `clients/design-oracle-mcp/design_oracle_mcp/__init__.py`
- Create: `clients/design-oracle-mcp/design_oracle_mcp/server.py`
- Create: `tests/test_cli_package.py`
- Modify: `README.md` (publishing + uvx usage)

**Interfaces:**
- Produces: `design-oracle-mcp` console entry point; module `design_oracle_mcp.server` with `main()` and a FastMCP instance named `mcp`.
- Consumes: backend HTTP API only (no Playwright).

- [ ] **Step 1: Write failing tests**

`tests/test_cli_package.py`:
```python
def test_package_imports_without_playwright():
    import design_oracle_mcp.server as s
    assert s.BASE_URL == "http://localhost:5000"

def test_package_api_url_helper():
    from design_oracle_mcp.server import _api_url
    assert _api_url("/api/health") == "http://localhost:5000/api/health"

def test_package_has_tools():
    from design_oracle_mcp import server as s
    names = {tool.name for tool in s.mcp.list_tools()}
    assert {"analyze_website", "get_status", "get_result", "list_analyses",
            "export_design_md", "export_tailwind", "export_components"} <= names
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pytest tests/test_cli_package.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'design_oracle_mcp'`.

- [ ] **Step 3: Create the package files**

`clients/design-oracle-mcp/pyproject.toml`:
```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "design-oracle-mcp"
version = "0.1.0"
description = "Lightweight MCP client for Design Oracle (HTTP only, no Playwright)"
readme = "README.md"
requires-python = ">=3.10"
license = { text = "MIT" }
dependencies = [
    "fastmcp>=2.0.0",
    "httpx>=0.28",
]

[project.scripts]
design-oracle-mcp = "design_oracle_mcp.server:main"

[tool.hatch.build.targets.wheel]
packages = ["design_oracle_mcp"]
```

`clients/design-oracle-mcp/README.md`:
```markdown
# design-oracle-mcp

Lightweight MCP client for the [Design Oracle](https://github.com/jomvick/design-oracle)
backend. Talks to the FastAPI backend over HTTP — **no Playwright, no Chromium**,
so it installs and starts in seconds.

## Usage

```bash
uvx design-oracle-mcp
```

Or install locally:

```bash
pip install design-oracle-mcp
design-oracle-mcp
```

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `DESIGN_ORACLE_URL` | `http://localhost:5000` | Backend API base URL |

## Publishing to PyPI

```bash
cd clients/design-oracle-mcp
python -m pip install --upgrade build twine
python -m build
python -m twine upload dist/*
```
```

`clients/design-oracle-mcp/design_oracle_mcp/__init__.py`:
```python
__version__ = "0.1.0"
```

`clients/design-oracle-mcp/design_oracle_mcp/server.py`:
```python
import json
import os

import httpx
from fastmcp import FastMCP

BASE_URL = os.getenv("DESIGN_ORACLE_URL", "http://localhost:5000")

mcp = FastMCP("design-oracle")


def _api_url(path: str) -> str:
    return f"{BASE_URL}{path}"


@mcp.tool()
def analyze_website(url: str) -> str:
    """Start a new website design analysis"""
    r = httpx.post(_api_url("/api/analyze"), json={"url": url}, timeout=30)
    r.raise_for_status()
    return json.dumps(r.json())


@mcp.tool()
def get_status(analyze_id: str) -> str:
    """Get analysis progress and status"""
    r = httpx.get(_api_url(f"/api/analyze/{analyze_id}/status"), timeout=10)
    r.raise_for_status()
    return json.dumps(r.json())


@mcp.tool()
def get_result(analyze_id: str) -> str:
    """Get the complete analysis result JSON"""
    r = httpx.get(_api_url(f"/api/analyze/{analyze_id}/result"), timeout=10)
    r.raise_for_status()
    return json.dumps(r.json())


@mcp.tool()
def list_analyses() -> str:
    """List all completed analyses"""
    r = httpx.get(_api_url("/api/designs"), timeout=10)
    r.raise_for_status()
    return json.dumps(r.json(), indent=2)


@mcp.tool()
def export_design_md(analyze_id: str) -> str:
    """Export DESIGN.md for an analysis"""
    r = httpx.get(_api_url(f"/api/analyze/{analyze_id}/export/design.md"), timeout=10)
    r.raise_for_status()
    return r.text


@mcp.tool()
def export_tailwind(analyze_id: str) -> str:
    """Export tailwind.config.js for an analysis"""
    r = httpx.get(_api_url(f"/api/analyze/{analyze_id}/export/tailwind"), timeout=10)
    r.raise_for_status()
    return r.text


@mcp.tool()
def export_components(analyze_id: str) -> str:
    """Export React components JSX for an analysis"""
    r = httpx.get(_api_url(f"/api/analyze/{analyze_id}/export/components"), timeout=10)
    r.raise_for_status()
    return r.text


def main():
    mcp.run()


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pytest tests/test_cli_package.py -v`
Expected: all PASS (conftest adds `clients/design-oracle-mcp` to `sys.path`).

- [ ] **Step 5: Verify the console script installs**

Run: `pip install -e ./clients/design-oracle-mcp && which design-oracle-mcp && design-oracle-mcp --help`
Expected: path to `design-oracle-mcp` printed. (`--help` output behavior depends on FastMCP; if it starts a server instead, Ctrl+C and treat the install as verified.)

- [ ] **Step 6: Update root README.md**

Add a subsection under `## MCP Server`:

````markdown
### Lightweight CLI (`uvx`)

A thin MCP client that calls the backend over HTTP — no Playwright/Chromium:

```bash
uvx design-oracle-mcp
```

The package is published on PyPI as `design-oracle-mcp`. Source lives in
`clients/design-oracle-mcp/`. Set `DESIGN_ORACLE_URL` if the backend is not at
`http://localhost:5000`.
````

- [ ] **Step 7: Commit**

```bash
git add clients/design-oracle-mcp tests/test_cli_package.py README.md
git commit -m "feat: publish design-oracle-mcp lightweight MCP client (PyPI)"
```

---

### Task 8: Full verification pass

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Run full backend test suite**

Run: `pytest tests/ -v`
Expected: all tests PASS (colors, layout filter, stealth, timeouts, mcp, cli package).

- [ ] **Step 2: Run backend import/CI check**

Run: `python -c "from backend.server import app; from backend.worker import WorkerSettings; print('OK')"`
Expected: `OK`.

- [ ] **Step 3: Run frontend lint + build (unchanged surface)**

Run: `npm run lint --prefix frontend && npm run build --prefix frontend`
Expected: lint clean, build succeeds (frontend is untouched by this plan).

- [ ] **Step 4: Manual smoke — verify a real analysis completes**

If a stack is available (`podman compose up --build -d` or `./start.sh`):

```bash
curl -s -X POST http://localhost:5000/api/analyze -H 'Content-Type: application/json' -d '{"url": "https://example.com"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['analyze_id'])"
```

then poll `GET /api/analyze/{id}/status` until `status` is `complete` or `error`/`failed`. Confirm no zombie Chromium remains:

```bash
pgrep -af chromium | grep -v grep || echo "no chromium processes"
```

- [ ] **Step 5: No-op commit guard**

If any stray file was touched, clean it up (`git status --short` should list only intended files from the tasks above). Do not commit unless a change is outstanding.
