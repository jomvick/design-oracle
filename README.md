# Design Oracle

Analyze any website and extract its complete design system — colors, typography, spacing, components, UX patterns — then export it as Tailwind config, React components, design tokens, or a full DESIGN.md report.

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

- **Frontend** — Next.js 15 (App Router) + Tailwind v4 + Framer Motion
- **Backend** — FastAPI with async SQLAlchemy + aiosqlite
- **Worker** — ARQ (Redis-backed async job queue)
- **Analysis** — Playwright for screenshots, custom CSS/HTML parser for design extraction

## Quick Start

Choose one of the two methods below.

### Option A — Docker Compose (recommended)

```bash
docker compose up --build -d
```

Then open http://localhost:3000

### Option B — Local Development (`./start.sh`)

#### Prerequisites

- Python 3.12+
- Node.js 20+
- Redis 7+ (auto-started via Docker or native if `./start.sh` detects none running)

#### Run

```bash
./start.sh
```

`./start.sh` handles everything:
- Creates a Python virtual environment and installs dependencies
- Installs Playwright Chromium
- Starts Redis (via Docker or native `redis-server` if available)
- Starts the ARQ background worker
- Starts the Next.js frontend dev server (port 3000)
- Starts the FastAPI server (port 5000)

Press `Ctrl+C` to stop all services at once.

> **Note:** The first startup is slower (venv creation, dependency installs, Next.js compilation). Subsequent runs are faster.

## API

| Endpoint | Description |
|---|---|
| `POST /api/analyze` | Submit a URL for analysis |
| `GET /api/analyze/{id}` | Get analysis results |
| `GET /api/analyze/{id}/events` | SSE stream of analysis progress |
| `GET /api/analyze/{id}/screenshot` | Full-page screenshot |
| `GET /api/analyze/{id}/export/tailwind` | Tailwind v4 config |
| `GET /api/analyze/{id}/export/components` | React components |
| `GET /api/analyze/{id}/export/design.md` | Design report |
| `GET /api/analyze/{id}/export/tokens` | Design tokens (JSON) |
| `GET /api/designs` | List all analyses |

## Generated Outputs

Each analysis produces:

- **screenshot.png** — Full-page capture
- **screenshot-overlay.png** — With detected component bounding boxes
- **result.json** — Complete raw analysis data
- **DESIGN.md** — Human-readable design system report
- **tailwind.config.js** — Tailwind v4 theme config
- **components.jsx** — Extracted UI components as React code
- **design-tokens.json** — Structured design tokens

## MCP Server

Design Oracle includes an MCP server for AI agent integration:

```bash
source .venv/bin/activate
python3 backend/mcp_server.py
```

Then configure in your AI tool:

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

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind v4, Framer Motion, Lucide React
- **Backend**: FastAPI, SQLAlchemy (async), aiosqlite, ARQ, Redis
- **Analysis**: Playwright, BeautifulSoup, TinyCSS2, Pillow
- **Infra**: Docker Compose
