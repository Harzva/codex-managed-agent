# Changelog

All notable release-facing changes to this extension are recorded here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Agent role cards with robot SVG icons per built-in role type.
- GPU-safe card animations (entry, hover, exit) with `prefers-reduced-motion` support.
- Friendly empty states for Board, Coordination Queue, Tab Management, Team Panel, and Schedule.
- Loading spinner on Generate/Save Draft buttons.
- `confirm()` guard before overwriting an existing orchestration draft.
- Global activation/deactivation error handlers with user-friendly messages.

### Changed
- README restructured with Table of Contents, FAQ, and competitive positioning.
- Internal development content moved from README to `CONTRIBUTING.md`.
- `package.json` categories updated (`"Other"` instead of `"Machine Learning"`) and keywords expanded.
- Light-theme styles for Workspace Hydrate boot loader (background, progress bar, stages).

## [1.0.37] — 2026-04-24

### Added
- Trace Core storage for task, run, and thread JSONL lanes with sidecar index metadata.
- Thread Trace views backed by trace files, commands, checks, errors, and raw JSONL inspection.
- Markdown Trace Report export.

### Changed
- Team task evidence summaries shifted toward trace-first runtime signals while preserving fallbacks.

## [1.0.33] — 2026-04-22

### Changed
- Moved Team task prompt, runtime, run-log tail, result envelope, and task JSON into the right-side Drawer.
- Added compact `Detail` action on Team task cards so lanes stay scannable.
- Reused Drawer action rail for retry, run-log, Codex, editor, and failure-copy actions.

## [1.0.32] — 2026-04-21

### Changed
- Smoothed Team task cards by hiding thread actions while a dedicated worker is resolving its thread id.
- Added clear `Starting` Team lane for pending dedicated workers.
- Tightened Marketplace details-page flow with Team Core workflow image.

## [1.0.31] — 2026-04-20

### Added
- Team Core self-contained mode: `.codex-team` coordination works without the optional `team-reflective-loop` skill.
- Compiled Team prompts, Codex model configuration, dispatch runtime tracking, and retry actions.
- Team Core Mermaid workflow diagram.

### Changed
- Snake Demo dispatch now starts a dedicated Team worker thread.

## [1.0.30] — 2026-04-19

### Changed
- Corrected release version to `1.0.30`.
- Tightened Team page wording for readiness, skill state, Snake Demo, and retry actions.

## [1.0.29] — 2026-04-18

### Fixed
- Light-theme board action rail no longer shows a dark block on white themes.

### Added
- Richer Marketplace details page with interface preview section (overview, threads, board, insights, loop).
- Bundled-skill management and `team-reflective-loop` skill for mailbox inspection and reflective handoff.

## [1.0.28] — 2026-04-17

### Changed
- Default Thread Explorer sorting to `Project Directory`.

## [1.0.27] — 2026-04-16

### Added
- Real Marketplace/extension details screenshots for thread explorer, board, insights, and loop views.

## [0.0.17] — [0.0.29] — Pre-1.0 Iterations

### Summary
Dashboard header unification, dropdown layering fixes, Overview simplification into a lightweight snapshot page, surface control consolidation, and board card typography refinements. See individual commit history for granular 0.0.x notes.

## [0.0.10] — [0.0.16] — Board Stabilization

### Summary
Board card layout stabilized with dedicated footer rails, internal scroll regions, tab management, and stop-outcome classification (Failed/Completed/Stopped). See commit history for details.

## [0.0.2] — [0.0.9] — Milestone 1-5 Foundation

### Summary
Initial preview release loop covering dashboard, sidebar, bottom panel, board interactions, insights, operational reliability, and publishability docs. See commit history for details.
