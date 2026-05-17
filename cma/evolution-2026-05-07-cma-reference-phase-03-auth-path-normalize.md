# Evolution Note: CMA Reference Roadmap Phase 3 Slice

Date: 2026-05-07

## Plan Used

- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- `task-plans/subtask_json/cma-reference-phase-03-account-identity-hardening.json`

## Bounded Target

Complete Phase 3 task `01-normalize-path` by adding identity-safe auth path normalization utilities and using them for account import source handling and active-profile detection paths.

## Files Changed

- `src/host/account-manager.js`
- `task-plans/subtask_json/cma-reference-phase-03-account-identity-hardening.json`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

## Tests or Checks Run

- `node --check src/host/account-manager.js`

## Risks or Deferrals

- This slice only adds path normalization infrastructure; dedupe logic, credential extraction, and UI path surfaces remain TODO in later Phase 3 tasks.
- `normalizeAuthPath` treats Windows case normalization by lowercasing; cross-platform behavior is conservative and not yet validated in CI matrixes.

## Next Handoff

Continue `cma-reference-phase-03-account-identity-hardening.json` with task `02-extend-records`:

- add identity fields (`credentialId`, `sourceAuthPath`, `normalizedSourceAuthPath`, `fingerprint`)
- thread them into payload and account records for path-based dedupe decisions.
