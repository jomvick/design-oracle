import json
import re
from collections import Counter
from bs4 import BeautifulSoup

async def extract_spacing_scale(page) -> dict:
    js = """() => {
        const vals = {};
        const props = ['padding','margin','gap','paddingLeft','paddingRight','paddingTop','paddingBottom',
                       'marginLeft','marginRight','marginTop','marginBottom',
                       'columnGap','rowGap'];
        const els = document.querySelectorAll('*');
        els.forEach(el => {
            try {
                const cs = getComputedStyle(el);
                if (cs.display === 'none') return;
                props.forEach(p => {
                    const v = parseFloat(cs[p]);
                    if (v && v > 0 && v < 200) {
                        const rounded = Math.round(v);
                        if (!vals[p]) vals[p] = [];
                        vals[p].push(rounded);
                    }
                });
            } catch(e) {}
        });
        return vals;
    }"""
    try:
        raw = await page.evaluate(js)
    except Exception:
        return {"scale": [], "raw": {}}

    all_vals = []
    for prop, values in raw.items():
        for v in values:
            all_vals.append(v)

    if not all_vals:
        return {"scale": [], "raw": {}}

    counter = Counter(all_vals)
    # Get most common values that form a spacing scale
    common = counter.most_common(30)
    common.sort(key=lambda x: x[0])

    # Find the scale: values that appear at least 0.5% of total
    threshold = max(3, len(all_vals) * 0.005)
    scale = [v for v, c in common if c >= threshold]

    # Add standard scale values if close
    standard = [0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128]
    for s in standard:
        if s not in scale and any(abs(s - x) <= 2 for x in all_vals):
            scale.append(s)

    scale.sort()
    return {"scale": scale, "raw_sample": dict(counter.most_common(15))}


async def extract_radius_and_shadows(page) -> dict:
    js = """() => {
        const radii = new Set();
        const shadows = [];
        const els = document.querySelectorAll('*');
        els.forEach(el => {
            try {
                const cs = getComputedStyle(el);
                const br = cs.borderRadius;
                if (br && br !== '0px' && !br.includes(' ')) {
                    const v = parseFloat(br);
                    if (v > 0 && v < 100) radii.add(Math.round(v));
                }
                const bs = cs.boxShadow;
                if (bs && bs !== 'none' && !shadows.includes(bs)) {
                    shadows.push(bs.substring(0, 100));
                }
            } catch(e) {}
        });
        return {
            radii: [...radii].sort((a,b) => a-b),
            shadows: shadows.slice(0, 10)
        };
    }"""
    try:
        return await page.evaluate(js)
    except Exception:
        return {"radii": [], "shadows": []}


async def get_component_boxes(page, components: list[dict]) -> list[dict]:
    if not components:
        return []
    # Build a mapping of selectors to component types
    selector_map = {}
    for c in components:
        sel = c.get("selector")
        if sel and c.get("type") not in ("buttons",):
            selector_map[sel] = c["type"]

    js = f"""
    () => {{
        const selectors = {json.dumps(list(selector_map.keys()))};
        const results = [];
        selectors.forEach(sel => {{
            try {{
                const el = document.querySelector(sel);
                if (el) {{
                    const rect = el.getBoundingClientRect();
                    const scrollY = window.scrollY;
                    const scrollX = window.scrollX;
                    if (rect.width > 20 && rect.height > 10) {{
                        results.push({{
                            selector: sel,
                            x: Math.round(rect.x + scrollX),
                            y: Math.round(rect.y + scrollY),
                            width: Math.round(rect.width),
                            height: Math.round(rect.height),
                        }});
                    }}
                }}
            }} catch(e) {{}}
        }});
        return results;
    }}
    """
    try:
        boxes = await page.evaluate(js)
    except Exception:
        return []

    # Map back to component types
    result = []
    for b in boxes:
        ctype = selector_map.get(b["selector"], "unknown")
        result.append({
            "type": ctype,
            "selector": b["selector"],
            "x": b["x"],
            "y": b["y"],
            "width": b["width"],
            "height": b["height"],
        })
    return result


def overlay_screenshot(screenshot_bytes: bytes, boxes: list[dict]) -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    import io

    img = Image.open(io.BytesIO(screenshot_bytes))
    draw = ImageDraw.Draw(img, "RGBA")

    box_colors = [
        (217, 119, 87, 40),   # accent
        (88, 166, 255, 35),   # blue
        (63, 185, 80, 35),    # green
        (210, 153, 34, 35),   # yellow
        (175, 82, 222, 35),   # purple
        (248, 81, 73, 35),    # red
    ]
    border_colors = [
        (217, 119, 87, 200),
        (88, 166, 255, 200),
        (63, 185, 80, 200),
        (210, 153, 34, 200),
        (175, 82, 222, 200),
        (248, 81, 73, 200),
    ]

    try:
        font = ImageFont.truetype("/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf", 13)
    except Exception:
        font = None

    for i, box in enumerate(boxes):
        ci = i % len(box_colors)
        fill = box_colors[ci]
        border = border_colors[ci]

        x, y, w, h = box["x"], box["y"], box["width"], box["height"]

        draw.rectangle([x, y, x + w, y + h], fill=fill, outline=border, width=2)

        label = box["type"].replace("-", " ").title()
        if font:
            bbox = draw.textbbox((0, 0), label, font=font)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
        else:
            tw, th = len(label) * 7, 14

        lx, ly = x, y - th - 6
        if ly < 0:
            ly = y + h + 2

        draw.rectangle([lx, ly, lx + tw + 10, ly + th + 6], fill=(0, 0, 0, 180))
        if font:
            draw.text((lx + 5, ly + 3), label, fill=(255, 255, 255, 255), font=font)
        else:
            draw.text((lx + 5, ly + 3), label, fill=(255, 255, 255, 255))

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


