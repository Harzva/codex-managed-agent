# CMA Reference-Inspired Product Roadmap

## Purpose

This plan turns lessons from `reference/codex_manager`, `reference/codex-auto`, and `reference/AIUsage` into a CMA-native roadmap.

The goal is not to clone those projects. CMA should become a VS Code-native Codex operating surface with its own strengths:

- thread cards that explain what is happening now
- account controls that are safe around real `auth.json` files
- Overview diagnostics that reveal which Codex CLI/version is actually active
- trace and board views that connect runtime evidence to work ownership
- a compact daily-use dashboard, not a generic web clone

## Product Position

CMA should sit between the official Codex experience and external supervisors:

| Surface | Their Strength | CMA Direction |
| --- | --- | --- |
| Official Codex app / extension | Primary single-thread coding and editor workflow | Stay compatible, open/focus Codex threads, never pretend to replace the editor |
| `codex_manager` | Local-first multi-session watch desk, tail-window inference, remote/mobile intervention | Bring lifecycle inference into VS Code cards and drawers |
| `codex-auto` | Multi-account overlay and quota recovery for CLI sessions | Add safe account profiles and explicit activation without reckless auth overwrites |
| `AIUsage` | Provider quota dashboard, identity chain, credential/source-path discipline | Build a Codex-first provider health and identity model |

CMA's differentiator:

> CMA is the visual command desk inside VS Code: cards, boards, trace evidence, accounts, and team runtime all speak the same operational language.

## Non-Goals

- Do not copy Python/FastAPI runtime from `codex_manager`; CMA's active direction is Node-native.
- Do not silently replace `~/.codex/auth.json` during ordinary UI refresh.
- Do not turn the dashboard into a marketing-style quota app; quota and identity exist to support real work.
- Do not build a proxy conversion layer before Codex account, thread, and trace basics are stable.
- Do not build a SQLite account-pool gateway as the first multi-account solution; keep it as a future exploration after direct auth-profile switching is stable.
- Do not infer completion from idle time alone.

## Current Execution Order

As of 2026-05-08, the practical order is:

1. Stabilize direct Codex account switching.
2. Make token health and inactive-account refresh visible and conservative.
3. Preserve usage fields that Codex already returns, including cached input and reasoning tokens.
4. Surface only those verified usage metrics in Insights.
5. Defer estimated cost until pricing data and model mapping are explicit.
6. Keep SQLite account pools, local gateways, and automatic quota-exhaustion rotation as future TODOs.

This order keeps CMA focused on auth safety and observability first. New features should only enter when they reduce a real operational failure mode.

## Borrowed Ideas And CMA-Specific Adaptation

### From `codex_manager`

Borrow:

- bounded JSONL tail reads
- recent event markers
- lifecycle inference
- explicit `task_complete` as a safe auto-continue gate
- lightweight remote/watch surface

CMA adaptation:

- implement inference in the Node backend and expose it as `thread.lifecycle`
- render lifecycle state on Thread Explorer rows and Board cards
- link lifecycle reasons to Trace drawer evidence
- use the existing board and drawer system instead of a separate web page
- defer remote/mobile until local card semantics are excellent

### From `codex-auto`

Borrow:

- account vault directory
- per-run overlay concept
- source `CODEX_HOME` preservation
- rate-limit detection
- session binding before recovery
- retry/reset metadata per account

CMA adaptation:

- make Accounts page manage profiles, not raw file replacement only
- support explicit "Activate for native Codex" action
- support "Launch Team worker with account profile" later
- keep all account operations inspectable and reversible
- display account state on cards only when it affects work

### From `AIUsage`

Borrow:

- provider identity policy
- source path as a first-class key for Codex
- account health refresh model
- quota/reset display
- provider protocol and normalizer discipline

CMA adaptation:

- Codex account identity must prefer auth source path and credential id
- account cards should explain source path, active state, provider health, and errors
- quota is a work-readiness signal, not the whole product
- do not use email or account id as the only dedupe key for Codex

## CMA Design Principles

1. **Evidence before decoration**

   Every visible status should be traceable to a process row, JSONL marker, account file, Codex sidecar signal, or explicit user action.

2. **Small cards, clear reasons**

   Cards should not become dashboards inside dashboards. Each card needs one visible state, one reason, and a few direct actions.

3. **Local-first, path-aware identity**

   Codex state is file-based. CMA should respect real paths and show when it is acting on `.codex/auth.json`, session JSONL, or team trace files.

4. **Conservative automation**

   Auto-continue, account rotation, and retries must require explicit safe gates and be easy to stop.

5. **VS Code-native orchestration**

   The product should feel like a VS Code control desk: thread drawers, board cards, trace reports, commands, and task ownership are first-class.

## Architecture Targets

### Thread Lifecycle Model

