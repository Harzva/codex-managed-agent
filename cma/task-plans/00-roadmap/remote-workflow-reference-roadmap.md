# CMA MoA Orchestrator Roadmap

## Pinned Long-Term Product Direction

Before CMA grows into LAN control, remote relay, or a broader multi-agent platform, the product should first become a narrow, trustworthy local Team Space for Codex. That local wedge is not the final product. It is the first serious product surface for a larger ambition:

```text
CMA = a cross-platform MoA agent orchestrator
```

The core method is ours:

```text
Reflective Loop Skills
  -> moa-loop
  -> roadmap-as-weights
  -> DAG scheduling
  -> shared blackboard
  -> check/failure feedback as loss signal
  -> task adapters as PEFT-style local adaptation
```

The VS Code extension is the first product carrier, not the boundary of the product. The long-term architecture should be separable into a core runtime, local hub, VS Code extension, CLI, Web/PWA, mobile dashboard, and optional relay.

The long-term ambition is large, but the winning wedge should stay small and hard:

```text
Codex Agent Operations Workspace
  -> Local Team Space / MoA Runtime
  -> Task / Worker / Thread / Run / Trace / Result
  -> DAG / Blackboard / File Ownership / Conflict Guard
  -> Role Plugins / reusable agent organization templates
  -> Failure recovery and audit evidence
  -> Workflow governance and doctor checks
  -> LAN/mobile control
  -> optional remote relay and full-platform clients later
```

The first reputation goal is not feature volume. It is quality:

> A user should open the Team page, understand it in five minutes, create a real Team Space, see honest runtime evidence, recover from failure, and feel the project is careful enough to star.

Informal positioning, README wording, and product-language reserves live in [docs/readme-knowledge-base.md](../docs/readme-knowledge-base.md). Promote only polished, stable language from that file into the public README.

## Task Plan Index

- [ ] [MoA Core Inside CMA: narrow local Team Space foundation](../10-agent-orchestration/moa-core-inside-cma-task-plan.md)
- [x] [MoA DAG Parallel Orchestrator: supervisor, blackboard, and ownership-safe workers](../10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md)

When a task plan is complete, check its own status box and this roadmap index entry. Keep execution detail in task-plan files so this roadmap stays strategic.

For the MoA DAG acceptance slice, keep the demo/validation path local and inspectable:

- demo recipe: [docs/demo/moa-dag-acceptance.md](../docs/demo/moa-dag-acceptance.md)
- focused validation: `npm run validate:moa-dag` (equivalent direct tests remain documented in the demo doc)

Canonical 5-step local operator flow (single acceptance pass):

1. Plan Team Run (`Generate Orchestration Draft`).
2. Save Draft as Team Space.
3. Inspect DAG workers/conflicts/blackboard.
4. Run Team action and reconcile workers.
5. Inspect trace/archive evidence.

MoA DAG acceptance cleanup status:

- [x] README and demo recipe align on the same 5-step local flow.
- [x] Team workflow doc (`docs/team-workspace.md`) includes the same 5-step acceptance quick path and validation command.
- [x] Focused validation command is documented from roadmap and demo doc.
- [x] Demo recipe includes a checklist-style single local acceptance pass (`docs/demo/moa-dag-acceptance.md`).
- [x] Demo recipe includes a copy/paste validation command plus one concise 5-step click path for a single acceptance pass.
- [x] Latest focused validation rerun is stamped consistently (`2026-04-27`, `npm run validate:moa-dag`, pass `198` tests total).
- [x] MoA DAG task plan includes the same stamped rerun note and canonical 5-step local demo path.
- [x] Scope guard remains local-first/Codex-first (no LAN/QR/mobile/relay/provider abstraction in this slice).
- [x] Stage 2.5 Role Plugin implementation remains deferred until acceptance/demo/readme cleanup is complete.

### Stage 0: Narrow and Trustworthy Local Team Space

This stage comes before LAN, relay, and broad multi-agent platform work. Its detailed plan is tracked in [moa-core-inside-cma-task-plan.md](../10-agent-orchestration/moa-core-inside-cma-task-plan.md).

Strategic outcome: one Team Space should represent one real Codex task with a clear `Task -> Worker -> Thread -> Run -> Trace -> Result` chain, trustworthy failure recovery, archiveable evidence, and README/docs that tell the Codex Agent Operations Workspace story.

### Stage 1: Deep Local MoA Workflow Governance

After Team Space feels trustworthy, deepen the local operating layer.

Goal: make Codex work observable, guided, recoverable, workflow-aware, and ready for DAG parallelism inside the local product.

Core additions:

