# Evolution Note — Milestone 3 Weekly Next-Action Cue

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: add one concise next-action cue to the weekly report surface

## Completed

- Derived a single weekly action cue from the strongest reported shift when weekly shift data is available
- Fell back to the first highlight or a stable generic sentence when weekly shift deltas are not available
- Added the cue as a dedicated `Next action` insight card inside the existing weekly report surface
- Kept the change scoped to webview rendering and did not alter host-side report generation
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No richer prioritization or multi-step recommendation logic was added
- No changes were made to topic map, word cloud, or persisted report generation

## Decisions

- Used the largest weekly delta as the smallest actionable anchor instead of inventing a broader recommendation engine
- Left overall weekly-report actionability review for the next bounded slice

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: run a weekly-report actionability exit review to decide whether this guidance surface is now concrete enough to move on to the next Milestone 3 gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
