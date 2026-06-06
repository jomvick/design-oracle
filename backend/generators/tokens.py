def generate_design_tokens_json(colors, typography, spacing, radius, dna):
    palette = colors.get("palette", {})
    tokens = {
        "meta": {
            "style": dna.get("style"),
            "confidence": dna.get("style_confidence"),
            "visual_score": dna.get("visual_score"),
            "accessibility": dna.get("accessibility"),
        },
        "color": {
            "primary": palette.get("primary"),
            "secondary": palette.get("secondary"),
            "accent": palette.get("accent"),
            "success": palette.get("success"),
            "warning": palette.get("warning"),
            "error": palette.get("error"),
            "background": palette.get("background_light"),
            "surface": palette.get("background_dark"),
            "text": palette.get("text_primary"),
        },
        "typography": {
            "families": typography.get("families", []),
            "primary": typography.get("primary_font"),
            "secondary": typography.get("secondary_font"),
            "headings": {
                k: {"size": v.get("size"), "weight": v.get("weight")}
                for k, v in (typography.get("headings") or {}).items()
                if v and v.get("size")
            },
        },
        "spacing": {
            "scale": spacing.get("scale", []) if spacing else [],
        },
        "border_radius": {
            "scale": radius.get("radii", []) if radius else [],
        },
        "shadows": (radius.get("shadows", []) if radius else [])[:5],
    }
    tokens["color"] = {k: v for k, v in tokens["color"].items() if v is not None}
    return tokens