- CMA workflow state model: planning, execution, review, blocked, failed, completed, archived.
- MoA state model: epoch, DAG run, DAG node, blackboard snapshot, node result, adapter note, failure memory.
- Doctor checks for Codex CLI, backend, workspace, Team Core, bundled skills, trace, and model config.
- HUD/status summary: what is running, what is blocked, what needs the user, and what is safe to do next.
- Unified event vocabulary for Team UI, trace, logs, loop automation, and future remote clients.
- Better handoff/result envelopes and examples.

This is where the `moa-loop` method becomes product runtime. oh-my-codex remains an important competitor benchmark for workflow discipline, doctor checks, HUD, and skill packaging, but CMA should not copy its tmux-first shape.

### Stage 2: DAG Parallel Team Orchestrator

After the local Team Space and MoA state model are stable, CMA should add true parallel multi-agent execution.

Goal: run multiple coding agents concurrently without turning the workspace into an uncontrolled merge conflict.

Detailed execution is tracked in [moa-dag-parallel-orchestrator-task-plan.md](../10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md).

Core additions:

- DAG run records under `.codex-team`, with nodes, dependencies, status, owner, result, and trace.
- Shared blackboard records for cross-agent context and intermediate results.
- File ownership fields per node:
  - `read_paths`
  - `write_paths`
  - `exclusive_paths`
  - `expected_outputs`
- Scheduler rule: a node may run only when dependencies are complete and its write/exclusive paths do not conflict with already running nodes.
- Worker prompts compiled from node scope, upstream blackboard entries, ownership constraints, and result envelope requirements.
- Visual DAG board in the Team page: layers, running nodes, blocked nodes, worker threads, changed files, checks, and final reviewer lane.
- Optional worktree execution mode for high-risk parallel code edits after same-workspace locks prove useful.

This is the central differentiator. oh-my-codex can launch multiple workers, but CMA should become DAG-first: dependency-aware, file-aware, trace-aware, and visual.

### Stage 2.5: Role Plugin System

After DAG planning, ownership, and Team UI orchestration drafts are stable, CMA should make roles reusable and extensible.

Goal: let users compose an agent organization from built-in and custom role plugins, without hardcoding CMA to only `Supervisor` and `Worker`.

This stage must not block the current DAG scheduler work. The current implementation can keep simple supervisor/worker fields while reserving a future `role_id` and role metadata on DAG nodes.

Core additions:

- Built-in role plugins:
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
- User-defined role plugins stored locally, initially under `.codex-team/roles/`.
- Role plugin fields:
  - `role_id`
  - `display_name`
  - `description`
  - `default_model`
  - `can_edit_code`
  - `writes_blackboard`
  - `default_read_paths`
  - `default_write_paths`
  - `expected_outputs`
  - `result_envelope`
  - `prompt_contract`
- Team UI role picker on each Agent card.
- One-click organization templates such as Fast Build Team, Careful Build Team, Research Team, and Bugfix Team.
- Custom role editor for advanced users.

Strategic reason: CMA should let users build an agent organization, not merely launch agents. Predefined roles make orchestration approachable; custom roles make it powerful.

Stage 2.5 kickoff status (`2026-04-26`, local-first/additive only):