async def detect_components(page, html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    components = []

    patterns = [
        ("navbar", "nav", ["nav", "navbar", "navigation", "menu", "header-nav"]),
        ("hero", "section", ["hero", "banner", "homepage", "landing", "cover", "intro"]),
        ("features", "section", ["features", "benefits", "highlights", "capabilities", "services"]),
        ("pricing", "section", ["pricing", "plans", "subscription", "tiers", "packages"]),
        ("testimonials", "section", ["testimonials", "reviews", "quotes", "social-proof"]),
        ("cta", "section", ["cta", "call-to-action", "signup", "get-started", "action"]),
        ("footer", "footer", ["footer", "site-footer", "bottom"]),
        ("faq", "section", ["faq", "questions", "help", "support"]),
        ("stats", "section", ["stats", "statistics", "metrics", "numbers", "counter"]),
        ("logo-cloud", "section", ["logo-cloud", "companies", "partners", "clients", "sponsors"]),
        ("contact", "section", ["contact", "get-in-touch", "reach-out"]),
        ("gallery", "section", ["gallery", "portfolio", "showcase", "work"]),
        ("newsletter", "section", ["newsletter", "subscribe", "mailing-list"]),
        ("blog", "section", ["blog", "articles", "posts", "insights"]),
    ]

    for comp_type, default_tag, keywords in patterns:
        candidates = []
        if default_tag:
            for tag in soup.find_all(default_tag):
                cls = " ".join(tag.get("class", [])).lower()
                id_ = tag.get("id", "").lower()
                if any(k in cls or k in id_ for k in keywords):
                    candidates.append({
                        "type": comp_type,
                        "tag": default_tag,
                        "selector": (tag.get("id") and f"#{tag.get('id')}") or (
                            f"{default_tag}.{tag.get('class')[0]}" if tag.get("class") else default_tag
                        ),
                        "confidence": 85 if tag.get("id") and any(k in tag.get("id","").lower() for k in keywords) else 70,
                    })

        if not candidates:
            for tag in soup.find_all(["div", "header", "section"]):
                cls = " ".join(tag.get("class", [])).lower()
                id_ = tag.get("id", "").lower()
                if any(k in cls or k in id_ for k in keywords):
                    candidates.append({
                        "type": comp_type,
                        "tag": tag.name,
                        "selector": f"#{tag.get('id')}" if tag.get("id") else (
                            f"{tag.name}.{tag.get('class')[0]}" if tag.get("class") else tag.name
                        ),
                        "confidence": 60,
                    })

        if candidates:
            components.append(candidates[0])

    # Detect buttons
    buttons = []
    for tag in soup.find_all(["button", "a"]):
        cls = " ".join(tag.get("class", [])).lower()
        if any(k in cls for k in ["btn", "button", "cta", "primary"]):
            buttons.append({"tag": tag.name, "text": tag.get_text(strip=True)[:40]})
    if buttons:
        components.append({
            "type": "buttons",
            "count": len(buttons),
            "samples": buttons[:5],
            "confidence": 85,
        })

    return components


async def analyze_layout(page, html: str) -> dict:
    layout_info = await page.evaluate("""() => {
        const info = {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            hasGrid: false,
            hasFlexbox: false,
            containerWidths: [],
            sections: [],
            breakpoints: [],
            stickyElements: [],
            maxWidth: 0,
        };
        const els = document.querySelectorAll('*');
        let maxW = 0;
        els.forEach(el => {
            try {
                const cs = getComputedStyle(el);
                if (cs.display === 'grid' || cs.display?.includes('-grid')) info.hasGrid = true;
                if (cs.display === 'flex' || cs.display?.includes('-flex')) info.hasFlexbox = true;
                const w = parseFloat(cs.maxWidth);
                if (w && w > 100 && w < 2000) {
                    if (w > maxW) maxW = w;
                    if (!info.containerWidths.includes(w)) info.containerWidths.push(w);
                }
                if (cs.position === 'sticky' || cs.position === 'fixed') {
                    if (el.tagName === 'NAV' || el.tagName === 'HEADER' ||
                        (el.id && (el.id.includes('nav') || el.id.includes('header'))))
                        info.stickyElements.push(el.tagName + (el.id ? '#'+el.id : ''));
                }
            } catch(e) {}
        });
        info.containerWidths.sort((a,b) => a-b);
        info.maxWidth = maxW;
        return info;
    }""")

    soup = BeautifulSoup(html, "html.parser")

    sections = []
    for tag in soup.find_all(["section", "header", "footer", "nav", "article", "main", "aside"]):
        cls = " ".join(tag.get("class", []))[:80]
        id_ = tag.get("id", "")
        text_len = len(tag.get_text(strip=True))
        sections.append({
            "tag": tag.name,
            "id": id_ or None,
            "class": cls or None,
            "text_length": text_len,
        })

    media_queries = []
    for tag in soup.find_all(["style"]):
        for m in re.finditer(r"@media\s*\(([^)]+)\)", tag.string or ""):
            media_queries.append(m.group(1))

    meta_viewport = soup.find("meta", attrs={"name": "viewport"})
    responsive = meta_viewport is not None

    return {
        "viewport": layout_info.get("viewport"),
        "responsive": responsive,
        "uses_grid": layout_info.get("hasGrid", False),
        "uses_flexbox": layout_info.get("hasFlexbox", False),
        "container_widths": sorted(set(layout_info.get("containerWidths", []))),
        "max_container_width": layout_info.get("maxWidth", 0),
        "sticky_elements": layout_info.get("stickyElements", []),
        "sections_count": len(sections),
        "sections": sections[:20],
    }


