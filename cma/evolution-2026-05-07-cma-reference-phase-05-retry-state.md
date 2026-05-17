# Evolution Note: `cma-reference-phase-05-retry-state`

Date: 2026-05-07

Plan used:
- `$codex-loop` manual iteration mode
- One bounded subtask slice from roadmap JSON first-incomplete item (`02-retry-state` in `task-plans/subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json`)
- Conservative edit in existing account manager path (`src/host/account-manager.js`)

Bounded target:
- Persist per-account rate-limit retry availability in CMA account state.
- Ensure quota/rate-limit probe outcomes keep/update `retryAvailabilityByAccount`.
- Leave UI surface untouched in this slice (to remain one-step bounded implementation).

Files changed:
- `src/host/account-manager.js`

Tests/checks run:
- `node --check src/host/account-manager.js`
- `node -e "const mgr = require('./src/host/account-manager'); const cases = ['HTTP 429 Too Many Requests', 'Quota exceeded for account', 'Retry after 30 seconds', '401 Unauthorized']; console.log(cases.map((c) => !!mgr.detectRateLimitSignal(c) ? mgr.detectRateLimitSignal(c).message : 'no-match').join('|'));"`
- `node -e "const mgr = require('./src/host/account-manager'); const cases = ['Retry in 2 days', 'Retry after 1 d', 'Quota exceeded for account']; const out = cases.map((c) => { const signal = mgr.detectRateLimitSignal(c); return signal ? [signal.code, String(signal.retryAfterSeconds || '')].join(':') : 'no-match'; }); console.log(out.join('|'));"`

Risks or deferrals:
- Retry-window parsing only infers explicit `retry after/try again` values and remains heuristic; hidden formats may be missed.
- No Accounts UI rendering has been added yet (`03-accounts-ui` remains pending).
- No Team/board warning propagation in this slice (left for later tasks `04-card-warning` and onward).

Next handoff:
- Complete `cma-reference-phase-05-quota-rate-limit-awareness.json` task `03-accounts-ui` by rendering retry window/time and rate-limited state in Accounts list.
- Then proceed to `04-card-warning` to add card-level blocking indicators when quota blocks bound work.
