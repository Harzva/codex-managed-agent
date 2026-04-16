# Evolution Note — Milestone 3 Last-Known Insights Fallback

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: keep the insights surface from dropping back to an empty state when a transient refresh arrives without a usable report payload

## Completed

- Audited how the webview chooses between fresh insights data and empty-state rendering
- Added an in-memory `lastInsightsSnapshot` cache in `src/webview-template.js`
- Updated render flow so the insights surface reuses the last usable payload when a transient refresh arrives without a report
- Kept the fallback scoped to the active session only; no new cross-reload persistence was added in this slice
- Validated the edited file with `node --check src/webview-template.js`
- Packaged the extension successfully with `npm run package`

## Failed or Deferred

- The last-known insights snapshot still resets if the webview itself is recreated
- No UI indicator was added to distinguish cached insights from fresh insights

## Decisions

- Chose a transient session fallback as the smallest safe step before deciding whether more persistence is actually needed
- Avoided broadening the change into report-generation or disk-persistence logic

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: decide whether the last-known insights snapshot should also survive webview reloads, or whether host-side persistence is already sufficient, then update the active plan and append a new evolution note. Package and sync only if code changes.
```
