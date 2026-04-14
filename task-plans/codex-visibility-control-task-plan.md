# Codex Visibility Control Task Plan

Status: complete

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

- [x] unarchive when needed
- [x] sync preferred thread name
- [x] open the target thread in Codex
- [x] reflect resulting link state in the managed center

### Task 2 — Hide from Codex

- [x] archive cleanly
- [x] preserve extension-side metadata and board preferences
- [x] update visible status immediately

### Task 3 — Visibility Feedback

- [x] show whether a thread is visible/hidden/linked/focused
- [x] make actions available from thread rows, cards, and drawer

## Constraints

Official Codex UI ordering and visibility are not fully controllable. This feature should expose best-effort visibility control, not claim total ownership of the Codex sidebar.

## Exit Criteria

- user can intentionally surface a thread in Codex
- user can intentionally hide a thread from Codex
- action outcomes are visible in the extension
