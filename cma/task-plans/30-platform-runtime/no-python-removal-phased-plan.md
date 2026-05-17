# No-Python Removal Phased Plan

Status: active
Owner: Codex-Managed-Agent extension
Created: 2026-04-22

## Objective

Make the VS Code extension run on a Node backend by default, remove misleading status labels, reach Node parity for required dashboard operations, and only then delete the Python/FastAPI backend and related configuration/docs.

This plan is intentionally staged. A phase is checked only after implementation, tests, and a short manual/runtime verification pass succeed.

## Current Checkpoint

- [x] Node backend can serve read-only dashboard list/detail/insights.
- [x] Node backend exposes `GET /api/health`.
- [x] Extension can start Node backend after Python startup/probe failure.
- [x] Node backend thread summaries include structured tool-call counts.
- [x] Node backend thread summaries include git branch metadata.
- [x] Thread Explorer has Base directory filtering and Git Repo / No Git filtering.
- [x] Checkpoint commit created: `f2c3083 Add Node backend git-aware thread filters`.
- [x] Node is the explicit default backend runtime.
- [x] Node supports the remaining write/refresh routes needed to remove Python.
- [x] Python launcher/config/docs are removed.
- [x] `extension/codex_manager/` is removed.

## Phase 1: Rigorous Thread State Model

Goal: Replace the current mixed status/phase language with a small, factual state model.

### Problem

The UI currently mixes two different concepts:

- Factual backend lifecycle status: `running`, `active`, `recent`, `idle`, `archived`, `soft_deleted`.
- Inferred frontend phase labels from log regexes: `Planning`, `Tooling`, `Editing`, `Testing`, `Waiting`.

The inferred labels are useful as weak hints, but they are not reliable state. They should not look like authoritative thread status.

### Target Model

- Process state:
  - `running`: verified live process/log evidence.
  - `stopped`: no live process evidence.
  - `unknown`: insufficient source data.
- Visibility state:
  - `visible`
  - `archived`
  - `soft_deleted`
- Attention state:
  - `needs_human`
  - `normal`

### Tasks

- [x] Add a frontend helper such as `threadStateFacts(thread, payload)` that returns `{ process, visibility, attention }`.
- [x] Keep backend `status` as compatibility input, but stop presenting inferred phases as status.
- [x] Replace Thread Explorer row badges with factual badges only.
- [x] Replace group names that imply guessed state where needed.
- [x] Move `inferCodexPhase()` output to an explicitly labeled hint, or remove it from primary cards.
- [x] Rename UI copy from "Phase" to "Inferred activity" wherever it remains.
- [x] Make `needs_human` a separate attention badge, not a lifecycle group masquerading as status.
- [x] Update empty-state and summary text to describe factual filters.

### Verification

- [x] `node --check extension/src/webview-template.js`
- [x] Existing dashboard tests still pass.
- [x] Manual reload found Overview/Coordination summary cards still exposed inferred labels; fixed summary-card badges to show factual or neutral labels instead.
- [x] Manual screenshot/reload: a stopped thread must not show `Planning/Tooling/Waiting` as its status.
- [x] Manual check: running thread uses factual `Running`; human handoff uses separate `Needs Human`.

### Done Criteria

- [x] No primary badge calls `Planning`, `Tooling`, `Editing`, `Testing`, `Inspecting`, or `Waiting` a thread status.
- [x] Inferred labels, if kept, are visually and textually secondary.
- [x] Thread counts are explained by factual process/visibility/attention filters.

## Phase 2: Node Backend Write/Refresh Parity Decision

Goal: Decide and implement Node equivalents for required non-read-only routes, or explicitly remove those features from the no-Python product.

### Routes

- `POST /api/threads/scan-codex-sessions`
- `POST /api/threads/lifecycle`
- Legacy `POST /api/thread/{thread_id}/rename` is unsupported in the Node product.

### Policy

