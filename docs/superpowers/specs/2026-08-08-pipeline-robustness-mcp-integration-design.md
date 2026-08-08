# Design : Robustesse du Pipeline & Intégration MCP/Agents

Date : 2026-08-08
Statut : Validé (Bloc 1 et Bloc 2)

## Contexte

Deux chantiers indépendants sur le dépôt `design-oracle` :

1. **Robustesse du pipeline d'extraction** (Playwright/ARQ) : mode stealth, alignement des timeouts, cleanup strict des instances Chromium, optimisation `getComputedStyle`, normalisation des couleurs.
2. **Intégration MCP & agents IA** : transport SSE/HTTP + stdio, config multi-éditeurs, CLI légère publiable sur PyPI.

### Constats de l'existant

- `backend/analyzer/core.py` : `run_analysis` ferme le browser en fin de parcours mais **sans `try/finally`** — une exception intermédiaire (dont `asyncio.TimeoutError`) laisse fuiter des processus Chromium.
- `backend/worker.py` : `WorkerSettings` ne définit **pas** `job_timeout` (défaut ARQ = 60s) alors que la navigation seule peut dépasser 90s → ARQ tue les jobs longues.
- `backend/analyzer/layout.py`, `colors.py`, `typography.py` : 5 passes itèrent sur `*` avec `getComputedStyle` sans filtre visibilité/sémantique → JSON massifs et coût mémoire.
- `backend/analyzer/colors.py` : `normalize_color` gère hex + rgb mais pas `rgba`/`hsl` → valeurs non normalisées en sortie.
- `backend/mcp_server.py` : la ressource `designoracle://{id}/{file}` lit le **disque local** alors que les outils passent par HTTP — incohérent si le MCP tourne hors du poste backend.
- `opencode.json.example` : stdio avec chemin relatif `backend/mcp_server.py` — fragile hors du dossier du projet.
- Aucun packaging CLI n'existe.

---

## Bloc 1 — Robustesse du Pipeline & UX Développeur

### 1A. Mode Stealth (init script maison)

- Nouveau module `backend/analyzer/stealth.py` exposant `stealth_init_script() -> str`.
- Évasions injectées côté navigateur (string JS) :
  - Suppression de `navigator.webdriver`.
  - Stub `window.chrome` (objet vide + `loadTimes`/`csi`).
  - `navigator.plugins` / `navigator.mimeTypes` non vides (faux plugins Chrome).
  - `navigator.languages` (e.g. `["en-US","en"]`).
  - `WebGLRenderingContext.getParameter` → vendor `Google Inc. (NVIDIA)` / renderer `ANGLE (NVIDIA, ...)` neutres.
  - `navigator.platform` / `userAgent` cohérents avec le UA déjà configuré.
- Activation : env `STEALTH_MODE=true` (défaut `false`).
- Dans `core.py`, si actif : `await context.add_init_script(stealth_init_script())` avant `new_page()`.
- **Documentation honnête** (README, section « Anti-bot limitations ») :
  - Le mode stealth contourne les protections de base/intermédiaires.
  - Cloudflare Enterprise, Akamai, Incapsula peuvent toujours bloquer sans résolution de captcha ou proxys résidentiels payants.
  - Légère augmentation du temps de chargement due à la modification des prototypes JS.
- Aucune nouvelle dépendance Python (zéro pip).

### 1B. Alignement des timeouts + cleanup strict

Hierarchie garantie :
```
Timeout Playwright (TIMEOUT_SECONDS) < job_timeout ARQ < Timeout SSE/HTTP
```

