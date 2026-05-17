#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${CODEX_LOOP_WORKSPACE:-$PWD}"
STATE_DIR="${CODEX_LOOP_STATE_DIR:-${WORKSPACE}/.codex-loop/state}"
PID_FILE="${STATE_DIR}/daemon.pid"
STOP_FLAG="${STATE_DIR}/stop.flag"
LAUNCHER_FILE="${STATE_DIR}/daemon_launcher.json"

TMUX_SESSION=""
if [[ -f "${LAUNCHER_FILE}" ]]; then
  TMUX_SESSION="$(python - "${LAUNCHER_FILE}" <<'PY'
import json
import sys
from pathlib import Path
path = Path(sys.argv[1])
try:
    data = json.loads(path.read_text(encoding="utf-8"))
except Exception:
    data = {}
print(data.get("tmux_session", ""))
PY
)"
fi

if [[ ! -f "${PID_FILE}" ]]; then
  if [[ -n "${TMUX_SESSION}" ]] && tmux has-session -t "${TMUX_SESSION}" 2>/dev/null; then
    tmux kill-session -t "${TMUX_SESSION}" || true
    rm -f "${LAUNCHER_FILE}"
    echo "stopped codex-loop tmux session ${TMUX_SESSION}"
    exit 0
  fi
  echo "codex-loop automation is not running"
  exit 0
fi

PID="$(cat "${PID_FILE}")"
touch "${STOP_FLAG}"

if kill -0 "${PID}" 2>/dev/null; then
  kill "${PID}" || true
  echo "stop requested for codex-loop automation, PID ${PID}"
else
  echo "stale PID file found, cleaning up"
fi

rm -f "${PID_FILE}"
if [[ -n "${TMUX_SESSION}" ]] && tmux has-session -t "${TMUX_SESSION}" 2>/dev/null; then
  tmux kill-session -t "${TMUX_SESSION}" || true
fi
rm -f "${LAUNCHER_FILE}"
