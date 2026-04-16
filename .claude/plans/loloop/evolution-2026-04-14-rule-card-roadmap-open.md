# Evolution Note — Rule Card ROADMAP Open

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer (complete)`
- bounded target: add one minimal source-integration slice by wiring the Rule card to quick-open `ROADMAP.md`

## Completed

- Added a host-side repo-file open path that can open a repository-visible markdown file from the managed surface
- Wired the Rule card to quick-open `ROADMAP.md`
- Updated the Rule card shell to show that it now has a linked source while leaving Prompt and Memo cards as placeholders
- Kept the slice limited to one real source and did not expand into prompt-file creation or broader card integration

## Failed or Deferred

- Deferred additional sources, editing behavior, and cross-card workflow wiring

## Decisions

- Treat `ROADMAP.md` on the Rule card as the first grounded Task 2 integration slice because it is repo-visible and already relevant to loop planning
- Move next to a Task 2 review instead of immediately wiring multiple additional sources

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md`. Stay on `task-plans/prompt-rule-memo-cards-task-plan.md` and do one Task 2 review focused on whether the first Rule-card source integration is sufficient to guide the next smallest memory-source slice.
```