- [x] Built-in local role templates and pure helper contract landed in `src/host/moa-core.js` with focused tests in `src/host/moa-core.test.js`.
- [x] Keep role template data contract local and stable (`display_name`, `description`, `default_model`, `can_edit_code`, `writes_blackboard`, path/output defaults, prompt contract).
- [x] Apply role template metadata to orchestration worker drafts without custom-role editor or marketplace.
- [x] Add Team UI role-picker foundation updates to consume the local built-in catalog only.
- [x] Assert Team coordination payload keeps stable built-in role template contract keys for UI consumers (`src/host/team-coordination.test.js`).
- [x] Add local built-in organization templates (`Fast Build Team`, `Careful Build Team`, `Research Team`, `Bugfix Team`) with pure helper/catalog contracts and focused `moa-core` tests.
- [x] Add Team UI organization-template picker foundation (local built-ins only) and round-trip template selection into orchestration draft generation/saving with focused Team/UI tests.
- [x] Add a focused local validation command for Stage 2.5 foundations: `npm run validate:role-plugins` (`2026-04-26`).
- [x] Add local custom role-plugin file loading from `.codex-team/roles/*.json` into the Team role catalog (no editor/marketplace), with focused `moa-core` and Team coordination tests (`2026-04-26`).
- [x] Extend role-template binding/application helpers so orchestration worker drafts can resolve/apply local custom role templates through pure options or workspace-local template catalogs, with focused `moa-core` tests (`2026-04-26`).
- [x] Extend Team orchestration draft role-picker foundation so selected local role templates also flow stable metadata fields (`read_paths`, `prompt_contract`, `result_envelope`, `can_edit_code`, `writes_blackboard`) through DOM draft parsing, with focused webview regression coverage (`2026-04-26`).
- [x] Expand focused Stage 2.5 validation command coverage so `npm run validate:role-plugins` also includes Team UI role-picker webview regression tests (`2026-04-26`, pass `43` tests across `32 + 8 + 3`).
- [x] Add a focused immutability contract test so built-in role template helpers return cloned data and caller-side mutations cannot alter shared catalog state (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `44` tests across `33 + 8 + 3`).
- [x] Add a focused pure-helper collision precedence test so built-in roles remain canonical when `customTemplates` collide on id/name/alias (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `45` tests across `34 + 8 + 3`).
- [x] Add a focused workspace-local alias-collision contract test so built-in alias resolution remains canonical during worker draft template application (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `46` tests across `35 + 8 + 3`).
- [x] Add a focused merge-contract test so worker drafts keep explicit overrides while inheriting missing fields from resolved custom role template defaults (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `47` tests across `36 + 8 + 3`).
- [x] Add a focused Team UI draft-reader merge-contract regression so explicit worker DOM fields (`role`, `model`, `write_paths`, `expected_outputs`) remain authoritative while missing metadata (`read_paths`, `prompt_contract`, `result_envelope`) inherits from the selected role template (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `48` tests across `36 + 8 + 4`).
- [x] Add a focused built-in role-set contract test that locks the exact Stage 2.5 built-in role IDs and rejects duplicate drift (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `49` tests across `37 + 8 + 4`).
- [x] Add a focused organization-template immutability contract test so built-in organization template helpers return cloned data and caller-side mutations cannot alter shared catalog state (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `50` tests across `38 + 8 + 4`).
- [x] Add a focused boolean-precedence contract fix so role template normalization/application preserves explicit snake_case `false` values when camelCase mirrors are present (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `51` tests across `39 + 8 + 4`).
- [x] Add a focused Team coordination round-trip regression that preserves snake_case boolean precedence for worker role metadata (`can_edit_code`, `writes_blackboard`) through orchestration save/load and DAG persistence (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `52` tests across `39 + 9 + 4`).
- [x] Add pure role-template helper aliases (`applyRoleTemplateToWorkerDraft`, `applyRoleTemplateToSupervisorDraft`) so Stage 2.5 callers can bind to role-template contract naming while preserving current behavior, with focused parity regression coverage (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `53` tests across `40 + 9 + 4`).
- [x] Adopt neutral role-template helper aliases in core orchestration draft-generation paths (worker normalization, organization-template worker expansion, supervisor draft normalization) while keeping behavior stable and local-first (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `53` tests across `40 + 9 + 4`).
- [x] Add focused supervisor-path custom-template binding coverage so `applyRoleTemplateToSupervisorDraft` resolves and applies local custom role-template defaults through pure helper options, mirroring existing worker-path contract coverage (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `54` tests across `41 + 9 + 4`).
- [x] Re-baseline Stage 2.5 validation snapshot parity across active checklist/docs references to the latest focused local evidence (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `54` tests across `41 + 9 + 4`).
- [x] Add a focused codex-first default-model contract test that locks built-in role template model policy (`supervisor` stays `gpt-5.4`; worker-facing built-ins stay `gpt-5.3-codex`) to prevent Stage 2.5 drift (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `55` tests across `42 + 9 + 4`).
- [x] Add a focused codex-first organization-template model-policy contract test that locks built-in template defaults (`supervisor_model` = `gpt-5.4`, `worker_model` = `gpt-5.3-codex`) across all local built-ins to prevent Stage 2.5 drift (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `56` tests across `43 + 9 + 4`).
- [x] Add a focused role-template application immutability contract test so `applyRoleTemplateToWorkerDraft` and `applyRoleTemplateToSupervisorDraft` do not mutate caller draft inputs while applying defaults (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `57` tests across `44 + 9 + 4`).
- [x] Add a focused idempotence contract test so applying built-in role templates to an already-normalized worker draft is stable (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `58` tests across `45 + 9 + 4`).
- [x] Add a focused built-in role-catalog metadata stability contract test so every built-in template preserves `role_template_source = builtin`, schema version parity, and `summary`/`role_prompt` parity (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `59` tests across `46 + 9 + 4`).
- [x] Extend Team orchestration draft-reader role-template binding so selected role templates also carry stable `role_template_source` and `role_template_version` metadata in worker drafts, with focused webview regression assertions (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `59` tests across `46 + 9 + 4`).
- [x] Add a focused organization-template role-link integrity contract test so every built-in organization-template worker lane references a valid built-in role template id (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `60` tests across `47 + 9 + 4`).
- [x] Add a focused Team UI organization-template round-trip regression so multi-worker lanes preserve selected `role_id` bindings through orchestration DOM draft parsing (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `61` tests across `47 + 9 + 5`).
- [x] Add a focused orchestration-worker role-template helper alias (`applyRoleTemplateToOrchestrationWorkerDraft`) so orchestration draft normalization can use a pure role-template contract with stable default worker-model fallback, with focused `moa-core` coverage (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `62` tests across `48 + 9 + 5`).
- [x] Add a focused Team UI role-template boolean-precedence regression so orchestration draft role-template application preserves explicit snake_case booleans over camelCase mirrors (`can_edit_code`, `writes_blackboard`) (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `63` tests across `48 + 9 + 6`).
- [x] Add a focused expected-outputs alias compatibility contract so role template catalogs expose stable `expected_outputs` alongside `default_expected_outputs`, and Team orchestration draft parsing applies template defaults when only the alias is present (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `64` tests across `48 + 9 + 7`).
- [x] Add a focused Team coordination round-trip regression for workspace-local custom role templates that define only `expected_outputs` alias defaults, ensuring orchestration worker persistence and DAG node ownership outputs inherit those defaults (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `65` tests across `48 + 10 + 7`).
- [x] Add a focused built-in role-token uniqueness contract so each built-in `role_id`/name/display/alias token resolves to exactly one owning built-in role template, preventing alias-resolution drift (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `66` tests across `49 + 10 + 7`).
- [x] Add a focused pure collision-guard helper contract (`assertUniqueRoleTemplateTokens`) so ambiguous role-token ownership fails fast for built-in template catalogs, with a negative regression test for duplicate alias collisions (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `67` tests across `50 + 10 + 7`).
- [x] Add a focused role-plugin normalization contract so `role_id`-only custom templates get readable `role_name`/`display_name` defaults for role-picker and draft metadata stability (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `68` tests across `51 + 10 + 7`).
- [x] Add a focused workspace-local role-plugin loading contract so `.codex-team/roles/*.json` entries with only `role_id` still normalize to readable role labels (`role_name`, `display_name`) in the local custom role catalog (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `69` tests across `52 + 10 + 7`).
- [x] Add a focused mixed-catalog ordering contract test so Stage 2.5 role catalogs keep built-ins first and append local custom templates deterministically for Team role-picker stability (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `70` tests across `53 + 10 + 7`).
- [x] Add a focused Team coordination payload ordering regression so role-picker template lists keep canonical built-ins first and append workspace-local custom roles deterministically in mixed catalogs (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `71` tests across `53 + 11 + 7`).
- [x] Add a focused orchestration-role coverage contract test so `applyRoleTemplateToOrchestrationWorkerDraft` resolves all ten built-in Stage 2.5 role IDs with stable template metadata (`role_template_source`, `role_template_version`, role/prompt/result/path defaults) (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `72` tests across `54 + 11 + 7`).
- [x] Add a focused orchestration-role precedence contract test so explicit worker ownership/output fields (`read_paths`, `write_paths`, `expected_outputs`) remain authoritative while missing metadata still inherits from built-in role template defaults during orchestration draft role application (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `73` tests across `55 + 11 + 7`).
- [x] Add a focused orchestration-provider precedence contract test so explicit worker `provider` values remain authoritative when applying built-in role template defaults to orchestration worker drafts (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `74` tests across `56 + 11 + 7`).
- [x] Add a focused Team UI draft-reader provider round-trip regression so explicit worker `provider` values remain preserved through orchestration DOM parsing while still inheriting missing role-template defaults (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `75` tests across `56 + 11 + 8`).
- [x] Re-baseline Stage 2.5 validation snapshot parity across active checklist/readme references (`SMOKE_CHECKLIST.md`, `docs/readme-knowledge-base.md`) to the latest focused local evidence (`2026-04-26`, `npm run validate:role-plugins`, pass `75` tests across `56 + 11 + 8`).
- [x] Add a focused built-in role-id catalog contract helper (`listBuiltInRoleTemplateIds`) and expose canonical `built_in_role_ids` in local role plugin catalogs/Team coordination payloads for role-picker stability (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `76` tests across `57 + 11 + 8`).
- [x] Add a focused codex-first built-in role provider contract so local built-in role templates/catalogs expose stable `default_provider = codex-cli`, with Team coordination contract-key coverage (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `77` tests across `58 + 11 + 8`).
- [x] Add a focused custom-role default-model fallback contract so whitespace/blank `default_model` values normalize to `gpt-5.3-codex` (and `codex-cli`) during role-template normalization/resolution, preventing empty-model drift in local role catalogs (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `78` tests across `59 + 11 + 8`).
- [x] Add a focused custom-role prompt fallback contract so whitespace/blank `role_prompt` values normalize to `description` during role-template normalization/resolution, preventing empty role-summary drift in local role catalogs (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `79` tests across `60 + 11 + 8`).
- [x] Add a focused organization-template application immutability regression so `applyBuiltInRoleOrganizationTemplateToDraft` does not mutate caller draft inputs (including explicit worker arrays) while applying template metadata (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `80` tests across `61 + 11 + 8`).
- [x] Add a focused organization-template application idempotence regression so applying `applyBuiltInRoleOrganizationTemplateToDraft` to an already-normalized draft keeps organization metadata, worker lanes, and DAG-node projection stable (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `81` tests across `62 + 11 + 8`).
- [x] Re-validate Stage 2.5 role-plugin gate and refresh snapshot parity notes with explicit rerun confirmation across active checklist/readme references (`2026-04-26`, `npm run validate:role-plugins`, pass `81` tests across `62 + 11 + 8`).
- [x] Add a focused built-in role metadata propagation regression so orchestration worker role-template metadata (`role_template_source`, `role_template_version`, role labels) remains intact when projected into DAG nodes across the full built-in role set (covered with cap-aware worker chunks), and re-baseline Stage 2.5 snapshot parity (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `82` tests across `63 + 11 + 8`).
- [x] Add a focused orchestration-worker role-template immutability/idempotence regression so `applyRoleTemplateToOrchestrationWorkerDraft` does not mutate caller input and remains stable across repeated application on normalized drafts (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `83` tests across `64 + 11 + 8`).
- [x] Add a focused orchestration-worker provider/model joint-precedence regression so explicit auxiliary `provider` and explicit `model` stay authoritative together while role-template defaults fill only missing fields (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `84` tests across `65 + 11 + 8`).
- [x] Add a narrow local Gemini CLI auxiliary-provider path for DAG/Team workers so explicit `provider: gemini-cli` nodes preserve Gemini models, compile auxiliary review/proposal prompts, and launch through provider-aware payloads without changing the default Codex worker path (`2026-04-26`, validated via `npm run validate:moa-dag`, pass `178` tests across `116 + 43 + 19`).
- [x] Reorder Gemini CLI auxiliary-provider defaults so Gemini 3.1 models are preferred before Gemini 3 and Gemini 2.5 fallbacks, matching the intended second-model strategy for lower-cost review/proposal work (`2026-04-26`).
- [x] Add a focused built-in orchestration-role helper alias (`applyBuiltInRoleTemplateToOrchestrationWorkerDraft`) so Stage 2.5 callers can bind to explicit built-in naming while preserving orchestration role-template application behavior, with parity regression coverage (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `85` tests across `66 + 11 + 8`).
- [x] Add a focused orchestration-alias immutability/idempotence contract regression for custom-template options so `applyBuiltInRoleTemplateToOrchestrationWorkerDraft` remains non-mutating and stable across repeated application on normalized drafts (`2026-04-26`, validated via `npm run validate:role-plugins`, pass `86` tests across `67 + 11 + 8`).

