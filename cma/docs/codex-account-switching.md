# Codex Account Switching Notes

This document records the account-switching model used by Codex-Managed-Agent
(CMA). The goal is local multi-account switching without accidentally burning
refresh tokens or losing the ability to switch back.

## Goal

CMA should support several local Codex accounts on the same machine:

- each account has its own independently logged-in `auth.json`
- switching accounts changes the global default used by new `codex` processes
- switching does not require logout
- switching does not copy `auth.json`
- thread/session/history metadata can remain shared

The important distinction is:

- **auth is isolated per account**
- **the default global auth pointer is switched**

## Directory Model

Managed accounts live under:

```text
~/.codex-managed-agent/accounts/<account-name>/
  auth.json
  config.toml
  meta.json
```

The global Codex auth file is:

```text
~/.codex/auth.json
```

CMA switches the global default by making `~/.codex/auth.json` a symlink:

```text
~/.codex/auth.json
  -> ~/.codex-managed-agent/accounts/<account-name>/auth.json
```

That means a normal terminal command:

```bash
codex
```

uses whichever account CMA has activated globally.

## Do Not Copy auth.json

Do not create multiple accounts by copying an existing `auth.json`.

Copying an auth file copies the same refresh token into multiple places. When
one copy refreshes, the provider can rotate or consume the refresh token, leaving
the other copy unable to refresh later.

Bad:

```bash
cp ~/.codex/auth.json ~/.codex-managed-agent/accounts/work/auth.json
```

Good:

```bash
CODEX_HOME=~/.codex-managed-agent/accounts/work codex login --device-auth
```

Each account slot should be logged in independently, even if the human signs in
with the same ChatGPT/OpenAI account.

## Login, Activate, Refresh, Logout

### Login

`Login` creates or repairs auth for one specific account slot.

It should run Codex with that account directory as `CODEX_HOME`:

```bash
CODEX_HOME=~/.codex-managed-agent/accounts/<account-name> codex login --device-auth
```

This updates only:

```text
~/.codex-managed-agent/accounts/<account-name>/auth.json
```

Use `Login` when:

- adding a new account
- an account is expired
- refresh token failed
- the account card says it needs login

### Activate

`Activate` switches the global default account.

It should not copy auth. It should update the symlink:

```text
~/.codex/auth.json
  -> ~/.codex-managed-agent/accounts/<account-name>/auth.json
```

After activation, any newly started terminal command:

```bash
codex
```

uses that account.

Running Codex processes are not force-switched. Activation only affects new
processes that read `~/.codex/auth.json` after the symlink changes.

### Refresh Token

`Refresh Token` attempts to extend one account's existing auth.

It should update that account's own `auth.json`; it should not activate the
account and should not change `~/.codex/auth.json`.

Refresh can fail if the refresh token has already been used/rotated elsewhere.
In that case, use `Login` for that account.

### Logout

Do not use logout for account switching.

Logout means clearing or invalidating auth for the selected `CODEX_HOME`.

Example:

```bash
CODEX_HOME=~/.codex-managed-agent/accounts/work codex logout
```

This affects:

```text
~/.codex-managed-agent/accounts/work/auth.json
```

After logout, switching back to that account will require login again.

UI rule:

- `Logout` should not be next to `Activate`
- `Logout` belongs in a danger area
- confirmation should say it is not needed for switching

## Official Codex Plugin Login

The official Codex plugin or a plain terminal `codex login` normally writes to
the current `CODEX_HOME`.

If `CODEX_HOME` is not set, it writes to:

```text
~/.codex/auth.json
```

Because CMA makes `~/.codex/auth.json` a symlink to the active managed account,
plain `codex login` updates the currently active account slot. It does not create
a new slot.

To add a separate account, use CMA's account-specific `Login`, or run:

```bash
CODEX_HOME=~/.codex-managed-agent/accounts/new-account codex login --device-auth
```

## Shared Threads and Metadata

The purpose of account switching is auth switching, not thread isolation.

It is reasonable to share:

- `history.jsonl`
- sessions
- rollout/session metadata
- SQLite provider metadata
- global config and memory, if desired

The main rule is that CMA should not directly append to `history.jsonl` or modify
SQLite as part of account switching. Account switching only changes auth.

SQLite/provider sync is a repair tool, not part of normal account switching.

## Background Token Maintenance

Inactive accounts can expire if they are never refreshed.

CMA can maintain managed accounts in the background:

