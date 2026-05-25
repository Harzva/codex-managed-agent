# CMA Desktop Architecture

> Scope: this document defines how the Electron desktop app reuses the VSIX host without becoming a second, divergent CMA implementation.

## Boundaries

- `cma/` remains the VSIX product and the source of truth for host logic.
- `desktop-electron/` owns the Electron shell, desktop settings, native window behavior, desktop packaging, and desktop-only adapters.
- `desktop-electron/vendor/` contains copied VSIX host modules that are required at runtime by the packaged desktop app.
- `desktop-electron/scripts/sync-vsix-host-to-desktop.mjs` is the only supported way to refresh vendored VSIX host files.
- `desktop-electron/scripts/check-vsix-host-vendor.mjs` is the guardrail that prevents silent drift.

## Runtime Shape

```text
Electron main
  - owns app lifecycle, userData, backend process, native dialogs, external open actions
  - starts the vendored Node backend with desktop state paths

Electron preload
  - exposes a narrow `window.cma` bridge
  - keeps renderer isolated from Node and Electron internals

Renderer
  - owns UI, local view state, filtering, and desktop navigation
  - calls backend APIs through the preload bridge

Vendored CMA backend
  - reads Codex sessions from CODEX_HOME
  - writes desktop sidecar state under Electron userData
  - must stay in parity with `cma/src/host/node-backend`
```

## Shared-Core Policy

- Shared host logic should live in `cma/src/host` first.
- Desktop can vendor shared modules when packaged runtime access is required.
- Desktop-specific behavior belongs in adapters around shared logic, not in hand-edited vendor files.
- If a vendored file needs a desktop-only change, first try to move the variation behind options in `cma/src/host`.
- If an exception is unavoidable, document it in this file and update `check-vsix-host-vendor.mjs` with an explicit allowlist.

## Current Vendored Files

- `vendor/cma-node-backend/node-backend.test.js`
- `vendor/cma-node-backend/parity-smoke.test.js`
- `vendor/cma-node-backend/server.js`
- `vendor/cma-node-backend/session-git.js`
- `vendor/cma-node-backend/session-lifecycle.js`
- `vendor/cma-node-backend/session-store.js`
- `vendor/cma-node-backend/session-worker-pool.js`
- `vendor/cma-node-backend/session-worker.js`
- `vendor/cma-node-backend/usage-report.js`
- `vendor/platform-runtime.js`

## State Isolation

- Codex source data stays in `CODEX_HOME`.
- Desktop sidecar state must be under Electron `app.getPath("userData")`.
- Desktop tests must prove that backend indexes and thread state are not written into `CODEX_HOME`.
- VSIX workspace/global state is not read as a desktop state store.

## Desktop Adapter Targets

- Account adapter: wraps account import, activation, token refresh, usage fetch, and Windows copy fallback.
- Terminal adapter: launches Codex login/resume/new thread in Windows PowerShell/CMD, macOS Terminal, and Linux terminal fallbacks.
- Loop adapter: starts/stops codex-loop with Windows daemon and macOS/Linux shell variants.
- Team adapter: exposes Team workspace/task/orchestration operations through desktop APIs.
- Evidence adapter: exposes trace dashboard/report/thread insight data to desktop detail views.
- Capability adapter: reports missing CLI tools, degraded mode, and repair actions in settings.

## Test Gates

- `npm run check:vsix-host` must pass before desktop tests.
- `npm test` runs TypeScript build, vendor parity, desktop isolation tests, and vendored Node backend tests.
- GitHub Actions desktop builds must keep running on Windows and macOS.
- A VSIX host change that affects vendored files must either run `npm run sync:vsix-host` or intentionally update the parity allowlist.
