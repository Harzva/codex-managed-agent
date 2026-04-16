# Evolution Note — Milestone 3 Insights Stale Wording

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: add explicit stale wording when persisted fallback insights are older than a simple threshold

## Completed

- Added a minimal age-threshold helper in the webview to detect stale fallback insights
- Appended explicit stale wording to the existing `Usage Report` note when persisted fallback data is older than 24 hours
- Kept the warning scoped to persisted fallback semantics, including session-cache states that were last sourced from persisted fallback data
- Left live insights and newer fallback data unchanged
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No relative age count or day-count wording is shown yet beyond the simple stale threshold
- No topic-map, word-cloud, or weekly-shift interaction changes were made in this slice

## Decisions

- Reused the existing freshness-disclosure surface instead of introducing a second stale badge or warning row
- Chose a simple 24-hour threshold as the smallest reliable rule before doing another Milestone 3 review pass

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: run a fallback-disclosure exit review to decide whether the current insights persistence/disclosure path is good enough to move on to the next navigation-oriented Milestone 3 gap, then update the active plan, append a new evolution note, and sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`.
```
