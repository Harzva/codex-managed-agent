# Evolution Note — Milestone 3 Topic Focus Clear Affordance

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: add one explicit clear-focus affordance for topic-map-driven thread filtering

## Completed

- Added a dedicated `Clear topic focus` action to the existing thread-summary surface whenever a topic-map filter is active
- Kept the affordance mirrored across both thread-summary surfaces so compact and main layouts behave the same way
- Clarified the zero-results state for topic-focused filtering by naming the topic-map focus explicitly
- Wired the new action into the existing `applyTopicFocus(null)` path instead of adding new state machinery
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No active-node highlight is shown yet inside the topic map itself
- No changes were made to word-cloud or weekly-shift navigation

## Decisions

- Reused the thread summary as the smallest obvious place for a clear-focus affordance
- Left the next navigation slice to visual linkage in the topic map rather than adding more filtering controls

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: add one active-focus visual highlight in the topic map so the filtered node stays legible, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
