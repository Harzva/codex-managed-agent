# Team Workspace Mental Model

Team Space is the local task cockpit in Codex-Managed-Agent. Use it when you want one auditable place to define a job, start a Codex worker, inspect what actually ran, and recover cleanly if the work fails.

## MoA DAG Acceptance Quick Path

For the current local-first acceptance slice, use this concise flow:

1. Plan Team Run (`Generate Orchestration Draft`).
2. Save Draft as Team Space.
3. Inspect DAG workers/conflicts/blackboard.
4. Run Team action and reconcile workers.
5. Inspect trace/archive evidence.

Focused local validation command:

```bash
npm run validate:moa-dag
```

Scope guard for this acceptance slice:

- local-first and Codex-first only
- no LAN, QR, mobile, relay, or provider abstraction work
- no Stage 2.5 Role Plugin implementation until DAG acceptance/demo/readme cleanup is complete
- for bounded local worker iterations in this slice, keep worker model policy on `gpt-5.3-codex`

Latest focused local validation snapshot:

- Date: `2026-04-26`
- Command: `npm run validate:moa-dag`
- Result: pass (`108` tests total across `65 + 31 + 12`, zero failures, command exit `0`)
- Rerun confirmation: validated again on `2026-04-26` during acceptance cleanup (same passing totals)

Full demo recipe: [`docs/demo/moa-dag-acceptance.md`](demo/moa-dag-acceptance.md).

Acceptance status source-of-truth references:

- [`SMOKE_CHECKLIST.md`](../SMOKE_CHECKLIST.md) (`## 7. MoA DAG Acceptance Gate`)
- [`task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md`](../task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md)
- [`task-plans/00-roadmap/remote-workflow-reference-roadmap.md`](../task-plans/00-roadmap/remote-workflow-reference-roadmap.md)

Acceptance evidence quick check:

- `.codex-team/dag-runs/<run_id>/`
- `.codex-team/dag-runs-archive/`
- `.codex-team/workspaces-archive/`

The model is intentionally small:

```text
Task -> Worker -> Thread -> Run -> Trace -> Result -> Archive
```

## Quickstart

1. Open `Codex-Managed-Agent: Open Dashboard`.
2. Go to the Team page.
3. Create a Team Space from `Feature`, `Bugfix`, `Review`, or `Demo`.
4. Edit the task title, prompt, and acceptance criteria.
5. Click `Run` to start a dedicated Codex worker.
6. Inspect the worker thread, run log, trace, and result evidence.
7. If the run fails, retry from the same Team Space or archive it after reviewing the log.

## Task

A Task is the user-facing work order. It contains:

- title: the short name shown on Team cards and detail pages
- prompt: the instruction sent to the worker
- acceptance criteria: concrete checks or outcomes used to decide whether the result is good enough

Keep the task narrow. A good Team Space is one deliverable with a clear finish line, not a project backlog.

## Worker

A Worker is the primary Codex agent assigned to the task. When a Team Space runs, CMA starts a dedicated background worker through the Codex CLI using the compiled task prompt and local workspace context.

The worker is separate from ordinary dashboard browsing: it has a task, a workspace, a run record, a log, and a result path that CMA can show back in the Team page.

## Thread

A Thread is the Codex conversation connected to the work. The primary thread is the main conversation used by the worker. Retry or review flows can add related threads, but the Team Space still keeps one primary chain visible first.

Thread evidence helps answer:

- which Codex conversation did the worker use?
- can I reopen or inspect that conversation?
- did a retry continue the same context or start a new worker?

## Run

A Run is one dispatch attempt. Running the same Team Space multiple times creates multiple runs.

A run can include:

- run id
- process id
- model
- state
- start and update times
- log path
- trace files
- linked thread id
- error summary when dispatch fails

Runs are the operational evidence. They show whether CMA actually launched something, where the log lives, and what state the local process reported.

## Result

A Result is the worker outcome CMA can summarize for the Team Space. Treat it as the product-facing handoff rather than the raw transcript.

A useful result should answer:

- what changed or was produced?
- which checks were run?
- what output files or commands matter?
- what risks remain?
- what should the next request be?

When the result is incomplete, the Team Space should still show the best available evidence rather than pretending the task succeeded.

## Advanced

Advanced surfaces are for diagnostics and audit details that should not crowd the default Team page.

Use Advanced when you need:

- compiled prompt text
- runtime JSON
- raw task state
- trace JSONL paths
- internal identifiers
- lower-level dispatch details

The default Team page should explain the work. Advanced should prove it.

## Archive

Archive removes a Team Space from the active Team view while keeping audit files on disk. It is the safe cleanup path for finished, abandoned, or failed spaces.

Archive does not mean "destroy all evidence." The workspace records, logs, traces, and run files should remain available for later review unless you deliberately delete them outside the product flow.

## Failure Recovery

Failure is a normal Team Space state. A failed run should leave enough evidence to decide the next action.

Start with this order:

1. Read the error summary on the Team card or detail page.
2. Open the latest run log and inspect the last relevant lines.
3. Check whether the failure happened before dispatch, during the worker run, or while resolving the result.
4. Retry on the same thread when the existing context is valuable.
5. Retry with a new worker when the current thread is stuck, stale, or confusing.
6. Copy the failure prompt when you need to continue manually in Codex.
7. Archive the Team Space when the failure is no longer actionable but the evidence should be retained.

Common recovery meanings:

- `Retry Same Thread`: continue from the existing Codex conversation when it still has useful context.
- `Retry New Worker`: start a fresh worker while keeping the Team Space and prior evidence.
- `Open Run Log`: inspect the local process log behind the latest run.
- `Copy Failure Prompt`: move the failure context into a manual Codex conversation.
- `Archive`: remove the space from active work without losing the audit trail.

## Trust Checklist

Before treating a Team Space as done, check:

- the task and acceptance criteria still match the requested work
- the run has a real state, log, and linked thread when available
- the result describes outputs, checks, risks, and next steps
- failures show recovery evidence instead of only a generic status
- archived work still has retained files for audit

## Next Layer (MoA Terms, Not Active Yet)

Current Team Space scope stays local and single-space first:

```text
Task -> Worker -> Thread -> Run -> Trace -> Result
```

After this trust baseline is solid, CMA can add MoA DAG terminology and runtime layers:

- `Blackboard`: shared intermediate context across planned nodes
- `DAG Run`: one graph execution record for coordinated work
- `Node`: one scoped unit in a DAG run
- `Ownership`: read/write path constraints to reduce concurrent edit conflicts

These are roadmap terms for the next phase, not required to run today’s Team Space workflow.
