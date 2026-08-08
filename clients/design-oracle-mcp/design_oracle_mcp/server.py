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
def get_presets() -> str:
    """List curated inspiration presets from the backend"""
    r = httpx.get(_api_url("/api/presets"), timeout=10)
    r.raise_for_status()
    return r.text


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
