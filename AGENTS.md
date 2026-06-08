# AGENTS.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. MCP Server (AI Agent Integration)

Ce projet expose un serveur MCP (Model Context Protocol) pour connecter des agents IA et IDE (opencode, Codex, Cursor, Codex, etc.). Le serveur MCP wraps l'API d'analyse en outils et ressources.

### Lancer le serveur MCP

**Local (sans Docker) :**
```bash
source .venv/bin/activate
pip install mcp
python3 backend/mcp_server.py
```

**Via Docker (si l'app tourne dans un container) :**
```bash
docker exec -i design-oracle python3 /app/backend/mcp_server.py
```

### Configurer chaque outil

**opencode** → ajouter dans `opencode.json` à la racine du projet :
```json
{
  "mcpServers": {
    "design-oracle": {
      "command": "python3",
      "args": ["backend/mcp_server.py"]
    }
  }
}
```

**Codex** → dans `~/.Codex/settings.json` ou `Codex.json` :
```json
{
  "mcpServers": {
    "design-oracle": {
      "command": "python3",
      "args": ["chemin/vers/backend/mcp_server.py"]
    }
  }
}
```

**Cursor / Codex / Antigravity** → idem dans leur configuration MCP respective.

### Outils MCP disponibles

| Outil | Description |
|---|---|
| `analyze_website(url)` | Lancer une nouvelle analyse |
| `get_status(analyze_id)` | Vérifier la progression |
| `get_result(analyze_id)` | Récupérer le JSON complet |
| `list_analyses()` | Lister toutes les analyses |
| `export_design_md(analyze_id)` | Exporter DESIGN.md |
| `export_tailwind(analyze_id)` | Exporter tailwind.config.js |
| `export_components(analyze_id)` | Exporter les composants React |

### Resources MCP

URIs: `designoracle://{analyze_id}/{filename}`

Fichiers disponibles : `DESIGN.md`, `tailwind.config.js`, `components.jsx`, `design-tokens.json`, `result.json`
