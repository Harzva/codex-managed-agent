---
name: team-reflective-loop
description: Reflective supervisor and worker workflow for Codex-Managed-Agent team spaces. Use when working with .codex-team, assigning or reviewing mailbox tasks, checking blocked/stale/review work, maintaining failure_bank.json, creating bounded worker prompts, or preparing the next supervisor handoff.
---

# Team Reflective Loop

Use this skill when a workspace has a `.codex-team/` mailbox and the work should proceed as a small reflective team loop rather than a one-shot task.

## State Model

Treat the team space as layered state:

- `.codex-team/team.md`: human-readable brief and slow shared intent.
- `.codex-team/team-space.json`: workspace identity and protocol metadata.
- `.codex-team/tasks/*.json`: structured task adapters.
- `.codex-team/agents/*.json`: supervisor and worker agent registry.
- `.codex-team/events/events.jsonl`: append-only event history.
- `.codex-team/inbox/*.jsonl`: per-agent messages.
- `.codex-team/failure_bank.json`: reusable team error memory.

Read [references/team-mailbox-protocol.md](./references/team-mailbox-protocol.md) before editing mailbox files.
Read [references/reflective-team-loop.md](./references/reflective-team-loop.md) before deciding the next team action.

## Supervisor Loop

For supervisor work:

1. Inspect `.codex-team/` and summarize available tasks, agents, blocked work, stale work, and recent events.
2. Read `failure_bank.json` if it exists and avoid repeating known bad patterns.
3. Pick one bounded next action: assign, request review, add a local patch, mark stale, reassign, or write a handoff.
4. Keep `team.md` human-readable. Do not use it as the structured source of truth.
5. Prefer append-only events and structured task updates over free-text state.

## Worker Loop

For worker work:

1. Read the assigned task JSON.
2. Apply any `local_patches` before editing.
3. Execute one verifiable slice.
4. Record heartbeat/progress through the CMA UI or by appending structured events only if explicitly asked.
5. Finish with a result envelope: `summary`, `outputs`, `checks_run`, `open_risks`, and `next_request`.

## Useful Scripts

Run these from the workspace root:

```bash
node ~/.codex/skills/team-reflective-loop/scripts/inspect_team_space.js
node ~/.codex/skills/team-reflective-loop/scripts/validate_team_space.js
node ~/.codex/skills/team-reflective-loop/scripts/summarize_team_failures.js
```

## Guardrails

- Do not silently overwrite task owners.
- Do not change board tabs as a side effect of team coordination.
- Do not mark blocked, completed, failed, or review tasks as stale.
- Do not claim success until checks or explicit review evidence exist.
- If a task needs more instruction, add `local_patches` instead of rewriting the whole brief.
