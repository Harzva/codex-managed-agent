# Evolution Note — Milestone 3 Insights Source Disclosure

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: make persisted-or-fallback insights state explicit in the UI so users understand when the dashboard is showing cached report data

## Completed

- Added a host-side `report_source` marker when insights come from the persisted fallback file
- Reused the existing `Usage Report` note line in the webview instead of adding a new surface
- Updated the note to distinguish live insights, persisted fallback insights, and in-session cached insights
- Kept the disclosure scoped to the existing insights summary area
- Validated the edited files with `node --check src/webview-template.js` and `node --check src/host/server.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No freshness timestamp or age hint is shown yet for cached/persisted insights
- No additional report-generation or disk-persistence logic was changed in this slice

## Decisions

- Chose the existing `Usage Report` note as the smallest user-facing disclosure point
- Left host-side reload recovery unchanged and only surfaced source state in the UI

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: add one freshness cue to cached/persisted insights disclosure so users can judge how stale the fallback report might be, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
