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
