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
TRANSPORT = os.getenv("DESIGN_ORACLE_TRANSPORT", "stdio")

mcp = FastMCP("design-oracle")


# ── Helpers ──

def _api_url(path: str) -> str:
    return f"{BASE_URL}{path}"


def _list_analyses():
    try:
        r = httpx.get(_api_url("/api/designs"), timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error("Failed to query designs from API: %s", e)
        return []


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
    mcp.run(transport=TRANSPORT)
