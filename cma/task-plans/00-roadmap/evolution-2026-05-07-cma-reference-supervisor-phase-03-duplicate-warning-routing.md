# Supervisor Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Subtask index reviewed: `task-plans/subtask_json/index.json`
- Worker state reviewed: `.codex-loop/state-cma-reference-roadmap-spark-worker/status.json`, latest Spark last-message files, and daemon heartbeat.

## Review Result

- Phase 8 is now `completed`; all version inventory tasks including `06-tests` are `done`.
- Phase 3 is active and `in_progress`; tasks `01-normalize-path` and `02-extend-records` are `done`; task `03-duplicate-warnings` is next.
- Spark worker is currently running a new tick (`tick_20260507_093245`), so the worker lock is active and must not be removed.
- The latest completed worker slice added account identity fields in `src/host/account-manager.js`; it did not itself add new native auth activation behavior.
- Existing activation code in `src/host/account-manager.js` still writes native `auth.json` during explicit activation. That belongs to later safe-activation work, not the Phase 3 duplicate-warning slice.
- This supervisor did not read or modify `.codex/auth.json`.
- Not all subtask JSON files are completed, so no supervisor `stop.flag` should be created.

## Checks Run

- `node --check src/host/account-manager.js`
- JSON parse check for the subtask index and all subtask JSON files
- `node --test src/host/node-backend/parity-smoke.test.js src/webview/render-detail-regression.test.js`

All checks passed.

## Routing For Worker

Continue Phase 3 task `03-duplicate-warnings`, but keep the slice narrow:

- Add non-destructive duplicate warnings only.
- Do not silently merge accounts by email, display name, or `account_id`.
- Treat same email/account id as warning evidence, not as a canonical identity key.
- Prefer path/fingerprint/credential evidence when available, and explicitly allow two auth files with the same email to coexist.
- Do not change activation, backup, refresh, token switching, or native `.codex/auth.json` write behavior in this task.
- Do not read, write, import, refresh, activate, or overwrite `.codex/auth.json`.

## Next Supervisor Check

After the worker finishes `03-duplicate-warnings`, verify that the warnings are surfaced without blocking same-email different-path accounts, and that Phase 3 still has `04-ui-source-path` and `05-tests` remaining unless the worker explicitly completes them in separate bounded slices.
