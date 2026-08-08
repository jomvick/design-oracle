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
