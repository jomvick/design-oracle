import logging
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

GALLERY_PLATFORMS = {
    "awwwards": {"host": "awwwards.com", "path": "/sites/", "resolvable": True},
    "siteinspire": {"host": "siteinspire.com", "path": "/websites/", "resolvable": True},
    "behance": {"host": "behance.net", "path": "/gallery/", "resolvable": False},
    "dribbble": {"host": "dribbble.com", "path": "/shots/", "resolvable": False},
    "mobbin": {"host": "mobbin.com", "path": "", "resolvable": False},
    "designspiration": {"host": "designspiration.net", "path": "", "resolvable": False},
}

VISIT_LABELS = ("visit site", "live site", "view website", "launch site")

RESOLVE_TIMEOUT = 10.0


def classify_url(url: str) -> tuple[str, bool]:
    """Return (platform_key, resolvable). 'unknown' platforms are analyzed directly."""
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower().replace("www.", "")
    for platform, cfg in GALLERY_PLATFORMS.items():
        if host == cfg["host"] or host.endswith("." + cfg["host"]):
            if not cfg["path"] or cfg["path"] in parsed.path.lower():
                return platform, cfg["resolvable"]
    return "unknown", True


def _extract_target(soup, base_url: str):
    """Extract the real site URL from a gallery page, by priority. Returns str or None."""
    gallery_host = (urlparse(base_url).hostname or "").lower()

    # 1. Anchor whose text / aria-label / class mentions a visit label
    for a in soup.find_all("a", href=True):
        text = a.get_text(" ", strip=True).lower()
        aria = (a.get("aria-label") or "").lower()
        classes = " ".join(a.get("class") or []).lower()
        haystack = f"{text} {aria} {classes}"
        if any(label in haystack for label in VISIT_LABELS):
            href = urljoin(base_url, a["href"])
            host = (urlparse(href).hostname or "").lower()
            if host and host != gallery_host:
                return href

    # 2. First external anchor
    for a in soup.find_all("a", href=True):
        href = urljoin(base_url, a["href"])
        host = (urlparse(href).hostname or "").lower()
        if host and host != gallery_host:
            return href

    # 3. Canonical link with a different domain
    canonical = soup.find("link", rel="canonical")
    if canonical and canonical.get("href"):
        href = urljoin(base_url, canonical["href"])
        host = (urlparse(href).hostname or "").lower()
        if host and host != gallery_host:
            return href

    return None


async def resolve_url(url: str) -> dict:
    platform, resolvable = classify_url(url)
    if not resolvable:
        return {"platform": platform, "resolvable": False}
    if platform == "unknown":
        return {"platform": platform, "resolvable": True, "target_url": url}

    try:
        async with httpx.AsyncClient(timeout=RESOLVE_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        target = _extract_target(soup, str(resp.url))
        if target:
            return {"platform": platform, "resolvable": True, "target_url": target}
        return {"platform": platform, "resolvable": False}
    except Exception as e:
        logger.warning("Resolve failed for %s: %s", url, e)
        return {"platform": platform, "resolvable": False, "message": "Résolution impossible"}
