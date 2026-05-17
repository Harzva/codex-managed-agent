# Cross-Path Unified Management Task Plan

Status: complete

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

- [x] normalize cwd/workspace paths
- [x] group threads by root or project identity
- [x] make path origin visible but compact

### Task 2 — Cross-Path Filtering

- [x] filter threads by root, project, and active workspace
- [x] keep path-based filtering compatible with topic focus and pins

### Task 3 — Cross-Path Board Actions

- [x] attach, pin, loop, and Codex visibility controls should work regardless of origin path
- [x] ensure board remains one unified workspace surface

## Exit Criteria

- user can manage multiple work roots from one extension surface
- path identity is clear without dominating UI
- board actions are path-agnostic from the user's perspective
