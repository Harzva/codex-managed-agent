# Evolution: Phase 7 Watch Endpoint

Plan: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Subtask: `task-plans/subtask_json/cma-reference-phase-07-remote-watch-surface.json`

Bounded target:

- Complete Phase 7 `01-watch-endpoint`.

Completed work:

- Added `GET /api/watch` to `src/host/node-backend/server.js`.
- Added `watch: true` to `/api/health` capabilities.
- Added a read-only watch snapshot shape with:
  - thread id/title/cwd/model
  - lifecycle evidence
  - process summary
  - disabled-by-default finite auto-continue metadata
  - read-only action flags that require auth before future write actions
- Exported `buildWatchSnapshot` for future direct tests.
- Added parity smoke coverage in `src/host/node-backend/parity-smoke.test.js`.
- Marked Phase 7 as `in_progress` and `01-watch-endpoint` as `done`.

Verification:

- `node --check src/host/node-backend/server.js`
- `node --test src/host/node-backend/parity-smoke.test.js`

Next handoff:

- Implement Phase 7 `02-watchlist`: persist selected thread/task watch items and expose them through the watch snapshot before adding any auto-continue write actions.
