# MoA DAG Parallel Orchestrator Task Plan

## Status

- [x] Complete

## Product Intent

Turn CMA from a trustworthy single Team Space into a local MoA supervisor that can run several Codex workers in parallel without uncontrolled file conflicts.

Target shape:

```text
Supervisor Thread
  -> DAG Run
  -> Blackboard
  -> Worker Node A
  -> Worker Node B
  -> Worker Node C
  -> Merge / Review / Trace / Archive
```

This phase keeps CMA local-first and Codex-first. It does not start with LAN, relay, mobile, or all-model abstraction. The win is professional parallel code work inside one local operations workspace.

Longer-term note: role plugins are planned after the DAG basics are stable. This phase may preserve `role_id` or role metadata on nodes, but it should not build the full role plugin system yet.

Recommended model split:

```text
Supervisor Thread: gpt-5.4 or gpt-5.5
Worker Threads: gpt-5.3-codex
```

The supervisor owns planning, DAG edits, conflict checks, review, retry decisions, and roadmap transitions. Workers own bounded implementation nodes with explicit file ownership.

## Why This Phase Comes Now

The previous phase proves the narrow Team Space story:

```text
Task -> Worker -> Thread -> Run -> Trace -> Result
```

Parallelism should not be added as "open more agents." It needs a graph, ownership rules, and evidence. Otherwise multiple agents can overwrite each other, duplicate work, or leave the user unable to explain what happened.

CMA's differentiator should be:

- `moa-loop` is the internal method, not decoration.
- oh-my-codex is a competitor benchmark for discipline, but CMA becomes DAG-first and visual.
- CodexFlow/HAPI remain later connection layers, not the core orchestration layer.

## Scope

### In Scope

- Define a local DAG Run state model under `.codex-team`.
- Add blackboard records for cross-worker context and intermediate results.
- Add file ownership contracts per DAG node.
- Add a scheduler rule that only launches dependency-ready, non-conflicting nodes.
- Add worker result envelopes that preserve evidence.
- Prepare UI labels and summaries for supervisor/worker parallelism.
- Keep all operations local and inspectable.

### Out of Scope

- LAN QR pairing.
- Remote relay.
- Mobile control.
- Full provider abstraction.
- Full role plugin marketplace or custom-role editor.
- Cloud queueing.
- Automatic cross-worktree merge.

## Data Contract

### DAG Run

```json
{
  "run_id": "dag-...",
  "team_space_id": "task-...",
  "supervisor_thread_id": "019d...",
  "status": "draft|ready|running|review|failed|completed|archived",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp",
  "nodes": [],
  "blackboard": [],
  "trace": {
    "trace_path": ".codex-team/dag-runs/dag-.../trace.jsonl",
    "index_path": ".codex-team/dag-runs/dag-.../trace.index.json"
  }
}
```

### DAG Node

```json
{
  "node_id": "node-ui",
  "title": "Implement Team Space DAG board UI",
  "status": "pending|ready|running|blocked|completed|failed|skipped",
  "depends_on": ["node-contract"],
  "owner": "worker-ui",
  "worker_thread_id": "",
  "ownership": {
    "read_paths": ["src/webview-template.js", "docs/team-workspace.md"],
    "write_paths": ["src/webview"],
    "exclusive_paths": ["src/webview-template.js"],
    "expected_outputs": ["src/webview/render-detail-regression.test.js"]
  },
  "result": {
    "summary": "",
    "changed_files": [],
    "checks_run": [],
    "open_risks": [],
    "next_request": ""
  }
}
```

### Blackboard Entry

```json
{
  "entry_id": "bb-...",
  "source_node_id": "node-contract",
  "kind": "decision|finding|artifact|risk|handoff",
  "visibility": "dag|node|review",
  "summary": "",
  "payload": {},
  "created_at": "ISO timestamp"
}
```

## Implementation Plan

### 1. MoA Core Contract

- Add pure helpers for DAG Run normalization.
- Add dependency readiness evaluation.
- Add path ownership normalization.
- Add write/exclusive conflict detection.
- Add ready-node batch selection with `maxParallel`.

Acceptance:

- Unit tests prove dependency-ready nodes are selected.
- Unit tests prove overlapping write paths cannot run together.
- Unit tests prove non-conflicting nodes can be scheduled together.