Add a normalized lifecycle block to each thread summary:

```json
{
  "lifecycle": {
    "state": "running | queued | waiting | completed | needs_attention | aborted | unknown",
    "reason": "Recent tool output observed; current turn has not reached task_complete.",
    "attention": "active | check | completed | needs_attention | unknown",
    "last_marker": "response:function_call_output:",
    "recent_markers": ["turn_context", "response:function_call:", "response:function_call_output:"],
    "recent_tools": ["exec_command", "apply_patch"],
    "last_assistant_preview": "...",
    "last_user_preview": "...",
    "last_event_at": "2026-05-07T..."
  }
}
```

Implementation direction:

- Add bounded tail parsing in `src/host/node-backend/session-store.js`.
- Reuse existing `preview_logs`, `history`, and trace preview where possible.
- Avoid full JSONL loads for ordinary list rendering.
- Add tests for marker ordering, task open/settled logic, and attention inference.

### Account Identity Model

Codex account identity should use this priority:

1. `credentialId`
2. normalized source auth file path
3. managed profile path
4. explicit fallback id that never merges with unrelated accounts

Never use only:

- email
- `account_id`
- display name
- stale API result id

Implementation direction:

- Extend `src/host/account-manager.js` with `sourceAuthPath`, `normalizedSourceAuthPath`, and `credentialId`.
- Surface these fields in the Accounts overview.
- Add duplicate detection that warns rather than silently merging.

### Account Vault And Activation

Introduce a CMA account vault:

```text
.codex/cma-accounts/ or ~/.codex-managed-agent/accounts/
├── profiles.json
├── <profile-id>/
│   ├── auth.json
│   ├── config.toml
│   └── meta.json
└── backups/
    └── auth-<timestamp>.json
```

Required behavior:

- adopt current `.codex/auth.json` into a managed profile when migrating an existing login
- add another profile by creating a slot and running account-specific Codex login
- keep import-from-file as a diagnostics/migration path, not the normal way to create working accounts
- show active native Codex profile by resolving the global auth symlink and, where needed, comparing normalized auth path or file fingerprint
- activate profile only through a deliberate button
- activate by linking `~/.codex/auth.json` to the selected managed profile's `auth.json`
- move aside an existing unmanaged native auth file before replacing it with the symlink
- show success/failure with exact symlink target and path touched

Later behavior:

- launch Team worker with a profile overlay
- detect quota/rate-limit prompts and recommend a profile switch
- resume only the session bound to the current run

### Token Expiration And Account Switching

This is a major product requirement, not a minor account detail.

Current CMA already has partial primitives:

- managed account folders under `~/.codex-managed-agent/accounts/<name>/`
- account add/remove/current selection
- explicit activation that symlinks global `~/.codex/auth.json` to a managed account auth file
- JWT `id_token` decoding for expiry display
- manual/background refresh attempt through `refresh_token`
- credential probe that can classify `401` as invalid and `429` as rate-limited

But the complete product behavior is not done yet.

Missing behavior:

- invalid/expired token is not yet a first-class blocking state across cards, Team runs, and preflight
- token refresh failure does not yet guide the user to re-login or switch accounts
- no automatic "recommended account" selection after token invalidation
- no per-run overlay for launching workers without mutating native `.codex/auth.json`
- no session-bound recovery after switching account during a managed run
- no trace event that records "account switched because token expired"

Required CMA behavior:

1. Detect token health:
   - `ok`
   - `expiring_soon`
   - `expired`
   - `invalid`
   - `refresh_failed`
   - `rate_limited`
   - `unknown`

2. Show token health in Accounts and work surfaces:
   - Accounts page shows exact profile, source path, expiry, refresh ability, and last probe result.
   - Board/Thread/Team cards show a small warning only when token health blocks work.
   - Drawer explains the evidence: JWT expiry, refresh error, probe `401`, or rate-limit output.

3. Refresh before switching:
   - if `refresh_token` exists, attempt refresh first
   - if refresh succeeds, keep the same profile active
   - if refresh fails, mark profile `refresh_failed` and recommend another valid profile

4. Switch explicitly, with safe writes:
   - user clicks `Activate` or `Switch to this account`
   - CMA refreshes/validates the selected profile before switching when possible
   - CMA moves aside an existing unmanaged native `auth.json` only when needed
   - CMA updates the global `~/.codex/auth.json` symlink to the selected profile auth
   - CMA validates the active auth path after linking
   - CMA emits a trace/audit event

5. Later, switch per managed run without native auth mutation:
   - Team worker uses account overlay
   - worker records bound account profile and session id
   - recovery resumes only that bound session id
   - automatic rotation remains opt-in

Acceptance:

- Expired tokens are visible before a user launches a task.
- A failed token refresh never silently overwrites active auth.
- User can switch to another account with one explicit action and see what path was touched.
- A Team run can later be recovered without guessing the newest session.

