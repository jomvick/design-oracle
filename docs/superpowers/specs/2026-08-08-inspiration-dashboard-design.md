# Inspiration Dashboard — Design Spec

Date: 2026-08-08
Status: Approved

Refonte du dashboard (home) de Design Oracle pour ajouter un point d'entrée de
découverte et d'inspiration, tout en réutilisant 100 % du pipeline Playwright /
FastAPI existant. Aucun changement au pipeline d'analyse lui-même.

## Contexte

La page d'accueil actuelle (`frontend/app/page.tsx`) se compose d'un hero
`HeroInput` (barre d'URL + presets `Try stripe.com...`) et d'une section
`HistoryList` (Recent Analyses). Quand l'historique est vide, elle affiche une
boîte `"No analyses yet"` vide.

Objectif : transformer cette page en point d'entrée d'inspiration — un
sélecteur de plateformes (Awwwards, Mobbin, SiteInspire, Behance, Dribbble,
Designspiration), une grille de 10-15 sites tendance avec analyse en 1-clic, et
un support intelligent des liens de galerie collés dans la barre de recherche.

## Périmètre v1

| Fonctionnalité | Inclus v1 | Hors scope v1 |
|---|---|---|
| URL de site direct (stripe.com) | Pipeline Playwright classique (inchangé) | Multi-viewport mobile/tablet |
| Galeries web (Awwwards, SiteInspire) | Résolution auto de l'URL du site réel (`httpx` + BeautifulSoup) | Scraping commentaires/notes |
| Galeries statiques / apps (Behance, Dribbble, Mobbin, Designspiration) | Fallback UX : message explicatif | Analyse d'images (vision/OCR), extraction de palettes |
| Grille d'inspiration | 10-15 presets statiques (`inspirations.json`), filtres plateforme, CTA analyse 1-clic | Flux de presets dynamiques côté backend |
| Résolver d'URL | Endpoint backend `POST /api/resolve` | Cache, stockage |

## Architecture

### Frontend (Next.js App Router)

```
frontend/
├── components/
│   ├── HeroSearch.tsx          # Refonte de HeroInput — détection de plateforme
│   ├── InspirationFilter.tsx   # Badges/filtres des 6 plateformes
│   ├── InspirationGrid.tsx     # Grille 3-4 col + onglets [Récents | Inspirations]
│   └── InspirationCard.tsx     # Carte : miniature, tag plateforme, titre, CTA
├── lib/
│   ├── inspirations.json       # 12 presets statiques (import direct)
│   └── urlResolver.ts          # Détection de plateforme + appel API /api/resolve
```

### Backend

Un seul ajout : `POST /api/resolve` dans `backend/server.py`.

Request: `{ "url": "https://www.awwwards.com/sites/stripe-press" }`

Responses:
- `{ "platform": "awwwards", "target_url": "https://press.stripe.com", "resolvable": true }`
- `{ "platform": "behance", "resolvable": false }`
- `{ "platform": "unknown", "resolvable": true, "target_url": "<url>" }`

### MCP (optionnel, non bloquant)

Le serveur MCP existant réutilise les mêmes outils. Aucun changement MCP en v1.
L'outil `analyze_website` fonctionne déjà pour les URLs directes et les URLs
résolues (le front résout avant d'appeler `/api/analyze`).

## Flux utilisateur

1. **URL directe** (stripe.com) → pipeline Playwright existant, inchangé.
2. **Lien Awwwards / SiteInspire** → mini-loader dans la barre « Résolution de
   l'URL du site final... » → le champ se met à jour avec la cible réelle →
   lance l'analyse via `POST /api/analyze`.
3. **Lien Behance / Dribbble / Mobbin / Designspiration** → modal explicatif :
   « Seuls les sites web en ligne sont analysables en v1. Découvre nos presets
   ou entre l'URL du site final ! »
4. **Carte preset** → CTA « Analyser le Design System » → `POST /api/analyze`
   avec `target_url` (pas de resolver, URL déjà connue).

## Endpoint `POST /api/resolve`

### Classification (regex par domaine, aucun fetch si non-galerie)

| Domaine | Plateforme | Résolvable |
|---|---|---|
| `awwwards.com/sites/` | awwwards | oui |
| `siteinspire.com/websites/` | siteinspire | oui |
| `behance.net/gallery/` | behance | non |
| `dribbble.com/shots/` | dribbble | non |
| `mobbin.com` | mobbin | non |
| `designspiration.net` | designspiration | non |
| autre | unknown | oui (target_url = url) |

### Extraction du lien cible (par ordre)

1. `a` avec texte/aria-label contenant `Visit Site` | `Live Site` | `View Website`
   → `href`
2. sinon premier `a[href]` externe (hors domaine de la galerie)
3. sinon `link[rel=canonical]` si domaine différent
4. échec → `resolvable: false`

Timeout 10s (`httpx`). Erreur réseau → `resolvable: false` avec message.
Pas de stockage ni cache en v1.

## Données — `inspirations.json`

12 presets au schéma suivant :

```json
[
  {
    "id": "stripe-press",
    "title": "Stripe Press",
    "category": "SaaS / Editorial",
    "target_url": "https://press.stripe.com",
    "gallery_url": "https://www.awwwards.com/sites/stripe-press",
    "source_platform": "awwwards",
    "preview_image": "https://assets.awwwards.com/.../stripe-press-cover.jpg",
    "fallback_image": "https://s0.wp.com/mshots/v1/press.stripe.com?w=800&h=600",
    "tags": ["Minimal", "Typography", "Dark"]
  }
]
```

- `source_platform` : l'une des 6 clés de filtre.
- `preview_image` : URL CDN de la plateforme.
- `fallback_image` : URL WordPress mShot, utilisée si l'image CDN échoue.
- `target_url` : site réel analysé en 1-clic (sans passer par le resolver).

## UI

### Hero compacte

Même carte `home-hero-card` mais paddings/titre réduits (~20 % de hauteur en
moins). Le halo `AiGlow` reste. La rangée `Try stripe.com...` est remplacée par
la rangée de 6 badges plateformes (`InspirationFilter`) qui filtre la grille et
sert d'info de source.

### Onglets

Onglets permanents `[ Récents | Inspirations ]`, grille par défaut.
- Inspirations = grille de presets, filtrable par plateforme.
- Récents = `HistoryList` actuel, inchangé.

### Grille

- `grid-cols-3` desktop, 2 tablette, 1 mobile.
- Carte : image 16:9, badge plateforme en overlay, titre + catégorie, tags,
  bouton « Analyser le Design System ».

### Animations

Framer Motion `AnimatePresence` + `layout` pour le re-flow des cartes au
filtrage. `layoutId` sur le badge actif du filtre. (framer-motion est déjà une
dépendance : `frontend/package.json`.)

## États & erreurs

- Image CDN en erreur → swap `fallback_image` → encore en erreur → placeholder
  dégradé stylisé.
- Resolver en erreur réseau → message inline « Résolution impossible, vérifie
  l'URL » ; le champ garde la valeur collée.
- Analyse depuis une carte → même flux `useAnalysisPipeline` (redirection vers
  `/analysis?url=...`).

## Tests

Infra existante : CI backend = simple `python -c "import backend.server"` ;
pas de pytest, pas de runner de tests front. Aucune nouvelle dépendance.

- **Backend** — `tests/test_resolve.py` avec `unittest` (stdlib) :
  - classification des 6 domaines + URL non-galerie → `unknown`
  - extraction depuis un HTML mocké (fixture) pour les 3 stratégies
  - timeout / erreur réseau simulé → `resolvable: false`
- **Frontend** — vérification du `urlResolver.ts` (détection des 6 domaines,
  URLs mal formées → `unknown`) via le build Next + vérification manuelle.
- **CI** — le job backend exécutera aussi `python -m unittest discover tests`.

## Vérification finale

1. `curl -X POST http://localhost:5000/api/resolve -H 'Content-Type: application/json' -d '{"url":"https://www.awwwards.com/sites/stripe-press"}'`
2. `npm run build` (frontend) sans erreur.
3. Vérification manuelle des 4 flux utilisateur dans le navigateur.
