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
