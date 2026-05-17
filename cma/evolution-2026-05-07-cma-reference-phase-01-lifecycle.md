# Evolution Note: CMA Reference Roadmap Phase 1 Lifecycle

Date: 2026-05-07

## Plan Used

- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- `task-plans/subtask_json/cma-reference-phase-01-lifecycle-inference.json`

## Bounded Target

Implement the first codex-loop slice for Phase 1:

- infer lifecycle from bounded Codex JSONL event samples
- attach lifecycle to thread summaries/details
- render lifecycle reason in Thread Explorer
- verify with focused tests

## Completed Work

- Added `inferThreadLifecycleFromEvents` in `src/host/node-backend/session-store.js`.
- Added lifecycle states: `running`, `queued`, `waiting`, `completed`, `needs_attention`, `aborted`, and `unknown`.
- Preserved bounded behavior by using existing summary sample events rather than full-history reads for list discovery.
- Ignored compaction/token metrics as lifecycle-ending markers so they do not hide the latest assistant/tool state.
- Attached normalized lifecycle data to thread summaries and details.
- Rendered a compact lifecycle line in Thread Explorer with state, reason, and recent tool chips.
- Added Node backend tests for five lifecycle states and rollout discovery lifecycle fields.
- Marked Phase 1 JSON subtask completed and checked off Phase 1 roadmap items.

## Verification

- `node --test src/host/node-backend/node-backend.test.js`
- `node --test src/webview/render-detail-regression.test.js`
- `node --check src/webview-template.js`

All passed.

## Failures Or Deferrals

- Board card lifecycle rendering is intentionally deferred to Phase 2.
- Trace drawer linking for lifecycle evidence is deferred until the card language is settled.
- Auto-continue remains disabled and unimplemented; it depends on lifecycle plus later account health and trace gates.

## Next Handoff

Next smallest useful slice:

1. Start `cma-reference-phase-02-board-operational-language`.
2. Bring `thread.lifecycle` into Board cards with a concise badge and reason line.
3. Ensure compact cards do not overflow and keep Cmd/Cmp/Git plus Inspector/Chat/Trace/Tab visible.
4. Run `node --test src/webview/render-detail-regression.test.js` and `node --check src/webview-template.js`.
