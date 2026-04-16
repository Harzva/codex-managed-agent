# Evolution Note — No Editor Task3 Terminal Wording

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: make the drawer terminal-launch actions explicit instead of labeling them as generic `Resume` / `Fork`

## Completed

- Re-read `ROADMAP.md`, `task-plans/no-editor-first-workflows-task-plan.md`, `.claude/plans/ACTIVE_PLAN.md`, and the latest relevant evolution note before acting
- Updated the drawer command cards so their labels explicitly state terminal launch behavior
- Renamed the drawer command cards to `Resume in Terminal` and `Fork in Terminal`
- Renamed the drawer command-card action buttons to `Run in Terminal` and `Copy Command` so the fallback behavior is explicit before click
- Moved the active slice forward to a bounded Task 3 review

## Failed or Deferred

- Did not change command behavior, terminal dispatch, or broader command-surface layout
- Deferred any wider fallback taxonomy beyond this wording-only pass

## Decisions

- Treat terminal-launch wording as the next Task 3 fix because it was the smallest remaining implicit fallback after the editor-opening wording pass
- Keep the slice wording-only instead of coupling it to command execution changes

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md`. Stay on `task-plans/no-editor-first-workflows-task-plan.md` and do one bounded Task 3 review to decide whether fallback actions are now explicit enough at a bounded level after the terminal-launch wording pass.
```
