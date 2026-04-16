# Evolution Note — Milestone 3 Insights Freshness Cue

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: add one freshness cue to cached/persisted insights disclosure so users can judge how stale the fallback report might be

## Completed

- Added a host-side `report_persisted_at` field for persisted fallback insights using the local report file mtime
- Stored the last usable insights capture time in the webview state alongside the existing cached insights snapshot
- Updated the existing `Usage Report` note so persisted fallback and session-cache modes now include a concrete freshness timestamp
- Kept the change scoped to the existing disclosure surface instead of adding new UI
- Validated the edited files with `node --check src/webview-template.js` and `node --check src/host/server.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- No explicit stale/old threshold wording is shown yet when the persisted fallback report is materially outdated
- No report-generation cadence or host retry behavior was changed in this slice

## Decisions

- Used the persisted report file mtime as the smallest trustworthy freshness signal for fallback insights
- Reused the existing `Usage Report` note rather than adding another badge or status row

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: add explicit stale wording when persisted fallback insights are older than a simple threshold, then validate packaging, sync to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`, update the active plan, and append a new evolution note.
```
