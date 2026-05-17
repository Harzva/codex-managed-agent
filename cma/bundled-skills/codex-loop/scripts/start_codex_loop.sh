#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${CODEX_LOOP_WORKSPACE:-$PWD}"
PROMPT_FILE="${CODEX_LOOP_PROMPT_FILE:-${WORKSPACE}/.codex-loop/prompt.md}"
STATE_DIR="${CODEX_LOOP_STATE_DIR:-${WORKSPACE}/.codex-loop/state}"
INTERVAL_MINUTES="${CODEX_LOOP_INTERVAL_MINUTES:-1}"
MAX_TICKS="${CODEX_LOOP_MAX_TICKS:-}"
PYTHON_BIN="${CODEX_LOOP_PYTHON_BIN:-python}"
LAUNCHER="${CODEX_LOOP_LAUNCHER:-auto}"
REUSE_CURRENT_THREAD="${CODEX_LOOP_REUSE_CURRENT_THREAD:-0}"
FORCE_THREAD_ID="${CODEX_LOOP_FORCE_THREAD_ID:-}"
LOG_DIR="${STATE_DIR}/logs"
PID_FILE="${STATE_DIR}/daemon.pid"
LAUNCHER_FILE="${STATE_DIR}/daemon_launcher.json"

mkdir -p "${LOG_DIR}"

if [[ -n "${CODEX_THREAD_ID:-}" ]]; then
  echo "detected current Codex thread: ${CODEX_THREAD_ID}"
fi

if [[ -f "${PID_FILE}" ]]; then
  EXISTING_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [[ -n "${EXISTING_PID}" ]] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
    echo "codex-loop automation is already running with PID ${EXISTING_PID}"
    exit 0
  fi
fi

if [[ "${LAUNCHER}" == "auto" ]]; then
  if command -v tmux >/dev/null 2>&1; then
    LAUNCHER="tmux"
  else
    LAUNCHER="nohup"
  fi
fi

THREAD_ARGS=()
THREAD_MODE="fresh_thread"
if [[ -n "${FORCE_THREAD_ID}" ]]; then
  THREAD_ARGS=(--thread-id "${FORCE_THREAD_ID}")
  THREAD_MODE="forced_thread"
elif [[ "${REUSE_CURRENT_THREAD}" == "1" && -n "${CODEX_THREAD_ID:-}" ]]; then
  THREAD_ARGS=(--thread-id "${CODEX_THREAD_ID}")
  THREAD_MODE="reuse_current_thread"
elif [[ -n "${CODEX_THREAD_ID:-}" ]]; then
  echo "ignoring current interactive Codex thread for automation start"
  echo "set CODEX_LOOP_REUSE_CURRENT_THREAD=1 if you explicitly want to resume it"
fi

MAX_TICK_ARGS=()
if [[ -n "${MAX_TICKS}" && "${MAX_TICKS}" != "0" ]]; then
  MAX_TICK_ARGS=(--max-ticks "${MAX_TICKS}")
fi

SESSION_NAME="${CODEX_LOOP_TMUX_SESSION:-codex-loop-$(basename "${WORKSPACE}")-$(printf '%s' "${WORKSPACE}" | md5sum | cut -c1-8)}"
CMD=(
  "${PYTHON_BIN}" "${SCRIPT_DIR}/codex_loop_automation.py" daemon
  --workspace "${WORKSPACE}"
  --prompt-file "${PROMPT_FILE}"
  --state-dir "${STATE_DIR}"
  --interval-minutes "${INTERVAL_MINUTES}"
  "${MAX_TICK_ARGS[@]}"
  "${THREAD_ARGS[@]}"
  "$@"
)

printf '{\n  "launcher": "%s",\n  "thread_mode": "%s",\n  "tmux_session": %s,\n  "workspace": "%s",\n  "prompt_file": "%s",\n  "state_dir": "%s",\n  "max_ticks": %s\n}\n' \
  "${LAUNCHER}" \
  "${THREAD_MODE}" \
  "$(if [[ "${LAUNCHER}" == "tmux" ]]; then printf '"%s"' "${SESSION_NAME}"; else printf 'null'; fi)" \
  "${WORKSPACE}" \
  "${PROMPT_FILE}" \
  "${STATE_DIR}" \
  "$(if [[ -n "${MAX_TICKS}" && "${MAX_TICKS}" != "0" ]]; then printf '%s' "${MAX_TICKS}"; else printf 'null'; fi)" > "${LAUNCHER_FILE}"

if [[ "${LAUNCHER}" == "tmux" ]]; then
  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux is not installed, cannot use CODEX_LOOP_LAUNCHER=tmux" >&2
    exit 1
  fi
  if tmux has-session -t "${SESSION_NAME}" 2>/dev/null; then
    echo "codex-loop tmux session already exists: ${SESSION_NAME}"
    exit 0
  fi
  printf -v CMD_SHELL '%q ' "${CMD[@]}"
  tmux new-session -d -s "${SESSION_NAME}" \
    "cd $(printf '%q' "${WORKSPACE}") && env -u CODEX_THREAD_ID ${CMD_SHELL} >> $(printf '%q' "${LOG_DIR}/daemon_stdout.log") 2>&1"
else
  nohup env -u CODEX_THREAD_ID "${CMD[@]}" > "${LOG_DIR}/daemon_stdout.log" 2>&1 &
fi

sleep 1

if [[ -f "${PID_FILE}" ]]; then
  echo "started codex-loop automation, PID $(cat "${PID_FILE}")"
  echo "launcher=${LAUNCHER} thread_mode=${THREAD_MODE}"
  if [[ "${LAUNCHER}" == "tmux" ]]; then
    echo "tmux session: ${SESSION_NAME}"
  fi
else
  echo "failed to start codex-loop automation" >&2
  exit 1
fi
