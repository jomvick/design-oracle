def test_package_imports_without_playwright():
    import design_oracle_mcp.server as s
    assert s.BASE_URL == "http://localhost:5000"


def test_package_api_url_helper():
    from design_oracle_mcp.server import _api_url
    assert _api_url("/api/health") == "http://localhost:5000/api/health"


def test_package_has_tools():
    import asyncio

    from design_oracle_mcp import server as s

    async def _names():
        return {tool.name for tool in await s.mcp.list_tools()}

    names = asyncio.run(_names())
    assert {"analyze_website", "get_status", "get_result", "list_analyses",
            "export_design_md", "export_tailwind", "export_components"} <= names


def test_cli_has_presets_tool():
    import asyncio

    from design_oracle_mcp import server as s

    async def _names():
        return {t.name for t in await s.mcp.list_tools()}

    assert "get_presets" in asyncio.run(_names())
