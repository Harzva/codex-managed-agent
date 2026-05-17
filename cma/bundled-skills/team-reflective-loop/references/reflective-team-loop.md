# Reflective Team Loop

The team loop follows a small training-style cycle:

```text
team brief -> active task -> worker optimize -> supervisor check -> local patch/failure memory -> next action
```

## Slow State

`team.md` and `team-space.json` describe durable intent. Change them only when the team's mission or operating rules genuinely change.

## Fast State

`tasks/*.json` are task adapters. They can evolve quickly through:

- status changes
- local patches
- dependency updates
- result envelopes
- review notes

## Failure Memory

`failure_bank.json` records patterns the team should not repeat:

```json
{
  "failures": [
    {
      "id": "failure-example",
      "created_at": "2026-04-24T00:00:00.000Z",
      "pattern": "Completed without running checks",
      "avoid": "Require checks_run before completion",
      "source_task_id": "task-example"
    }
  ]
}
```

## Local Patches

Prefer narrow task patches over broad rewrites:

```json
{
  "local_patches": [
    {
      "type": "scope_patch",
      "message": "Only edit src/webview/styles.js"
    },
    {
      "type": "check_patch",
      "message": "Run render-detail-regression.test.js before review"
    }
  ]
}
```

## Next Handoff

A good supervisor handoff names:

- current workspace
- one next task or risk
- expected owner
- acceptance criteria
- checks to run
- what not to touch
