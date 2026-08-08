from bs4 import BeautifulSoup

from .layout import visible_element_filter_js

async def extract_typography(page) -> dict:
    fonts = await page.evaluate(visible_element_filter_js() + """() => {
        const fonts = {};
        const els = document.querySelectorAll('*');
        els.forEach(el => {
            if (!relevant(el)) return;
            try {
                const cs = getComputedStyle(el);
                const family = cs.fontFamily;
                const size = cs.fontSize;
                const weight = cs.fontWeight;
                const lh = cs.lineHeight;
                if (family && cs.display !== 'none') {
                    family.split(',').forEach(f => {
                        const name = f.replace(/['"]/g,'').trim();
                        if (name && name !== 'serif' && name !== 'sans-serif' &&
                            name !== 'monospace' && name !== 'cursive' && name !== 'fantasy') {
                            if (!fonts[name]) fonts[name] = {sizes:[],weights:[],lineHeights:[]};
                            if (size) fonts[name].sizes.push(parseFloat(size));
                            if (weight) fonts[name].weights.push(weight);
                            if (lh) fonts[name].lineHeights.push(lh);
                        }
                    });
                }
            } catch(e) {}
        });
        Object.keys(fonts).forEach(k => {
            fonts[k].sizes = [...new Set(fonts[k].sizes.map(s => Math.round(s*10)/10))].sort((a,b)=>a-b);
            fonts[k].weights = [...new Set(fonts[k].weights)].sort();
            fonts[k].lineHeights = [...new Set(fonts[k].lineHeights)].slice(0,5);
        });
        return fonts;
    }""")

    heading_sizes = await page.evaluate("""() => {
        const tags = ['h1','h2','h3','h4','h5','h6'];
        const sizes = {};
        tags.forEach(t => {
            const el = document.querySelector(t);
            if (el) {
                const cs = getComputedStyle(el);
                sizes[t] = {
                    size: cs.fontSize,
                    weight: cs.fontWeight,
                    family: cs.fontFamily.split(',')[0].replace(/['"]/g,'').trim(),
                };
            }
        });
        return sizes;
    }""")

    body_info = await page.evaluate("""() => {
        const el = document.querySelector('body');
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
            size: cs.fontSize,
            family: cs.fontFamily.split(',')[0].replace(/['"]/g,'').trim(),
            weight: cs.fontWeight,
            lineHeight: cs.lineHeight,
        };
    }""")

    # Get Google Fonts / web fonts
    font_faces = await page.evaluate("""() => {
        const fonts = [];
        try {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules || sheet.rules) {
                        if (rule instanceof CSSFontFaceRule) {
                            const s = rule.style;
                            fonts.push({
                                family: s.fontFamily,
                                weight: s.fontWeight,
                                style: s.fontStyle,
                                src: (s.src || '').substring(0, 120),
                            });
                        }
                    }
                } catch(e) {}
            }
        } catch(e) {}
        return fonts;
    }""")

    families = sorted(fonts.keys())
    primary_font = families[0] if families else None
    secondary_font = families[1] if len(families) > 1 else None

    return {
        "families": families,
        "primary_font": primary_font,
        "secondary_font": secondary_font,
        "details": fonts,
        "headings": heading_sizes,
        "body": body_info,
        "font_faces": font_faces,
    }


