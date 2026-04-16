## Loop Type
- type: execution

## What Changed
- Added per-line event parsing for `eventTail` in `src/host/team-coordination.js`.
- `eventTail` now skips malformed JSONL lines and non-envelope events instead of dropping the whole recovered tail.
- Kept event writes, event ids, task ids, inbox message ids, UI, stale recovery, and board/tab semantics unchanged.
- Updated `.claude/plans/ACTIVE_PLAN.md` so the next pass audits event-tail recovery before closing or extending Task 2 restart-recovery hardening.

## Plan
- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-team-mailbox-loop-task-plan.md`
- Bounded target: event-tail malformed-line recovery

## Validation
- `node --check src/host/team-coordination.js`
- Recovery probe: two valid events recovered in tail order while malformed JSON and non-envelope event lines were ignored; event/inbox id prefixes remained `event` and `msg`.
- `npm run package`
- Result: passed; package output was 85 files, 388.23 KB.

## Next Handoff
- Follow `.claude/plans/ACTIVE_PLAN.md`.
- Run an analysis loop that verifies event-tail recovery and decides whether Task 2 restart-recovery hardening can be closed or needs one more mailbox-file-only containment slice.