### Stage 3: LAN and Mobile Control

Only after the local Team Space, workflow governance, and DAG event model are stable should CMA expose control outside VS Code.

Goal: let a phone or browser on the same LAN observe and perform safe actions.

Core additions:

- Opt-in LAN bind mode.
- QR pairing and device token auth.
- Read-only-first mobile PWA.
- REST reads and safe actions.
- SSE updates backed by the unified event model.
- Doctor checks for LAN reachability.

### Stage 4: Optional Remote Hub and Relay

Remote relay should be the third layer, not the first.

Goal: support outside-LAN access and multiple devices without weakening local trust.

Core additions:

- Optional relay/tunnel.
- Remote-safe authentication and device revocation.
- Multi-device subscription model.
- WebSocket/Socket.IO only where SSE/REST is insufficient.
- Machine identity if multiple CMA instances are connected.

### Product Boundary

CMA can become large, but it should not become broad too early.

Prefer now:

- Team Space quality
- Run evidence
- Trace and result clarity
- Failure recovery
- Workflow state
- MoA DAG execution
- File ownership conflict guard
- Role plugin system after DAG basics are stable
- Local-first trust

Avoid now:

- Cloud-first product decisions
- Public relay before local APIs are stable
- All-model/all-agent abstraction too early
- Role marketplace before local role plugins are useful
- A full project-management UI
- Mixing Claude/LikeCode/model-router concepts into the primary Team Space surface before Codex Team Space is excellent
- Treating oh-my-codex as the architecture to copy instead of the competitor to benchmark