### Deferred: Local Gateway Account Pool

CodexManager-style account pooling is a future TODO, not the current CMA path.

The deferred architecture would use:

- a CMA SQLite account vault for `id_token`, `access_token`, and `refresh_token`
- a local OpenAI-compatible gateway exposed through `base_url`
- a CMA platform key in Codex `auth.json`, not raw account tokens
- gateway-side account selection and token refresh

Reasons to defer:

- it changes CMA from an auth-profile switcher into a request-routing gateway
- it creates more security and policy surface than local symlink activation
- it can be mistaken for quota or rate-limit rotation if designed carelessly
- it requires separate routing, logging, key management, and local binding guarantees

Guardrails if this is revisited:

- local-only binding by default
- no token sharing or public/team exposure of personal credentials
- no default automatic quota-exhaustion account rotation
- explicit account selection and traceable audit events
- direct `auth.json` profile activation remains available as the conservative fallback

### Provider Health Mini-Layer

Add a Codex-first provider health model:

```json
{
  "provider": "codex",
  "accounts": [],
  "activeAuthPath": "...",
  "cli": {
    "available": true,
    "path": "...",
    "version": "...",
    "activeForCurrentUser": true,
    "source": "user_npm_global | system_npm_global | workspace_local | vscode_bundled | wrapper | symlink | unknown"
  },
  "cliVersions": [
    {
      "path": "/home/clashuser/.local/bin/codex",
      "realpath": "/home/clashuser/.local/lib/node_modules/@openai/codex/bin/codex.js",
      "version": "0.128.0",
      "source": "user_npm_global",
      "active": true
    },
    {
      "path": "/usr/bin/codex",
      "realpath": "/usr/lib/node_modules/@openai/codex/bin/codex.js",
      "version": "0.118.0",
      "source": "system_npm_global",
      "active": false
    }
  ],
  "sidecar": { "available": true, "extension": "openai.chatgpt" },
  "quota": { "known": false, "resetAt": null, "reason": "" },
  "lastRefreshAt": "..."
}
```

This should feed:

- Overview account summary
- Provider subpage
- Board card warnings when a running action is blocked by auth/quota
- Team preflight checks

### Codex CLI Version Inventory

Overview must make Codex executable/version conflicts visible.

Required behavior:

1. Detect the active Codex executable for the current user and CMA runtime:
   - `command -v codex`
   - actual PATH used by managed commands
   - `codex --version`
   - symlink/wrapper realpath where possible

2. Detect other installed Codex versions:
   - user-level npm global, for example `/home/clashuser/.local/bin/codex`
   - system-level npm global, for example `/usr/bin/codex`
   - workspace-local installs under `node_modules/@openai/codex`
   - VS Code extension-bundled Codex executable

3. Show an Overview version card:
   - active path and version
   - all discovered paths and versions
   - source label: user npm, system npm, workspace, VS Code bundled, wrapper, symlink, unknown
   - warning when active user version differs from system/bundled versions
   - safe upgrade guidance that does not use `sudo` by default

Acceptance:

- A user can immediately see whether `/home/clashuser/.local/bin/codex` or `/usr/bin/codex` is active.
- Stale system versions are visible but not mistaken for the active user version.
- Overview explains why `npm -g` can still be user-level when `npm prefix -g` is `/home/clashuser/.local`.
- The UI never modifies auth files or installs packages automatically.

### Trace-Linked Card Language

Cards should use consistent state language:

| State | Visual Label | Meaning |
| --- | --- | --- |
| running | Running | Current turn appears active |
| queued | Queued | Latest user input is present, waiting for agent processing |
| waiting | Waiting | Agent output ended and awaits next input |
| completed | Completed | Explicit `task_complete` or final answer signal observed |
| needs_attention | Needs Human | Assistant asks for confirmation/info or stopped in commentary |
| aborted | Aborted | Turn was interrupted |
| unknown | Unknown | Not enough bounded evidence |

Each card should show:

- state label
- one-line reason
- recent tool chips
- Cmd/Cmp/Git quick actions
- Inspector/Chat/Trace/Tab micro tabs

## Phased Plan

### JSON Subtask Registry

Machine-readable subtasks live under `task-plans/subtask_json/`.

Index:

- [Subtask Index](../subtask_json/index.json)

Phase task files:

- [Phase 1 — Lifecycle Inference](../subtask_json/cma-reference-phase-01-lifecycle-inference.json)
- [Phase 2 — Board Operational Language](../subtask_json/cma-reference-phase-02-board-operational-language.json)
- [Phase 8 — Overview Codex Version Inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json)
- [Phase 3 — Account Identity Hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json)
- [Phase 4 — Account Vault And Token Health](../subtask_json/cma-reference-phase-04-account-vault-token-health.json)
- [Phase 5 — Quota And Rate-Limit Awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json)
- [Phase 6 — Team Worker Account Profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json)
- [Phase 7 — Remote Watch Surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json)

