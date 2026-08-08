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


import asyncio
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
