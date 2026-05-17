# Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Bounded target: Execute phase 8 task `01-detect-active-codex` by adding a read-only active Codex detection endpoint and wiring it into dashboard state.
- Files changed:
  - `src/host/node-backend/server.js`
  - `src/host/server.js`
  - `src/host/node-backend/parity-smoke.test.js`
  - `task-plans/subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json`
  - `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Tests or checks run:
  - `node --check src/host/node-backend/server.js`
  - `node --check src/host/server.js`
  - `node --check src/host/node-backend/parity-smoke.test.js`
  - `node --test src/host/node-backend/parity-smoke.test.js`
- Risks or deferrals:
  - Active-Codex detection does not yet enumerate all candidate executables; it only resolves the single executable that `codex` resolves to from current environment plus its version.
  - Overview UI rendering for this metadata is deferred to later tasks in phase 8.
- Next handoff: proceed with phase 8 task `02-inventory-all-codex` in `task-plans/subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json`.
