# Codex-Managed-Agent Long-Range Roadmap

This roadmap exists so we stop doing open-ended reactive edits and instead move in deliberate, reviewable milestones.

## North Star

Make `Codex-Managed-Agent` a dependable VS Code control surface for multi-thread Codex work:

- stable enough for daily use
- structured enough to keep evolving
- fast enough to feel responsive
- clear enough that new features do not keep collapsing into one giant file

## Product Principles

- **One interactive board**: only one fully interactive board surface should exist at a time
- **Server-aware, not server-fragile**: degraded state should stay usable and understandable
- **Small, composable host modules**: host logic should be split by responsibility
- **Board first, chrome second**: layout and interaction quality matter more than decorative additions
- **Persistent memory**: insights, usage reports, and board preferences should survive reloads

## Milestones

### Milestone 1 — Architecture Stabilization

Goal: stop the extension from growing as one tangled file.

Targets:

- finish host-side modular split
- define clean seams between host logic and webview logic
- keep `extension.js` as a thin entry point
- keep `panel.js` as orchestration only
- ensure every split keeps packaging and activation intact

Exit criteria:

- host responsibilities live in focused modules
- webview responsibilities live in focused modules
- adding a new feature does not require editing every major file

### Milestone 2 — Board Interaction Quality

Goal: make board interaction feel intentional and smooth.

Targets:

- improve drag smoothness and drop reliability
- finish resize behavior for all supported directions
- define clear card-size semantics for `T / S / M / L`
- keep `Needs Human` useful without blocking the board
- establish board-only interaction rules and remove duplicate surfaces

Exit criteria:

- drag and resize feel stable under normal use
- `T / S / M / L` each have consistent density rules
- users can manage many cards without layout confusion

### Milestone 3 — Insight and Guidance Layer

Goal: make the extension useful as a memory and reflection tool, not only a launcher.

Targets:

- stabilize usage report generation
- make topic map, word cloud, and weekly shifts navigable
- keep reports persisted locally
- add explicit user-facing explanations for insights
- make advice actionable instead of generic

Exit criteria:

- reports survive reloads
- topic map and thread list stay linked
- weekly report gives concrete behavior suggestions

### Milestone 4 — Operational Reliability

Goal: make background continue, looping, and server orchestration trustworthy.

Targets:

- keep background `codex exec resume` detached and observable
- expose last result and log access clearly
- refine degraded-state handling
- separate “linked to Codex” from “actually running”
- improve status semantics across cards and timelines

Exit criteria:

- no accidental TUI popups for background actions
- users can tell whether a loop is armed, queued, running, or failed
- server recovery is understandable from inside the extension

### Milestone 5 — Publishable Product Quality

Goal: move from feature-rich beta to a maintainable public extension.

Targets:

- tighten repo structure and docs
- improve screenshots and release notes
- define validation routines and smoke checks
- reduce polish debt in theme/layout options
- prepare predictable release workflow

Exit criteria:

- releases are repeatable
- repo structure is understandable to outside contributors
- feature work no longer depends on undocumented knowledge

## Working Rules

### What we should keep doing

- make one bounded change at a time
- validate with syntax checks and package builds
- sync clean repo and dev workspace together
- keep a commit checkpoint after each architectural slice

### What we should stop doing

- adding major new behavior before finishing architectural seams
- stacking decorative UI ideas faster than interaction quality can keep up
- duplicating the same surface in multiple interactive places
- letting `panel.js` become the dumping ground again

## Near-Term Sequence

1. Finish host/module cleanup
2. Revisit board interaction smoothness
3. Normalize size-density rules and compact surfaces
4. Stabilize insights/report persistence
5. Revisit polish and theme variants after interaction quality is solid

## Review Cadence

After each milestone slice we should ask:

- Did this reduce structural complexity?
- Did this make the extension more reliable or more legible?
- Did this improve a core workflow, not just appearance?
- Did we validate and package successfully?

If the answer is mostly “no”, it probably belongs later.
