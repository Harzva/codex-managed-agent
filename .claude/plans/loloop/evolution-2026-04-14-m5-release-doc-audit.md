# Evolution Note — Milestone 5 Release Doc Audit

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 5 — Publishable Product Quality`
- bounded target: audit the current Milestone 5 release/doc workflow to identify the first smallest publishable-product gap

## Completed

- Audited the current release/doc path through `package.json`, `README.md`, and the existing repo guidance
- Confirmed the repository already has VSIX packaging commands and basic local-install / marketplace publish instructions
- Confirmed the first smallest Milestone 5 gap is the absence of a repo-visible, repeatable smoke/validation checklist that turns the current ad hoc package checks into a documented release routine
- Narrowed the next bounded slice to writing one compact smoke/validation checklist before expanding into broader release engineering

## Failed or Deferred

- No code changes were made in this audit slice
- No packaging run was needed because behavior did not change
- Deferred broader release-engineering work because the validation routine gap is the first blocker

## Decisions

- Do not create a new Milestone 5 task-plan yet; the next step is still small enough to run directly from `ROADMAP.md` and `ACTIVE_PLAN.md`
- Start Milestone 5 with the validation checklist, not Marketplace polish

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on the current slice only: add one compact repo-visible smoke/validation checklist for VSIX packaging and local install verification, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