Rule:

- Update the JSON subtask first when task status, scope, acceptance, or implementation targets change.
- Keep this roadmap focused on product direction and phase-level narrative.

### Phase 1: Lifecycle Inference On Threads

JSON subtask: [cma-reference-phase-01-lifecycle-inference](../subtask_json/cma-reference-phase-01-lifecycle-inference.json)

Scope:

- parse bounded tail markers from session JSONL
- normalize lifecycle state and reason
- add test coverage
- render lifecycle on Thread Explorer rows

Tasks:

- [x] Add bounded lifecycle event inference in Node backend.
- [x] Add `inferThreadLifecycleFromEvents` pure helper with unit tests.
- [x] Add `lifecycle` to normalized thread summary and thread detail.
- [x] Render lifecycle state and reason in Thread Explorer.
- [x] Add regression tests for `task_complete`, open turn, tool calls, aborted turn, and commentary stop.

Acceptance:

- Thread list does not load full histories.
- At least five lifecycle states are visible in test fixtures.
- Existing render-detail tests still pass.

### Phase 2: Board Card Operational Language

JSON subtask: [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)

Latest slice:

- 2026-05-07: recent tool chips added to the board lifecycle strip; see [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)
- 2026-05-07: board lifecycle strip added to running cards; see [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)
- 2026-05-07: board quick actions now include Cmd/Cmp/Git in compact and standard cards; see [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)
- 2026-05-07: regression adjusted so compact board cards retain 2-chip truncation while standard cards keep full tool list visibility; see [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)
- 2026-05-07: needs_attention lifecycle now marks running cards as intervention candidates; see [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)
- 2026-05-07: compact board card overflow behavior hardened with width/ellipsis safeguards to avoid overlapping badges/actions/reason text; see [cma-reference-phase-02-board-operational-language](../subtask_json/cma-reference-phase-02-board-operational-language.json)

Scope:

- bring lifecycle state to running cards
- make compact cards read like operational cards, not generic summaries
- keep current card size controls and 5-line title behavior

Tasks:

- [x] Add lifecycle badge and reason line to board card body.
- [x] Add recent tool chips for bounded tail evidence.
- [x] Keep Cmd/Cmp/Git quick actions visible in compact and standard cards.
- [x] Highlight `needs_attention` lifecycle state on board cards as handoff candidates.
- [x] Add visual regression-minded checks for compact card overflow.

Acceptance:

- A user can decide "wait, inspect, continue, or intervene" from the card alone.
- No text overlap on compact cards.
- `Cmp 0` is visibly neutral and not styled like an error.

### Phase 8: Overview Codex Version Inventory

JSON subtask: [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json)

Scope:

- show which Codex CLI path/version is active for the current user
- detect every visible Codex executable/version CMA can find
- explain user-level vs system-level vs bundled Codex installs
- provide safe upgrade guidance without running upgrades automatically

Tasks:

- [x] Detect active Codex executable and version from the same environment CMA uses. (implemented in `task-plans/subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json#tasks`)
- 2026-05-07: detected active CLI executable/path/version via new Node backend `/api/codex/active` endpoint; wired to dashboard payload as `activeCodex`. See [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json).
- [x] Inventory user-level, system-level, workspace-local, and VS Code bundled Codex executables.
- 2026-05-07: added Node backend `/api/codex/inventory` endpoint with PATH/common executable candidates, realpath dedupe, and version probing for discoverable candidates. See [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json).
- [x] Classify each executable as user npm global, system npm global, workspace local, VS Code bundled, wrapper, symlink, or unknown.
- 2026-05-07: added install-source labels to every `/api/codex/inventory` item (`installSource` + `installSourceTags`) in `src/host/node-backend/server.js`, with regression assertions in `src/host/node-backend/parity-smoke.test.js`. See [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json).
- [x] Add an Overview version card with active path, active version, and discovered versions.
- 2026-05-07: added `overviewDigest` Codex CLI card from `dashboard.activeCodex` + `dashboard.codexInventory` in `src/webview-template.js`, including active resolution, discovered executables, and conflict warning copy for system/bundled version mismatch. See [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json) and `evolution-2026-05-07-cma-reference-phase-08-overview-ui.md`.
- [x] Add safe upgrade guidance for user-level installs: `npm config set prefix ~/.local`, `npm install -g @openai/codex@latest`, `hash -r`, `codex --version`.
- 2026-05-07: added explicit safe user-level upgrade guidance copy to the Overview Codex card for manual remediation without auto-mutation; includes shell order, profile notice, and `codex --version` verification. See [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json) and `evolution-2026-05-07-cma-reference-phase-08-overview-upgrade-guidance.md`.
- [x] Add tests for mixed active/stale versions and non-executable paths.
- 2026-05-07: added Node backend `readCodexInventory` regression assertions in `src/host/node-backend/parity-smoke.test.js` for active/stale version distinction, non-executable path error handling, and deterministic spawn capture. See [cma-reference-phase-08-overview-codex-version-inventory](../subtask_json/cma-reference-phase-08-overview-codex-version-inventory.json) and `evolution-2026-05-07-cma-reference-phase-08-tests.md`.

