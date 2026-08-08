import re
import math
from bs4 import BeautifulSoup

COLOR_NAMES = {
    "aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff",
    "aquamarine": "#7fffd4", "azure": "#f0ffff", "beige": "#f5f5dc",
    "bisque": "#ffe4c4", "black": "#000000", "blanchedalmond": "#ffebcd",
    "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a",
    "burlywood": "#deb887", "cadetblue": "#5f9ea0", "chartreuse": "#7fff00",
    "chocolate": "#d2691e", "coral": "#ff7f50", "cornflowerblue": "#6495ed",
    "cornsilk": "#fff8dc", "crimson": "#dc143c", "cyan": "#00ffff",
    "darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b",
    "darkgray": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b",
    "darkmagenta": "#8b008b", "darkolivegreen": "#556b2f", "darkorange": "#ff8c00",
    "darkorchid": "#9932cc", "darkred": "#8b0000", "darksalmon": "#e9967a",
    "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f",
    "darkturquoise": "#00ced1", "darkviolet": "#9400d3", "deeppink": "#ff1493",
    "deepskyblue": "#00bfff", "dimgray": "#696969", "dodgerblue": "#1e90ff",
    "firebrick": "#b22222", "floralwhite": "#fffaf0", "forestgreen": "#228b22",
    "fuchsia": "#ff00ff", "gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff",
    "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080",
    "green": "#008000", "greenyellow": "#adff2f", "honeydew": "#f0fff0",
    "hotpink": "#ff69b4", "indianred": "#cd5c5c", "indigo": "#4b0082",
    "ivory": "#fffff0", "khaki": "#f0e68c", "lavender": "#e6e6fa",
    "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd",
    "lightblue": "#add8e6", "lightcoral": "#f08080", "lightcyan": "#e0ffff",
    "lightgoldenrodyellow": "#fafad2", "lightgray": "#d3d3d3", "lightgreen": "#90ee90",
    "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa",
    "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightsteelblue": "#b0c4de",
    "lightyellow": "#ffffe0", "lime": "#00ff00", "limegreen": "#32cd32",
    "linen": "#faf0e6", "magenta": "#ff00ff", "maroon": "#800000",
    "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3",
    "mediumpurple": "#9370db", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee",
    "mediumspringgreen": "#00fa9a", "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585",
    "midnightblue": "#191970", "mintcream": "#f5fffa", "mistyrose": "#ffe4e1",
    "moccasin": "#ffe4b5", "navajowhite": "#ffdead", "navy": "#000080",
    "oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23",
    "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6",
    "palegoldenrod": "#eee8aa", "palegreen": "#98fb98", "paleturquoise": "#afeeee",
    "palevioletred": "#db7093", "papayawhip": "#ffefd5", "peachpuff": "#ffdab9",
    "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd",
    "powderblue": "#b0e0e6", "purple": "#800080", "rebeccapurple": "#663399",
    "red": "#ff0000", "rosybrown": "#bc8f8f", "royalblue": "#4169e1",
    "saddlebrown": "#8b4513", "salmon": "#fa8072", "sandybrown": "#f4a460",
    "seagreen": "#2e8b57", "seashell": "#fff5ee", "sienna": "#a0522d",
    "silver": "#c0c0c0", "skyblue": "#87ceeb", "slateblue": "#6a5acd",
    "slategray": "#708090", "snow": "#fffafa", "springgreen": "#00ff7f",
    "steelblue": "#4682b4", "tan": "#d2b48c", "teal": "#008080",
    "thistle": "#d8bfd8", "tomato": "#ff6347", "turquoise": "#40e0d0",
    "violet": "#ee82ee", "wheat": "#f5deb3", "white": "#ffffff",
    "whitesmoke": "#f5f5f5", "yellow": "#ffff00", "yellowgreen": "#9acd32",
}

RE_HEX = re.compile(r"#([0-9a-fA-F]{3,8})\b")
RE_RGB = re.compile(r"rgb(a?)\(([^)]+)\)")
RE_HSL = re.compile(r"hsl(a?)\(([^)]+)\)")
RE_VAR = re.compile(r"var\(--([^)]+)\)")
RE_CUSTOM_PROP = re.compile(r"--([a-zA-Z0-9-]+)\s*:\s*([^;]+)")


def hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    h = h % 360
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if h < 60:
        r, g, b = c, x, 0
    elif h < 120:
        r, g, b = x, c, 0
    elif h < 180:
        r, g, b = 0, c, x
    elif h < 240:
        r, g, b = 0, x, c
    elif h < 300:
        r, g, b = x, 0, c
    else:
        r, g, b = c, 0, x
    return round((r + m) * 255), round((g + m) * 255), round((b + m) * 255)


def parse_color(raw: str) -> dict | None:
    raw = raw.strip().lower()
    if raw in COLOR_NAMES:
        raw = COLOR_NAMES[raw]

    m = RE_HEX.match(raw)
    if m:
        h = m.group(1)
        alpha = None
        if len(h) in (3, 4):
            h = "".join(c * 2 for c in h)
        if len(h) == 8:
            alpha = round(int(h[6:8], 16) / 255, 3)
            h = h[:6]
        return {"hex": f"#{h.lower()}", "alpha": alpha, "raw": raw}

    m = RE_RGB.match(raw)
    if m:
        parts = re.findall(r"[\d.]+", m.group(2))
        nums = [float(p) for p in parts[:3]]
        alpha = float(parts[3]) if len(parts) > 3 and m.group(1) else None
        return {
            "hex": f"#{int(nums[0]):02x}{int(nums[1]):02x}{int(nums[2]):02x}",
            "alpha": alpha,
            "raw": raw,
        }

    m = RE_HSL.match(raw)
    if m:
        parts = re.findall(r"[\d.]+", m.group(2))
        r, g, b = hsl_to_rgb(float(parts[0]), float(parts[1]) / 100, float(parts[2]) / 100)
        alpha = float(parts[3]) if len(parts) > 3 and m.group(1) else None
        return {"hex": f"#{r:02x}{g:02x}{b:02x}", "alpha": alpha, "raw": raw}

    return None


def normalize_color(raw: str) -> str | None:
    c = parse_color(raw)
    return c["hex"] if c else None


def luminance(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    if len(h) != 6:
        return 0
    r, g, b = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def classify_color(hex_color: str) -> str:
    lum = luminance(hex_color)
    if lum < 0.1:
        return "dark"
    if lum < 0.35:
        return "muted-dark"
    if lum < 0.65:
        return "mid"
    if lum < 0.85:
        return "muted-light"
    return "light"


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def color_distance(c1: str, c2: str) -> float:
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    return math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2)


def dedupe_colors(colors: list[dict], threshold=30) -> list[dict]:
    kept = []
    for c in colors:
        h = c["hex"]
        dup = False
        for k in kept:
            if color_distance(h, k["hex"]) < threshold:
                dup = True
                break
        if not dup:
            kept.append(c)
    return kept


