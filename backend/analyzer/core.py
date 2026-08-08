import asyncio
import logging
import os
from pathlib import Path
from .colors import extract_colors

logger = logging.getLogger(__name__)
from .typography import extract_typography
from .layout import (extract_spacing_scale, extract_radius_and_shadows, 
                     get_component_boxes, overlay_screenshot, 
                     detect_components, analyze_layout)
from .patterns import detect_ux_patterns
from .dna import generate_design_dna
from backend.generators.tokens import generate_design_tokens_json
from .stealth import stealth_init_script

STEALTH_MODE = os.getenv("STEALTH_MODE", "false").lower() in ("true", "1", "yes")

async def run_analysis(url: str, progress_callback=None):
    from playwright.async_api import async_playwright

    def progress(stage, pct, detail=""):
        if progress_callback:
            progress_callback(stage, pct, detail)

    progress("launch", 0, "Launching browser engine...")
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        )
        context = await browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
        )
        if STEALTH_MODE:
            await context.add_init_script(stealth_init_script())
        page = await context.new_page()

        progress("navigate", 8, "Navigating to page...")
        nav_success = False
        for wait_mode, timeout_ms, label in [
            ("load",            45000, "full page load"),
            ("domcontentloaded",30000, "DOM ready"),
            ("commit",          20000, "initial response"),
        ]:
            try:
                progress("navigate", 8, f"Trying {label}...")
                await page.goto(url, wait_until=wait_mode, timeout=timeout_ms)
                nav_success = True
                break
            except Exception as e:
                logger.debug("Navigation attempt %s failed: %s", label, e)

        if not nav_success:
            progress("error", 0, f"Navigation failed for {url} — unreachable or blocked")
            await browser.close()
            return {"error": f"Navigation failed: could not load {url}. The site may be blocking automated browsers."}

        # Let the page settle (JS frameworks render, lazy-loads trigger)
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=10000)
        except Exception as e:
            logger.debug("wait_for_load_state after navigation failed: %s", e)
        await page.wait_for_timeout(2000)

        final_url = page.url
        progress("navigate", 15, "Page loaded successfully")

        progress("screenshot", 15, "Capturing screenshot...")
        screenshot_bytes = await page.screenshot(full_page=True)
        progress("screenshot", 20, "Screenshot captured")

        progress("dom", 20, "Scanning DOM...")
        html = await page.content()

        progress("dom", 25, "DOM scanned, extracting design tokens...")

        progress("colors", 25, "Detecting color system...")
        colors_data = await extract_colors(page, html)
        progress("colors", 40, f"{len(colors_data['all'])} colors detected")

        progress("typography", 40, "Detecting typography...")
        typography_data = await extract_typography(page)
        progress("typography", 55, "Typography analyzed")

        progress("components", 55, "Detecting components...")
        components_data = await detect_components(page, html)
        progress("components", 65, f"{len(components_data)} components identified")

        progress("components", 65, "Capturing component positions...")
        component_boxes = await get_component_boxes(page, components_data)
        try:
            overlay_bytes = overlay_screenshot(screenshot_bytes, component_boxes)
        except Exception:
            overlay_bytes = screenshot_bytes
        progress("components", 70, f"{len(component_boxes)} components mapped on screenshot")

        progress("layout", 70, "Analyzing layout...")
        layout_data = await analyze_layout(page, html)
        progress("layout", 75, "Layout analyzed")

        progress("layout", 75, "Extracting spacing scale...")
        spacing_data = await extract_spacing_scale(page)
        progress("layout", 78, f"{len(spacing_data.get('scale',[]))} spacing values found")

        progress("layout", 78, "Extracting radius & shadows...")
        radius_data = await extract_radius_and_shadows(page)
        progress("layout", 80, f"{len(radius_data.get('radii',[]))} radii, {len(radius_data.get('shadows',[]))} shadows")

        progress("patterns", 80, "Detecting UX patterns...")
        patterns_data = detect_ux_patterns(html)
        progress("patterns", 88, f"{len(patterns_data)} patterns found")

        progress("dna", 88, "Generating Design DNA...")
        dna = generate_design_dna(
            colors_data, typography_data, components_data, layout_data, patterns_data,
            spacing_data, radius_data,
        )
        design_tokens = generate_design_tokens_json(
            colors_data, typography_data, spacing_data, radius_data, dna
        )
        progress("dna", 95, "Design DNA generated")

        page_title = await page.title()

        await browser.close()

    progress("complete", 100, "Analysis complete!")

    return {
        "url": url,
        "final_url": final_url,
        "title": page_title or "",
        "screenshot": screenshot_bytes,
        "screenshot_overlay": overlay_bytes,
        "component_boxes": component_boxes,
        "colors": colors_data,
        "typography": typography_data,
        "components": components_data,
        "layout": layout_data,
        "spacing": spacing_data,
        "radius": radius_data,
        "patterns": patterns_data,
        "dna": dna,
        "design_tokens": design_tokens,
    }


