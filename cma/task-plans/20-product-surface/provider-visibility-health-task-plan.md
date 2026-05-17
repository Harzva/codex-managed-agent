# Provider Visibility Health

## Summary

`state_5.sqlite` is Codex's local state database, normally at `~/.codex/state_5.sqlite`. It is metadata storage for the Codex App/Desktop history index, including thread/project/provider visibility signals. Chat body content still lives in rollout JSONL files under `~/.codex/sessions`.

The CMA dashboard should show a read-only Provider Visibility Health panel in Overview. The goal is to explain when CMA can see rollout JSONL sessions while the official Codex App/Desktop may hide them because its SQLite provider metadata is out of sync.

## Key Changes

- Add an Overview health panel near Codex Configuration.
- Show the current `config.toml` `model_provider`, rollout JSONL provider distribution, and `state_5.sqlite` availability/readability.
- Surface a plain conclusion: `Aligned`, `CMA visible, Desktop may differ`, or `SQLite unavailable`.
- Keep v1 diagnostic-only. Do not modify `state_5.sqlite`, `config.toml`, rollout JSONL, `auth.json`, or encrypted content.

## Implementation Notes

- Host payload field: `providerVisibilityHealth`.
- Read Codex home via existing `resolveCodexHome()`.
- Parse only root-level `model_provider` from `~/.codex/config.toml`; default to `openai` when missing.
- Count providers from `~/.codex/sessions/**/rollout-*.jsonl` using lightweight JSONL sampling.
- Inspect `~/.codex/state_5.sqlite` only when it exists and the system `sqlite3` CLI is available; do not add an npm SQLite dependency.
- Treat SQLite schema drift as a warning, not a fatal panel error.

## Test Plan

- Host tests for config provider parsing, JSONL provider counts, missing SQLite, sqlite3-unavailable SQLite, query failure, and mismatch detection.
- Webview regression to ensure the panel renders and no overview scripts break.
- Verification commands:
  - `node -c src/host/state-sync.js`
  - `node -c src/webview-template.js`
  - `node -c src/webview/styles.js`
  - `node --test src/host/state-sync.test.js`
  - `node --test src/webview/render-detail-regression.test.js`
