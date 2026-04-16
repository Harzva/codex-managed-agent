# Evolution Note — Milestone 4 Spotlight Loop Exit Review

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: run a spotlight loop-state exit review to decide whether this inspector-level status path is now good enough to move on to the next operational reliability gap

## Completed

- Reviewed the spotlight `Auto Loop` metric against the Milestone 4 goal of making loop state legible across surfaces
- Confirmed that selected-thread inspection now shows compact loop state without requiring a return to thread rows or larger board cards
- Determined that the next smallest operational reliability gap is explicit Codex visibility control: the roadmap calls for `Show in Codex / Hide from Codex`, but the current UI still exposes only lower-level open/archive actions
- Narrowed the next bounded slice to an audit of the current visibility-control path

## Failed or Deferred

- No code changes were made in this review slice
- No packaging run was needed because behavior did not change

## Decisions

- Treat the spotlight loop-state path as good enough to stop iterating for now
- Move the next bounded slice to visibility-control auditing instead of continuing to polish inspector status chrome

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: audit the current visibility-control path to identify the first smallest `Show in Codex / Hide from Codex` gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
