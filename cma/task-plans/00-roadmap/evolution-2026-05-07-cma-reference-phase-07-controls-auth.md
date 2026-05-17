# Evolution: Phase 7 Controls And Auth

Plan: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Subtask: `task-plans/subtask_json/cma-reference-phase-07-remote-watch-surface.json`

Bounded target:

- Complete Phase 7 `07-controls` and `08-auth-model`.

Completed work:

- Added local `POST /api/watch/control`.
- Supported explicit `stop` and `resume` actions for watched thread/task auto-continue state.
- Stop records `last_stop_reason: "user_stopped"` and disables auto-continue.
- Resume records `last_stop_reason: "user_resumed"` and re-enables auto-continue.
- Added durable JSONL trace evidence in `~/.codex-managed-agent/watch-actions.jsonl`.
- Added watch write auth:
  - local requests are allowed
  - non-local writes require a matching bearer token
  - non-local writes also accept `x-cma-watch-token`
  - token source is `watchAuthToken` option or `CMA_WATCH_AUTH_TOKEN`
- Marked Phase 7 completed.

Verification:

- `node --check src/host/node-backend/server.js`
- `node --test src/host/node-backend/node-backend.test.js --test-name-pattern "watch write auth|persists watch stop and resume controls|watch auto-continue reports explicit stop conditions|persists local watch auto-continue count controls"`
- `node --test src/host/node-backend/parity-smoke.test.js`

Next handoff:

- Run a broader webview/backend regression sweep before packaging, especially once UI buttons are wired to the new watch routes.
