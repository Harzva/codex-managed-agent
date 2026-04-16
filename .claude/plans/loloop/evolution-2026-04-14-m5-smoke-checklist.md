# Evolution Note — Milestone 5 Smoke Checklist

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 5 — Publishable Product Quality`
- bounded target: add one compact repo-visible smoke/validation checklist for VSIX packaging and local install verification

## Completed

- Added a new root-level `SMOKE_CHECKLIST.md`
- Captured the current package command, VSIX install path, activation checks, local-server recovery check, and one compact core-UI smoke pass
- Kept the checklist scoped to the commands and flows the repo already supports today

## Failed or Deferred

- No code changes were made in this doc slice
- No packaging run was needed because behavior did not change
- Deferred README integration to the next smallest slice

## Decisions

- Keep the first Milestone 5 validation artifact as a standalone checklist before changing broader release docs
- Move next to a README entry so the checklist is discoverable from the main install/release path

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on the current slice only: add one README entry that points release users to the smoke/validation checklist, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
