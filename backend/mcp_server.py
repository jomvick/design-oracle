import json
import logging
import os
from pathlib import Path

import httpx
from fastmcp import FastMCP

logger = logging.getLogger(__name__)

BASE = Path(__file__).resolve().parent.parent
ANALYSES_DIR = BASE / "analyses"

BASE_URL = os.getenv("DESIGN_ORACLE_URL", "http://localhost:5000")

mcp = FastMCP("design-oracle")


# ── Helpers ──

def _api_url(path: str) -> str:
    return f"{BASE_URL}{path}"


def _list_analyses():
    results = []
    if ANALYSES_DIR.exists():
        for d in sorted(ANALYSES_DIR.iterdir(), reverse=True):
            rp = d / "result.json"
            if rp.exists():
                try:
                    data = json.loads(rp.read_text(encoding="utf-8"))
                    results.append({
                        "id": d.name,
                        "url": data.get("url", ""),
                        "title": data.get("title", ""),
                        "style": data.get("dna", {}).get("style"),
                        "visual_score": data.get("dna", {}).get("visual_score"),
                    })
                except Exception as e:
                    logger.warning("Failed to read analysis %s: %s", d.name, e)
    return results


# ── Tools ──

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
    return json.dumps(_list_analyses(), indent=2)


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


if __name__ == "__main__":
    mcp.run()