## Executive Summary

This document evaluates three external reference projects now vendored under `reference/`, plus our own `moa-loop` method, and translates the lessons into a staged roadmap for `Codex-Managed-Agent` (CMA).

The recommended direction, after Stage 0 local Team Space quality is strong, is:

1. **Make `moa-loop` the CMA core method: DAG scheduling, shared blackboard, roadmap-as-weights, and safe parallel code work.**
2. **Use CodexFlow as a reference for local/LAN Codex control.**
3. **Use HAPI as a reference for QR, Hub, Relay, and multi-device access.**
4. **Use oh-my-codex as a competitor benchmark for workflow discipline, doctor checks, HUD, skills, and team runtime.**

These steps do not conflict. They are layers:

```text
MoA Core layer    -> DAG scheduling, blackboard, ownership locks, epoch/check feedback
CodexFlow layer   -> connect local Codex state to mobile/web clients
HAPI layer        -> expose the same control surface across devices, networks, and agents
Competitor layer  -> benchmark oh-my-codex without copying its tmux-first product shape
```

CMA already has the right foundation: a VS Code extension host, a Webview dashboard, a built-in Node backend on `127.0.0.1:8787`, Codex session discovery, Team Core state, bundled skills, and trace-backed inspection. The next product leap is not to replace this architecture, but to make it MoA-native, then expose it safely beyond VS Code.

