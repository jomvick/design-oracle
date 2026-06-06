import re
import sys
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests

EXT_CSS = (".css",)
EXT_JS = (".js", ".mjs")
EXT_IMG = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico")
EXT_FONT = (".woff", ".woff2", ".ttf", ".otf", ".eot")
EXT_VID = (".mp4", ".webm")
ALL_EXTS = EXT_CSS + EXT_JS + EXT_IMG + EXT_FONT + EXT_VID


def extract_assets(html: str, base_url: str):
    patterns = [
        r'(?:href|src)\s*=\s*["\']([^"\']+)["\']',
        r'srcset\s*=\s*["\']([^"\']+)["\']',
        r'url\(["\']?([^"\')]+)["\']?\)',
        r'@import\s+(?:url\()?["\']?([^"\')\s;]+)',
    ]
    seen = set()
    assets = []
    for pat in patterns:
        for m in re.finditer(pat, html, re.IGNORECASE):
            val = m.group(1)
            for part in val.split(","):
                part = part.strip().split()[0] if part.strip() else ""
                if not part or part.startswith("data:") or part.startswith("#"):
                    continue
                full = urljoin(base_url, part)
                if full not in seen and urlparse(full).scheme in ("http", "https"):
                    seen.add(full)
                    assets.append(full)
    return assets


def clean_analytics(html: str):
    removals = [
        r'<script[^>]*>[\s\S]*?posthog[\s\S]*?</script>\s*',
        r'posthog\.init\([^;]+;',
        r'<script[^>]*>window\.lemonSqueezyAffiliateConfig[^<]*</script>\s*',
        r'<script[^>]*src=[^>]*lmsqueezy\.com[^>]*></script>\s*',
        r'<script[^>]*data-cfasync=["\']false["\'][^>]*src=["\'][^"\']*email-decode\.min\.js[^>]*></script>\s*',
        r'<script[^>]*src=["\'][^"\']*cloudflareinsights\.com[^>]*></script>\s*',
        r'<!-- Cloudflare Pages Analytics -->\s*<script[^>]*src=["\'][^"\']*beacon\.min\.js[^>]*></script>',
        r'<script[^>]*src=["\'][^"\']*googletagmanager\.com[^>]*></script>\s*',
        r'<script[^>]*>[\s\S]*?gtag\([^<]+</script>\s*',
        r'<script[^>]*>[\s\S]*?fbq\([^<]+</script>\s*',
        r'<script[^>]*src=["\'][^"\']*connect\.facebook\.net[^>]*></script>\s*',
        r'<!-- pages\.dev[^>]*-->[\s\S]*?<script[^>]*>[\s\S]*?pages\.dev[\s\S]*?</script>\s*',
    ]
    for pat in removals:
        html = re.sub(pat, "", html, flags=re.IGNORECASE | re.DOTALL)
    return html


def download_file(url: str, dest: Path, session: requests.Session, timeout=15):
    if dest.exists() and dest.stat().st_size > 0:
        return True
    try:
        resp = session.get(url, timeout=timeout,
                           headers={"User-Agent": "Mozilla/5.0"})
        resp.raise_for_status()
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(resp.content)
        return True
    except Exception:
        return False


def clone(url: str, out_dir: str, max_assets=200):
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr,en;q=0.9",
    })

    try:
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        return {"error": f"Impossible de télécharger {url}: {e}"}

    html = resp.text
    base_url = resp.url

    html = clean_analytics(html)

    assets = extract_assets(html, base_url)

    html_path = out / "index.html"
    html_path.write_text(html, encoding="utf-8")

    count = 0
    errors = []
    for asset_url in assets:
        if count >= max_assets:
            break
        parsed = urlparse(asset_url)
        path = parsed.path.lstrip("/")
        if not path or path.endswith("/"):
            continue
        if not any(path.lower().endswith(ext) for ext in ALL_EXTS):
            continue
        dest = out / path
        if download_file(asset_url, dest, session):
            count += 1
        else:
            errors.append(asset_url)

    total_size = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    file_count = len(list(out.rglob("*")))

    return {
        "html_path": str(html_path),
        "file_count": file_count,
        "total_size_kb": round(total_size / 1024),
        "assets_downloaded": count,
        "errors": errors[:5],
    }
