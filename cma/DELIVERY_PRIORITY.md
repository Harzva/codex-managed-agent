# Codex-Managed-Agent Delivery Priority

## Goal

Turn Codex-Managed-Agent from a feature-heavy beta into a stable Agent Center with a clear delivery order.

This file answers one question: **what should we build first, and what should wait?**

## Priority 1 — Must Stabilize First

These determine whether the product is actually usable.

### 1. Board Interaction Quality

Targets:

- drag placement reliability
- resize reliability
- clear drop semantics
- stable placement logic
- clean behavior for `T / S / M / L`
- `Needs Human` that does not block the board

Why first:

- board is the primary work surface
- if board interaction is unstable, the rest of the product feels unreliable

### 2. Operational Reliability

Targets:

- loop correctness
- background continue correctness
- detached execution correctness
- running vs linked vs waiting semantics
- degraded-state recovery visibility

Why second:

- users need to trust what the extension says is happening
- background automation must not surprise users or open the wrong interface

### 3. Codex Visibility Control

Targets:

- `Show in Codex`
- `Hide from Codex`
- archive/unarchive handling
- preferred-name sync
- open target thread in Codex

Why third:

- this is the practical bridge between the managed center and the official Codex experience
- it solves a real workflow problem immediately

### 4. Cross-Path Unified Management

Targets:

- manage threads from multiple working roots in one surface
- reduce reliance on “one project = one window”

Why fourth:

- this is one of the strongest differentiators of the product
- it supports the real user workflow directly

## Priority 2 — Workflow Multipliers

These increase usefulness after the core becomes stable.

### 5. Prompt / Rule / Memo Cards

Targets:

- prompt card
- rule card
- memo card
- roadmap/prompt visibility inside the agent center

Why important:

- this turns the extension from a viewer into a working memory system
- it aligns directly with loop-driven and research-style workflows

### 6. Insight and Guidance

Targets:

- usage report clarity
- topic map actions
- word cloud usefulness
- weekly shift recommendations
- actionable vibe-coding suggestions

Why important:

- this helps the user improve workflow quality, not just inspect state

### 7. No-Editor-First Workflows

Targets:

- routine send / loop / inspect / manage actions stay inside the center
- editor and terminal become fallback surfaces

Why important:

- this is a strong UX goal, but it depends on core stability first

## Priority 3 — Multi-Agent Expansion

These should wait until the Codex-only center is stable.

### 8. Codex Multi-Agent Coordination

Targets:

- multi-thread work planning
- ownership / baton passing
- coordination surfaces

### 9. Claude + Codex Team Space

Targets:

- shared team board
- provider-aware role separation
- cross-provider collaboration model

Why these are later:

- they add major state and architecture complexity
- they are not good foundations if the Codex-only surface is still unstable

## Priority 4 — Ecosystem Extensions

These are valid, but not near-term blockers.

### 10. WeChat Bot / Background Service

Targets:

- external background runtime
- bot-driven task dispatch or notification

### 11. HTML/PPT and Visual Extensions

Targets:

- HTML/PPT workflow support
- icon/theme expansion
- presentation output tooling

Why later:

- useful, but not essential to making the core control surface dependable

## Recommended Build Order

1. Board interaction quality
2. Operational reliability
3. `Show in Codex / Hide from Codex`
4. Cross-path unified management
5. Prompt / rule / memo cards
6. Insight and guidance refinement
7. No-editor-first workflow refinement
8. Codex multi-agent coordination
9. Claude + Codex team space
10. WeChat bot and ecosystem extensions

## Stop Doing

Until Priority 1 is solid, avoid:

- adding decorative UI faster than interaction quality improves
- expanding into multi-provider orchestration too early
- adding more parallel surfaces for the same board behavior
- treating the extension as a general playground instead of a product

## Immediate Focus

The current execution focus should remain:

### Milestone 2 — Board Interaction Quality

Concrete near-term work:

- drag smoothness
- resize correctness
- drop overlay stability
- card density normalization
- board occupancy rules
- `Needs Human` compact behavior

This is the most defensible next milestone.
