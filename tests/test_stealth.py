from backend.analyzer.stealth import stealth_init_script

def test_stealth_removes_webdriver():
    assert "webdriver" in stealth_init_script()

def test_stealth_stubs_chrome():
    js = stealth_init_script()
    assert "window.chrome" in js
    assert "loadTimes" in js

def test_stealth_fakes_plugins():
    js = stealth_init_script()
    assert "plugins" in js
    assert "languages" in js

def test_stealth_patches_webgl():
    assert "WebGLRenderingContext" in stealth_init_script()

def test_stealth_uses_headless_proof_js_syntax():
    js = stealth_init_script().strip()
    assert js.startswith("Object.defineProperty")
    assert js.endswith(";")
