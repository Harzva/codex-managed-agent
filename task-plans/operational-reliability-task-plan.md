# Operational Reliability Task Plan

Status: complete

## Priority

Priority 1

## Objective

Make looping, background continue, and runtime status trustworthy.

## Scope

- detached background continue
- loop observability
- status semantics
- degraded-state handling
- log access and result visibility

## Tasks

### Task 1 — Background Continue Correctness

- [x] keep `codex exec resume` detached
- [x] prevent accidental TUI popups
- [x] persist log location and run metadata

### Task 2 — Loop State Clarity

- [x] distinguish armed / queued / running / failed / success
- [x] surface last result and log tail clearly
- [x] avoid loop triggering on linked-but-not-running threads

### Task 3 — Runtime Semantics

- [x] separate `running`, `linked`, `attached`, `waiting`, `needs human`
- [x] make list, board, drawer, and timeline use the same semantics

### Task 4 — Degraded-State Recovery

- [x] make restart/reload cues understandable
- [x] avoid silent failures from backend or message plumbing
- [x] preserve partial usability in degraded mode

## Exit Criteria

- background continue does not surprise users
- loop state is legible from the board
- status labels mean one thing everywhere
- degraded mode remains recoverable from inside the extension
