# Codex Loop Control Surface Task Plan

Status: planned

## Priority

Priority 1

## Objective

Expose `codex-loop` as a first-class managed surface inside `Codex-Managed-Agent` instead of leaving daemon control in shell scripts only.

## Scope

- daemon status inside the extension
- watch / tail visibility for loop logs
- card-level loop enablement
- interval presets such as `10 min`, `20 min`, and custom input
- quick start / stop / restart controls

## Tasks

### Task 1 — Loop Status Visibility

- [ ] show daemon running state in the extension
- [ ] show current thread id, launcher, and heartbeat metadata
- [ ] show last tick summary and latest status from `.codex-loop/state`

### Task 2 — Watch and Tail Surfaces

- [ ] expose the latest tick log path inside the UI
- [ ] add quick watch / tail actions for loop logs
- [ ] show a compact recent log tail without leaving the managed surface

### Task 3 — Card-Level Loop Controls

- [ ] add per-card loop enablement
- [ ] support interval presets such as `10 min` and `20 min`
- [ ] support a custom interval input
- [ ] show whether a card is currently loop-managed

### Task 4 — Runtime Control Actions

- [ ] start loop from the extension
- [ ] stop loop from the extension
- [ ] restart loop from the extension
- [ ] keep the UI state consistent when the daemon exits unexpectedly

## Exit Criteria

- loop daemon state is visible without opening a terminal
- loop logs can be watched or tailed from the managed workflow
- one card can enter loop mode with a clear interval setting
- start / stop / restart actions are available in the extension itself
