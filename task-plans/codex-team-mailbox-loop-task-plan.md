# Codex Team Mailbox Loop Task Plan

Status: active

## Priority

Priority 3

## Objective

Turn the current early mailbox prototype into a dependable `codex-loop`-driven team-coordination track without breaking existing single-thread, board, loop, or dashboard workflows.

## Scope

- mailbox-backed multi-thread coordination under `.codex-team/`
- `codex-loop` plan, prompt, and handoff assets for this track
- non-destructive UI surfacing for team state inside the existing dashboard
- bounded defaults for loop automation with a 1 minute interval
- repo-facing plan hygiene and git-safe slicing guidance

## Rules

- [x] add new team-mode capabilities as opt-in enhancements, not replacements for current flows
- [x] do not regress existing thread lifecycle, board interactions, auto-continue, or loop controls
- [x] keep mailbox state isolated from legacy board/tab metadata so rollback stays easy
- [ ] keep implementation sliced into small commits; avoid mixing protocol, UI, and refactor churn in one commit
- [x] require at least one review-oriented loop in every two-loop window to audit progress, detect drift, and adjust the active plan if work is heading in a bad direction
- [x] treat version safety as a standing gate: if a slice risks breaking the current stable behavior, stop expanding scope and steer the next loop toward rollback, isolation, or plan correction first

## Task 1 — Loop-Owned Planning Surface

- [x] create and maintain one mailbox-specific task-plan as the long-form source of truth
- [x] point `.claude/plans/ACTIVE_PLAN.md` at this plan with one bounded current slice
- [x] align `.codex-loop/prompt.md` so recurring passes stay anchored to this mailbox track
- [x] write one evolution note per bounded slice and keep the next handoff minimal
- [x] record whether each loop is an execution loop or an analysis loop so progress audits stay explicit

## Task 2 — Mailbox Protocol Stabilization

- [x] define the minimal on-disk mailbox schema for `tasks/`, `events/`, `inbox/`, `agents/`, and `team.md`
- [x] keep task states explicit: `queued`, `assigned`, `running`, `blocked`, `review`, `completed`, `failed`, `stale`
- [x] ensure every write path uses deterministic ids and append-only event behavior where possible
- [x] make restart recovery rely on mailbox files instead of inferred free text

## Minimal On-Disk Mailbox Schema

Mailbox root: `.codex-team/`

- `team-space.json`: workspace metadata with `team_id`, `workspace`, `created_at`, `protocol_version`, and `mode`.
- `team.md`: human-readable operating brief. It may hold shared goals, rules, and links, but it is not the structured task source of truth.
- `tasks/<task_id>.json`: one JSON object per task. Minimal fields are `task_id`, `title`, `owner`, `status`, `priority`, `dependencies`, `inputs`, `goal`, `acceptance_criteria`, `artifacts`, `lease_until`, `created_at`, `updated_at`, and optional `result`.
- `events/events.jsonl`: append-only event stream. Each line is one JSON object with `event_id`, `type`, `timestamp`, and event-specific fields such as `task_id`, `agent_id`, `workspace`, or `payload`.
- `inbox/<agent_id>.jsonl`: append-only per-agent messages. Each line is one JSON object with `message_id`, `target_agent_id`, `created_at`, `type`, and message-specific fields such as `task_id`, `agent_id`, or `payload`.
- `agents/<agent_id>.json`: latest known agent state with `agent_id`, `state`, `current_task_id`, `heartbeat_at`, `last_error`, and `updated_at`.
- `views/`: reserved for generated read models. It must not become the source of truth for task, event, inbox, or agent state.

IDs should remain filename-safe. Structured writes should prefer `tasks/`, `events/`, `inbox/`, and `agents/` over parsing free text from `team.md`.

## Task 3 — Supervisor and Worker Flow

- [x] keep supervisor actions explicit: initialize, assign, inspect, recover, and handoff
- [x] support worker actions as mailbox events only: claim, heartbeat, blocked, complete
- [x] attach a result envelope shape to completion events so future automation can inspect outcomes
- [x] define stale-lease recovery behavior before adding background reclamation automation

