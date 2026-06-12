from .colors import hex_to_rgb, estimate_contrast_ratio

def generate_design_dna(
    colors: dict, typography: dict, components: list,
    layout: dict, patterns: list,
    spacing: dict = None, radius: dict = None,
) -> dict:
    style_classifications = {
        "Modern SaaS": ["tailwind", "vercel", "linear", "stripe", "notion", "figma"],
        "Apple-like": ["apple", "minimal", "clean", "white-space", "san-francisco"],
        "Minimal": ["minimal", "clean", "white", "airy", "simple"],
        "Corporate": ["enterprise", "business", "professional", "corporate", "global"],
        "Startup": ["startup", "launch", "growth", "scale", "disrupt"],
        "E-commerce": ["shopify", "woocommerce", "product", "cart", "shop", "store"],
        "Blog/Content": ["blog", "article", "medium", "substack", "ghost", "magazine"],
        "Landing Page": ["landing", "lp-", "hero", "lead", "conversion", "funnel"],
        "Documentation": ["docs", "documentation", "api-ref", "swagger", "reference"],
        "Agency/Portfolio": ["portfolio", "agency", "studio", "showcase", "work", "creative"],
        "SaaS Dashboard": ["dashboard", "analytics", "metrics", "stats", "admin", "panel"],
        "Glassmorphism": ["glass", "blur", "backdrop", "frost", "transparent"],
        "Neo Brutalism": ["brutal", "bold", "thick", "border", "shadow"],
    }

    domain_scores = {k: 0 for k in style_classifications}

    high_conf_comps = [c for c in components if isinstance(c, dict) and c.get("confidence", 0) > 70]
    comp_types = [c["type"] for c in high_conf_comps]

    if "hero" in comp_types:
        domain_scores["Landing Page"] += 2
        domain_scores["Modern SaaS"] += 1
        domain_scores["Startup"] += 1
    if "pricing" in comp_types:
        domain_scores["Modern SaaS"] += 2
        domain_scores["Landing Page"] += 1
        domain_scores["Startup"] += 1
    if "features" in comp_types:
        domain_scores["Modern SaaS"] += 2
        domain_scores["Landing Page"] += 1
        domain_scores["Startup"] += 1
    if "blog" in comp_types:
        domain_scores["Blog/Content"] += 3
    if "faq" in comp_types:
        domain_scores["Landing Page"] += 1
        domain_scores["SaaS Dashboard"] += 1
    if "stats" in comp_types:
        domain_scores["SaaS Dashboard"] += 2
    if "contact" in comp_types:
        domain_scores["Corporate"] += 1

    if layout.get("uses_grid"):
        domain_scores["Modern SaaS"] += 1
        domain_scores["Apple-like"] += 1

    # Detect style from colors
    palette = colors.get("palette", {})
    if palette.get("primary"):
        rgb = hex_to_rgb(palette["primary"])
        is_blue = rgb[2] > rgb[0] and rgb[2] > rgb[1]
        is_purple = rgb[0] > 100 and rgb[2] > 100 and abs(rgb[0] - rgb[2]) < 50
        if is_blue:
            domain_scores["Modern SaaS"] += 2
            domain_scores["Corporate"] += 1
        if is_purple:
            domain_scores["Startup"] += 1
            domain_scores["Modern SaaS"] += 1

    # Detect from spacing/radius
    if spacing:
        s = spacing.get("scale", [])
        if s and max(s) > 48:
            domain_scores["Apple-like"] += 1
            domain_scores["Minimal"] += 1
    if radius:
        r = radius.get("radii", [])
        if any(v >= 16 for v in r):
            domain_scores["Modern SaaS"] += 1
            domain_scores["Startup"] += 1
        if any(v >= 24 for v in r):
            domain_scores["Apple-like"] += 1

    # Detect glassmorphism
    radius_shadows = radius.get("shadows", []) if radius else []
    if any("backdrop" in str(s).lower() for s in radius_shadows):
        domain_scores["Glassmorphism"] += 3
    # Check for blur in CSS
    if "blur(" in str(radius_shadows):
        domain_scores["Glassmorphism"] += 2

    best_style = max(domain_scores, key=domain_scores.get)
    best_score = domain_scores[best_style]
    confidence = min(50 + best_score * 10, 96)

    color_count = colors.get("count", 0)
    if color_count > 20:
        complexity = "High"
    elif color_count > 8:
        complexity = "Medium"
    else:
        complexity = "Low"

    density = "Balanced"
    if layout.get("sections_count", 0) > 15:
        density = "Dense"
    elif layout.get("sections_count", 0) < 5:
        density = "Sparse"

    aa_pass = True
    if colors.get("palette", {}).get("text_primary") and colors.get("palette", {}).get("background_light"):
        ratio = estimate_contrast_ratio(
            colors["palette"]["text_primary"],
            colors["palette"]["background_light"],
        )
        aa_pass = ratio >= 4.5

    visual_score = 7.0
    if len(typography.get("families", [])) >= 1:
        visual_score += 0.5
    if len(typography.get("families", [])) <= 2:
        visual_score += 0.3
    if layout.get("max_container_width", 0) > 0:
        visual_score += 0.3
    if layout.get("uses_grid") or layout.get("uses_flexbox"):
        visual_score += 0.3
    if aa_pass:
        visual_score += 0.3
    if patterns:
        visual_score += min(len(patterns) * 0.2, 1.0)
    visual_score = min(round(visual_score, 1), 10.0)

    return {
        "style": best_style,
        "style_confidence": confidence,
        "complexity": complexity,
        "density": density,
        "accessibility": "AA+" if aa_pass else "AA-",
        "visual_score": f"{visual_score}/10",
        "summary": generate_summary(colors, typography, components, layout, best_style),
        "visual_rules": generate_visual_rules(colors, typography, layout, aa_pass, spacing, radius),
    }


