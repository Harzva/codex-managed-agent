# Codex-Managed-Agent Product Analysis

## Purpose

This document translates the current product request into a concrete engineering view:

- what the product is
- what is already implemented
- what is partially implemented
- what is not implemented
- what should be prioritized
- what cannot be fully controlled

`ROADMAP.md` remains the execution plan. This file is the requirement interpretation and product framing document.

## Product Definition

Codex-Managed-Agent is evolving from a VS Code helper extension into an **Agent Center**:

1. a unified Codex thread management surface
2. a board-based operating workspace for active agents
3. a loop and background-execution controller
4. a long-term foundation for multi-agent collaboration

The correct near-term target is **Codex-only Agent Center**, not a full multi-provider team platform yet.

## Requirement Translation

### A. Agent Center Core

This is the highest-value layer.

- link threads to Codex views
- display and manage many threads in one place
- align board, list, and inspector views
- support loop / auto-continue / custom loop counts
- support cross-path management in a single workspace surface
- reduce dependency on “one working directory = one VS Code window”

### B. Agent Team Space

This is the medium-term collaboration layer.

- Codex multi-thread collaboration
- Claude + Codex collaboration
- shared team workspace for multiple agents

### C. No-Editor / No-Terminal Experience

This is an experience target, not an absolute constraint.

- most routine agent operations should happen inside the managed center
- editor and terminal should become exceptions, not the primary workflow

### D. Ecosystem Extensions

These are valid, but not core-first.

- WeChat bot
- persistent background services
- icon/theme systems
- HTML/PPT generation
- wrapper + loop + memo/rule cards

## Current Implementation Status

### Implemented

The following already exist in working form:

- VS Code multi-surface opening:
  - editor
  - sidebar
  - bottom panel
  - fullscreen/editor placement
- local dashboard + VS Code extension integration
- thread list:
  - search
  - filter
  - sort
  - pin
  - grouping
- board/card workspace:
  - attach
  - pin
  - `T / S / M / L`
  - drag and resize foundations
- drawer / inspector
- lifecycle actions:
  - archive
  - restore
  - delete flows
- auto-loop and detached background continue
- usage reporting:
  - usage report
  - weekly shift
  - topic map
  - word cloud
- Codex link states:
  - open
  - focused
  - linked

### Partially Implemented

These work, but are not stable or product-complete yet:

- board drag smoothness
- board resize smoothness
- `T / S / M / L` density rules
- `Needs Human` occupancy and docking behavior
- running vs linked vs attached semantics
- auto-loop observability
- cross-path workflow ergonomics
- visual theme consistency
- insight productization and actionability

### Not Implemented Yet

- `Show in Codex / Hide from Codex` as a finished product feature
- true multi-agent orchestration
- Claude + Codex shared team space
- WeChat bot backend system
- prompt/rule/roadmap/memo cards as first-class board entities
- HTML/PPT workflow integration
- provider-neutral team operating model

## What Is Feasible

### Feasible Now

- Codex-only Agent Center
- reliable board-centric thread management
- loop control and background continue
- usage analysis and workflow advice
- cross-path management within one extension surface
- memo/rule/prompt support in board or drawer

### Feasible Later

- multi-agent orchestration
- Claude + Codex coordination
- shared team-space abstractions
- bot integrations via external services

## What Is Not Fully Controllable

These limits should be treated as product constraints.

### Official Codex Sidebar Behavior

We can influence:

- archive/unarchive
- thread naming
- open target thread
- recent activity

We cannot fully control:

- official sidebar ordering
- exact visibility of all threads
- guaranteed selection/highlight semantics inside the official sidebar

### Official Provider Internals

We cannot assume full control over:

- Codex plugin internal state
- Claude plugin internal state
- unpublished provider APIs

### No-Editor / No-Terminal as an Absolute Rule

This should be a default experience goal, not a hard promise.

Some operations will still need:

- editor reveal
- logs
- external services
- CLI-backed background execution

### Background Bot / Daemon Inside VS Code Only

Long-running bot or service behavior should not rely purely on the extension host.

The robust architecture is:

- VS Code extension = control surface
- external service = durable background worker

## Product Strategy

The product should **not** continue expanding horizontally without discipline.

The correct strategy is:

1. finish Codex-only Agent Center
2. make board and loop reliable
3. make Codex visibility controllable
4. then expand into team-space and ecosystem layers

That path is coherent, defensible, and shippable.