Acceptance:

- Overview shows the active Codex path and version for the current user.
- Overview distinguishes `/home/clashuser/.local/bin/codex` from `/usr/bin/codex`.
- Older system or bundled Codex versions are visible but do not override active user detection.
- Users can understand why Update Available may point at a different Codex install.
- No auth file is touched, and no package install runs automatically.

### Phase 3: Codex Account Identity Hardening

JSON subtask: [cma-reference-phase-03-account-identity-hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json)

Latest slice:

- 2026-05-07: added normalized auth path utilities (`src/host/account-manager.js`) for trim/`~` expansion, path resolution, symlink-aware fallback, and case handling before reuse in future identity comparisons. See [cma-reference-phase-03-account-identity-hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json)
- 2026-05-07: extended account identity records with source-auth path, normalized source path, managed path, credentialId, and fingerprint metadata in `src/host/account-manager.js`; added helper derivation for future dedupe safety. See [cma-reference-phase-03-account-identity-hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json)
- 2026-05-07: added non-destructive duplicate identity warnings in `src/host/account-manager.js` plus duplicate warning badges and messages in the Accounts UI (`src/webview-template.js`, `src/webview/styles.js`). See [cma-reference-phase-03-account-identity-hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json) and `evolution-2026-05-07-cma-reference-phase-03-duplicate-warnings.md`.
- 2026-05-07: surfaced source auth path and active-profile state in the Accounts overview and account cards (`src/webview-template.js`, `src/webview/styles.js`) so users can identify which profile would be activated and what auth file path is in play. See [cma-reference-phase-03-account-identity-hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json) and `evolution-2026-05-07-cma-reference-phase-03-ui-source-path.md`.
- 2026-05-07: added regression coverage in `src/webview/render-detail-regression.test.js` that validates two configured accounts with matching `credentialId` can coexist with distinct source paths, while each shows duplicate warning badges and path visibility. See [cma-reference-phase-03-account-identity-hardening](../subtask_json/cma-reference-phase-03-account-identity-hardening.json) and `evolution-2026-05-07-cma-reference-phase-03-tests.md`.

Scope:

- make account identity path-aware
- stop relying on email/account id for Codex dedupe
- explain active auth source in UI

Tasks:

- [x] Add normalized auth path utilities.
- [x] Extend account records with `credentialId`, `sourceAuthPath`, `fingerprint`.
- [x] Add duplicate warning logic.
- [x] Update Accounts overview card to show source path and active status.
- [x] Add tests for same email across different auth paths.

Acceptance:

- Two Codex auth files with same email can coexist.
- Active account detection is path/fingerprint-based.
- UI shows enough source information to understand what will be activated.

### Phase 4: Account Vault And Explicit Activation

JSON subtask: [cma-reference-phase-04-account-vault-token-health](../subtask_json/cma-reference-phase-04-account-vault-token-health.json)

Scope:

- store managed Codex auth profiles and activate them by global auth symlink
- keep import/backup flows as migration or diagnostics paths
- avoid silent replacement of `.codex/auth.json`
- make token expiration and invalid credentials visible before activation

Tasks:

