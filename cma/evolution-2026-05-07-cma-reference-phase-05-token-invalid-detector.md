# Evolution Note

- Plan used: `$codex-loop` conservative one-slice implementation pass.
- Bounded target: execute one slice of Phase 5 (`06-token-invalid-detector`) by adding explicit invalid credential detection in `src/host/account-manager.js` for probe and activation refresh validation paths.
- Files changed:
  - `src/host/account-manager.js`
  - `task-plans/subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json`
  - `task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md`
- Tests or checks run:
  - `node --check src/host/account-manager.js`
  - `node -e "const mgr=require('./src/host/account-manager'); const cases=['HTTP 401 Unauthorized','403 Forbidden: invalid token','rate limit']; const out=cases.map((c)=>mgr.detectInvalidCredentialSignal(c)?.code||mgr.detectRateLimitSignal(c)?.code||'none'); console.log(out.join('|'));"`
- Risks or deferrals:
  - Invalid detection remains heuristic and shares simple regex matching with existing rate-limit detector coverage.
  - This slice does not yet introduce a dedicated CLI worker output hook; it uses shared account-manager validation inputs (probe/activation refresh path) as the first phase.
  - Activation currently preserves existing refresh-failure handling; only recognized invalid-refresh failures are now classified as `invalid` instead of generic refresh failures.
- Next handoff:
  - Continue `cma-reference-phase-05-quota-rate-limit-awareness` with task `07-switch-action` (and finalize UI action wiring for explicit account switching from blocking states).
