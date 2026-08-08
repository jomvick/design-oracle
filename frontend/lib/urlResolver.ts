import type { PlatformKey, ResolveResult } from "./types";

export const PLATFORM_META: Record<PlatformKey, { label: string; tagline: string }> = {
  awwwards: { label: "Awwwards", tagline: "Sites web ultra-créatifs & interactifs" },
  mobbin: { label: "Mobbin", tagline: "UI/UX Apps Web & Mobile" },
  siteinspire: { label: "SiteInspire", tagline: "Design minimaliste & épuré" },
  behance: { label: "Behance", tagline: "Études de cas complètes & branding" },
  dribbble: { label: "Dribbble", tagline: "Concepts visuels & animations" },
  designspiration: {
    label: "Designspiration",
    tagline: "Recherche par palettes de couleurs",
  },
};

export function detectPlatform(url: string): PlatformKey | "unknown" {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (host.endsWith("awwwards.com") && path.includes("/sites/")) return "awwwards";
    if (host.endsWith("siteinspire.com") && path.includes("/websites/")) return "siteinspire";
    if (host.endsWith("behance.net") && path.includes("/gallery/")) return "behance";
    if (host.endsWith("dribbble.com") && path.includes("/shots/")) return "dribbble";
    if (host.endsWith("mobbin.com")) return "mobbin";
    if (host.endsWith("designspiration.net") || host.endsWith("designspiration.com")) {
      return "designspiration";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function resolveGalleryUrl(url: string): Promise<ResolveResult> {
  const res = await fetch("/api/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    return {
      platform: detectPlatform(url),
      resolvable: false,
      message: "Résolution impossible, vérifie l'URL",
    };
  }
  return res.json();
}
