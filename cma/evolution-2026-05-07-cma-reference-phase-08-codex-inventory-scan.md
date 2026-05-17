# Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Bounded target: Execute Phase 8 task `02-inventory-all-codex` by adding a backend-only Codex inventory scan endpoint that enumerates visible executables, dedupes candidates, and returns version probing results.
- Files changed:
  - `src/host/node-backend/server.js`
  - `src/host/node-backend/parity-smoke.test.js`
  - `task-plans/subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json`
  - `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Tests or checks run:
  - `node --check src/host/node-backend/server.js`
  - `node --check src/host/node-backend/parity-smoke.test.js`
  - `node --test src/host/node-backend/parity-smoke.test.js`
- Risks or deferrals:
  - Inventory candidates currently rely on PATH-derived resolution plus common local/system/wd paths; VS Code-bundled detection is intentionally minimal and classification is deferred to task 03.
  - Front-end presentation of the new `inventory` payload is deferred to task 04 (Overview card) to keep this slice conservative.
- Next handoff:
  - Continue with Phase 8 task `03-classify-sources` in `task-plans/subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json` to add source labeling (`user/global/workspace/bundled/wrapper/symlink`) for each discovered executable.
