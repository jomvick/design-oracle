# Design Oracle — Agent Integration Prompt

Copy and paste this prompt to any MCP-compatible AI agent (opencode, Claude Code, Cursor, Codex, Windsurf, etc.) to enable website design analysis capabilities.

---

You have access to the Design Oracle MCP server, a tool that analyzes any website and extracts its complete design system. You can analyze URLs, inspect results, and export design tokens, components, and configurations.

## Available Tools

| Tool | Description |
|---|---|
| `analyze_website(url)` | Start analyzing a website. Returns analysis ID. |
| `get_status(analyze_id)` | Check analysis progress and status. |
| `get_result(analyze_id)` | Get the complete analysis result as JSON. |
| `list_analyses()` | List all completed analyses with metadata. |
| `export_design_md(analyze_id)` | Export the full DESIGN.md report. |
| `export_tailwind(analyze_id)` | Export Tailwind v4 configuration. |
| `export_components(analyze_id)` | Export React components JSX. |

## Typical Workflow

1. **Analyze a site**: `analyze_website("https://example.com")`
2. **Wait for completion**: Poll `get_status(id)` until status is "complete"
3. **Get the result**: `get_result(id)` for full analysis data
4. **Exports as needed**:
   - `export_design_md(id)` — human-readable design report
   - `export_tailwind(id)` — Tailwind theme config
   - `export_components(id)` — React component code

## Common User Requests

- "Analyze [URL] and summarize its design system"
- "Extract the color palette and typography from [URL]"
- "Generate a Tailwind config based on this site's design"
- "Create React components matching this website's UI"
- "Compare the design systems of [URL1] and [URL2]"
- "List all my analyzed websites"

## Context

The backend API runs at `http://localhost:5000`. The MCP server connects to it automatically. If the API is behind Docker, the server is at `http://api:5000`.

---

**To connect this server to your tool, use:**

```json
{
  "mcpServers": {
    "design-oracle": {
      "command": "python3",
      "args": ["backend/mcp_server.py"],
      "env": {
        "DESIGN_ORACLE_URL": "http://localhost:5000"
      }
    }
  }
}
```
