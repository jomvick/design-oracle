# Design Oracle

[![CI](https://github.com/jomvick/design-oracle/actions/workflows/ci.yml/badge.svg)](https://github.com/jomvick/design-oracle/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/badge/Docker-ghcr.io%2Fjomvick%2Fdesign--oracle-2496ED?logo=docker)](https://github.com/jomvick/design-oracle/pkgs/container/design-oracle)
[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](LICENSE)

Analyze any website and extract its complete design system — colors, typography, spacing, components, UX patterns — then export it as Tailwind config, React components, design tokens, or a full `DESIGN.md` report.

Works standalone or as an [MCP server](AGENT_PROMPT.md) for AI agents (Cursor, Claude Code, opencode, etc.).

<p align="center">
  <img src="Gif/export-1780924448919.gif" alt="Design Oracle demo" width="720">
</p>

## Features

- **Full-page capture** with Playwright (Chromium)
- **Design DNA** — style classification, visual score, heuristics
- **Component detection** — hero, pricing, nav, FAQ, etc. with bounding boxes
- **Live progress** — SSE stream + Redis pub/sub
- **Exports** — Tailwind v4, React JSX, JSON tokens, Markdown report
- **MCP integration** — expose analysis tools to AI workflows

## Architecture

```
┌──────────────┐     ┌─────────────┐     ┌───────────┐
│  Next.js UI  │────▶│  FastAPI    │────▶│  ARQ      │
│  (port 3000) │◀────│  (port 5000)│◀────│  Worker   │
└──────────────┘     └──────┬──────┘     └─────┬─────┘
                            │                  │
                     ┌──────┴──────┐     ┌─────┴─────┐
                     │   SQLite    │     │   Redis    │
                     │  analyses   │     │  (pub/sub  │
                     │  metadata   │     │   + queue) │
                     └─────────────┘     └───────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 15, React 19, Tailwind v4, Framer Motion |
| Backend | FastAPI, SQLAlchemy (async), aiosqlite |
| Worker | ARQ + Redis |
| Analysis | Playwright, BeautifulSoup, TinyCSS2, Pillow |

## Quick Start

### Option A — Docker Compose (recommended)

```bash
cd design-oracle
cp .env.example .env   # optional — defaults work in Docker
docker compose up --build -d
```

Open **http://localhost:3000**

### Option B — Local (`./start.sh`)

**Prerequisites:** Python 3.12+, Node.js 20+, Redis 7+

```bash
cp .env.example .env
./start.sh
```

`start.sh` creates the venv, installs Playwright Chromium, starts Redis (Docker or native), the ARQ worker, Next.js (3000), and FastAPI (5000). Press `Ctrl+C` to stop all services.

> First run is slower (deps + Next.js compile). Subsequent runs are faster.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `API_URL` | `http://api:5000` | Backend URL for Next.js proxy |
| `DESIGN_ORACLE_URL` | `http://localhost:5000` | API URL for MCP server |
| `UVICORN_RELOAD` | `1` | Hot-reload (set `0` in production) |

See [`.env.example`](.env.example) for the full list.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `POST /api/analyze` | Submit a URL for analysis |
| `GET /api/analyze/{id}/status` | Progress + summary when complete |
| `GET /api/analyze/{id}/result` | Full JSON result |
| `GET /api/analyze/{id}/events` | SSE progress stream |
| `GET /api/analyze/{id}/screenshot` | Full-page screenshot |
| `DELETE /api/analyze/{id}` | Delete analysis |
| `GET /api/designs` | List all analyses |
| `GET /api/analyze/{id}/export/tailwind` | Tailwind v4 config |
| `GET /api/analyze/{id}/export/components` | React components |
| `GET /api/analyze/{id}/export/design.md` | Design report |
| `GET /api/analyze/{id}/export/tokens` | Design tokens (JSON) |

## Generated outputs

Each analysis writes to `analyses/{id}/`:

| File | Description |
|------|-------------|
| `screenshot.png` | Full-page capture |
| `screenshot-overlay.png` | Component bounding boxes |
| `result.json` | Raw analysis data |
| `DESIGN.md` | Human-readable report |
| `tailwind.config.js` | Tailwind v4 theme |
| `components.jsx` | React component stubs |
| `design-tokens.json` | Structured tokens |

## MCP Server

```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 backend/mcp_server.py
```

Configure in your AI tool — see [`opencode.json.example`](opencode.json.example) or [`AGENT_PROMPT.md`](AGENT_PROMPT.md).

## Project structure

```
design-oracle/
├── backend/
│   ├── server.py          # FastAPI routes
│   ├── worker.py          # ARQ background jobs
│   ├── mcp_server.py      # MCP tools for AI agents
│   ├── analyzer/          # Playwright extraction pipeline
│   └── generators/        # Tailwind, React, Markdown exports
├── frontend/              # Next.js App Router UI
├── analyses/              # Runtime data (gitignored except .gitkeep)
├── docker-compose.yml
├── start.sh
└── .env.example
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © [jomvick](https://github.com/jomvick)

## Known limitations

- Single viewport (1440×900) — multi-device analysis not yet implemented
- Sites with bot protection (Cloudflare, etc.) may block Playwright
- Component detection uses heuristics, not ML/vision models
- SQLite storage — suitable for local/single-user; not multi-tenant ready
