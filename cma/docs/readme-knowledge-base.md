# CMA README Knowledge Base

This file is the informal README knowledge base for Codex-Managed-Agent. It is not the polished marketplace README. It is where product positioning, wording, architecture ideas, and future README paragraphs can accumulate before they are promoted into formal docs.

## Core Positioning

Codex-Managed-Agent is not a black-box multi-agent launcher.

CMA is a transparent, controllable, and learnable Agent Operations Workspace for planning, supervising, and reviewing Codex work.

The product direction:

```text
User goal
  -> structured orchestration draft
  -> supervisor / worker / custom role plugins
  -> model assignment
  -> DAG nodes and ownership paths
  -> visible schedule and progress
  -> trace / run / result evidence
  -> recovery, archive, and learning
```

The important advantage is not merely that CMA can start multiple agents. The important advantage is that users can understand and control what those agents are doing.

## Differentiation

Many agent tools optimize for a magical one-shot experience:

```text
big prompt -> hidden agent work -> final output
```

That can feel impressive when it works, but it creates problems when the task is serious:

- the user cannot see how the task was split
- the user cannot tell which agent changed which files
- failures are hard to diagnose
- retries often lose useful context
- beginners do not learn how expert agent workflows are structured
- advanced users lose precise control

CMA should take a different path:

```text
big goal -> visible plan -> editable orchestration -> bounded agents -> traceable results
```

This makes CMA closer to an operations cockpit than a hidden automation box.

## User Value

### Precise Control

Users can decide:

- what the supervisor is responsible for
- how many worker agents should exist
- which model each role should use
- which files or directories each worker may write
- what each worker is expected to produce
- when a draft becomes a real Team Space
- when workers actually launch

This keeps the user in charge. CMA helps with planning and execution, but does not take control away from the operator.

### Transparent Progress

Every meaningful unit should be visible:

```text
Team Space
Task
Supervisor
DAG Run
DAG Node
Worker
Thread
Run
Trace
Result
Archive
```

The user should be able to answer:

- what is running?
- who owns this task?
- what files can this worker touch?
- why is this node blocked?
- what evidence proves this run happened?
- what failed and what can I do next?

### Learning Through Use

CMA should teach users how strong agent workflows are organized.

A beginner can learn:

- how a large task is decomposed
- why different agents need different roles
- why write ownership prevents conflicts
- how tests and traces support trust
- how to recover from failed agent work

An advanced user can use the same surfaces for precise professional control.

This is a major product advantage: CMA is not only an execution tool, but also a workflow learning environment.

## MoA DAG Acceptance Slice

Current acceptance and productization cleanup should stay local-first and Codex-first:

- no LAN, QR, mobile, relay, or provider abstraction work in this slice
- Stage 2.5 Role Plugin work remains local/additive only (built-in templates, pure contracts, focused tests)
- use `gpt-5.3-codex` for bounded local worker iterations

Focused Stage 2.5 local validation command:

- `npm run validate:role-plugins`

Latest focused Stage 2.5 validation snapshot:

- Date: `2026-04-27`
- Command: `npm run validate:role-plugins`
- Result: pass (`86` tests total across `67 + 11 + 8`, zero failures, command exit `0`)
- Rerun confirmation: validated again on `2026-04-27` (same passing totals)

## Gemini CLI Auxiliary Provider Note

Gemini should enter CMA as an auxiliary local CLI provider before it becomes a direct write-enabled worker. The first safe role is reviewer/reflector/patch-proposal: it can reduce Codex token usage and add a second-model perspective while the supervisor, DAG ownership rules, trace, blackboard, and archive evidence remain CMA-controlled.

Current local contract:

- `provider: "codex-cli"` remains the default worker path.
- `provider: "gemini-cli"` is accepted on DAG nodes and orchestration workers.
- Gemini nodes preserve Gemini model names such as `gemini-3.1-pro-preview`; they are not coerced to `gpt-5.3-codex`.
- Default Gemini CLI model priority is `gemini-3.1-pro-preview` -> `gemini-3.1-flash-lite-preview` -> `gemini-3-pro-preview` -> `gemini-3-flash-preview` -> `gemini-2.5-pro` -> `gemini-2.5-flash`.
- Gemini worker prompts explicitly identify the node as an auxiliary Gemini CLI worker and ask for review/reflection/patch proposals instead of direct workspace edits.
- Team launch payloads carry `provider`, `model`, log path, and runtime metadata into the existing trace-backed DAG evidence path.

