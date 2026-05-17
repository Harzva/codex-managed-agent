# Evolution: Phase 7 Watchlist

Plan: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Subtask: `task-plans/subtask_json/cma-reference-phase-07-remote-watch-surface.json`

Bounded target:

- Complete Phase 7 `02-watchlist`.

Completed work:

- Added local watchlist loading in `src/host/node-backend/server.js`.
- Default watchlist path is `~/.codex-managed-agent/watchlist.json`.
- Added `readWatchlist` injection support for tests and future host integration.
- Updated `GET /api/watch` behavior:
  - explicit `ids=` filters watched threads for ad hoc read-only views
  - when `ids=` is absent, the endpoint uses configured watched thread ids
  - watched task ids are surfaced in metadata as unsupported until task resolution/control slices land
- Added parity smoke coverage for watchlist-backed `/api/watch`.

Verification:

- `node --check src/host/node-backend/server.js`
- `node --test src/host/node-backend/parity-smoke.test.js`

Next handoff:

- Implement Phase 7 `03-auto-continue`: add conservative per-watch-item auto-continue state that remains disabled by default and can only become launchable after explicit `task_complete` evidence.
