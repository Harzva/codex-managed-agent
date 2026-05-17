# Supervisor Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Subtask index reviewed: `task-plans/subtask_json/index.json`
- Worker state reviewed: `.codex-loop/state-cma-reference-roadmap-spark-worker/status.json`, latest Spark last-message, daemon heartbeat, and recent Phase 4 evolution notes.

## Review Result

- Phase 4 is `in_progress`.
- Phase 4 tasks `01-vault-schema`, `02-import-current`, `03-import-file`, and `04-activate-backup` are marked `done`; task `05-token-health` is next by JSON status.
- Spark worker completed tick `tick_20260507_100633` while this supervisor pass was running; the tick completed Phase 4 task `04-activate-backup`.
- Import-current and import-file are now explicit UI/message paths. They should remain user-invoked only and must not run during ordinary Accounts refresh/render.
- Activation now includes a pre-write backup path in `activateAccountForCodex`; continue to keep exact native target path and backup metadata visible as Phase 4 proceeds.
- Recent worker notes call out missing regression tests for import and activation paths. That is acceptable for small slices, but Phase 4 should add focused tests before it is considered complete.
- This supervisor did not read or modify `.codex/auth.json`.
- Not all subtask JSON files are completed, so no supervisor `stop.flag` should be created.

## Checks Run

- `node --check src/host/account-manager.js`
- `node --check src/panel.js`
- `node --check src/host/panel-view.js`
- `node --check src/webview-template.js`
- JSON parse check for the subtask index and all subtask JSON files

All checks passed.

## Tiny Corrective Action

- Removed stale `.codex-loop/state-cma-reference-roadmap-spark-worker/tick.lock` after confirming the Spark worker status was `idle` and no Spark child `codex exec resume` process was active.

## Routing For Worker

Continue Phase 4 task `05-token-health` when the active tick is ready for the next slice.

Keep the next slice narrow:

- Add deterministic token-health classification (`ok`, `expiring_soon`, `expired`, `invalid`, `refresh_failed`, `rate_limited`, `unknown`) without network calls.
- Prefer pure helpers and focused temp-fixture tests before UI expansion.
- Do not refresh tokens, activate accounts, switch profiles, or overwrite native auth in `05-token-health`.
- Do not read the workspace `.codex/auth.json` in tests; use temp `codexHome`/managed-profile fixtures.
- Preserve backup-before-write behavior in activation, and do not move activation behavior into import or token-health paths.

## Next Supervisor Check

After task `05-token-health`, verify token-health state semantics, absence of network/native-auth side effects, and whether Phase 4 needs import/activation regression tests before moving to refresh behavior.