## Reference Project Lessons

### moa-loop

Local method reference:

```text
/home/clashuser/hzh/item_bo/Oh-Reflective-loop-skills/moa-loop
```

`moa-loop` is not an external competitor. It is the internal method that should become CMA's orchestration core.

Its central model is:

```text
vertical epoch loop
  -> optimize / check / snapshot / adapt

horizontal computation graph
  -> DAG nodes
  -> same-layer parallelism
  -> dependency-constrained serialization

shared communication
  -> blackboard for intermediate results
  -> persisted state for recovery and audit
```

The most important lesson is that multi-agent parallelism must be graph-driven, not simply process-driven. Opening three workers is not enough. CMA needs to know which work can run together, which work depends on prior results, and which file paths are safe to modify concurrently.

For CMA, the MoA runtime should provide:

- DAG run creation and validation.
- Topological layer execution.
- Ready-node scheduling.
- Shared blackboard records.
- File ownership and lock checks.
- Worker result envelopes.
- Final synthesis and verification lanes.
- Epoch-level snapshots and failure memory.

Why this is the core strategy:

- It is ours, not a borrowed product pattern.
- It gives CMA a sharper technical identity than "a VS Code panel for Codex."
- It supports true parallel coding without uncontrolled conflicts.
- It scales from local VS Code to CLI, Web/PWA, desktop, and mobile.
- It gives the product a research-grade story: roadmap-as-weights, adapters, loss signals, and computation graphs.

### CodexFlow

Local reference:

```text
reference/codexflow
```

CodexFlow is the closest architectural match for CMA's immediate next step. It focuses on a Codex-specific control surface:

```text
Codex app-server / Codex state
  -> local agent
  -> HTTP / SSE
  -> mobile/web client
```

The key lesson is that a mobile client should not pretend to be Codex. It should connect to a local agent/backend that understands Codex sessions, threads, events, approvals, and lifecycle state.

For CMA, this means the first remote-control milestone should be:

```text
Mobile PWA
  -> REST commands
  -> SSE updates
  -> CMA Node backend
  -> Codex sessions / CMA state
```

Why this should come first:

- CMA already has a local Node backend.
- CMA already normalizes Codex thread/session data.
- LAN access is easier to secure and validate than public relay.
- REST/SSE fits the current dashboard model better than a full WebSocket platform.
- It creates reusable API contracts that HAPI-style relay can later forward.

### HAPI

Local reference:

```text
reference/hapi
```

HAPI is more advanced as a remote-control product. It is closer to a platform:

```text
Agent CLI wrapper
  -> Hub
  -> REST / SSE / Socket.IO
  -> Web/PWA/Telegram
  -> optional relay/tunnel
```

Its main value for CMA is the product shape: pairing, QR entry, remote dashboard, multi-device access, relay, and multi-agent routing.

However, HAPI is a larger jump than CMA needs for the first milestone. Copying the full Hub/Relay model too early would force CMA to solve public networking, authentication, multi-client state, and agent abstraction before the local Codex control plane is mature.

For CMA, HAPI should inspire the second remote phase:

- QR pairing UX
- token-based device authorization
- optional relay/tunnel support
- WebSocket or Socket.IO only where bidirectional low-latency control is required
- multi-device sessions after the single-LAN-client path is proven

Why this should come later:

- Public relay expands the security surface.
- Multi-device consistency needs stable session/event semantics first.
- CMA is currently Codex-centered, while HAPI abstracts multiple agents.
- A HAPI-style Hub is most valuable after CMA has a clean local API to forward.

### oh-my-codex

Local reference:

```text
reference/oh-my-codex
```

oh-my-codex is not primarily a networking reference. It is a Codex workflow governance layer and should be treated as a competitor benchmark:

```text
Codex CLI
  -> skills / prompts / roles
  -> .omx state
  -> doctor checks
  -> hooks
  -> HUD
  -> team runtime
```

