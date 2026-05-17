# Evolution Note — 2026-05-07

- Phase: `cma-reference-phase-06-team-worker-account-profiles`
- Slice: `02-preflight`

## Plan used

- `codex-loop` plan-driven slice anchored to:
  - `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
  - `task-plans/subtask_json/cma-reference-phase-06-team-worker-account-profiles.json`
- Bounded target: complete only one phase-6 preflight slice (validation before launch + trace blocker propagation + regression coverage).

## Bounded target

- Implement Team worker launch preflight in `launchTeamWorkspaceOrchestration`:
  - validate workspace exists and is a directory.
  - validate selected account profile exists (for codex workers).
  - validate account token health does not indicate blocked states.
  - validate codex CLI availability once per launch batch.
- Propagate preflight kind into scheduler blocker `reason` and keep trace evidence for structured failures.
- Add targeted tests for missing profile and blocked token health preflight.

## Files changed

- `src/host/team-coordination.js`
- `src/host/moa-core.js`
- `src/host/team-coordination.test.js`
- `task-plans/subtask_json/cma-reference-phase-06-team-worker-account-profiles.json`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

## Tests / checks run

- `node --check src/host/moa-core.js`
- `node --check src/host/team-coordination.js`
- `node --test src/host/team-coordination.test.js --test-name-pattern "blocks Team launch when selected account profile is not found"`
- `node --test src/host/team-coordination.test.js --test-name-pattern "blocks Team launch when selected account token health is blocked"`
- `node --test src/host/team-coordination.test.js --test-name-pattern "persists account profile id on launched Team workers for draft-bound workers"`

## Risks / deferrals

- Workspace-path preflight is tested for account-profile/token states; CLI unavailability is implemented but not explicitly locked to a dedicated deterministic unit stub in this slice.
- Codex-specific trace kind values currently include the preflight kind only via launch blocker reason and trace payload; downstream card-level copy for each preflight reason can be refined in the next slice.
- Remaining Phase 6 tasks (`03-run-metadata`, `04-recovery-guard`, `05-trace-evidence`) are still pending.

## Next handoff

- Continue in `cma-reference-phase-06-team-worker-account-profiles` with `03-run-metadata`, then `04-recovery-guard`.