Why this matters: CMA's advantage is not just launching more agents. It is transparent, provider-aware orchestration where users can decide which role uses Codex for implementation and which role uses Gemini for independent review or lower-cost analysis.

Concise local demo recipe:

1. Plan Team Run (`Generate Orchestration Draft`).
2. Save Draft as Team Space.
3. Inspect DAG workers/conflicts/blackboard.
4. Run Team action and reconcile workers.
5. Inspect trace/archive evidence.

Focused local validation commands:

```bash
npm run validate:moa-dag
```

Source-of-truth references for acceptance status and demo path:

- `SMOKE_CHECKLIST.md` (`## 7. MoA DAG Acceptance Gate`)
- `docs/demo/moa-dag-acceptance.md`
- `docs/team-workspace.md`
- `task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md`
- `task-plans/00-roadmap/remote-workflow-reference-roadmap.md`

Latest focused local validation snapshot (sync target across README/demo/roadmap/task-plan/checklist):

- Date: `2026-04-27`
- Command: `npm run validate:moa-dag`
- Result: pass (`198` tests total across `134 + 44 + 20`, zero failures, command exit `0`)

Acceptance evidence quick check:

- `.codex-team/dag-runs/<run_id>/`
- `.codex-team/dag-runs-archive/`
- `.codex-team/workspaces-archive/`

## Role Plugins

CMA should eventually treat roles as plugins.

Supervisor and Worker are defaults, not limits. Users should be able to compose a team from built-in roles and their own custom role templates.

Built-in role examples:

- Supervisor
- Planner
- Implementer
- Tester
- Reviewer
- Reflector
- Debugger
- Researcher
- Documenter
- Integrator

Custom role examples:

- Security Auditor
- Paper Writer
- Experiment Runner
- API Designer
- Domain Expert
- Release Manager

A role plugin should describe:

- role id and display name
- purpose
- default model
- whether it can edit code
- whether it writes to the blackboard
- default read paths
- default write paths
- expected outputs
- result envelope
- prompt contract

Example shape:

```json
{
  "role_id": "reflector",
  "display_name": "Reflector",
  "description": "Reflects on worker results and proposes plan adjustments.",
  "default_model": "gpt-5.4",
  "can_edit_code": false,
  "writes_blackboard": true,
  "default_read_paths": ["."],
  "default_write_paths": ["task-plans", ".codex-team/blackboard"],
  "expected_outputs": ["reflection_summary", "risks", "plan_adjustments"],
  "result_envelope": {
    "summary": "",
    "findings": [],
    "risks": [],
    "plan_adjustments": [],
    "blackboard_updates": [],
    "next_request": ""
  },
  "prompt_contract": [
    "Do not edit production code.",
    "Read worker results and trace evidence.",
    "Identify drift, missing evidence, and improvement opportunities.",
    "Write concise recommendations for the supervisor."
  ]
}
```

Product idea:

```text
CMA does not only run agents.
CMA lets users compose reusable agent roles into inspectable teams.
```

This should come after the current orchestration draft and DAG scheduler foundations. The current Team UI can keep simple role fields now while reserving a future `role_id` for plugin-backed roles.

## Team UI Implication

The Team UI should not be only a prompt box.

It should support a plan-mode style orchestration experience:

1. User enters a natural-language goal.
2. CMA generates an orchestration draft.
3. The draft shows:
   - supervisor role
   - supervisor model
   - worker model defaults
   - number of agents
   - each agent's role
   - write paths and expected outputs
   - DAG schedule explanation
4. User edits the draft in structured fields.
5. User saves the draft as a Team Space.
6. Later, the supervisor can launch safe worker nodes.

Default behavior should be careful:

```text
generate draft -> review/edit -> save Team Space -> launch later
```

The first version should not auto-launch workers immediately after generation.

## Suggested Public Wording

Short English:

```text
CMA is not a black-box agent launcher. It is a transparent operations workspace for planning, supervising, and learning from multi-agent Codex work.
```

Short Chinese:

```text
CMA 不是黑盒式多 Agent 启动器，而是一个透明、可编排、可追踪、可学习的 Agent Operations Workspace。
```

Product tagline candidates:

- Transparent orchestration for Codex agents.
- Plan, supervise, trace, and recover Codex work.
- A local operations workspace for controlled multi-agent coding.
- Fine-grained control for serious agent workflows.

## Strategic Principle

Do not hide the orchestration.

Even when CMA later supports LAN, mobile, remote relay, or full-platform clients, the core advantage should remain:

```text
fine-grained control
transparent scheduling
visible evidence
recoverable failures
learnable workflows
```

Remote access should expose this operating model, not replace it with another black box.