def estimate_contrast_ratio(c1: str, c2: str) -> float:
    l1 = luminance(c1)
    l2 = luminance(c2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def is_light(hex_color: str) -> bool:
    return luminance(hex_color) > 0.5


def classify_semantic_color(hex_color: str, all_hex: list[str]) -> str:
    rgb = hex_to_rgb(hex_color)
    r, g, b = rgb

    # Check if color is a neutral / gray
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    saturation = (max_c - min_c) / max_c if max_c > 0 else 0

    is_neutral = saturation < 0.25 or (
        abs(r - g) < 30 and abs(g - b) < 30 and abs(r - b) < 30
    )

    lum = luminance(hex_color)

    if is_neutral:
        if lum > 0.9:
            return "neutral-light"
        if lum < 0.1:
            return "neutral-dark"
        return "neutral"

    # Check if red-ish (error/warning)
    if r > 180 and g < 120 and b < 120:
        if lum < 0.4:
            return "error"
        if lum < 0.7:
            return "warning"

    # Check if green (success)
    if g > r and g > b and g > 120 and saturation > 0.3:
        return "success"

    # Dominant channel analysis
    if b > r and b > g and b > 150:
        return "primary-blue"
    if b > 100 and g > 100 and r < 150:
        return "primary-teal"
    if r > g and r > b and r > 150:
        if saturation > 0.4:
            return "accent-warm"
        return "accent-muted"

    if r > 120 and g > 120:
        return "secondary-light"

    return "accent"


async def extract_colors(page, html: str) -> dict:
    js_colors = await page.evaluate("""() => {
        const colors = {};
        const props = ['color','background-color','background','border-color',
                       'border-top-color','border-bottom-color','border-left-color',
                       'border-right-color','outline-color','text-decoration-color',
                       'accent-color','caret-color','fill','stroke'];
        const els = document.querySelectorAll('*');
        const seen = new Set();
        const compStyles = new Map();
        els.forEach(el => {
            try {
                const cs = getComputedStyle(el);
                props.forEach(prop => {
                    const val = cs[prop];
                    if (val && val !== 'transparent' && val !== 'rgba(0,0,0,0)' &&
                        val !== 'initial' && val !== 'inherit' && val !== 'currentColor') {
                        if (!seen.has(val)) {
                            seen.add(val);
                            if (!colors[prop]) colors[prop] = [];
                            colors[prop].push(val);
                        }
                    }
                });
            } catch(e) {}
        });
        return colors;
    }""")

    raw_colors = set()
    for prop, vals in js_colors.items():
        for v in vals:
            norm = normalize_color(v)
            if norm:
                raw_colors.add(norm)

    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.find_all(["style"]):
        for m in RE_HEX.finditer(tag.string or ""):
            norm = normalize_color(m.group(0))
            if norm:
                raw_colors.add(norm)
        for m in RE_RGB.finditer(tag.string or ""):
            norm = normalize_color(m.group(0))
            if norm:
                raw_colors.add(norm)

    custom_props = {}
    for tag in soup.find_all(["style"]):
        for m in RE_CUSTOM_PROP.finditer(tag.string or ""):
            name, val = m.group(1), m.group(2).strip()
            norm = normalize_color(val)
            if norm:
                custom_props[name] = norm

    color_list = []
    for c in raw_colors:
        lum = luminance(c)
        color_list.append({
            "hex": c,
            "luminance": round(lum, 4),
            "tone": classify_color(c),
            "role": classify_semantic_color(c, list(raw_colors)),
        })
    color_list.sort(key=lambda x: x["luminance"])
    color_list = dedupe_colors(color_list, threshold=25)

    # Semantic palette detection
    all_hexes = [c["hex"] for c in color_list]
    roles = {}
    for c in color_list:
        role = classify_semantic_color(c["hex"], all_hexes)
        if role not in roles:
            roles[role] = c["hex"]

    # Find background (lightest neutral or light color)
    light_colors = [c for c in color_list if c["tone"] == "light" or "neutral-light" in c["role"]]
    bg_light = light_colors[0]["hex"] if light_colors else None

    # Find dark background / text (darkest non-accent)
    dark_colors = [c for c in color_list if c["tone"] in ("dark", "muted-dark") and "accent" not in c["role"]]
    text_primary = dark_colors[0]["hex"] if dark_colors else None
    bg_dark = dark_colors[-1]["hex"] if len(dark_colors) > 1 else text_primary

    palette = {
        "primary": roles.get("primary-blue") or roles.get("primary-teal"),
        "secondary": roles.get("secondary-light") or roles.get("neutral"),
        "accent": roles.get("accent-warm") or roles.get("accent-muted") or roles.get("accent"),
        "success": roles.get("success"),
        "warning": roles.get("warning"),
        "error": roles.get("error"),
        "background_light": bg_light,
        "background_dark": bg_dark,
        "text_primary": text_primary,
    }
    # Fallback: if no primary found, use most saturated mid-tone
    if not palette["primary"]:
        for c in color_list:
            if c["tone"] in ("mid", "muted-dark") and "neutral" not in c["role"]:
                palette["primary"] = c["hex"]
                break
    if not palette["accent"]:
        for c in color_list:
            if "accent" in c["role"] and c["hex"] != palette.get("primary"):
                palette["accent"] = c["hex"]
                break

    return {
        "all": color_list,
        "count": len(color_list),
        "palette": palette,
        "custom_properties": custom_props,
        "semantic_roles": {k: v for k, v in sorted(roles.items())},
    }


