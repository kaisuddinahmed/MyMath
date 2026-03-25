#!/usr/bin/env bash
set -euo pipefail

BACK_PID=""
REMOTION_PID=""

port_pids() {
  lsof -ti :1232 -ti :1233 -ti :1234 -ti :1235 2>/dev/null || true
}

ensure_port_free() {
  # Force kill known problem processes that might hang before binding a port
  pkill -9 -f "uvicorn backend.main:app" >/dev/null 2>&1 || true
  pkill -9 -f "node remotion/render-api.js" >/dev/null 2>&1 || true
  pkill -9 -f "next dev" >/dev/null 2>&1 || true
  pkill -9 -f "remotion studio" >/dev/null 2>&1 || true

  local pids=""
  pids="$(port_pids)"
  if [[ -n "${pids}" ]]; then
    echo "[dev:all] Clearing existing process(es) on ports 1232, 1233, 1234, 1235: ${pids}"
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
    echo "[dev:all] Force-killing stubborn process(es) on ports 1232, 1233, 1234, 1235: ${pids}"
    kill -9 ${pids} >/dev/null 2>&1 || true
    sleep 0.3
  fi

  pids="$(port_pids)"
  if [[ -n "${pids}" ]]; then
    echo "[dev:all] Could not free ports 1232, 1233, 1234, 1235. Stop the process manually and retry."
    return 1
  fi
}

ensure_port_free

# macOS "Optimize Mac Storage" converts unused files into dataless iCloud stubs after 4-5 days.
# When python tries to read these stubs using specific mmaps, it deadlocks the kernel.
# This forces the kernel to instantly materialize all project files before starting the servers.
brctl download . >/dev/null 2>&1 || true

# macOS quarantine/provenance tracking attributes frequently cause Python's read() syscalls to deadlock.
# This recursively strips them from the backend/ directory to permanently prevent silent server hangs.
xattr -rc backend/ >/dev/null 2>&1 || true

.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 1233 &
BACK_PID=$!
echo "[dev:all] Started backend on 127.0.0.1:1233 (pid ${BACK_PID})."

BACKEND_READY=0
for _ in {1..80}; do
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
  echo "[dev:all] Backend did not become ready on localhost:1233."
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
  echo "[dev:all] Starting Remotion render server on port 1235..."
  REMOTION_PORT=1235 node remotion/render-api.js &
  REMOTION_PID=$!
  echo "[dev:all] Remotion render server started (pid ${REMOTION_PID})."
fi

npm --prefix frontend run dev
