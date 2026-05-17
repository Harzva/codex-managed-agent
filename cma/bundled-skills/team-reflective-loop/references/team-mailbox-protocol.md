# Team Mailbox Protocol

Mailbox root:

```text
.codex-team/
```

## Required Files

- `team-space.json`: `team_id`, `workspace`, `created_at`, `protocol_version`, `mode`.
- `team.md`: human-readable team brief.
- `tasks/<task_id>.json`: structured task records.
- `events/events.jsonl`: append-only event stream.
- `inbox/<agent_id>.jsonl`: per-agent messages.
- `agents/<agent_id>.json`: latest known agent state.

## Task Fields

Minimal task record:

```json
{
  "task_id": "task-example",
  "title": "Example task",
  "owner": "thread-id",
  "status": "assigned",
  "priority": "normal",
  "dependencies": [],
  "inputs": [],
  "goal": "What should be accomplished",
  "acceptance_criteria": [],
  "artifacts": [],
  "lease_until": "",
  "created_at": "2026-04-24T00:00:00.000Z",
  "updated_at": "2026-04-24T00:00:00.000Z"
}
```

Valid task states:

```text
queued, assigned, running, blocked, review, completed, failed, stale
```

## Result Envelope

Completed or review-ready work should include:

```json
{
  "summary": "What changed",
  "outputs": [],
  "checks_run": [],
  "open_risks": [],
  "next_request": ""
}
```

## Stale Rules

A task is stale only when:

- status is `running`
- `lease_until` is parseable
- `lease_until` is in the past

Do not stale-mark `blocked`, `completed`, `failed`, or `review`.
