#!/usr/bin/env bash
set -euo pipefail

BACK_PID=""
REMOTION_PID=""

port_pids() {
  lsof -tiTCP:1233 -sTCP:LISTEN 2>/dev/null || true
}

ensure_port_free() {
  local pids=""
  pids="$(port_pids)"
  if [[ -n "${pids}" ]]; then
    echo "[dev:all] Clearing existing process(es) on port 1233: ${pids}"
  fi

  for _ in {1..30}; do
    pids="$(port_pids)"
    if [[ -z "${pids}" ]]; then
      return 0
    fi
    kill ${pids} >/dev/null 2>&1 || true
    sleep 0.2
  done

  pids="$(port_pids)"
  if [[ -n "${pids}" ]]; then
    echo "[dev:all] Force-killing stubborn process(es) on port 1233: ${pids}"
    kill -9 ${pids} >/dev/null 2>&1 || true
    sleep 0.3
  fi

  pids="$(port_pids)"
  if [[ -n "${pids}" ]]; then
    echo "[dev:all] Could not free port 1233. Stop the process manually and retry."
    return 1
  fi
}

ensure_port_free

.venv/bin/python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 1233 --reload-dir backend --reload-exclude ".venv/*" &
BACK_PID=$!
echo "[dev:all] Started backend on 127.0.0.1:1233 (pid ${BACK_PID})."

BACKEND_READY=0
for _ in {1..40}; do
  if ! kill -0 "${BACK_PID}" >/dev/null 2>&1; then
    echo "[dev:all] Backend process exited before becoming ready."
    exit 1
  fi
  if curl -sS -m 1 http://127.0.0.1:1233/children >/dev/null 2>&1; then
    echo "[dev:all] Backend is ready."
    BACKEND_READY=1
    break
  fi
  sleep 0.25
done

if [[ "${BACKEND_READY}" -ne 1 ]]; then
  echo "[dev:all] Backend did not become ready on 127.0.0.1:1233."
  exit 1
fi

cleanup() {
  if [[ -n "${REMOTION_PID}" ]] && kill -0 "${REMOTION_PID}" >/dev/null 2>&1; then
    kill "${REMOTION_PID}" >/dev/null 2>&1 || true
  fi
  if [[ -n "${BACK_PID}" ]] && kill -0 "${BACK_PID}" >/dev/null 2>&1; then
    kill "${BACK_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

if [[ ! -x "frontend/node_modules/.bin/next" ]]; then
  echo "[dev:all] Frontend dependencies missing. Installing..."
  npm --prefix frontend install
fi

# Start Remotion render server
if [[ -d "remotion" ]]; then
  if [[ ! -d "remotion/node_modules" ]]; then
    echo "[dev:all] Remotion dependencies missing. Installing..."
    npm --prefix remotion install
  fi
  echo "[dev:all] Starting Remotion render server on port 1234..."
  node remotion/render-api.js &
  REMOTION_PID=$!
  echo "[dev:all] Remotion render server started (pid ${REMOTION_PID})."
fi

npm --prefix frontend run dev
