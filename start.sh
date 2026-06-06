#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Setting up virtual environment..."
python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate 2>/dev/null || true

echo "Installing Python dependencies..."
pip install -r backend/requirements.txt

echo "Installing Playwright Chromium dependencies..."
python3 -m playwright install chromium 2>/dev/null || true

# Check if Redis is running
if ! nc -z localhost 6379 2>/dev/null; then
    echo "Redis is not running on port 6379. Attempting to start local redis-server..."
    if command -v redis-server >/dev/null 2>&1; then
        redis-server --daemonize yes
        echo "Local redis-server started in daemon mode."
    else
        echo "WARNING: redis-server is not installed and no running Redis instance was found on port 6379."
        echo "Please install Redis or ensure it is running for the background worker to function."
    fi
else
    echo "Redis connection verified on port 6379."
fi

# Clean up background jobs on exit
cleanup() {
    echo "Stopping background worker..."
    kill $WORKER_PID 2>/dev/null || true
    echo "Stopping frontend dev server..."
    kill $FRONTEND_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "Starting background analysis worker..."
arq backend.worker.WorkerSettings > arq_worker.log 2>&1 &
WORKER_PID=$!

echo "Starting Next.js frontend dev server..."
npm run dev --prefix frontend > /dev/null 2>&1 &
FRONTEND_PID=$!

echo "Starting FastAPI server..."
python3 -m backend.server
