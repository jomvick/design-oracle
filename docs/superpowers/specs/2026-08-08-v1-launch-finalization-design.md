# Finalisation V1 — Design Spec

Date: 2026-08-08
Status: Approved

Finaliser la V1 en 5 volets : résolveur d'URL branché sur `/api/analyze`,
outil MCP `get_presets`, tests de robustesse automatisés, déploiement
Cloudflare Tunnel, et supports de lancement. Base de travail :
`feature/pipeline-mcp`.

## Contexte

Deux chantiers existent et ne sont pas encore fusionnés sur `main` :

- `feature/pipeline-mcp` (PR #2) : robustesse pipeline (couleurs, filtre
  `getComputedStyle`, stealth, timeouts) + MCP (transport HTTP/SSE, montage
  `/mcp`, config multi-éditeurs, package PyPI `design-oracle-mcp`).
- `feature/inspiration-dashboard` : résolveur d'URL (`backend/resolver.py` +
  `POST /api/resolve` + `tests/test_resolve.py`), 12 presets
  (`frontend/lib/inspirations.json`) et UI d'inspiration.

Ce spec reprend des morceaux de `feature/inspiration-dashboard` (résolveur,
presets) et les intègre au pipeline existant, sans fusionner les branches.

## Périmètre v1

| Fonctionnalité | Inclus v1 | Hors scope v1 |
|---|---|---|
| Résolveur d'URL | Réutilisé depuis `backend/resolver.py`, branché sur `/api/analyze` | Fusion des branches UI inspiration |
| MCP presets | Outil `get_presets` + source unique `backend/data/inspirations.json` | Import frontend (à la fusion inspiration) |
| Robustesse | Tests automatisés (timeout, fermeture browser, exports, analyse résolue) | Analyses manuelles lourdes |
| Déploiement | `start-public.sh` + Cloudflare Tunnel + docs | Oracle Cloud / Railway |
| Showcase | Post de lancement + guide de capture GIF | Production du GIF/vidéo |

## 1. Résolveur d'URL branché sur `/api/analyze`

### Module `backend/resolver.py`

Porté tel quel depuis `feature/inspiration-dashboard` :

- `classify_url(url) -> (platform, resolvable)` : classification par domaine
  (awwwards, siteinspire résolvables ; behance, dribbble, mobbin,
  designspiration non résolvables ; inconnu → pass-through).
- `_extract_target(soup, base_url) -> str | None` : extraction du lien cible
  par ordre de priorité (1. ancre « Visit Site » / « Live Site » / « View
  Website » / « Launch Site », 2. première ancre externe, 3. canonical d'un
  autre domaine).
- `resolve_url(url) -> dict` : `{platform, resolvable, target_url?}`.
  Timeout 10s (`httpx`), erreur réseau → `{platform, resolvable: False}`.

Dépendances déjà présentes : `beautifulsoup4`, `httpx` (backend/requirements.txt).

### Branchement dans `backend/server.py`

Dans `api_analyze`, après le check SSRF `is_safe_url` (ligne ~190) et avant
l'incrément du rate limit :

```python
resolved = await resolve_url(url)
target_url = resolved.get("target_url") or url
```

- `target_url` est stocké dans le record DB et transmis au worker ARQ
  (c'est l'URL que Playwright visite).
- Si l'URL n'est pas une galerie résolvable → `target_url == url`
  (comportement inchangé).
- **Galerie non résolvable** (behance, dribbble, mobbin, designspiration) :
  refus explicite — `HTTP 400` « Seuls les sites web en ligne sont
  analysables. Découvre nos presets ou entre l'URL du site final. » On
  n'analyse pas la page de galerie elle-même.
- Erreur réseau du résolveur (galerie résolvable mais fetch échoué) →
  fallback sur l'URL d'origine, jamais bloquant.
- L'URL d'origine est conservée dans la réponse API si utile.

### Tests

- `tests/test_resolve.py` porté depuis `feature/inspiration-dashboard`
  (classification 6 plateformes, extraction 3 stratégies, timeout/erreur
  réseau → `resolvable: False`).
