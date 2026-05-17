# CMA Codex Communication Optimization Task Plan

Status: active

## Priority

Priority 1

## Objective

Reduce control latency and make Codex interaction feel immediate inside `Codex-Managed-Agent`.

## Scope

- optimistic `sendPrompt` and `auto-continue` feedback
- lightweight Codex tab link-state synchronization
- fewer full refreshes and fewer full rerenders for small actions

## Tasks

### Task 1 — Optimistic Queued State

- [x] show `queued` immediately after `sendPrompt`
- [ ] show `queued` immediately after `auto-continue` is armed or triggered
- [ ] replace the optimistic state with real result state when backend confirmation arrives
- [ ] keep failure fallback explicit when the backend call fails

### Task 2 — Lightweight Codex Link Sync

- [ ] keep `open / focused / linked` state synced without forcing a full dashboard refresh
- [ ] avoid recomputing unrelated panes when only Codex tab state changes
- [ ] make board and thread list react consistently to link-state changes

### Task 3 — Render and Refresh Reduction

- [ ] stop using full rerender for small card actions where a local patch is enough
- [ ] stop using full refresh for actions that only update one thread or one UI region
- [ ] separate card-level updates from board-level updates
- [ ] keep degraded-state recovery intact after the optimization pass

## Exit Criteria

- `sendPrompt` and `auto-continue` feel immediate instead of waiting for the next refresh
- Codex tab state changes do not trigger visibly heavy refresh cycles
- routine card actions no longer cause full-screen UI churn
