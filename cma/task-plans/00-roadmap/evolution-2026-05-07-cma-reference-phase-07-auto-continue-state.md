# Evolution: Phase 7 Auto-Continue State

Plan: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

Subtask: `task-plans/subtask_json/cma-reference-phase-07-remote-watch-surface.json`

Bounded target:

- Complete Phase 7 `03-auto-continue`.

Completed work:

- Added conservative read-only auto-continue derivation to `src/host/node-backend/server.js`.
- Watched threads now expose auto-continue fields in `/api/watch`:
  - `enabled`
  - `max_count`
  - `remaining_count`
  - `consumed_count`
  - `prompt`
  - `current_completed_turn_signature`
  - `last_completed_turn_signature`
  - `launchable`
  - `blocked_reason`
- Launchability is true only when:
  - auto-continue is explicitly enabled
  - max count is finite and positive
  - remaining count is positive
  - latest lifecycle marker is explicit `event:task_complete`
  - the completed-turn signature has not already been consumed
- Added parity smoke coverage for a launchable watched thread with explicit task-complete evidence.

Verification:

- `node --check src/host/node-backend/server.js`
- `node --test src/host/node-backend/parity-smoke.test.js`

Next handoff:

- Implement Phase 7 `04-auto-continue-count`: expose reset/adjust count controls through the VS Code webview or an authenticated local write path, while keeping non-local writes auth-gated.
