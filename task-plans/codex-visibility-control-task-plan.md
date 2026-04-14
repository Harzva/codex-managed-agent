# Codex Visibility Control Task Plan

## Priority

Priority 1

## Objective

Give the user deliberate control over whether a thread is surfaced in the official Codex experience.

## Scope

- `Show in Codex`
- `Hide from Codex`
- archive/unarchive handling
- name sync
- open target thread in Codex

## Tasks

### Task 1 — Show in Codex

- unarchive when needed
- sync preferred thread name
- open the target thread in Codex
- reflect resulting link state in the managed center

### Task 2 — Hide from Codex

- archive cleanly
- preserve extension-side metadata and board preferences
- update visible status immediately

### Task 3 — Visibility Feedback

- show whether a thread is visible/hidden/linked/focused
- make actions available from thread rows, cards, and drawer

## Constraints

Official Codex UI ordering and visibility are not fully controllable. This feature should expose best-effort visibility control, not claim total ownership of the Codex sidebar.

## Exit Criteria

- user can intentionally surface a thread in Codex
- user can intentionally hide a thread from Codex
- action outcomes are visible in the extension
