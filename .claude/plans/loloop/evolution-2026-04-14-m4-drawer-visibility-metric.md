# Evolution Note — Milestone 4 Drawer Visibility Metric

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: add one drawer-level visibility status metric that makes `visible / hidden / linked / focused` state explicit

## Completed

- Followed `task-plans/codex-visibility-control-task-plan.md` and completed the first bounded feedback slice from `Task 3 — Visibility Feedback`
- Added a dedicated `Visibility` metric to the drawer summary instead of forcing users to infer visibility from lower-level `Codex Link` wording
- Kept the value constrained to the roadmap-level states `Visible`, `Hidden`, `Linked`, and `Focused`
- Validated syntax and packaged the extension successfully

## Failed or Deferred

- Deferred thread-row and card-level visibility cues to later slices so this turn stayed drawer-only
- Did not alter the existing `Codex Link` metric; this slice only adds the missing higher-level visibility view

## Decisions

- Keep `Visibility` separate from `Codex Link` because the roadmap semantics are broader than open-tab linkage alone
- Move next to one compact thread-row cue so visibility can be scanned without opening the drawer

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4 and keep following `task-plans/codex-visibility-control-task-plan.md`. Do one minimal slice only: add one compact visibility cue to thread rows so hidden / linked / focused state can be scanned without opening the drawer, then update the active plan, append a new evolution note, validate/package if code changes, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
