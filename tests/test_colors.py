from backend.analyzer.colors import normalize_color, parse_color

def test_normalize_rgb():
    assert normalize_color("rgb(37, 99, 235)") == "#2563eb"

def test_normalize_named():
    assert normalize_color("white") == "#ffffff"

def test_normalize_rgba_keeps_hex_and_alpha():
    assert normalize_color("rgba(37, 99, 235, 0.8)") == "#2563eb"
    c = parse_color("rgba(37, 99, 235, 0.8)")
    assert c["hex"] == "#2563eb"
    assert c["alpha"] == 0.8
    assert c["raw"] == "rgba(37, 99, 235, 0.8)"

def test_normalize_hex8_alpha():
    c = parse_color("#2563ebcc")
    assert c["hex"] == "#2563eb"
    assert c["alpha"] == 0.8

def test_normalize_hsl_primary():
    assert normalize_color("hsl(221, 83%, 53%)") == "#2463eb"

def test_normalize_hsl_edges():
    assert normalize_color("hsl(0, 0%, 100%)") == "#ffffff"
    assert normalize_color("hsl(120, 100%, 50%)") == "#00ff00"
    assert normalize_color("hsl(0, 0%, 0%)") == "#000000"

def test_normalize_hsla():
    c = parse_color("hsla(120, 100%, 50%, 0.5)")
    assert c["hex"] == "#00ff00"
    assert c["alpha"] == 0.5

def test_normalize_invalid_returns_none():
    assert normalize_color("not-a-color") is None
    assert parse_color("") is None

def test_normalize_malformed_rgb_var_returns_none():
    assert normalize_color("rgb(var(--x))") is None
    assert parse_color("rgb(var(--x))") is None

def test_normalize_malformed_empty_rgb_returns_none():
    assert normalize_color("rgb()") is None
    assert normalize_color("rgba()") is None
    assert normalize_color("hsl()") is None

def test_normalize_short_rgb_returns_none():
    assert normalize_color("rgb(255)") is None
    assert normalize_color("rgba(255, 0)") is None

def test_normalize_rgb_space_syntax():
    assert normalize_color("rgb(255 0 0)") == "#ff0000"
