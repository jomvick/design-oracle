from bs4 import BeautifulSoup

UX_PATTERNS = [
    ("Sticky Navbar", "navigation stays visible while scrolling", "navbar", ["sticky", "fixed"]),
    ("Social Proof", "logos, testimonials, or user count to build trust", "testimonials", ["testimonial", "social-proof"]),
    ("Pricing Section", "comparison of subscription plans or tiers", "pricing", ["pricing"]),
    ("FAQ Accordion", "expandable questions and answers", "faq", ["faq"]),
    ("Newsletter CTA", "email subscription call-to-action", "newsletter", ["newsletter"]),
    ("Multi-step Funnel", "progressive disclosure or wizard interface", None, []),
    ("Hero Section", "large header with main value proposition", "hero", ["hero"]),
    ("Feature Grid", "grid of product/service capabilities", "features", ["features"]),
    ("Footer Links", "comprehensive footer with navigation links", "footer", ["footer"]),
    ("Dark Mode", "dark color scheme support", None, []),
    ("Animation/Parallax", "scroll-triggered animations or parallax", None, []),
    ("Search Bar", "site search functionality visible", None, []),
]


def detect_ux_patterns(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    found = []
    html_lower = html.lower()

    for name, description, comp_type, keywords in UX_PATTERNS:
        confidence = 0

        if comp_type:
            for tag in soup.find_all(["section", "div", "nav", "header", "footer"]):
                cls = " ".join(tag.get("class", [])).lower()
                id_ = tag.get("id", "").lower()
                if any(k in cls or k in id_ for k in keywords):
                    confidence = max(confidence, 75)

        if any(k in html_lower for k in (keywords + [name.lower().replace(" ", "-")])):
            confidence = max(confidence, 50)

        if name == "Sticky Navbar":
            sticky_selectors = ["position: sticky", "position: fixed", "sticky", "fixed top"]
            if any(s in html_lower for s in sticky_selectors):
                confidence = max(confidence, 70)

        if name == "Dark Mode":
            if "dark" in html_lower or "prefers-color-scheme" in html_lower:
                confidence = max(confidence, 60)

        if name == "Search Bar":
            if soup.find("input", type="search") or any(
                "search" in " ".join(t.get("class", [])).lower() for t in soup.find_all(["input", "div"])
            ):
                confidence = max(confidence, 75)

        if name == "Animation/Parallax":
            if any(k in html_lower for k in ["animation", "transition", "transform", "parallax", "scroll"]):
                confidence = max(confidence, 50)

        if name == "Multi-step Funnel":
            if any(k in html_lower for k in ["step", "wizard", "progress-bar", "multi-step"]):
                confidence = max(confidence, 60)

        if confidence >= 40:
            found.append({
                "name": name,
                "description": description,
                "confidence": min(confidence, 98),
            })

    found.sort(key=lambda x: -x["confidence"])
    return found