### 2. Supervisor Prompt Compiler

- Compile one supervisor prompt from Team Space task, DAG nodes, blackboard, and current evidence.
- Make the supervisor output a strict plan/result envelope.
- Keep supervisor as the decision owner, not a code-writing worker by default.
- Include model policy so strong supervisor models can route cheaper worker nodes to `gpt-5.3-codex`.

Acceptance:

- Prompt includes task, DAG status, conflict rules, and result schema.
- Prompt avoids telling one worker to edit another worker's ownership area.
- Prompt explains selected, blocked, and waiting DAG nodes.

### 3. Worker Prompt Compiler

- Compile worker prompts from one DAG node.
- Include only relevant upstream blackboard entries and ownership boundaries.
- Require result envelope:
  - summary
  - changed_files
  - checks_run
  - open_risks
  - blackboard_updates
  - next_request

Acceptance:

- Worker prompt clearly names allowed write paths.
- Worker prompt states that other workers may be active.
- Worker result can be parsed into the DAG node result.

### 4. Local Scheduler

- Store DAG runs under `.codex-team/dag-runs/<run_id>/`.
- Launch only nodes that are dependency-ready and ownership-safe.
- Preserve running worker metadata:
  - thread id
  - pid/log path when available
  - model
  - started_at
  - trace path
- Do not overlap ticks for the same DAG run.

Acceptance:

- A dry-run scheduler can explain selected and blocked nodes.
- Running nodes prevent conflicting ready nodes from launching.
- Failed nodes preserve trace and can be retried.

### 5. UI and Evidence

- Add Team Space summary for:
  - supervisor state
  - DAG status
  - running workers
  - blocked ownership conflicts
  - blackboard highlights
  - review lane
- Keep advanced JSON/log details behind existing advanced surfaces.

Acceptance:

- User can see why a node is blocked.
- User can see which worker owns which file paths.
- User can inspect node trace and result evidence.

### 6. Long-Running Supervisor Loop

- Let the supervisor read the roadmap index and active task plan at each tick.
- Let the supervisor update task-plan checkboxes when evidence proves completion.
- When one task plan completes, let the supervisor move to the next roadmap index entry.
- Use worker threads for bounded implementation nodes, defaulting to `gpt-5.3-codex`.
- Use strong models only for supervisor milestone review, plan revision, conflict resolution, and final acceptance.
- Do not auto-enter LAN/relay/mobile phases until local DAG worker launch and evidence archive are stable.

Acceptance:

- Supervisor can explain which roadmap item is active and why.
- Supervisor can create or revise DAG nodes from the active plan.
- Supervisor does not launch conflicting workers.
- Supervisor preserves trace evidence for every plan transition.

## Completion Checklist

- [x] MoA core pure scheduling helpers exist.
- [x] Unit tests cover dependency readiness and ownership conflict detection.
- [x] DAG Run files are persisted under `.codex-team/dag-runs`.
- [x] Supervisor prompt compiler exists.
- [x] Worker prompt compiler exists.
- [x] Dry-run scheduler explains selected and blocked nodes.
- [x] Worker launch path can start at least two non-conflicting nodes.
- [x] Scheduler tick lock prevents overlapping ticks per DAG run.
- [x] Worker result envelopes update node result and blackboard.
- [x] Team UI renders DAG status, workers, conflicts, and blackboard highlights.
- [x] Trace/archive preserves DAG evidence.
- [x] README/docs include a concise local MoA DAG acceptance demo path with focused validation commands.
- [x] Acceptance cleanup rerun note is recorded with date, command, and totals for docs/roadmap consistency.
- [x] Roadmap index is checked when complete.

## Acceptance Cleanup Rerun Note

- Date: `2026-04-26`
- Command: `npm run validate:moa-dag`
- Result: pass (`108` tests total across `65 + 31 + 12`, zero failures, exit `0`)
- Rerun confirmation: validated again on `2026-04-26` during acceptance cleanup (same passing totals)
- Canonical local demo path: `Plan Team Run -> Save Draft as Team Space -> Inspect DAG workers/conflicts/blackboard -> Run Team action and reconcile workers -> Inspect trace/archive evidence`

## First Loop Target

Implement the local DAG persistence and dry-run scheduler only. Do not launch multiple Codex workers until persistence, conflict explanation, and tests are stable.
