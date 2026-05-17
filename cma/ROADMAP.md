# Codex-Managed-Agent Long-Range Roadmap

This roadmap is the spine. It should stay short.

Use it to answer:

- what the main milestones are
- what order we should execute them in
- which task-plan file owns the concrete work

Detailed work belongs in categorized files under `task-plans/<category>/*.md`; start from `task-plans/README.md` when browsing.

## North Star

Make `Codex-Managed-Agent` a dependable VS Code control surface for multi-thread Codex work:

- stable enough for daily use
- structured enough to keep evolving
- fast enough to feel responsive
- clear enough that new features do not collapse back into one giant file

## Product Principles

- **One interactive board**
- **Server-aware, not server-fragile**
- **Small, composable host modules**
- **Board first, chrome second**
- **Persistent memory**

## Milestones

## Milestone Status

- [x] Milestone 1 — Architecture Stabilization
- [x] Milestone 2 — Board Interaction Quality
- [x] Milestone 3 — Insight and Guidance Layer
- [x] Milestone 4 — Operational Reliability
- [x] Milestone 5 — Publishable Product Quality
- [x] **Stage 2.5 — Role Plugin System Foundation** (2026-04-27)

### Milestone 1 — Architecture Stabilization

Goal:

- keep the extension modular and reviewable

Related plans:

- host/module cleanup is already largely completed
- continue only when new architectural drift appears

### Milestone 2 — Board Interaction Quality

Goal:

- make board interaction intentional, smooth, and predictable

Primary plan:

- `task-plans/20-product-surface/board-interaction-quality-task-plan.md`

### Milestone 3 — Insight and Guidance Layer

Goal:

- make the extension useful as memory and workflow guidance, not only a launcher

Primary plan:

- `task-plans/20-product-surface/insight-and-guidance-task-plan.md`

### Milestone 4 — Operational Reliability

Goal:

- make loop, background continue, and Codex visibility control trustworthy

Primary plans:

- `task-plans/30-platform-runtime/operational-reliability-task-plan.md`
- `task-plans/20-product-surface/codex-visibility-control-task-plan.md`

### Milestone 5 — Publishable Product Quality

Goal:

- keep releases understandable, repeatable, and maintainable

Related plans:

- release and doc quality work should stay aligned with the current architecture and priority docs

## Delivery Order

### Priority 1 — Must Stabilize First

- `task-plans/20-product-surface/board-interaction-quality-task-plan.md`
- `task-plans/30-platform-runtime/operational-reliability-task-plan.md`
- `task-plans/20-product-surface/codex-visibility-control-task-plan.md`
- `task-plans/30-platform-runtime/cma-codex-communication-optimization-task-plan.md`
- `task-plans/10-agent-orchestration/codex-loop-control-surface-task-plan.md`
- `task-plans/30-platform-runtime/cross-path-unified-management-task-plan.md`

### Priority 2 — Workflow Multipliers

- `task-plans/20-product-surface/prompt-rule-memo-cards-task-plan.md`
- `task-plans/20-product-surface/insight-and-guidance-task-plan.md`
- `task-plans/20-product-surface/no-editor-first-workflows-task-plan.md`

### Priority 3 — Multi-Agent Expansion

- `task-plans/10-agent-orchestration/codex-multi-agent-coordination-task-plan.md`
- `task-plans/10-agent-orchestration/claude-codex-team-space-task-plan.md`
- `task-plans/10-agent-orchestration/codex-team-mailbox-loop-task-plan.md`

### Priority 4 — Ecosystem Extensions

- `task-plans/40-release-and-integrations/wechat-bot-background-service-task-plan.md`
- `task-plans/40-release-and-integrations/html-ppt-visual-extensions-task-plan.md`

## Working Rule

When new work appears:

1. decide which priority bucket it belongs to
2. attach it to an existing `task-plan` if possible
3. create a new `task-plan` only when the work introduces a new delivery track
4. keep `ROADMAP.md` as the index, not the implementation dump

## Task-Plan Formatting Rule

When creating or updating files under `task-plans/`:

1. put a `Status: planned`, `Status: active`, or `Status: complete` line directly below the title
2. write task items as Markdown checkboxes using `[ ]` and `[x]`
3. when work is completed, mark the relevant checkbox items as `[x]`
4. when a task-plan is fully completed, set its top status line to `Status: complete`
5. when adding new task items later, add them in the same checkbox format instead of plain bullets

## Immediate Focus

Core roadmap milestones are currently complete.

Immediate follow-on track:

- `task-plans/10-agent-orchestration/codex-team-mailbox-loop-task-plan.md`

Current handoff state:

- `task-plans/20-product-surface/prompt-rule-memo-cards-task-plan.md` is complete.
- Keep the mailbox loop track active first so team-mode planning, prompt alignment, and non-destructive defaults are stabilized before reopening broader coordination expansion.