Prefer Node implementation where the operation can be safe and deterministic. Remove or disable the operation where it depends on Python-only metadata mutation that should not survive no-Python cleanup.

### Tasks

- [x] Audit current callers in `src/host/lifecycle.js`, `src/panel.js`, and `src/host/panel-view.js`.
- [x] Implement Node `scan-codex-sessions` as a no-op refresh-compatible endpoint if direct JSONL discovery already covers it.
- [x] Decide lifecycle storage source:
  - Option A: Node-managed sidecar state file for archive/soft-delete. Decision: chosen for non-destructive actions.
  - Option B: remove archive/delete actions until a stable Node metadata store is introduced.
- [x] Implement safe lifecycle actions if Option A is chosen.
- [x] Decide rename policy:
  - Option A: Node-managed display alias only.
  - Option B: remove legacy thread rename and rely on Card Name aliases. Decision: chosen after Phase 5 validation.
- [x] Update Node backend capabilities to match actual support.
- [x] Add route tests to `src/host/node-backend/node-backend.test.js` or a new write-route test.
- [x] Update `service-capabilities.test.js`.

### Caller Audit

- `POST /api/threads/scan-codex-sessions`
  - Host wrapper: `src/host/server.js::postScanCodexSessions()`.
  - UI entry: `src/panel.js::scanCodexSessions()`.
  - Lifecycle helper entry: `src/host/lifecycle.js` uses a small scan after creating a new thread.
  - Decision: implement in Node as a no-op/index-refresh compatible endpoint because direct JSONL discovery already covers import.
- `POST /api/threads/lifecycle`
  - Host wrapper: `src/host/server.js::postLifecycleAction()`.
  - Message dispatch: `src/host/panel-view.js` handles `lifecycle` and `lifecycleBatch`.
  - UI events: `src/webview-template.js` emits single and batch lifecycle actions; capability guards already block read-only Node backend.
  - Decision: implement only non-destructive actions with Node sidecar state: `archive`, `unarchive`, `soft_delete`, `restore`. Keep `hard_delete` disabled/rejected under Node.
- Legacy `POST /api/thread/{thread_id}/rename`
  - Decision: unsupported in the Node product; use Board/Card labels for local naming instead.

### Verification

- [x] `node --test extension/src/host/node-backend/node-backend.test.js`
- [x] `node --test extension/src/host/node-backend/parity-smoke.test.js`
- [x] `node --test extension/src/host/service-capabilities.test.js`
- [x] Manual: Scan Sessions succeeds under Node runtime.
- [x] Manual: disabled/removed actions do not appear clickable.
- [x] Manual: implemented actions survive reload.

### Done Criteria

- [x] No UI action depends on Python-only write endpoints.
- [x] Capability metadata is truthful.
- [x] Destructive behavior is either tested or absent.

## Phase 3: Explicit Backend Runtime Setting

Goal: Add a user-visible runtime selector and make Node the default.

### Runtime Values

- `node`: use built-in Node backend only.
- `python`: use legacy Python backend only.
- `auto`: probe configured/existing service, then fall back as needed.

Default should be `node`.

### Tasks

- [x] Add `codexAgent.backendRuntime` to `package.json`.
- [x] Update `getConfig()` to read `backendRuntime`.
- [x] Change startup flow:
  - [x] `node`: start/probe Node backend directly.
  - [x] `python`: preserve current Python launch/probe path.
  - [x] `auto`: preserve compatibility probing and fallback behavior.
- [x] Stop treating Python as the implicit healthy default in service metadata.
- [x] Update service banner/backend label copy.
- [x] Remove or hide Python-only start buttons when runtime is `node`.
- [x] Add server tests for all three runtime values. Current coverage includes default `node` and node-runtime startup.
- [x] Decide whether `.vscode/settings.json` still needs `autoStartServer: false`; remove it if `backendRuntime: node` supersedes it.

### Verification

