# Evolution: Phase 7 Count Controls And Persistence

Plan: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Subtask: `task-plans/subtask_json/cma-reference-phase-07-remote-watch-surface.json`

Bounded target:

- Complete Phase 7 `04-auto-continue-count` and `05-persist-settings`.

Completed work:

- Added local `POST /api/watch/auto-continue` in `src/host/node-backend/server.js`.
- The route updates watched thread/task auto-continue settings:
  - `enabled`
  - `max_count`
  - `remaining_count`
  - `consumed_count`
  - `prompt`
  - `last_completed_turn_signature`
  - `last_stop_reason`
- Added reset behavior that restores remaining count to max count, clears consumed turn signature, and records `last_stop_reason: "reset"`.
- Persisted settings with atomic writes to `~/.codex-managed-agent/watchlist.json`.
- Restricted the write path to local requests until the non-local auth model lands.
- Added regression coverage in `src/host/node-backend/node-backend.test.js`.

Verification:

- `node --check src/host/node-backend/server.js`
- `node --test src/host/node-backend/node-backend.test.js --test-name-pattern "persists local watch auto-continue count controls"`
- `node --test src/host/node-backend/parity-smoke.test.js`

Next handoff:

- Implement Phase 7 `06-stop-conditions`: expand `blocked_reason` so count exhaustion, running/queued lifecycle, missing explicit `task_complete`, account/token blocks, rate limits, user stop, launch failure, and session binding changes are represented distinctly.
