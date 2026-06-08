#!/usr/bin/env bash
set -eo pipefail
cd "$(dirname "$0")"

VENV=".venv"

# --- Virtual environment ---
echo "Setting up virtual environment..."
if [ ! -d "$VENV" ]; then
  python3 -m venv "$VENV"
fi
source "$VENV/bin/activate"

# --- Dependencies ---
echo "Installing Python dependencies..."
pip install -q -r backend/requirements.txt

echo "Installing Playwright Chromium..."
python3 -m playwright install chromium 2>/dev/null || true

# --- Redis ---
if command -v redis-cli >/dev/null 2>&1 && redis-cli ping 2>/dev/null | grep -q PONG; then
  echo "Redis connection verified on port 6379."
elif command -v redis-server >/dev/null 2>&1; then
  echo "Starting local redis-server..."
  redis-server --daemonize yes
elif command -v docker >/dev/null 2>&1; then
  echo "Starting Redis via Docker..."
  docker rm -f design-oracle-redis 2>/dev/null || true
  docker run -d --rm --name design-oracle-redis -p 6379:6379 redis:7-alpine
else
  echo "ERROR: Redis is required. Install it or start a Docker container:"
  echo "  docker run -d --rm -p 6379:6379 redis:7-alpine"
  exit 1
fi

# --- Port checks (Linux / macOS) ---
port_in_use() {
  local port=$1
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -q ":$port "
  elif command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$port" -sTCP:LISTEN -P -n 2>/dev/null | grep -q .
  fi
}
if port_in_use 5000; then
  echo "ERROR: Port 5000 already in use. Kill the process and retry:"
  if command -v lsof >/dev/null 2>&1; then
    echo "  lsof -ti :5000 | xargs kill"
  else
    echo "  fuser -k 5000/tcp"
  fi
  exit 1
fi
if port_in_use 3000; then
  echo "WARNING: Port 3000 already in use — frontend may fail."
fi

# --- Cleanup ---
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $WORKER_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  kill $SERVER_PID 2>/dev/null || true
  wait $WORKER_PID $FRONTEND_PID $SERVER_PID 2>/dev/null || true
  echo "All services stopped."
}
trap cleanup EXIT INT TERM

# --- Start services ---
echo "Starting background analysis worker..."
"$VENV/bin/arq" backend.worker.WorkerSettings > arq_worker.log 2>&1 &
WORKER_PID=$!

echo "Starting Next.js frontend (port 3000)..."
API_URL=http://localhost:5000 npm run dev --prefix frontend > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Starting FastAPI server (port 5000)..."
"$VENV/bin/uvicorn" backend.server:app --host 0.0.0.0 --port 5000 > /tmp/server.log 2>&1 &
SERVER_PID=$!

echo ""
echo "  Frontend : http://localhost:3000"
echo "  API      : http://localhost:5000"
echo "  Logs     : tail -f /tmp/server.log /tmp/frontend.log arq_worker.log"
echo ""
echo "Press Ctrl+C to stop all services."
wait