Its value to CMA is high, but it should not define CMA's architecture. It shows what a strong CLI-first competitor already does well: durable state, skills, doctor checks, hooks, HUD, and team runtime discipline.

The strongest ideas to benchmark and surpass are:

- Explicit workflow modes such as planning, execution, team, persistence, review, and cancellation.
- A durable state model with active/completed/failed/blocked/user-input phases.
- A `doctor` surface that checks installation, backend health, Codex CLI availability, skills, state, and team runtime.
- A HUD/status surface that continuously summarizes active work, blockers, and next actions.
- A unified hook/event vocabulary that can feed dashboard, logs, mobile SSE, and automation.
- Team runtime concepts: leader, worker, mailbox, heartbeat, task state, blocked state, shutdown.

For CMA, these should become product capabilities inside the MoA runtime, VS Code dashboard, and later full-platform clients. CMA should not become a tmux clone. Its advantage should be a DAG-first, file-aware, visual orchestrator.

Why this is a competitor benchmark:

- oh-my-codex is CLI-first; CMA should be product/runtime-first and eventually full-platform.
- oh-my-codex has strong workflow surfaces; CMA should match them with doctor/HUD/state but add visual DAG, file locks, trace, and mobile control.
- oh-my-codex can coordinate multiple workers; CMA should coordinate dependency-aware MoA graphs.
- oh-my-codex informs the bar for polish, not the architecture to copy.

## Current CMA Fit

CMA currently connects like this:

```text
VS Code Webview
  -> Extension Host
  -> built-in Node backend on http://127.0.0.1:8787/
  -> Codex session files / Codex CLI / .codex-team state
```

This is not yet LAN/mobile capable because `127.0.0.1` is loopback-only. A phone cannot reach it. The first networking change should be an opt-in LAN mode:

```text
0.0.0.0:8787
```

The QR code should point to the computer's LAN address:

```text
http://192.168.x.x:8787/mobile?pair=<one-time-code>
```

After pairing, the mobile client should use a stored bearer token:

```http
Authorization: Bearer <device-token>
```

The initial mobile API should be conservative:

- Read health.
- List threads.
- Read thread detail.
- Read running board state.
- Trigger safe lifecycle actions.
- Subscribe to updates via SSE.

Prompt sending, resume, interrupt, and approval handling should be added only after the pairing, authorization, event, and observability foundations are stable.

## Recommended Roadmap

### Phase 1: MoA Core Inside CMA

Goal: make CMA's Team Core DAG-native before expanding remote control.

Detailed task plan: [moa-core-inside-cma-task-plan.md](../10-agent-orchestration/moa-core-inside-cma-task-plan.md).

Strategic additions:

- First make the local Team Space narrow and trustworthy.
- Then add MoA-ready state for DAG runs, blackboard entries, ownership locks, node results, and synthesis/review lanes.
- Preserve CMA's VS Code/trace/evidence advantage instead of copying terminal-first runtimes.

Why:

- This makes MoA the product's core, not a side note.
- It gives CMA a defensible advantage over tmux-first competitors.
- It makes safe parallel code work possible.
- It produces stable state that LAN/mobile/relay clients can observe later.

### Phase 2: Visual DAG Team Orchestrator

Goal: expose MoA execution as a professional VS Code control surface.

Key additions:

- Team page DAG board with layers, dependencies, node status, worker thread, changed files, and checks.
- Parallel run button with worker count and mode presets.
- File ownership conflict guard shown before launch.
- Run timeline that links node -> worker -> thread -> log -> trace -> result.
- CMA Doctor panel checking:
  - MoA/DAG state validity
  - lock conflicts
  - stale workers
  - Codex CLI
  - backend
  - workspace
  - Team Core
  - bundled skills
  - trace integrity
- HUD/status summary: active DAG, running nodes, blocked nodes, needed user action, and safe next step.
- Unified internal event vocabulary for DAG, dashboard, SSE, logs, and later relay.

Why:

- CMA's native advantage is visual orchestration inside the workspace.
- Users should see why agents are parallel or blocked.
- Trace-backed evidence makes parallel work auditable.
- This keeps local trust high before network exposure.

### Phase 3: CodexFlow-style LAN + QR Control Surface

Goal: make CMA accessible from a phone on the same local network without changing the core Codex execution model.

Key additions:

- Opt-in LAN server mode that binds to `0.0.0.0` while preserving the existing local-only default.
- Local IP discovery for QR generation.
- One-time pairing code and persistent device token.
- Mobile PWA route served by the Node backend.
- REST endpoints for health, thread list, thread detail, Team Space, DAG run, and safe lifecycle actions.
- SSE endpoint for MoA/DAG/dashboard updates.
- Dashboard card/action to show "Connect Phone" QR code.

