#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${CODEX_LOOP_WORKSPACE:-$PWD}"
PROMPT_FILE="${CODEX_LOOP_PROMPT_FILE:-${WORKSPACE}/.codex-loop/prompt.md}"
STATE_DIR="${CODEX_LOOP_STATE_DIR:-${WORKSPACE}/.codex-loop/state}"
WATCH=0
INTERVAL_SECONDS=5

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch)
      WATCH=1
      shift
      ;;
    --interval)
      INTERVAL_SECONDS="$2"
      shift 2
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

render() {
  local raw_status
  raw_status="$(python "${SCRIPT_DIR}/codex_loop_automation.py" status \
    --workspace "${WORKSPACE}" \
    --prompt-file "${PROMPT_FILE}" \
    --state-dir "${STATE_DIR}")"

  python - "${raw_status}" "${STATE_DIR}" <<'PY'
import json
import sys
from pathlib import Path

payload = json.loads(sys.argv[1])
state_dir = Path(sys.argv[2])
launcher_file = state_dir / "daemon_launcher.json"
launcher = {}
if launcher_file.exists():
    launcher = json.loads(launcher_file.read_text(encoding="utf-8"))

print("Codex Loop Monitor")
print("==================")
print(f"daemon_running : {payload.get('daemon_running')}")
print(f"pid            : {payload.get('pid')}")
print(f"thread_id      : {payload.get('thread_id')}")
if launcher:
    print(f"launcher       : {launcher.get('launcher')}")
    if launcher.get("tmux_session"):
        print(f"tmux_session   : {launcher.get('tmux_session')}")
    print(f"thread_mode    : {launcher.get('thread_mode')}")

heartbeat = payload.get("heartbeat") or {}
if heartbeat:
    print(f"heartbeat      : {heartbeat.get('phase')} @ {heartbeat.get('last_loop_started_at') or heartbeat.get('last_sleep_started_at') or heartbeat.get('stopped_at')}")

last_tick = payload.get("last_tick") or {}
if last_tick:
    print(f"last_tick      : {last_tick.get('phase')} (returncode={last_tick.get('returncode')})")
    print(f"started_at     : {last_tick.get('started_at')}")
    print(f"finished_at    : {last_tick.get('finished_at')}")
    print(f"raw_log_path   : {last_tick.get('raw_log_path')}")
    preview = (last_tick.get("last_message_preview") or "").strip()
    if preview:
        print("--- last message preview ---")
        print(preview[:800])

print("--- helpful commands ---")
print("status  : bash ~/.codex/skills/codex-loop/scripts/status_codex_loop.sh")
print("stop    : bash ~/.codex/skills/codex-loop/scripts/stop_codex_loop.sh")
print("logs    : tail -f .codex-loop/state/logs/daemon_stdout.log")
PY
}

if [[ "${WATCH}" == "1" ]]; then
  while true; do
    clear
    render
    sleep "${INTERVAL_SECONDS}"
  done
else
  render
fi
