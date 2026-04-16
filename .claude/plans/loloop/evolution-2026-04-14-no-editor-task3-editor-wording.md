# Evolution Note — No Editor Task3 Editor Wording

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: make editor-opening fallback actions explicit instead of labeling them as generic `Open`

## Completed

- Re-read `ROADMAP.md`, `task-plans/no-editor-first-workflows-task-plan.md`, `.claude/plans/ACTIVE_PLAN.md`, and the latest relevant evolution note before acting
- Updated editor-opening fallback labels across the main managed-center surfaces without changing behavior
- Renamed the primary board-card editor action from generic `Open` to explicit `Editor`
- Renamed spotlight and drawer editor-opening actions to explicit editor wording so they read as fallback paths rather than normal in-center operations
- Moved the active slice forward to a bounded Task 3 review

## Failed or Deferred

- Did not change terminal-command wording, action ordering, or deeper fallback taxonomy
- Did not change host-side behavior or action dispatch

## Decisions

- Treat editor-opening wording as the first Task 3 fix because it was the smallest misleading fallback label still left on the main surfaces
- Keep this slice wording-only instead of mixing in terminal semantics or broader action redesign

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md`. Stay on `task-plans/no-editor-first-workflows-task-plan.md` and do one bounded Task 3 review to decide whether fallback actions are now explicit enough at a bounded level, or whether one more small fallback-path gap remains.
```
