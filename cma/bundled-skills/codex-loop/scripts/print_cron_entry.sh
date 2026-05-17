#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${CODEX_LOOP_WORKSPACE:-$PWD}"
START_CMD="cd ${WORKSPACE} && CODEX_LOOP_WORKSPACE=${WORKSPACE} CODEX_LOOP_LAUNCHER=tmux bash ~/.codex/skills/codex-loop/scripts/start_codex_loop.sh"
STATUS_CMD="cd ${WORKSPACE} && CODEX_LOOP_WORKSPACE=${WORKSPACE} bash ~/.codex/skills/codex-loop/scripts/status_codex_loop.sh"

cat <<EOF
# Example cron entries for codex-loop
#
# Start the daemon after reboot in a detached tmux session
@reboot ${START_CMD}
#
# Check every 10 minutes and start if not running
*/10 * * * * ${STATUS_CMD} >/tmp/codex-loop-status.log 2>&1 || ${START_CMD} >>/tmp/codex-loop-status.log 2>&1
EOF