- `tests/test_analyze_resolver.py` : `/api/analyze` avec URL galerie mockée
  → la cible résolue est enregistrée. URL non-galerie → inchangée. Galerie
  non résolvable (behance) → HTTP 400.

## 2. MCP `get_presets`

### Source unique : `backend/data/inspirations.json`

- Copié depuis `frontend/lib/inspirations.json` (`feature/inspiration-dashboard`,
  12 presets) dans `backend/data/inspirations.json`.
- Le frontend pointera sur ce même fichier à la fusion de l'autre branche
  (hors périmètre v1).

### Outil MCP

Dans `backend/mcp_server.py` :

```python
@mcp.tool()
def get_presets() -> str:
    """List curated inspiration presets (title, category, target_url, tags)"""
```

Lit `backend/data/inspirations.json` (relatif à `Path(__file__)`), renvoie le
contenu en JSON. Fichier absent → liste vide avec log d'erreur.

### Endpoint HTTP + package PyPI

- Nouvel endpoint `GET /api/presets` dans `backend/server.py` : renvoie le
  contenu de `backend/data/inspirations.json`.
- `get_presets` dans `clients/design-oracle-mcp/design_oracle_mcp/server.py` :
  appelle `GET /api/presets` (cohérent avec les autres outils HTTP-only).

## 3. Robustesse — tests automatisés

| Test | Fichier | Vérifie |
|---|---|---|
| Résolveur (classification + extraction) | `tests/test_resolve.py` | porté |
| `/api/analyze` résout une galerie | `tests/test_analyze_resolver.py` | la cible résolue est enregistrée |
| `browser.close()` garanti au timeout | `tests/test_timeouts.py` (ajout) | mock Playwright → close appelé même en exception |
| Chaîne d'exports valide | `tests/test_exports.py` | les 4 routes export répondent sur un dossier d'analyse factice |

## 4. Déploiement — Cloudflare Tunnel

### `start-public.sh`

- Vérifie/installe `cloudflared` (message si absent).
- Lance `docker compose up -d redis api worker` (pas le frontend, cf. limite).
- Lance `cloudflared tunnel --url http://localhost:3000`.
- Affiche l'URL publique HTTPS + rappel `Ctrl+C` pour arrêter.

### README — section « Déploiement local public »

- Prérequis, commande `./start-public.sh`, limites.
- Note : le frontend est servi en local (`npm run dev`) tant que
  `frontend/public/` n'est pas tracké (problème Docker build préexistant,
  hors périmètre).

## 5. Showcase

### `docs/launch/launch-post.md`

Brouillon de post (X / LinkedIn / Reddit) :
- Problème : « Extraire à la main le design system d'un site prend des heures. »
- Solution : « Design Oracle analyse le site, extrait les tokens, génère le
  code React/Tailwind et sert de serveur MCP pour vos agents IA. »
- Lien d'accès + CTA retours.

### `docs/launch/screencast-guide.md`

Guide de capture du GIF 20 s :
1. Clic sur une carte d'inspiration (ex. Linear).
2. Chargement de l'analyse.
3. Résultat : palette de couleurs, code Tailwind v4, intégration dans
   Cursor / Claude Code via MCP.

## Vérification finale

1. `pytest tests/ -v` — tous verts (résolveur, analyze, timeouts, exports,
   MCP, CLI, couleurs, layout, stealth).
2. Import CI : `python -c "from backend.server import app"` → `OK`.
3. Smoke local : `POST /api/analyze` avec une URL galerie mockée → job ARQ
   reçoit la cible résolue.
4. `get_presets` répond via MCP (stdio) et via `GET /api/presets`.

## Notes

- `frontend/public/` non tracké : bloque `docker compose up -d frontend`
  (Dockerfile attend `public/`). Noté dans le README, hors périmètre.
- Les fichiers résolveur/presets sont recopiés depuis
  `feature/inspiration-dashboard`, pas fusionnés.
