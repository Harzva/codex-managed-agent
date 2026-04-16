# Evolution Note — Milestone 3 Persistence Audit

## Plan

- path: `.claude/plans/ACTIVE_PLAN.md`
- milestone: `Milestone 3 — Insight and Guidance Layer`
- bounded target: audit current insight / report persistence paths and identify the first smallest reliability gap to fix next

## Completed

- Audited host-side insights persistence and confirmed there is already a file-backed fallback at `~/.codex/codex_managed_agent_usage_report.json`
- Audited webview-side persistence and confirmed topic-driven UI state is stored through `vscode.setState()`
- Identified the first smallest reliability gap: persisted `topicFocus` is not revalidated against the current insights payload or current threads after reload
- Updated the active plan to move from audit to a single bounded fix for stale `topicFocus` validation

## Failed or Deferred

- No code change was made in this slice
- No deeper usage-report generation fix was chosen yet because the stale topic-focus problem is the smaller, clearer first defect

## Decisions

- Started Milestone 3 with persistence-path auditing instead of speculative fixes
- Chose stale `topicFocus` validation as the next slice because it can strand users in a misleading filtered view even when the persisted report itself is present

## Next Handoff

```text
Continue the codex-loop from `.claude/plans/ACTIVE_PLAN.md` using `ROADMAP.md` as the anchor. Stay on Milestone 3. Do one minimal slice only: validate persisted `topicFocus` on reload so stale insight navigation state cannot strand the thread list in an invalid filtered view, then update the active plan and append a new evolution note. Package and sync only if code changes.
```
