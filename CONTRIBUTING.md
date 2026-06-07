# Contributing to Design Oracle

Thanks for your interest in contributing! This project is open source and welcomes bug reports, documentation improvements, and pull requests.

## Getting started

1. Fork the repository and clone your fork.
2. Choose a setup method:
   - **Docker (recommended):** `docker compose up --build`
   - **Local:** `./start.sh` (requires Python 3.12+, Node 20+, Redis 7+)
3. Create a branch: `git checkout -b fix/my-change` or `feat/my-feature`

## Development workflow

| Service   | Port | Command |
|-----------|------|---------|
| Frontend  | 3000 | `npm run dev --prefix frontend` |
| API       | 5000 | `uvicorn backend.server:app --reload --port 5000` |
| Worker    | —    | `arq backend.worker.WorkerSettings` |
| Redis     | 6379 | `docker run -d -p 6379:6379 redis:7-alpine` |

Run the worker alongside the API when testing analyses end-to-end.

## Code guidelines

- **Keep changes focused** — one concern per PR.
- **Match existing style** — Python for backend, TypeScript + Tailwind for frontend.
- **No secrets** — never commit `.env`, API keys, or local analysis data.
- **English** for user-facing UI strings and documentation.

## Before opening a PR

```bash
# Frontend
cd frontend && npm run lint && npm run build

# Backend (optional smoke test)
curl http://localhost:5000/api/health
```

## Pull request checklist

- [ ] Description explains **why** the change is needed
- [ ] `npm run build` passes in `frontend/`
- [ ] No unrelated formatting or drive-by refactors
- [ ] README updated if behavior, setup, or API changed

## Reporting bugs

Open a [GitHub issue](https://github.com/jomvick/design-oracle/issues) with:

- OS and setup method (Docker / local)
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs (`arq_worker.log`, `/tmp/server.log`)

## Feature ideas

See [open issues](https://github.com/jomvick/design-oracle/issues). Popular areas:

- Multi-viewport analysis (mobile / tablet)
- Test coverage for analyzers
- i18n / localization
- Improved component detection heuristics
