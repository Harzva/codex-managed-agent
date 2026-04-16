# Evolution Note — Milestone 4 Show In Codex Action

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: add one explicit drawer-level `Show in Codex` action that unarchives before opening the target thread in Codex

## Completed

- Followed `task-plans/codex-visibility-control-task-plan.md` and completed the first bounded slice from `Task 1 — Show in Codex`
- Added a drawer-level `Show in Codex` action for normal threads instead of requiring users to compose `Open Codex` plus `Unarchive` themselves
- Added a host-side `showThreadInCodex` path that best-effort syncs the current thread title, unarchives the thread, and then opens it in the Codex editor
- Kept the slice narrow by leaving `Hide from Codex` and broader visibility feedback for later turns
- Validated syntax and packaged the extension successfully

## Failed or Deferred

- Deferred explicit `Hide from Codex` to the next slice so this turn stayed within one bounded action path
- Did not expand the new action to every surface; this slice is drawer-only on purpose

## Decisions

- Treat the drawer as the first place to expose visibility control because it already owns the thread-level lifecycle action rail
- Use the editor open path for `Show in Codex` so the action has a clear, deterministic target

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4 and keep following `task-plans/codex-visibility-control-task-plan.md`. Do one minimal slice only: add one explicit `Hide from Codex` drawer action that archives cleanly without deleting extension-side state, then update the active plan, append a new evolution note, validate/package if code changes, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
