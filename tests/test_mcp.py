import httpx
from fastapi.testclient import TestClient

def test_server_mounts_mcp():
    from backend.server import app
    client = TestClient(app)
    paths = [getattr(r, "path", None) for r in app.routes]
    assert "/mcp" in paths

def test_mcp_has_presets_tool():
    import asyncio

    from backend import mcp_server as ms

    async def _names():
        return {t.name for t in await ms.mcp.list_tools()}

    assert "get_presets" in asyncio.run(_names())

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
