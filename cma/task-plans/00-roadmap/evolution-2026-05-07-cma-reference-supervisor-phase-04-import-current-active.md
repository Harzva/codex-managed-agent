# Supervisor Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Subtask index reviewed: `task-plans/subtask_json/index.json`
- Worker state reviewed: `.codex-loop/state-cma-reference-roadmap-spark-worker/status.json`, latest Spark last-message, daemon heartbeat, and recent Phase 4 evolution notes.

## Review Result

- Phase 4 is `in_progress`.
- Task `01-vault-schema` is `done`; task `02-import-current` is the next intended slice.
- Spark worker is currently running a new tick (`tick_20260507_095027`), so the worker lock is active and must not be removed.
- The completed schema slice added vault constants and metadata templates in `src/host/account-manager.js`; it did not change native auth activation semantics.
- Existing activation code still writes native `auth.json` without the full Phase 4 backup/audit guard. That must remain visible roadmap debt until task `04-activate-backup`.
- This supervisor did not read or modify `.codex/auth.json`.
- Not all subtask JSON files are completed, so no supervisor `stop.flag` should be created.

## Checks Run

- `node --check src/host/account-manager.js`
- JSON parse check for the subtask index and all subtask JSON files

All checks passed.

## Routing For Active Worker

Continue Phase 4 task `02-import-current`, but keep it bounded:

- Implement explicit import-current behavior only; do not make ordinary refresh/render/list paths import native auth automatically.
- Import-current may define code that reads the configured native auth path when the user explicitly invokes that action, but tests should use temp `codexHome` fixtures and must not read the workspace `.codex/auth.json`.
- Store managed profile metadata with source auth path, normalized source path, managed auth path, credential/fingerprint, and token-health placeholders.
- Do not activate, switch, refresh, validate remotely, or overwrite native auth in this slice.
- Do not change existing activation behavior until Phase 4 task `04-activate-backup`, where backup-before-write and exact path/audit reporting must be added first.

## Next Supervisor Check

After `02-import-current`, verify that import is explicit, source-path-aware, non-mutating toward native auth, and covered by focused temp-path tests before routing to `03-import-file`.
