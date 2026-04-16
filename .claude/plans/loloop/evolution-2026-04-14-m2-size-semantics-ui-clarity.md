# Evolution Note — Milestone 2 Size Semantics UI Clarity

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: make the `T / S / M / L` density ladder explicit in the board UI so the size semantics are understandable without trial and error

## Completed

- Audited where board-level size semantics could be surfaced without adding new UI surfaces
- Added a compact size-guide sentence to the existing board summary copy in `src/webview-template.js`
- The board UI now explicitly states: `T` focus, `S` progress, `M` preview, `L` full detail
- Kept the clarification inside existing board copy instead of adding another legend block or new control surface
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No separate tooltip or per-card helper text was added in this slice
- Milestone 2 still needs one final confirmation pass before closure

## Decisions

- Chose the board summary copy as the smallest user-facing place to clarify size semantics
- Avoided adding new chrome because the roadmap still prioritizes board-first interaction quality

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: confirm Milestone 2 exit readiness after the explicit size-semantics pass and decide whether to close the milestone or name one final bounded defect, then update the active plan and append a new evolution note. Package and sync only if code changes.
```