- Env vars :
  - `TIMEOUT_SECONDS=30` : plafond par tentative de navigation Playwright.
  - `ARQ_JOB_TIMEOUT_SECONDS=180` : `job_timeout` ARQ (≥ 3× le timeout navigateur, laisse le worker nettoyer et enregistrer l'erreur).
- `core.py` :
  - Navigation : remplacer les 45/30/20 fixes par 3 essais (`load`, `domcontentloaded`, `commit`) chacun plafonné à `TIMEOUT_SECONDS`.
  - Tout le cycle browser/context/page enveloppé dans `try/finally` : `browser.close()` toujours exécuté, même sur `asyncio.TimeoutError`.
- `worker.py` :
  - `WorkerSettings.job_timeout = ARQ_JOB_TIMEOUT_SECONDS`.
  - États d'erreur distincts et explicites :
    - Timeout ARQ (`TaskAborted`) → `status="failed"` (nouvel état) avec message dédié.
    - Autre exception d'extraction → `status="error"` (comportement actuel conservé).
  - Dans les deux cas : mise à jour en base, événement SSE `error` publié, aucun état corrompu. Le frontend traite `failed` et `error` comme des états d'échec.
- `server.py` : `SSE_MAX_POLLS` ≥ `job_timeout / SSE_POLL_INTERVAL` pour que le client SSE ne coupe pas avant le worker.

### 1C. Filtrage `getComputedStyle`

- Helper JS réutilisable (fonction dans `layout.py`, importée par les autres passes) : itération limitée aux éléments **visibles** ET **pertinents** :
  - Visible : `offsetParent !== null` OU `position: fixed/absolute/sticky` avec taille > 0.
  - Balises sémantiques : `h1-h6, p, button, a, input, header, nav, main, section, article, footer`.
  - Conteneurs de cartes : classes `card`, `panel`, `widget` (heuristique).
- Appliqué aux 5 passes :
  - `extract_spacing_scale`
  - `extract_radius_and_shadows`
  - `extract_colors`
  - `extract_typography` (première passe `fonts`, pas les passes heading/body ciblées)
  - `analyze_layout`
- Objectif : réduire fortement le volume de styles calculés et la taille des JSON sans perte de sémantique.

### 1D. Normalisation des couleurs

- Étendre `normalize_color` dans `colors.py` :
  - Parser `rgba(r,g,b,a)` et `hsl(...)`/`hsla(...)`.
  - Sortie normalisée : hex propre + alpha conservée (ex. `rgba(37,99,235,0.8)` → `#2563eb` + alpha `0.8`).
  - Valeur brute conservée en métadonnée (`raw`).
- Consommateurs (`generators/tokens.py`, `tailwind.py`) : utiliser le champ hex normalisé (comportement actuel), exposer l'alpha pour Tailwind v4 si non nulle.
- Compatibilité : ne pas casser le format de sortie existant (champ `hex` toujours présent).

---

## Bloc 2 — Intégration MCP & Agents IA

### 2A. Transport MCP : SSE/HTTP + stdio

- `mcp_server.py` : nouvelle env `DESIGN_ORACLE_TRANSPORT` (`stdio` défaut, `sse` sinon).
  - `stdio` : comportement actuel (`mcp.run()`).
  - `sse` : exposé via `mcp.sse_app()` (FastMCP).
- `backend/server.py` : montage de la sous-app MCP sur `/mcp` dans l'app FastAPI existante (un seul service, un seul port 5000, pas de conteneur dédié).
- **Ressource `designoracle://{id}/{file}` corrigée** : lire via l'API HTTP (`GET /api/analyze/{id}/export/{...}` + `/result`) au lieu du disque local. Le MCP fonctionne ainsi même déployé hors du poste du backend.

### 2B. Config multi-éditeurs

- `opencode.json.example` : mis à jour vers le transport recommandé (SSE/HTTP).
- `AGENT_PROMPT.md` : snippets distincts et testés pour :
  - **opencode** : `opencode.json` (champ `mcpServers`).
  - **Cursor** : `.cursor/mcp.json`.
  - **Claude Code** : `claude mcp add ...` (CLI).
  - Tous pointent vers `http://localhost:5000/mcp` (transport HTTP) — aucun chemin absolu dur.
  - Variante stdio documentée pour usage local.
- `README.md` : table de configuration par outil + rappel de `DESIGN_ORACLE_URL` et `DESIGN_ORACLE_TRANSPORT`.

### 2C. CLI légère `uvx`

- Nouveau dossier `clients/design-oracle-mcp/` :
  - `pyproject.toml` autonome, nom `design-oracle-mcp`, entrée console `design-oracle-mcp`.
  - Dépendances : `fastmcp` + `httpx` uniquement (aucun Playwright/Chromium).
- Code client factorisé depuis `backend/mcp_server.py` (httpx pur) dans `clients/design-oracle-mcp/design_oracle_mcp/`.
- `DESIGN_ORACLE_URL` via env, défaut `http://localhost:5000`.
- Usage : `uvx design-oracle-mcp` lance le serveur MCP stdio léger qui appelle le backend HTTP.
- README : instructions de publication PyPI (`python -m build` + `twine upload`).

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `backend/analyzer/stealth.py` | **Nouveau** — init script stealth |
| `backend/analyzer/core.py` | add_init_script, try/finally, timeouts dynamiques |
| `backend/analyzer/layout.py` | filtre getComputedStyle + helper partagé |
| `backend/analyzer/colors.py` | normalize_color rgba/hsl + alpha |
| `backend/analyzer/typography.py` | filtre getComputedStyle (passe fonts) |
| `backend/worker.py` | job_timeout, status "failed" sur timeout |
| `backend/server.py` | SSE_MAX_POLLS aligné, montage MCP /mcp |
| `backend/mcp_server.py` | transport sse, ressource via API |
| `clients/design-oracle-mcp/*` | **Nouveau** — package PyPI client léger |
| `opencode.json.example` | config transport recommandé |
| `AGENT_PROMPT.md` | snippets multi-éditeurs |
| `README.md` | anti-bot limitations, config MCP, packaging |
| `.env.example` | nouvelles env vars (STEALTH_MODE, TIMEOUT_SECONDS, ARQ_JOB_TIMEOUT_SECONDS, DESIGN_ORACLE_TRANSPORT) |

## Hors périmètre (explicitement exclu)

- Proxys résidentiels / résolution de captcha automatique.
- Publication effective sur PyPI (livraison du package + doc, pas de `twine upload`).
- Refactoring non lié aux deux chantiers (ex. structure `dna.py`, composants React).
