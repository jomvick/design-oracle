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