- check all managed official accounts after CMA opens
- check again on a low-frequency interval, currently 60 minutes
- refresh accounts only when `shouldRefreshToken` says refresh is needed
- never activate accounts during background maintenance
- never change the global `~/.codex/auth.json` symlink during maintenance

This keeps inactive accounts ready to switch back to, as long as their refresh
tokens are still valid.

If maintenance reports:

```text
refresh token has already been used
```

that account cannot be repaired by refresh. Use account-specific `Login`.

## Reference Repository Observations

This section records how the repositories under `reference/switch/` implement
Codex account switching. The common pattern is that Codex still reads one active
credential location, usually `~/.codex/auth.json`; the tools differ in how they
store inactive accounts and how aggressively they update the live Codex process.

### Summary Matrix

| Repository | Storage model | Switch operation | Runtime refresh model | Main observation |
| --- | --- | --- | --- | --- |
| `CODEx-SWITCH` | Per-account `auth.json` under `~/.codex/codex-switch/<alias>/`, plus a local `config/accounts.json` index in the repo | Copies selected backup to `~/.codex/auth.json` | Restarts Codex Desktop/backend when possible; briefly sets Windows `auth.json` read-only to avoid old desktop cache overwriting it | Simple copy-based switcher with explicit handling for desktop cache races |
| `Codex_AccountSwitch` | Per-account backup files under app-managed backup folders, indexed by account/group | Writes selected backup content into `%USERPROFILE%\.codex\auth.json` | Restarts configured IDE in normal mode; in proxy mode asks for restart and/or retries through local proxy | Full desktop manager: manual switch is still `auth.json` replacement; proxy mode adds request-level account dispatch |
| `codex-auth` | Managed auth snapshots under `<CODEX_HOME>/accounts/<account-key>.auth.json`, plus registry metadata | Copies managed snapshot into `<CODEX_HOME>/auth.json`, preserving existing permissions and backing up changed auth | CLI/App users are told to restart client; optional background auto-switch chooses better account by quota | Mature copy-based CLI with registry, identity keying, usage-aware auto-switch, and safer file permissions |
| `codex-auto` | `~/.codex-auto/accounts/<name>/auth.json` and optional `config.toml`; per-run `instances/<id>/` overlays | For native activation, copies account auth into source `CODEX_HOME/auth.json`; for managed runs, swaps only overlay `auth.json` | During managed run, detects quota output, replaces overlay auth, then resumes bound session | Best reference for non-global, per-process switching without touching shared sessions |
| `codex-cli-account-switcher` | Whole `~/.codex` directory archived as `~/codex-data/<name>.zip`; shared paths separated into `~/.codex-switch/shared` | Deletes/replaces entire `~/.codex` by extracting selected archive | No live refresh beyond the next Codex process reading the replaced directory | Coarse but simple: switches all Codex home state, not just auth |
| `codex-multi-auth` | Canonical storage in `~/.codex-multi-auth/openai-codex-accounts.json`, optionally project-scoped; mirrors Codex CLI state | Updates canonical active index, writes `~/.codex/accounts.json` active flags when present, and writes `~/.codex/auth.json` tokens | Runtime account pool can rotate/fail over per request through wrapper/proxy paths | Most advanced runtime model; treats Codex CLI files as mirrors of its own account store |
| `codex-switch` | VS Code profile JSON files under `~/.codex/switch-profiles` | For OpenAI mode, writes selected profile auth object to `~/.codex/auth.json`; for relay mode, updates `config.toml` | Restarts OpenAI extension host or reloads VS Code window depending on setting | Minimal VS Code extension: profile save + auth/config overwrite |
| `codex-switch1` | VS Code SecretStorage by default, or shared files under `~/.codex-switch/` for remote/SSH | Builds `auth.json` from stored token payload or full original auth JSON, then atomically replaces the resolved Codex auth path | Tracks active profile in shared state; no broad runtime migration beyond file sync | Strong identity matching and storage-mode design; still switches by replacing active auth file |
| `codex-switcher` | Desktop app store in `~/.codex-switcher/accounts.json` | Serializes selected account into `~/.codex/auth.json`; supports ChatGPT tokens and API-key auth shapes | UI-driven desktop switching; token refresh support updates stored account tokens | Tauri app: direct auth-file writer with account metadata and refresh helpers |

### Implementation Patterns