- [x] Define vault layout and metadata schema. (tracked in `task-plans/subtask_json/cma-reference-phase-04-account-vault-token-health.json`, task `01-vault-schema`)
- [x] Implement import current auth.
- [x] Implement import from path.
- [x] Implement activate profile through global auth symlink.
- [x] Add token health states: `ok`, `expiring_soon`, `expired`, `invalid`, `refresh_failed`, `rate_limited`, `unknown`.
- [x] Attempt refresh before activation when a refresh token is available.
- [x] Mark refresh failures without overwriting native auth. (tracked in `task-plans/subtask_json/cma-reference-phase-04-account-vault-token-health.json`, task `07-refresh-failure`)
- [x] Add re-login/switch recommendation copy for invalid or expired profiles.
- [x] Add UI actions: Import Current, Import File, Activate, Open Source.
- 2026-05-07: Added the `Open Source` per-account control in the accounts list and wired it to existing `openLocalFile` handling in `src/webview-template.js` (`data-open-codex-account-source-path` -> `openLocalFile`). Active JSON slice: [cma-reference-phase-04-account-vault-token-health](../subtask_json/cma-reference-phase-04-account-vault-token-health.json#tasks) (`08-ui-actions`).
- 2026-05-07: Renamed the credentials probe action to `Validate` for the account actions row, remaining on the same handler path in `src/webview-template.js`. Active JSON slice: [cma-reference-phase-04-account-vault-token-health](../subtask_json/cma-reference-phase-04-account-vault-token-health.json#tasks) (`08-ui-actions`).
- [x] Add failure states for invalid/missing auth.

2026-05-08 route sync note: activation now means `~/.codex/auth.json` points to the selected managed profile's `auth.json`. Existing unmanaged native auth is moved aside before linking, but managed profile switches do not copy auth between profiles.
2026-05-07 sync note: this is implemented through account token health classification and Accounts/Board UI copy. Invalid/expired/refresh-failed profiles render `Token blocked`, `Token health`, and `Switch recommended` guidance; missing auth renders a `No auth.json` state and activation is blocked before global auth linking.

Acceptance:

- Activation updates the global auth symlink instead of copying profile auth.
- Existing unmanaged native auth is preserved by moving it aside before linking.
- UI shows exact global auth path and symlink target.
- Invalid auth cannot replace the global auth link.
- Expired or invalid tokens are visible as blocking account health states.

### Phase 5: Quota And Rate-Limit Awareness

JSON subtask: [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json)

Scope:

- detect quota/rate-limit signals from Codex output and managed actions
- show retry/reset information without pretending to have perfect quota APIs
- recommend account switch when quota or invalid token blocks work, without auto-switching by default

Tasks:

- [x] Add rate-limit detector for common Codex messages. (tracked in [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json#tasks) as `01-rate-limit-detector`)
- [x] Store per-account retry availability. (tracked in [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json#tasks) as `02-retry-state`)
- 2026-05-07: Rendered rate-limited retry timing and badge visibility in the Accounts list, plus regression coverage. See [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json).
- [x] Show retry time in Accounts list.
- [x] Add card warning when the bound action hit quota. (tracked in [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json#tasks) as `04-card-warning`)
- [x] Add "switch recommended" UI state without auto-switching.
- [x] Add token-invalid detector from probes, CLI output, and activation validation. (tracked in [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json#tasks) as `06-token-invalid-detector`)
- [x] Add explicit `Switch Account` action from blocking warning states.

2026-05-07: Added a first-phase detector (`01-rate-limit-detector`) that classifies common quota/rate-limit/upgrade/retry messages into structured rate-limit signals in `src/host/account-manager.js`. The token probe path now returns structured `rate_limited` diagnostics without changing auth state.
2026-05-07: Added per-account retry-state persistence (`02-retry-state`) for probe-detected rate-limit signals in `src/host/account-manager.js` under `retryAvailabilityByAccount`, with helper parsing for retry window and state cleanup on non-rate-limit failures. See [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json#tasks).
2026-05-07: Added running-board quota warning badges when the active Codex account has blocked rate-limit state (`04-card-warning`) and regression coverage for compact/standard cards in `src/webview-template.js` + `src/webview/render-detail-regression.test.js`.
2026-05-07: Closed the remaining Phase 5 detector gap by recognizing `usage limit` plus upgrade-plan wording as quota exhaustion in `src/host/account-manager.js`, matching the roadmap requirement to classify common usage-cap and upgrade prompts. See [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json).
2026-05-07: Phase 5 quota/rate-limit awareness marked complete in [cma-reference-phase-05-quota-rate-limit-awareness](../subtask_json/cma-reference-phase-05-quota-rate-limit-awareness.json) after all subtasks reached `done` state.

Acceptance:

- Quota messages become visible structured state.
- Retry availability survives refresh.
- No automatic account switch occurs without explicit user opt-in.
- Token invalidation and quota exhaustion are separate states in UI and trace.

### Phase 6: Team Worker Account Profiles

 JSON subtask: [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json)

Scope:

- allow Team runs to select an account profile
- preserve session binding when recovering a worker

 Tasks:

- [x] Add account profile selector to Team worker draft.
- [x] Add preflight: selected account valid, CLI available, workspace path valid. (tracked in [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) as `02-preflight`)
- [x] Add run metadata: profile id, auth source, session binding. (tracked in [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) as `03-run-metadata`)
- [x] Add recovery guard: resume only bound session id. (tracked in [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) as `04-recovery-guard`)
- [x] Add trace evidence for account/profile used. (tracked in [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) as `05-trace-evidence`)

2026-05-07: Added team worker draft support for `account_profile_id` passthrough during worker launch and persisted runtime metadata (`src/host/moa-core.js`, `src/host/team-coordination.js`), with regression coverage in `src/host/team-coordination.test.js`. See [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json).
2026-05-07: Fixed launch payload contract so scheduler now delivers `account_profile_id` as `payload.account_profile_id` to launch callbacks, enabling consistent profile propagation under draft-bound and mocked launch flows (`src/host/moa-core.js`). See [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json).
2026-05-07: Added Team worker preflight checks that validate workspace path, selected account profile, token health blocking states, and codex CLI availability before spawn. Scheduler blocker reasons now preserve preflight kinds (`team_workspace_missing`, `team_workspace_invalid`, `team_account_profile_not_found`, `team_account_token_blocked`) instead of collapsing to generic launch-failure signals, and added regression coverage in `src/host/team-coordination.test.js`. See [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) (`02-preflight`).
2026-05-07: Persisted Team worker run metadata for account-bound launches: DAG node runtime and Team task `launched_workers` now carry `account_profile_id`, auth source path, token health, and session-binding metadata, with focused regression coverage in `src/host/team-coordination.test.js`. See [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) (`03-run-metadata`).
2026-05-07: Added session-bound retry recovery guard in `src/host/team-coordination.js`; same-thread retry now resumes only the persisted bound worker session and fails closed on session drift instead of falling back to the current task owner thread. See [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) (`04-recovery-guard`).
2026-05-07: Added explicit Team trace evidence for account-profile launch usage and profile-blocked preflight states in `src/host/team-coordination.js`, with focused regression coverage for successful account binding and blocked profile/token launches. See [cma-reference-phase-06-team-worker-account-profiles](../subtask_json/cma-reference-phase-06-team-worker-account-profiles.json#tasks) (`05-trace-evidence`).

Acceptance:

- Team task evidence records which account profile was used.
- Recovery does not guess from newest session.
- User can inspect profile/run binding in drawer.

### Phase 7: Remote And Lightweight Watch Surface

JSON subtask: [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json)

Scope:

- design a CMA-native lightweight surface after local lifecycle/card semantics stabilize
- enable auto-continue only after lifecycle inference, account health, and trace evidence are reliable
- let the user configure a finite auto-continue count per watched thread/task

Tasks:

- [x] Define local HTTP read-only watch endpoint or VS Code webview route.
- [x] Add watchlist for selected threads/tasks.
- [x] Add conservative auto-continue per watched item.
- [x] Add auto-continue count controls: remaining count, max count, consumed count, and reset action.
- [x] Persist auto-continue settings per watched thread/task.
- [x] Stop auto-continue when count reaches zero, token/account health blocks work, latest turn is not `task_complete`, or user stops it manually.
- [x] Add stop/resume controls with trace evidence.
- [x] Add auth/token model before non-local exposure.

2026-05-07: Added the first local watch surface contract as `GET /api/watch` in the Node backend. It is read-only, advertises `watch` in `/api/health`, returns lifecycle/process evidence for watched threads, and explicitly marks future write actions as auth-gated. See [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json#tasks) (`01-watch-endpoint`).

2026-05-07: Added local watchlist loading for `~/.codex-managed-agent/watchlist.json`. `GET /api/watch` now uses explicit `ids=` when present, otherwise filters to configured watched thread ids and reports watched task ids as unsupported until the task resolver/control slices land. See [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json#tasks) (`02-watchlist`).

2026-05-07: Added conservative read-only auto-continue state derivation for watched threads. Items only become launchable when enabled, finite, still have remaining count, and current lifecycle evidence contains an explicit `event:task_complete` marker that has not already been consumed. See [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json#tasks) (`03-auto-continue`).

2026-05-07: Added local auto-continue count controls and persistence via `POST /api/watch/auto-continue`. Settings are written atomically to `~/.codex-managed-agent/watchlist.json`, support reset behavior, and remain limited to local requests until the remote auth model is added. See [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json#tasks) (`04-auto-continue-count`, `05-persist-settings`).

2026-05-07: Added explicit watch auto-continue stop-condition reasons for exhausted counts, running/queued lifecycle, missing `task_complete`, account/token blocks, quota/rate-limit blocks, user stop, launch failure, and session binding changes. See [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json#tasks) (`06-stop-conditions`).

2026-05-07: Added local stop/resume controls at `POST /api/watch/control`, durable watch action JSONL evidence in `~/.codex-managed-agent/watch-actions.jsonl`, and token-gated non-local write auth via bearer token or `x-cma-watch-token`. See [cma-reference-phase-07-remote-watch-surface](../subtask_json/cma-reference-phase-07-remote-watch-surface.json#tasks) (`07-controls`, `08-auth-model`).

Acceptance:

- Remote/watch surface never exposes write actions without auth.
- Auto-continue only triggers after explicit completed-turn evidence.
- Auto-continue requires a finite count unless the user explicitly chooses an advanced unlimited mode.
- The UI shows remaining auto-continue count before every launch.
- Stop/resume actions appear in trace.

## UI Plan

### Overview Codex Version Card

Layout:

```text
Codex CLI
Active: /home/clashuser/.local/bin/codex     0.128.0     user npm

Other versions
/usr/bin/codex                               0.118.0     system npm
/bin/codex                                   0.118.0     system npm
.../openai.chatgpt-*/bin/.../codex           unknown     VS Code bundled

Guidance
npm prefix -g -> /home/clashuser/.local
hash -r / exec bash -l after upgrade
```

Rules:

- the active executable is based on the current user/CMA runtime, not the newest discovered version
- stale versions are warnings, not errors
- copyable commands are guidance only; Overview does not run upgrade commands
- version inventory belongs in Overview and can feed Provider/Team preflight

### Thread Explorer Row

Layout:

```text
[status badges] [label] [thread id]                         [updated] [Terminal] [Codex] [...]
Title
Base directory
Meta pills
[Cmd 4] [Cmp 0] [Git Status/Commit/Push]
[Inspector] [Chat] [Trace] [Tab]
```

Rules:

- bottom tabs are smaller than top action buttons
- quick actions stay visible even in reduced display modes
- `Cmp 0` is neutral, not an error
- Git action always renders when a cwd exists:
  - non-git: `Git Init`
  - unknown metadata: `Git Status`
  - known repo: `Commit`, and `Push` if remote exists

### Board Card

Each card should answer:

- What is this thread doing?
- Why does CMA believe that?
- What can I do next?

Required card signals:

- lifecycle badge
- reason line
- latest preview
- recent tools
- Cmd/Cmp/Git quick actions
- Trace/Chat/Inspector entry

### Accounts Page

Sections:

- Active Native Codex Auth
- Managed CMA Profiles
- Discovered Auth Files
- Health and Quota Signals
- Backup History

Actions:

- Import Current
- Import Auth File
- Activate
- Backup Now
- Open Auth Source
- Validate

## Data And Storage Plan

### Thread Lifecycle Cache

Candidate location:

```text
.codex-team/cache/thread-lifecycle.json
```

Use only as an optimization. The JSONL tail remains the source of truth.

### Account Vault Metadata

Example:

```json
{
  "schema_version": 1,
  "profiles": [
    {
      "id": "uuid",
      "label": "work-team",
      "source_auth_path": "/home/user/.codex/auth.json",
      "managed_auth_path": ".../accounts/uuid/auth.json",
      "fingerprint": "sha256:...",
      "created_at": "...",
      "last_activated_at": "...",
      "notes": ""
    }
  ]
}
```

### Trace Additions

Add trace events for:

- lifecycle inference refresh
- account activation
- account validation failure
- quota/rate-limit detection
- auto-continue decision skipped/launched
- Team worker profile binding

## Testing Strategy

### Unit Tests

- lifecycle marker inference
- Codex CLI version inventory and active path selection
- auth path normalization
- account duplicate detection
- rate-limit detection
- git action rendering fallback

### Webview Regression Tests

- Thread row renders quick actions and micro tabs.
- Overview renders active Codex version and stale discovered versions.
- Account page renders source path and activation actions.
- Board card shows lifecycle reason without overflow.
- Trace drawer links lifecycle evidence.

### Safety Tests

- invalid auth does not overwrite active auth
- activation links global auth to the selected profile
- activating over an existing managed symlink does not copy or move another profile's auth
- activating over unmanaged native auth moves it aside before linking
- same email with different source paths does not merge
- auto-continue skips non-`task_complete` turns

## Risks

| Risk | Mitigation |
| --- | --- |
| Lifecycle inference lies | Show reason and marker evidence; keep `unknown` acceptable |
| Account activation points at the wrong auth | Symlink-only activation, explicit action, exact path/target display, and tests for managed-symlink switching |
| UI becomes too dense | Use small quick actions, neutral pills, drawer for detail |
| Quota detection is incomplete | Label as detected signal, not canonical quota truth |
| Remote surface creates security exposure | Defer until auth and local model are stable |

## First Implementation Slice

Start with Phase 1 and one small UI pass:

1. Add bounded tail lifecycle inference.
2. Put `lifecycle.state` and `lifecycle.reason` on thread summaries.
3. Render the reason in Thread Explorer.
4. Keep current quick actions and micro tabs.
5. Add tests before touching account activation.

This gives CMA an immediate original product feel: cards become explainable operational instruments, not just borrowed session rows.

## Success Definition

CMA succeeds when a user can open the dashboard and answer these questions in under ten seconds:

- Which Codex threads are actively working?
- Which ones are done?
- Which ones need me?
- Which account/auth source is active?
- Which Codex CLI path/version is active for my current user?
- Is quota/auth blocking any work?
- What evidence supports each answer?
