#!/usr/bin/env bash
# Start the backend (port 8000) and the frontend dev server (port 5173+).
set -e
cd "$(dirname "$0")/.."

echo "== backend: http://127.0.0.1:8000/docs =="
( cd backend && python -m uvicorn app.main:app --reload --port 8000 ) &
BACK_PID=$!

echo "== frontend dev server =="
cd frontend
npm run dev -- --port 5173 --strictPort &
FRONT_PID=$!

trap "kill $BACK_PID $FRONT_PID 2>/dev/null" EXIT
wait