- [x] `node --test extension/src/host/server.test.js`
- [x] `node --test extension/src/host/service-capabilities.test.js`
- [x] `node --check extension/src/host/server.js`
- [x] Manual: reload panel with runtime `node` does not spawn uvicorn.
- [x] Manual: runtime `python` can still use legacy backend before deletion.
- [x] Manual: runtime `auto` behaves compatibly during transition.

### Done Criteria

- [x] Fresh install defaults to Node.
- [x] Python never starts unless `backendRuntime` is `python` or transitional `auto`.
- [x] User can see which runtime is active.

## Phase 4: Python Surface Removal

Goal: Delete Python backend code and user-facing Python configuration after Node default and route parity are verified.

### Tasks

- [x] Remove Python launcher code from `src/host/server.js`.
- [x] Remove `codexAgent.pythonPath`.
- [x] Remove `codexAgent.serverRoot`.
- [x] Remove or repurpose `codexAgent.autoStartServer` if it only described Python behavior.
- [x] Remove `codex_manager/`.
- [x] Remove Python/FastAPI docs from `docs/blog.md`, screenshot checklist, and parity docs.
- [x] Update packaging contents if `vsce` includes Python files today.
- [x] Keep backend metadata compatible during Phase 4; final product naming is deferred to Phase 5.
- [x] Update tests that still assert Python defaults.
- [x] Run full JS test suite and packaging smoke.

### Verification

- [x] `rg -n "python|uvicorn|fastapi|codex_manager|serverRoot|pythonPath" extension/src extension/package.json extension/docs`
- [x] The remaining matches are intentional, historical, or test-only.
- [x] `node --test` for all committed Node tests.
- [x] `node --check` for changed JS files.
- [x] Package/build smoke succeeds.
- [x] Manual panel reload succeeds with no Python process.

### Done Criteria

- [x] No Python backend code ships in the extension.
- [x] No Python config appears in package contributions.
- [x] No uvicorn process is spawned by the extension.
- [x] Dashboard list/detail/insights and supported write actions work under Node.

## Phase 5: Cleanup, Rename, and Documentation Polish

Goal: Turn the transition into a clean product boundary.

### Tasks

- [x] Rename `node-fallback` module naming now that the backend is no longer a fallback.
- [x] Update user docs to describe Node runtime and limitations.
- [x] Update internal architecture docs.
- [x] Remove stale no-Python migration warnings that no longer apply.
- [x] Add a short rollback note for users who still need legacy Python before it is fully removed.

### Verification

- [x] Docs no longer describe Python as primary.
- [x] UI/backend names are consistent.
- [x] Tests and package metadata agree on runtime terminology.

### Done Criteria

- [x] Product reads as Node-native, not Python-primary-with-fallback.

## Phase Completion Log

- [x] 2026-04-22: Created checkpoint commit `f2c3083` for Node backend git/tool-count/thread filter work.
- [x] 2026-04-22: Manual reload verified Phase 1 factual badges; stopped/running/needs-human states no longer present inferred activity as primary status.
- [x] 2026-04-22: Added Node backend persistent worker pool, session index, and scan diagnostics for `indexed/reparsed/workerCount`.
- [x] Phase 1 completed.
- [x] 2026-04-22: Manual validation passed for Node scan/lifecycle routes; hard delete and rename remain unavailable under Node.
- [x] Phase 2 completed.
- [x] 2026-04-22: Manual validation passed for `node`, `python`, and `auto` runtime behavior; runtime selector semantics are ready for Python surface removal.
- [x] Phase 3 completed.
- [x] 2026-04-22: Manual panel reload confirmed healthy Node backend with no Python process.
- [x] Phase 4 completed.
- [x] 2026-04-22: Renamed Node backend surface, normalized metadata to `backendMode: node`, refreshed docs/readme, and kept legacy sidecar compatibility.
- [x] 2026-04-22: Removed new rename writes from the Node product; legacy sidecar aliases remain readable.
- [x] Phase 5 completed.
