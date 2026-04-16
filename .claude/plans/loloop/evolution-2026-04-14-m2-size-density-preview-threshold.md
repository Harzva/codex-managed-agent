# Evolution Note — Milestone 2 Size Density Preview Threshold

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 2 — Board Interaction Quality`
- bounded target: normalize one concrete `T / S / M / L` density rule so size tiers communicate predictable information density

## Completed

- Audited current size-tier rendering in `src/webview-template.js`
- Chose one explicit density rule instead of trying to rebalance all sizes at once
- Updated board cards so preview text starts at `M`, not `S`
- This makes `S` a consistent title/subtitle/progress tier while `M / L` remain the tiers that reveal process preview text
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No further density rules were changed in this slice
- `Needs Human` occupancy and collapse behavior still needs its own dedicated pass

## Decisions

- Kept the normalization pass to a single rule so the size ladder can evolve in reviewable steps
- Chose `preview` as the threshold because it is a high-noise block and the clearest divider between `S` and `M`

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 2. Do one minimal slice only: improve `Needs Human` occupancy or collapse behavior so urgent cards stay useful without competing with the board layout surface, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