1. **Direct active-auth replacement**

   Most repositories switch accounts by writing the selected account's credentials
   to the live Codex auth file:

   ```text
   ~/.codex/auth.json
   ```

   Examples:

   - `CODEx-SWITCH` copies `~/.codex/codex-switch/<alias>/auth.json` to
     `~/.codex/auth.json`.
   - `Codex_AccountSwitch` reads a managed backup auth file, normalizes it, then
     writes it to `%USERPROFILE%\.codex\auth.json`.
   - `codex-auth` resolves `<CODEX_HOME>/accounts/<account-key>.auth.json`, backs
     up changed active auth, then copies it to `<CODEX_HOME>/auth.json`.
   - `codex-switch`, `codex-switch1`, and `codex-switcher` all store profile
     token data elsewhere and reconstruct or copy the selected payload into the
     active auth file.

   This is compatible with existing Codex because it preserves Codex's current
   single-active-auth assumption. The tradeoff is that every switch mutates the
   live file, so running clients may keep stale in-memory auth until restarted.

2. **Whole-home swapping**

   `codex-cli-account-switcher` backs up and restores the entire `~/.codex`
   directory as zip archives. It extracts the target archive into `~/.codex` and
   overlays a shared subset (`rules`, `AGENTS.md`, `config.toml`, `skills`,
   `memories`, `automations`) after each switch.

   This approach captures more than auth, but it is heavy and riskier for shared
   history/session state. It can also erase or replace unrelated Codex home files
   if they were not classified as shared.

3. **Per-run overlay**

   `codex-auto` has the cleanest process-local strategy. For a managed run it
   creates:

   ```text
   ~/.codex-auto/instances/<id>/
   ```

   It symlinks most entries from the source `CODEX_HOME`, excludes `auth.json`,
   and copies only the chosen account's `auth.json` into the instance. It then
   launches Codex with:

   ```text
   CODEX_HOME=~/.codex-auto/instances/<id>
   ```

   When quota is detected, it replaces only the overlay's `auth.json` and resumes
   the session id captured for that managed run. This avoids changing the global
   `~/.codex/auth.json` during a running managed session and keeps shared session
   files linked back to the original home.

4. **Proxy / request-level rotation**

   `Codex_AccountSwitch` and `codex-multi-auth` go beyond file switching.

   `Codex_AccountSwitch` can write a proxy-style `auth.json` containing an API
   key and patch `config.toml` so Codex points at a local proxy provider. The
   proxy dispatches requests across managed accounts by fixed account,
   round-robin, random, or best usable quota. On usage-limit or abnormal account
   responses it can mark accounts unavailable, pick another candidate, switch the
   selected account, and retry the request.

   `codex-multi-auth` keeps its own canonical account pool and mirrors active
   selection into Codex CLI files. It updates `~/.codex/accounts.json` active
   markers when that file exists, writes token state into `~/.codex/auth.json`,
   enforces `cli_auth_credentials_store = "file"` in `config.toml`, and also has
   runtime account selection/failover code for request routing.

### Login and Import Behavior

The repositories differ most sharply on account creation:

- `CODEx-SWITCH`, `Codex_AccountSwitch`, `codex-auth`, `codex-switch`,
  `codex-switch1`, and `codex-switcher` can import the currently active
  `auth.json` into their own storage.
- `codex-auto add <name>` prefers logging in with the target account directory as
  `CODEX_HOME`, which creates an independent account slot. It can also import an
  existing auth file.
- `codex-cli-account-switcher add <name>` clears `~/.codex` and asks the user to
  run `codex login`, then save the new whole-home archive.

For CMA, importing an existing auth file is convenient but should be treated as a
migration path, not the primary way to create independent accounts. Independent
slot login is safer because refresh tokens can rotate.

### Identity Matching

The strongest identity logic appears in `codex-switch1` and `codex-auth`.

`codex-switch1` matches profiles first by user identity fields extracted from
JWT/auth payloads (`chatgptUserId`, `userId`, JWT `sub`). If workspace or
organization id is known on either side, it avoids collapsing profiles unless the
organization also matches. This matters because team/business accounts can share
some account-level fields across users.

`codex-auth` uses a stable `account_key` derived from auth identity and stores
snapshots as `<account-key>.auth.json`. Its switch path selects by registry key
rather than by email alone.

For CMA, account identity should not be keyed only by email. Prefer stable user
identity plus workspace/organization when available, and keep the display name as
metadata.

### Runtime Refresh Observations

Directly replacing `auth.json` is not enough for already-running clients:

- `CODEx-SWITCH` explicitly restarts Codex Desktop/backend and even temporarily
  makes Windows `auth.json` read-only because the desktop client can overwrite
  the new file from an old cache.
