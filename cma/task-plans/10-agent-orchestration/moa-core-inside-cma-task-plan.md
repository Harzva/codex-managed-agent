# MoA Core Inside CMA Task Plan

## Status

- [ ] Complete

## Product Intent

Build the first narrow, trustworthy local Team Space for Codex before expanding into remote control, broad multi-agent routing, or full-platform clients.

Positioning:

```text
Codex Agent Operations Workspace
  -> a local control console, task space, and evidence system for Codex agent work
```

The goal is not to make the biggest possible agent platform in this phase. The goal is to make one local workflow feel real, inspectable, recoverable, and professional:

```text
One Team Space = one real task
Task -> Worker -> Thread -> Run -> Trace -> Result
```

This phase should make CMA credible. A user should be able to create a Team Space, launch a worker, watch honest runtime evidence, recover from failure, archive the work, and understand the story from README/docs without reading internals.

## Why This Phase Comes First

CMA's future direction is cross-platform MoA orchestration, but a broad platform without a trusted local core will feel shallow. The local Team Space is the wedge that proves the product's seriousness.

This phase borrows three ideas but keeps CMA's own identity:

- From `moa-loop`: treat work as persistent state, evidence, and eventually DAG computation, not just a prompt.
- From oh-my-codex as a competitor benchmark: match the discipline of doctor checks, HUD/status, skills, and durable workflow state without copying its tmux-first shape.
- From CMA's own strengths: use VS Code, Webview, Node backend, `.codex-team`, trace files, Codex sessions, and visual inspection as the product advantage.

The phase deliberately delays full DAG parallelism. Before multiple workers safely write code in parallel, one worker must be fully trustworthy: task definition, run evidence, trace, result, failure explanation, retry, and archive.

## Scope

### In Scope

- Make Team Space the primary local product story.
- Ensure each Team Space maps cleanly to one task and one primary worker/run history.
- Improve failure recovery and evidence visibility.
- Polish archive behavior so it preserves audit evidence.
- Make the UI readable for normal users while keeping low-level diagnostics available.
- Update README/docs so the Team Space narrative is clear.
- Prepare state shape and terminology for later MoA DAG runs without implementing full DAG scheduling yet.

### Out of Scope

- LAN/mobile QR connection.
- Remote relay.
- Full DAG scheduling.
- Multi-worker parallel writes.
- Worktree merge orchestration.
- Multi-agent provider abstraction beyond the current Codex worker path.

## Implementation Plan

### 1. Product Story and Navigation

- Rename and frame the Team surface as a Codex Agent Operations Workspace in README/docs and user-facing copy.
- Keep "Team Space" as the concrete unit of work.
- Make the Team page's first screen answer:
  - what is running
  - what failed
  - what is waiting for review
  - what can be recovered
  - what was archived
- Treat Snake/demo spaces as templates or examples, not the default story.

Acceptance:

- New users can understand the Team page without knowing `.codex-team` internals.
- README has a short Team Space quickstart.
- Team docs explain `Task / Worker / Thread / Run / Trace / Result`.

### 2. Team Space Data Contract

Standardize one Team Space around this chain:

```text
Task
  -> task definition, goal, prompt, acceptance criteria
Worker
  -> assigned Codex worker identity and role
Thread
  -> resolved Codex session/thread when available
Run
  -> pid, log path, runtime state, retry mode, timestamps
Trace
  -> structured timeline and evidence
Result
  -> summary, outputs, checks_run, open_risks, next_request
```

Implementation direction:

- Preserve existing `.codex-team` compatibility.
- Prefer additive fields over migrations that rewrite old records.
- Keep raw JSON and compiled prompts available under Advanced.
- Add explicit user-facing status mapping:
  - Draft
  - Queued
  - Running
  - Review
  - Failed
  - Blocked
  - Completed
  - Archived

Acceptance:

- A Team Space page can render even when some fields are missing.
- Failed or partial runs show honest missing evidence instead of pretending completion.
- Tests cover old task/workspace records.

### 3. Runtime Evidence and Trace Clarity

Make runtime evidence visible and trustworthy:

- Show run history with pid, process status, log path, model, start time, end/result state.
- Link trace preview to task/run/thread evidence.
- Surface changed files, command signals, check signals, and last error when available.
- Keep noisy JSON/log tails in Advanced.

Acceptance:

- A running worker shows progress based on real logs/process state.
- A completed worker shows result evidence and checks.
- A failed worker shows failure reason and recovery action.

### 4. Failure Recovery

Make failure states useful rather than scary:

- Failed Team Spaces should show what failed:
  - missing Codex CLI
  - model misconfiguration
  - no workspace
  - process exited early
  - runtime error
  - unresolved owner thread
- Offer recovery actions:
  - retry same thread when resolvable
  - retry new worker
  - edit task definition
  - archive
  - open logs/trace
- Keep retries attached to the same Team Space/run history.

Acceptance:

- Retry creates trace evidence and preserves prior failure context.
- Failure messages are actionable and not just raw exceptions.
- Archive remains available after failure.

### 5. Archive and Audit Evidence

Archive should mean "move out of active work while preserving evidence."

Implementation direction:

- Archive Team Space records, task definition, runtime metadata, result, trace, and recent events.
- Keep archive visible in a separate state group or recoverable list.
- Avoid destructive deletion for normal archive flows.

Acceptance:

- Archived work can still be inspected.
- Active Team home is not cluttered by old completed/failed experiments.
- Tests verify archive preserves evidence files.

### 6. Local Doctor and Readiness

Add or prepare a local readiness surface focused on the narrow Team Space:

- Codex CLI available.
- `codex exec` available.
- Workspace path exists.
- `.codex-team` readable/writable.
- Node backend healthy.
- Team task records valid.
- Trace directories writable.
- Bundled Team skill status visible but not required.

Acceptance:

- Readiness failures explain the user action needed.
- Team Space creation/run actions avoid silent failure.

### 7. MoA-Ready Terminology and State Hooks

Prepare for the next phase without implementing full DAG yet:

- Use terminology compatible with future MoA Core:
  - Team Space
  - Task
  - Run
  - Trace
  - Result
  - Blackboard
  - DAG Run
  - Node
  - Ownership
- Add placeholder docs explaining that DAG parallelism comes after single-space trust.
- Avoid UI labels that imply broad project management or cloud orchestration too early.

Acceptance:

- Roadmap and docs clearly show that MoA DAG is the next step.
- Current UI remains focused on one reliable local Team Space.

## Testing Plan

- Run Team coordination unit tests after changes.
- Run Webview render regression tests for Team home and Team Space page.
- Add tests for:
  - missing runtime fields
  - failed worker display state
  - retry state preservation
  - archive evidence preservation
  - old `.codex-team` compatibility
- Run `node --check` on changed JS files.

## Completion Checklist

- [x] Team Space is the primary local product story in README/docs.
- [x] Team UI groups work by meaningful state.
- [x] One Team Space clearly shows Task / Worker / Thread / Run / Trace / Result.
- [x] Failed spaces provide actionable recovery.
- [ ] Archive preserves evidence.
- [x] Runtime evidence is visible without exposing raw internals first.
- [ ] Local readiness/doctor signals are present or stubbed clearly.
- [x] MoA/DAG terminology is introduced as the next layer, not mixed into the current narrow workflow.
- [ ] Tests cover data compatibility and failure/recovery states.

## Follow-Up

After this task is complete, check the status box at the top of this file and the linked roadmap index entry. Then start the next task: DAG Run + Blackboard + File Ownership Guard.