## Supervisor and Worker Action Model

Current mailbox action boundaries:

- Supervisor actions are explicit host/dashboard actions: initialize team space, assign a task to a live thread, inspect mailbox-derived team state, recover by re-reading mailbox files on refresh, and receive handoffs through events plus supervisor inbox messages.
- Worker actions are represented as mailbox state transitions plus append-only events: claim, heartbeat/progress, blocked, and complete.
- Worker blocked and complete actions also notify the supervisor through `inbox/supervisor.jsonl`.
- This model does not route work through board tabs and does not replace legacy thread lifecycle state.

## Stale-Lease Recovery Behavior

Stale-lease recovery must stay explicit until a later hardening slice adds automation:

- A task is stale only when it is still `running`, has a parseable `lease_until`, and that timestamp is in the past. Missing or malformed leases are not reclaimed automatically.
- `blocked`, `completed`, `failed`, and `review` tasks are not background-reclaimed, even if they have an old lease value.
- The first recovery action should be supervisor-visible: write `status: "stale"`, preserve the previous `owner`, clear no result data, and append a `task.stale` event.
- Reassignment or reclaim is a separate explicit action after stale marking; it should emit its own assignment or claim event instead of silently changing ownership.
- Stale recovery must not alter board tabs, legacy thread lifecycle state, loop daemon state, or dashboard routing semantics.

## Completion Result Envelope

Completion events use the same result envelope stored on the task record and sent as the `payload` of `task.completed` events:

- `summary`: non-empty human-readable completion summary.
- `outputs`: array of produced artifact references or paths.
- `checks_run`: array of validation commands or checks performed.
- `open_risks`: array of known residual risks, blockers, or caveats.
- `next_request`: optional follow-up request for the supervisor.

## Task 4 — Non-Destructive Dashboard Surface

- [x] surface mailbox summary in overview without reshaping existing overview cards
- [x] expose thread-level team controls only inside bounded surfaces such as the drawer
- [x] avoid overloading current board tab semantics with team routing semantics
- [x] make the team surface clearly secondary when mailbox mode is not initialized

## Task 5 — Loop Automation Defaults

- [x] set the default loop interval for this repo to 1 minute
- [x] keep custom interval input available for manual override
- [x] keep daemon start/restart commands backward compatible with existing state files
- [x] ensure the default quick-start affordance reads as `Loop 1m` instead of `Loop 10m`

## Task 6 — Validation and Hardening

- [x] syntax-check touched host and webview modules after each bounded slice
- [x] verify that opening the dashboard still works when no team space exists
- [x] verify that mailbox actions do not change legacy thread status unless explicitly intended
- [x] reject stale or non-existent thread ids before mailbox actions write `.codex-team` task or agent state, using `panel.lastPayload.dashboard.threads` as the source of truth
- [x] implement one shared live-thread resolver from `panel.lastPayload.dashboard.threads` and use it only in `assignTaskToThread`, `claimTaskForThread`, `heartbeatThread`, `blockTaskForThread`, and `completeTaskForThread`
- [x] add a foreground supervisor stale-marking action that marks only expired `running` leases as `stale` without background reclamation
- [x] verify that a stopped or missing loop daemon still renders cleanly
- [x] on every analysis loop, review the last two iterations for regressions, incomplete work, or plan drift before approving the next execution slice
- [ ] if an analysis loop finds risk to the current stable version, prioritize containment, revert-friendly isolation, or follow-up hardening before adding new behavior

## Task 7 — Git and Delivery Hygiene

- [ ] keep commits bounded and reviewable
- [x] add package ignore or allowlist coverage so loop state, plan logs, and generated VSIX artifacts do not destabilize extension packaging
- [ ] use commit shapes such as `feat(team-mailbox): ...` and `docs(loop): ...`
- [ ] avoid sweeping refactors until mailbox behavior is stable
- [ ] document any required follow-up migration before replacing existing behavior

## Exit Criteria

- mailbox coordination is plan-driven through `codex-loop`
- the default loop cadence for this track is 1 minute
- team-mode behavior is visibly available but remains opt-in
- existing extension features remain usable without mailbox initialization