def generate_summary(colors, typography, components, layout, style):
    parts = []
    palette = colors.get("palette", {})

    parts.append(f"The site uses a {style.lower()} design style")

    if palette.get("primary"):
        parts.append(f"with {palette['primary']} as primary color")

    if typography.get("primary_font"):
        parts.append(f"and {typography['primary_font']} for typography")

    if layout.get("responsive"):
        parts.append("It is fully responsive")
    else:
        parts.append("It has limited responsive support")

    if layout.get("uses_grid") or layout.get("uses_flexbox"):
        parts.append(f"using {'grid' if layout.get('uses_grid') else ''}"
                     f"{' and ' if layout.get('uses_grid') and layout.get('uses_flexbox') else ''}"
                     f"{'flexbox' if layout.get('uses_flexbox') else ''} layout")

    comp_count = len([c for c in components if isinstance(c, dict) and c.get("confidence", 0) > 60])
    if comp_count > 0:
        parts.append(f"with {comp_count} identifiable components")

    return ". ".join(parts) + "."


def generate_visual_rules(colors, typography, layout, aa_pass, spacing=None, radius=None):
    rules = []
    palette = colors.get("palette", {})

    if palette.get("text_primary") and palette.get("background_light"):
        ratio = estimate_contrast_ratio(
            palette["text_primary"],
            palette["background_light"],
        )
        if ratio > 7:
            rules.append("High contrast hierarchy")
        elif ratio > 4.5:
            rules.append("Moderate contrast ratio")

    if layout.get("max_container_width", 0) > 800:
        rules.append("Large whitespace / wide containers")
    elif layout.get("max_container_width", 0) > 0:
        rules.append("Contained, readable layout")

    if palette.get("primary"):
        rgb = hex_to_rgb(palette["primary"])
        is_blue = rgb[2] > rgb[0] and rgb[2] > rgb[1] - 20
        is_green = rgb[1] > rgb[0] and rgb[1] > rgb[2]
        is_red = rgb[0] > rgb[1] and rgb[0] > rgb[2]
        if is_blue:
            rules.append("Blue trust colors — common in SaaS")
        elif is_green:
            rules.append("Green growth-oriented palette")
        elif is_red:
            rules.append("Red energetic accent colors")

    if layout.get("sticky_elements"):
        rules.append("Sticky navigation header")

    if aa_pass:
        rules.append("AA accessible contrast")

    if layout.get("uses_grid"):
        rules.append("Grid-based layout structure")

    if layout.get("uses_flexbox"):
        rules.append("Flexbox alignment system")

    if colors.get("custom_properties"):
        rules.append("CSS custom properties for theming")

    if spacing:
        s = spacing.get("scale", [])
        if s:
            rules.append(f"Spacing scale: {', '.join(str(x) for x in s[:6])}{'...' if len(s)>6 else ''}px")
    if radius:
        r = radius.get("radii", [])
        if r:
            max_r = max(r)
            rules.append(f"Border radius up to {max_r}px")
    if radius and radius.get("shadows"):
        rules.append("Box shadows used for depth")

    return rules
