# Evolution Note — No Editor Task1 Board Prompt Entry

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: restore the smallest board-card prompt-send entry point so routine prompting does not require leaving the managed center

## Completed

- Re-read `ROADMAP.md`, `task-plans/no-editor-first-workflows-task-plan.md`, `.claude/plans/ACTIVE_PLAN.md`, and the latest relevant evolution note before acting
- Audited card-level operations and found that board cards still had `quickComposer` plumbing and handlers, but no rendered control exposed `data-open-composer`
- Restored an explicit `Prompt` action on running board cards, including compact/tiny board-card variants, by wiring the button back to the existing quick-composer path
- Added a matching `prompt` tool icon so the restored action reads as a first-class board operation rather than a text-only fallback
- Kept the slice bounded to board-card prompt entry only; did not expand into spotlight compose, drawer compose, or richer prompt workflows

## Failed or Deferred

- Did not change spotlight, drawer, or thread-row surfaces in this slice
- Deferred any broader no-editor-first work until Task 1 review confirms whether another card-level gap still remains

## Decisions

- Treat the missing board-card prompt opener as the first real Task 1 gap because it left prompt sending effectively unreachable from the primary card surface
- Reuse the existing quick-composer state and send handlers instead of introducing a second compose path

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md`. Stay on `task-plans/no-editor-first-workflows-task-plan.md` and do one bounded Task 1 review to decide whether board cards are now sufficient for the smallest prompt-send workflow, or whether one more card-level operation gap still remains.
```
