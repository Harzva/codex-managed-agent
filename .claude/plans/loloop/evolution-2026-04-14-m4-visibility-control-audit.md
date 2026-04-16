# Evolution Note — Milestone 4 Visibility Control Audit

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: audit the current visibility-control path to identify the first smallest `Show in Codex / Hide from Codex` gap

## Completed

- Reviewed the current visibility-control path against `ROADMAP.md` and confirmed the roadmap intent is higher-level than the current UI
- Confirmed that the drawer currently exposes only low-level pieces: `Rename`, `Open Codex`, `Sidebar Codex`, and `Archive / Unarchive`
- Confirmed the host already has the primitives needed for the first practical path: rename support, lifecycle archive control, and Codex open routing
- Determined that the first smallest gap is missing explicit `Show in Codex`, because users still have to mentally compose unarchive plus open from lower-level actions
- Narrowed the next bounded slice to one drawer-level `Show in Codex` action that unarchives before opening the target thread in Codex

## Failed or Deferred

- No code changes were made in this audit slice
- No packaging run was needed because behavior did not change
- Deferred explicit `Hide from Codex` because existing `Archive` already covers most of that path, so it is not the first smallest gap

## Decisions

- Start the visibility-control work with `Show in Codex`, not both actions at once
- Treat this as a UI orchestration gap rather than a missing host-capability gap

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: add one explicit `Show in Codex` drawer action that unarchives before opening the target thread in Codex, then update the active plan, append a new evolution note, validate/package if code changes, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
