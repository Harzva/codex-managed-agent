# Supervisor Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Subtask index reviewed: `task-plans/subtask_json/index.json`
- Worker state reviewed: `.codex-loop/state-cma-reference-roadmap-spark-worker/status.json`, latest Spark last-message, daemon heartbeat, and recent Phase 4 evolution notes.

## Review Result

- Phase 4 is `in_progress`.
- Phase 4 tasks `01-vault-schema` through `06-refresh-before-activation` are marked `done`; task `07-refresh-failure` is next by JSON status.
- Spark worker is currently running tick `tick_20260507_101718`, so the worker lock is active and must not be removed.
- Token health is now surfaced through managed account payloads, and activation preflight now blocks native auth overwrite when a pre-activation refresh fails.
- The activation path now has backup-before-write behavior for existing native auth, but import and activation coverage is still mostly syntax/check based.
- This supervisor did not read or modify `.codex/auth.json`.
- Not all subtask JSON files are completed, so no supervisor `stop.flag` should be created.

## Checks Run

- `node --check src/host/account-manager.js`
- `node --check src/panel.js`
- `node --check src/host/panel-view.js`
- `node --check src/webview-template.js`
- JSON parse check for the subtask index and all subtask JSON files

All checks passed.

## Routing For Worker

Continue Phase 4 task `07-refresh-failure`.

Keep the next slice narrow:

- Persist and surface `refresh_failed` as a blocking account health state with clear re-login or switch-account guidance.
- Add focused regression coverage for refresh failure blocking activation before any native auth write.
- Tests must use temp `codexHome` and managed-profile fixtures; do not read workspace `.codex/auth.json`.
- Do not add automatic account switching or account rotation.
- Do not weaken backup-before-write behavior in `activateAccountForCodex`.
- Do not run real network refresh calls in tests; stub or isolate refresh behavior deterministically.

## Next Supervisor Check

After task `07-refresh-failure`, verify the blocked-write path with focused tests and ensure Phase 4 task `08-ui-actions` remains the only UI-action expansion slice unless the worker explicitly completes it next.
