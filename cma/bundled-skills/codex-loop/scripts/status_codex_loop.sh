#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="${CODEX_LOOP_WORKSPACE:-$PWD}"
PROMPT_FILE="${CODEX_LOOP_PROMPT_FILE:-${WORKSPACE}/.codex-loop/prompt.md}"
STATE_DIR="${CODEX_LOOP_STATE_DIR:-${WORKSPACE}/.codex-loop/state}"
LAUNCHER_FILE="${STATE_DIR}/daemon_launcher.json"

RAW_STATUS="$(python "${SCRIPT_DIR}/codex_loop_automation.py" status \
  --workspace "${WORKSPACE}" \
  --prompt-file "${PROMPT_FILE}" \
  --state-dir "${STATE_DIR}" \
  "$@")"

python - "${RAW_STATUS}" "${LAUNCHER_FILE}" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

status = json.loads(sys.argv[1])
launcher_file = Path(sys.argv[2])
launcher = {}
if launcher_file.exists():
    launcher = json.loads(launcher_file.read_text(encoding="utf-8"))

if launcher.get("launcher") == "tmux" and launcher.get("tmux_session"):
    proc = subprocess.run(
        ["tmux", "has-session", "-t", launcher["tmux_session"]],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    launcher["tmux_session_running"] = proc.returncode == 0

status["launcher"] = launcher
print(json.dumps(status, ensure_ascii=False, indent=2))
PY
