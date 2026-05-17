# Board Interaction Quality Task Plan

Status: complete

## Priority

Priority 1

## Objective

Make the board stable, predictable, and smooth enough for daily use.

## Why This Matters

The board is the main operating surface. If drag, resize, and card-density rules are unstable, the rest of the extension feels unreliable.

## Scope

- drag placement reliability
- resize reliability in all supported directions
- drop overlay correctness and smoothness
- `T / S / M / L` density rules
- `Needs Human` occupancy rules
- board-only interaction rules

## Tasks

### Task 1 — Drag Reliability

- [x] stabilize drag target computation
- [x] eliminate false drops and stuck drag states
- [x] ensure board coordinates persist correctly after drop

### Task 2 — Resize Reliability

- [x] support left/right/bottom/corner resize consistently
- [x] align resize math with board grid rules
- [x] prevent card overlap and accidental snapping regressions

### Task 3 — Density Normalization

- [x] define exact content rules for `T / S / M / L`
- [x] ensure typography, controls, and truncation scale with card size
- [x] make `L` a full-row layout by design

### Task 4 — Needs Human Compactness

- [x] keep the dock visible without covering core board content
- [x] support collapse/expand and bounded height behavior
- [x] keep urgent cards readable in compact mode

### Task 5 — Performance Cleanup

- [x] keep drag/resize on `requestAnimationFrame`
- [x] minimize board-wide re-render during interaction
- [x] keep overlay rendering isolated from card rendering

## Dependencies

- stable board state model
- stable host/webview message flow

## Exit Criteria

- drag feels reliable under normal use
- resize is predictable and bidirectional
- `T / S / M / L` each have clear semantics
- `Needs Human` no longer blocks the board
- interactive board remains the only true board surface