- `Codex_AccountSwitch` restarts the configured IDE in normal mode.
- `codex-switch` restarts the OpenAI VS Code extension host or reloads the VS
  Code window.
- `codex-auth` documents that CLI/App users should restart after switching.
- `codex-auto` avoids this class of problem in managed runs by launching a new
  Codex process with an overlay `CODEX_HOME`.

For CMA, activation should be defined as affecting new Codex processes. If the
UI promises immediate effect in VS Code or Desktop, it needs an explicit refresh
strategy for that host.

### Design Takeaways for CMA

- The broad ecosystem validates the core idea that Codex account switching is
  ultimately active auth selection.
- Copy-based switchers are simple and compatible, but they duplicate refresh
  tokens and can suffer stale-client races.
- Symlink-based activation keeps the live path stable while avoiding repeated
  auth-file copying, but clients that replace files atomically may break the
  symlink unless watched and repaired.
- `codex-auto`'s overlay model is the best reference for per-process isolation:
  shared sessions/config can remain linked while auth is account-specific.
- Proxy/request-level rotation is powerful but changes the auth model from
  "Codex uses ChatGPT auth directly" to "Codex talks to a local provider/proxy".
  That should be treated as a separate advanced mode, not basic account
  switching.
- Any account manager should separate "switch account" from "logout". None of
  the safer implementations require logout to switch back and forth.
- Account creation should prefer independent `CODEX_HOME=<slot> codex login`
  over copying an existing `auth.json`.

## Future TODO: Local Gateway Account Pool

A SQLite-backed account pool plus local OpenAI-compatible gateway is a possible
future architecture, but it is not the current CMA account-switching plan.

That future model would look more like:

- account tokens live in a CMA SQLite vault
- Codex CLI uses a local `base_url`
- Codex CLI auth uses a CMA platform key, not raw ChatGPT account tokens
- the local gateway selects an account from the vault for each request

This is a larger gateway product, not a simple account switcher. It should stay
deferred until the direct Codex auth model is stable.

Guardrails for that future work:

- bind the gateway locally by default
- do not expose account tokens or platform keys to other users
- do not implement automatic quota-exhaustion rotation as a default behavior
- keep account selection explicit and auditable
- keep direct `auth.json` profile switching as the conservative fallback

Current CMA behavior remains:

```text
independent account login -> managed auth.json -> global ~/.codex/auth.json symlink
```

## UI Status That Should Be Visible

The Accounts page should clearly show two separate concepts:

```text
CMA selected account
Global terminal default account
```

The global terminal default should display:

```text
Global Codex auth
<account-name>
~/.codex/auth.json
symlink
~/.codex-managed-agent/accounts/<account-name>/auth.json
```

If CMA selected account and global terminal default differ, show a warning.

Each account card should show:

- token health
- profile state
- whether it is the global terminal default
- usage quota if available
- refresh failure / login needed state
- duplicate identity warnings

## Common Pitfalls

### "I copied auth.json and now one account cannot refresh."

That is expected. The copied files share one refresh token. Login separately for
each managed account.

### "Do I need logout to switch accounts?"

No. Use `Activate`. Logout invalidates/removes auth and is not a switching
operation.

### "The official plugin login overwrote my account."

Plain login writes to the current global `~/.codex/auth.json`. With CMA, that is
the active account symlink. To create a new account, login with that account's
own `CODEX_HOME`.

### "An inactive account expired while I was using another one."

Use background token maintenance. If refresh already fails, re-login that account
slot.

### "Can multiple accounts be the same ChatGPT account?"

They can be logged in separately, but they may share subscription quota. Separate
login avoids refresh-token collisions; it does not create separate quota if the
underlying ChatGPT identity is the same.

## Product Rules

- `Add Account` should create a slot and immediately launch account-specific
  login.
- `Activate` should symlink global auth, not copy auth.
- If `~/.codex/auth.json` is already a managed symlink, `Activate` should only
  retarget that symlink.
- If `~/.codex/auth.json` is an unmanaged regular file, `Activate` may move it
  into the selected profile's backup folder before creating the symlink.
- `Login` should run with account-specific `CODEX_HOME`.
- `Refresh Token` should update only the account slot.
- background maintenance should refresh inactive account slots without activating
  them.
- `Logout` should be treated as destructive auth removal.
- backup/import flows should be migration or diagnostics only, not the normal
  way to create working accounts.
