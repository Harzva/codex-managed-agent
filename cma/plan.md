# Codex-Managed-Agent Comprehensive Plan

## Product Goal

Bring `Codex-Managed-Agent` from an internally useful VS Code beta to a stable, polished, publishable extension that can serve as a primary Codex agent workspace inside VS Code.

## Current State

The extension already supports:

- multiple presentation surfaces inside VS Code
- local server auto-start and refresh
- thread search, filter, sort, pin, and grouped views
- inspector drawer with conversation and log detail
- lifecycle actions and batch lifecycle actions
- command helpers for `resume` and `fork`
- installable `.vsix` packaging

The extension still has clear gaps before it should be treated as a mature product.

## Main Workstreams

### 1. Runtime Architecture

Goal: make the extension reliable even when the local server is unavailable or partially broken.

Targets:

- reduce hard dependence on the external `codex_manager` backend where practical
- make server discovery, launch, restart, and failure recovery more robust
- separate transport failures from empty-data states in the UI
- define which features are extension-native versus server-backed

### 2. Streaming Experience

Goal: approach a true terminal-grade live agent experience inside VS Code.

Targets:

- replace preview-style logs with a real streaming live console
- support per-thread streaming tabs
- support pause, resume, and clear behaviors
- improve running-thread observability and process awareness

### 3. Interaction Quality

Goal: make the extension feel native, safe, and well-resolved.

Targets:

- remove browser-style destructive confirms from drawer actions
- reuse consistent in-panel confirm patterns for risky operations
- improve keyboard and focus behavior
- refine spacing, hover, feedback, and empty states
- improve command execution feedback and terminal reuse semantics

### 4. Testing and Validation

Goal: move from ad hoc validation to repeatable confidence.

Targets:

- add structured smoke checks for extension behavior
- add basic verification for message handling and core render flows
- define a repeatable package-validation routine
- ensure the VSIX remains installable after each significant slice

### 5. Release Engineering

Goal: make the repository and extension ready for broader distribution.

Targets:

- add publish-ready metadata
- add repository and licensing clarity
- prepare Marketplace-facing assets and descriptions
- define versioning and release notes workflow

## Milestone Order

### Milestone A — Safe and Stable Beta

- eliminate fragile destructive-action UX
- make service failure states legible
- improve server control and recovery
- add a minimal validation checklist

### Milestone B — IDE-Native Control Surface

- ship a real streaming live console
- improve command, process, and running-thread visibility
- strengthen keyboard flow and panel ergonomics

### Milestone C — Publishable Extension

- add release metadata and packaging polish
- finalize repo-facing docs
- formalize validation and release workflow

## Current Bounded Slice

- Add explicit degraded-state messaging when the local server is unreachable or partially broken
- Add an explicit `Restart Server` control alongside the existing startup affordances
- Distinguish service failure from empty-data states inside the VS Code panel
- Validate with `node --check` and repackage the VSIX if code changes

## Near-Term Candidate Slices

- Add keyboard-friendly drawer focus and action shortcuts
- Improve terminal reuse so command-card feedback stays local and predictable
- Start a native streaming console surface for running threads
- Add a lightweight server-health summary and retry affordance in the top bar

## Medium-Term Candidate Slices

- Add a proper streaming channel design for live logs
- Add structured smoke tests for extension activation and core message flows
- Separate extension-native cached data from server-only enriched data
- Improve publish-ready metadata and repo packaging

## Success Criteria

The extension is ready to graduate from beta when:

- destructive operations feel safe and fully native
- streaming and running-thread visibility are strong enough to replace the browser view for normal monitoring
- failure states are understandable and recoverable from inside VS Code
- packaging and metadata are ready for public-facing distribution
- validation is repeatable rather than purely manual

## Loop Rules

- Each codex-loop tick should complete only one bounded, verifiable slice
- If the current bounded slice is already done, update this file before starting the next slice
- Prefer slices that improve safety, observability, or product readiness over purely cosmetic changes
- Keep evolution notes in `.claude/plans/loloop/`
- Repackage the VSIX whenever a code slice changes extension behavior materially
