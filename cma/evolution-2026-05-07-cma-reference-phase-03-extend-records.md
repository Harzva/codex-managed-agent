# Evolution Note: CMA Reference Roadmap Phase 3 Slice

Date: 2026-05-07

## Plan Used

- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- `task-plans/subtask_json/cma-reference-phase-03-account-identity-hardening.json`

## Bounded Target

Complete Phase 3 task `02-extend-records` by adding path/identity fields to account records and introducing identity helper derivation in `src/host/account-manager.js`.

## Files Changed

- `src/host/account-manager.js`
- `task-plans/subtask_json/cma-reference-phase-03-account-identity-hardening.json`
- `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`

## Tests or Checks Run

- `node --check src/host/account-manager.js`

## Risks or Deferrals

- Fields are computed at payload-read time and are not yet persisted into account metadata files, so historical values are not stored until a follow-up phase updates persistence.
- `credentialId` is a best-effort derivation (email/account/refresh token/sub/access token) and may still collide across accounts that share token content.

## Next Handoff

Continue `cma-reference-phase-03-account-identity-hardening.json` with task `03-duplicate-warnings`:

- add duplicate detection guidance for same email or credential identifiers using new `credentialId`/`fingerprint` fields;
- keep dedupe warnings non-destructive and avoid silently merging accounts.
