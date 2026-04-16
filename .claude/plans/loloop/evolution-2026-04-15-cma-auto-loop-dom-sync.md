## What Changed

- Replaced the full rerender for `autoContinueConfigPatched` with a local auto-loop DOM sync path.
- Thread rows, spotlight, and running cards now expose stable auto-loop slots so loop-state cues update in place.
- The change stayed scoped to auto-loop cues and did not widen into broader render-reduction work.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `autoContinueConfigPatched` with a local auto-loop DOM sync path only

## Validation

- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest rerender-heavy mutation after the auto-loop DOM sync without widening into broader render-reduction work