Why:

- Low implementation risk after the event model exists.
- Directly extends the current backend.
- Creates the API contract needed for later relay.
- Gives immediate user value: phone monitoring, approval, and lightweight control.

### Phase 4: HAPI-style Remote Hub and Relay

Goal: allow CMA to be used outside the local network and eventually across multiple devices or machines.

Key additions:

- Optional relay/tunnel integration, not enabled by default.
- Remote-safe authentication and device revocation.
- WebSocket/Socket.IO only for interactions that truly need bidirectional real-time transport.
- Multi-client session subscription model.
- Optional machine identity if multiple CMA instances are connected.
- Relay-aware QR code generation.

Why:

- Public networking should build on a proven local MoA control plane.
- Relay security is difficult to retrofit after clients depend on unstable APIs.
- Multi-device behavior needs stable event and workflow semantics first.

### Phase 5: Full-Platform CMA Product

Goal: split CMA from a VS Code-only extension into a platform with shared core runtime.

Target modules:

```text
cma-core       -> DAG / blackboard / scheduler / locks / result envelopes
cma-hub        -> local REST/SSE/WebSocket API
cma-cli        -> terminal workflow and automation entrypoint
cma-vscode     -> current VS Code product surface
cma-web        -> browser/PWA dashboard
cma-mobile     -> phone monitoring and approvals
cma-relay      -> optional remote access layer
```

Why:

- VS Code is the first carrier, not the final boundary.
- The MoA runtime should be reusable across editor, CLI, desktop, web, and mobile.
- This positions CMA as a cross-platform agent operating system rather than a narrow extension.

## Technical Direction

The minimum long-term architecture should look like this:

```text
CMA Core / MoA Runtime
  -> DAG scheduler
  -> shared blackboard
  -> file ownership lock manager
  -> workflow state
  -> result envelope parser
  -> trace/event writer

VS Code Extension Host
  -> CMA Node Backend / Local Hub
      -> REST for commands and reads
      -> SSE for live events
      -> device token auth
      -> workflow state
      -> doctor checks
  -> Codex sessions / Codex CLI / Team Core

Mobile PWA / Web Client
  -> QR pairing
  -> REST actions
  -> SSE event stream

CLI / Desktop Client
  -> same local hub API
  -> same MoA run state

Optional Relay
  -> forwards authenticated REST/SSE or WebSocket traffic
  -> does not own Codex state
```

Recommended event vocabulary for the first pass:

```text
backend-health-changed
workflow-state-updated
dag-run-created
dag-node-ready
dag-node-started
dag-node-blocked
dag-node-completed
dag-node-failed
blackboard-updated
file-lock-conflict
thread-list-updated
thread-detail-updated
team-state-updated
approval-requested
user-input-needed
turn-complete
session-idle
error
```

The event vocabulary should be CMA/MoA-owned. It may be benchmarked against oh-my-codex hooks, but it should not expose raw Codex or raw internal implementation events directly.

## Why This Ordering Is Best

Doing MoA Core first is best because it establishes CMA's technical identity and makes true safe parallelism possible.

Doing Visual DAG Team Orchestrator second is best because CMA's strongest product advantage is not a terminal pane. It is workspace-native visualization, trace evidence, and conflict-aware control.

Doing CodexFlow-style LAN/QR third is best because mobile control is useful only when there is reliable state to observe.

Doing HAPI-style relay fourth is best because relay multiplies risk. Public networking, multi-device sessions, and remote control should build on stable local MoA state, auth, event semantics, and APIs.

Doing full-platform extraction fifth is best because the core runtime and local hub need to prove themselves before being split across products.

The result is an incremental strategy:

```text
MoA core first
visual local product second
LAN/mobile third
remote relay fourth
full-platform fifth
```

This avoids a rewrite while moving CMA toward a serious cross-platform MoA agent operating system.

## Concrete Next Milestone

The next implementable milestone should be:

**"CMA MoA Team v1: DAG Run + Blackboard + File Ownership Guard"**

Acceptance criteria:

- Existing single Team Space behavior remains available.
- User can create a DAG run from a Team Space.
- Each DAG node has dependencies, role, prompt, ownership paths, status, result, and trace.
- Scheduler can start multiple ready nodes concurrently.
- Scheduler refuses concurrent nodes with conflicting `write_paths` or `exclusive_paths`.
- Each worker writes a result envelope and blackboard entry.
- Team page shows DAG layers, running nodes, blocked/conflicting nodes, worker threads, and final status.
- Final synthesis/review node runs after required upstream nodes complete.
- Tests cover DAG validation, cycle detection, ready-node selection, path conflict detection, and result aggregation.

This milestone proves the core differentiator: safe parallel multi-agent code work with auditable state.
