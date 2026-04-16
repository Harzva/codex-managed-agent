# Evolution Note — Milestone 4 Linked Thread Group

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 4 — Operational Reliability`
- bounded target: add one dedicated linked-thread group in the explorer so Codex-linked threads stop reading as generic idle

## Completed

- Added a dedicated `linked` bucket to explorer grouping
- Moved `status === "linked"` threads out of the generic idle bucket and into a distinct `Linked` group
- Kept the change scoped to explorer grouping order without altering filter semantics or host-side status detection
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No filter or sort semantics were changed in this slice
- No additional spotlight, board, or drawer grouping changes were made

## Decisions

- Fixed grouping clarity first because it directly addresses the roadmap’s linked-vs-running distinction
- Left broader review of explorer status semantics for the next bounded slice

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 4. Do one minimal slice only: run a linked-thread grouping exit review to decide whether this distinction is now good enough to move on to the next operational reliability gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
