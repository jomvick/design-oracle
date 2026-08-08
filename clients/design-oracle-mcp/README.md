# design-oracle-mcp

Lightweight MCP client for the [Design Oracle](https://github.com/jomvick/design-oracle)
backend. Talks to the FastAPI backend over HTTP — **no Playwright, no Chromium**,
so it installs and starts in seconds.

## Usage

```bash
uvx design-oracle-mcp
```

Or install locally:

```bash
pip install design-oracle-mcp
design-oracle-mcp
```

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `DESIGN_ORACLE_URL` | `http://localhost:5000` | Backend API base URL |

## Publishing to PyPI

```bash
cd clients/design-oracle-mcp
python -m pip install --upgrade build twine
python -m build
python -m twine upload dist/*
```
