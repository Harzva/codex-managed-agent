# Evolution: Phase 07 Webview Watch Controls

Date: 2026-05-07

## Scope

Productized the completed Phase 07 watch/control backend inside the VS Code webview.

## Completed

- Added `dashboard.watch` fetching from `/api/watch` in the host dashboard state.
- Exposed `watch` in service capabilities so the UI can treat it as a first-class backend feature.
- Added host-to-backend write helpers for:
  - `POST /api/watch/auto-continue`
  - `POST /api/watch/control`
- Added panel message handlers for:
  - `setWatchAutoContinue`
  - `watchControl`
- Added an Overview `Watch` subtab with:
  - watched thread count
  - launchable count
  - active auto-continue count
  - stopped count
  - per-thread blocking reason
  - `Set Auto`, `Stop`, and `Resume` actions

## Behavior Notes

- Auto-continue remains conservative: UI only configures count-limited auto-continue; backend launchability is still gated by explicit `task_complete` evidence.
- Stop/resume are explicit user controls and write through the backend watch state rather than guessing from idle time.
- After a watch write, the panel performs a full refresh so the visible card state reflects persisted backend state.

## Verification

- `node --check src/host/server.js`
- `node --check src/panel.js`
- `node --check src/host/panel-view.js`
- `node --check src/webview-template.js`
- `node --check src/webview/panes.js`
- `node --test src/host/node-backend/node-backend.test.js --test-name-pattern "watch"`
- `node --test src/host/node-backend/parity-smoke.test.js`
