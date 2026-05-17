# Node Backend Contract

This document records the minimum backend contract now served by the built-in Node backend. The extension should not require a separate local service for normal dashboard use.

## Backend Boundary

- Extension client/orchestrator: `extension/src/host/server.js`
- Node backend module: `extension/src/host/node-backend/`
- Main consumers: `state-sync.js`, `lifecycle.js`, `panel.js`, `thread-insight.js`, and the webview payload rendered by `webview-template.js`.
- Startup rule: the extension starts the built-in local Node backend on the configured `codexAgent.baseUrl` port, or the next available local candidate.

## Backend Mode Metadata Contract

Service payloads expose a small, stable mode shape:

- `service.backendMode`: `node` | `remote` | `configured` | `unavailable`
- `service.backendSource`: `configured` | `local`
- `service.readOnly`: boolean
- `service.capabilities`: booleans for `threads`, `threadDetail`, `insights`, `scanSessions`, `lifecycle`, and `hardDelete`

Rules:

- The built-in Node backend reports `backendMode: "node"` and `readOnly: false`.
- Non-local configured endpoints may report their own metadata; missing metadata is treated as a configured read-write service.
- Capability metadata must be truthful. Unsupported destructive actions such as hard delete are disabled or rejected by the Node backend.

## Required Endpoints

### `GET /api/health`

Returns service metadata, backend mode, capability flags, and scan diagnostics when available.

### `GET /api/threads`

Current callers request list, running, scoped, and id-filtered views with parameters such as:

- `q`, `ids`, `archived`, `status`, `scope`, `limit`, `offset`, `sort`
- `include_logs`, `include_history`, `history_limit`, `preview_limit`, `include_git`

Response shape:

- Top-level object with `meta` and `items`.
- `meta` includes counts and scan stats where available.
- `items` contains normalized thread summaries for Thread Explorer, Board, Running, and Insights.

### `GET /api/thread/{thread_id}`

Returns a detail object with:

- `meta`
- `thread`
- `logs`
- `hint_commands`

Missing logs or history should produce empty arrays rather than failing the whole detail request.

### `POST /api/threads/scan-codex-sessions`

Refresh-compatible endpoint. Direct JSONL discovery already powers the list, so this endpoint may return structured success after refreshing the Node index.

### `POST /api/threads/lifecycle`

Supported Node actions:

- `archive`
- `unarchive`
- `soft_delete`
- `restore`

Node stores non-destructive lifecycle state in a sidecar file and does not mutate Codex rollout files. `hard_delete` remains unsupported.

### `GET /api/insights/report`

Serves persisted local usage data and synthesized compatibility sections needed by the webview charts.

## Readiness Checklist

- [x] Serve `GET /api/health`.
- [x] Serve `GET /api/threads` with dashboard-ready summaries.
- [x] Serve `GET /api/thread/{thread_id}` with inspector-ready detail.
- [x] Serve `GET /api/insights/report` from persisted local usage data.
- [x] Serve structured tool-call counts.
- [x] Serve git/base-directory metadata.
- [x] Support scan refresh compatibility.
- [x] Support safe lifecycle sidecar state.
- [x] Keep legacy sidecar display aliases readable, while new rename writes are unsupported.
- [x] Expose truthful capability metadata.
- [x] Add parity tests for response shape and write routes.

## Non-Goals

- Hard deleting Codex session files from the Node backend.
- Rewriting Codex rollout JSONL for display aliases.
- Parsing rendered preview text as authoritative structured tool-call data.
