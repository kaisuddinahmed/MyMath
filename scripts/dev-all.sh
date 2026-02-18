#!/usr/bin/env bash
set -euo pipefail

BACK_PID=""

if lsof -nP -iTCP:1233 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "[dev:all] Backend already running on 127.0.0.1:1233 (reusing existing process)."
else
  .venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233 --reload-dir backend --reload-exclude ".venv/*" &
  BACK_PID=$!
  echo "[dev:all] Started backend on 127.0.0.1:1233 (pid ${BACK_PID})."
fi

cleanup() {
  if [[ -n "${BACK_PID}" ]] && kill -0 "${BACK_PID}" >/dev/null 2>&1; then
    kill "${BACK_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

npm --prefix frontend run dev
