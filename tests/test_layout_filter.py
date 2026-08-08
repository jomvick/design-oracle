from backend.analyzer.layout import visible_element_filter_js

def test_filter_defines_relevant():
    js = visible_element_filter_js()
    assert "isVisible" in js
    assert "isSemantic" in js
    assert "const relevant" in js

def test_filter_covers_semantic_tags():
    js = visible_element_filter_js()
    for tag in ["h1", "p", "button", "a", "input", "header", "nav", "main", "section", "article", "footer"]:
        assert tag in js

def test_filter_covers_card_containers():
    assert "card" in visible_element_filter_js()
    assert "panel" in visible_element_filter_js()

def test_filter_skips_hidden():
    js = visible_element_filter_js()
    assert "display" in js and "none" in js
    assert "offsetParent" in js
