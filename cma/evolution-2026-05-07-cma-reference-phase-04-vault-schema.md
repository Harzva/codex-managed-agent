# Evolution Note

- Plan used: `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Bounded target: execute Phase 4 task `01-vault-schema` by defining explicit account vault layout and metadata contracts in `src/host/account-manager.js` only, with no auth import/activation behavior changes.
- Files changed:
  - `src/host/account-manager.js`
  - `task-plans/subtask_json/cma-reference-phase-04-account-vault-token-health.json`
  - `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Tests or checks run:
  - `node --check src/host/account-manager.js`
- Risks or deferrals:
  - This slice only defines schema constants/helpers; metadata/backup schema is not yet persisted by all import/activation paths.
  - No existing activation/import flow is changed in this pass.
  - Runtime paths are still surfaced by existing payload fields and not yet fully migrated to the new schema contract.
- Next handoff:
  - Continue Phase 4: `cma-reference-phase-04-account-vault-token-health`.
  - Next slice: `02-import-current`.
  - Keep import/activation/backup write behavior untouched until later phases while schema usage is wired.
