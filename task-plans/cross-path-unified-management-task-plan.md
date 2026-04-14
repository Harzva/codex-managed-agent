# Cross-Path Unified Management Task Plan

## Priority

Priority 1

## Objective

Manage threads across multiple project roots from one control surface.

## Scope

- cross-path discovery
- path-aware grouping and filtering
- board actions across roots
- remove the need for one project per VS Code window

## Tasks

### Task 1 — Path Model

- normalize cwd/workspace paths
- group threads by root or project identity
- make path origin visible but compact

### Task 2 — Cross-Path Filtering

- filter threads by root, project, and active workspace
- keep path-based filtering compatible with topic focus and pins

### Task 3 — Cross-Path Board Actions

- attach, pin, loop, and Codex visibility controls should work regardless of origin path
- ensure board remains one unified workspace surface

## Exit Criteria

- user can manage multiple work roots from one extension surface
- path identity is clear without dominating UI
- board actions are path-agnostic from the user's perspective
