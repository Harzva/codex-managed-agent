# Evolution: Phase 7 Stop Conditions

Plan: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Subtask: `task-plans/subtask_json/cma-reference-phase-07-remote-watch-surface.json`

Bounded target:

- Complete Phase 7 `06-stop-conditions`.

Completed work:

- Expanded `/api/watch` auto-continue `blocked_reason` values:
  - `user_stops_auto_continue`
  - `resume_launch_fails`
  - `token_or_account_health_blocks_work`
  - `quota_or_rate_limit_blocks_work`
  - `session_binding_is_missing_or_changed`
  - `thread_is_running_or_queued`
  - `finite_count_required`
  - `remaining_count_reaches_zero`
  - `latest_turn_is_not_task_complete`
  - `completed_turn_already_consumed`
- Added account-health, launch-status, and session-binding fields to persisted watch auto-continue settings.
- Added regression coverage for token/account block, running lifecycle block, and missing session binding block.

Verification:

- `node --check src/host/node-backend/server.js`
- `node --test src/host/node-backend/node-backend.test.js --test-name-pattern "watch auto-continue reports explicit stop conditions|persists local watch auto-continue count controls"`
- `node --test src/host/node-backend/parity-smoke.test.js`

Next handoff:

- Implement Phase 7 `07-controls`: add explicit stop/resume controls and durable watch action trace evidence.
