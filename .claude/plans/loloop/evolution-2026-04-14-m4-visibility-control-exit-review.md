# Evolution Note — Milestone 4 Visibility Control Exit Review

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: run one visibility-control exit review to decide whether cards still need a dedicated cue or the current surfaces are sufficient

## Completed

- Reviewed the current visibility-control path against `task-plans/codex-visibility-control-task-plan.md`
- Confirmed the deliberate action path now exists in the drawer through explicit `Show in Codex` and `Hide from Codex`
- Confirmed visibility feedback now exists in two useful layers: a drawer-level `Visibility` metric and a thread-row compact cue for non-default states
- Confirmed cards do not need an additional dedicated visibility cue right now because board/card surfaces already expose linked/focused state through existing linked badges, focused treatment, and phase copy
- Narrowed the next bounded slice to one Milestone 4 exit review instead of continuing to add more visibility chrome

## Failed or Deferred

- No code changes were made in this review slice
- No packaging run was needed because behavior did not change
- Deferred any card-level visibility cue because the review did not find it necessary

## Decisions

- Treat the visibility-control subtrack as sufficient for now
- Use the next slice to determine whether Milestone 4 as a whole can close or whether one final operational reliability gap remains

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: run one Milestone 4 exit review against `task-plans/operational-reliability-task-plan.md` and `task-plans/codex-visibility-control-task-plan.md` to decide whether this milestone can close, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
