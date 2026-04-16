## Loop Type
- type: execution

## What Changed
- Added a focused task recovery read filter in `src/host/team-coordination.js`.
- `readTaskRecords` now accepts only task files whose filename stem matches a filename-safe `task_id` envelope.
- Kept task creation, task ids, event ids, inbox message ids, UI, stale recovery, and board/tab semantics unchanged.
- Updated `.claude/plans/ACTIVE_PLAN.md` so the next pass audits this filter before broader restart-recovery hardening.

## Plan
- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/codex-team-mailbox-loop-task-plan.md`
- Bounded target: task recovery read filtering

## Validation
- `node --check src/host/team-coordination.js`
- Recovery probe: one valid task file recovered; mismatched and unsafe task files were ignored; event/inbox id prefixes remained `event` and `msg`.
- `npm run package`
- Result: passed; package output was 85 files, 412.3 KB.

## Next Handoff
- Follow `.claude/plans/ACTIVE_PLAN.md`.
- Run an analysis loop that verifies task recovery read filtering and decides the next mailbox-file-only restart-recovery slice without parsing `team.md` free text.
