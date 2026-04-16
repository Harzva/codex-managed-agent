## What Changed

- Replaced the unconditional full rerender for `threadsPatched` with a bounded local explorer DOM sync path when every patched thread stays confined to explorer surfaces.
- Reused the same explorer-only safety guard as the removal slices, and added a batch-selection/pending-batch guard so broader workflow surfaces still fall back to full rerender when needed.
- Left broader render-reduction work out of scope.

## Plan

- Active plan: `.claude/plans/ACTIVE_PLAN.md`
- Current milestone: follow-on track — `task-plans/cma-codex-communication-optimization-task-plan.md`
- Bounded target: replace full rerender for `threadsPatched` with a bounded local DOM sync path only

## Validation

- `node --check src/webview-template.js`
- `npm run package`

## Next Handoff

- Follow `.claude/plans/ACTIVE_PLAN.md`
- Audit the next smallest rerender-heavy mutation after the bounded `threadsPatched` local DOM sync path
