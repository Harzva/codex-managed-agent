# Evolution Note — Milestone 3 Reload Fallback Decision

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: decide whether the last-known insights snapshot should also survive webview reloads, or whether host-side persistence is already sufficient

## Completed

- Re-reviewed the host-side insights fallback path in `src/host/server.js`
- Re-reviewed the webview-side state persistence path in `src/webview-template.js`
- Concluded that host-side persisted report fallback is already the right reload-recovery mechanism for insights data
- Decided not to add a second reload-survivable webview cache because it would duplicate persistence responsibilities without solving a new user-visible failure mode
- Updated the active plan to shift the next slice toward explicit UI disclosure when cached/persisted insights are being shown

## Failed or Deferred

- No additional code change was made in this slice
- Users still are not explicitly told when the dashboard is showing cached or fallback insights data

## Decisions

- Kept transient in-memory fallback for active-session smoothness
- Left cross-reload recovery to the host-side persisted report file

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: make persisted-or-fallback insights state explicit in the UI so users understand when the dashboard is showing cached report data, then update the active plan and append a new evolution note. Package and sync only if code changes.
```
