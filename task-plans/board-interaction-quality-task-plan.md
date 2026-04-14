# Board Interaction Quality Task Plan

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

- stabilize drag target computation
- eliminate false drops and stuck drag states
- ensure board coordinates persist correctly after drop

### Task 2 — Resize Reliability

- support left/right/bottom/corner resize consistently
- align resize math with board grid rules
- prevent card overlap and accidental snapping regressions

### Task 3 — Density Normalization

- define exact content rules for `T / S / M / L`
- ensure typography, controls, and truncation scale with card size
- make `L` a full-row layout by design

### Task 4 — Needs Human Compactness

- keep the dock visible without covering core board content
- support collapse/expand and bounded height behavior
- keep urgent cards readable in compact mode

### Task 5 — Performance Cleanup

- keep drag/resize on `requestAnimationFrame`
- minimize board-wide re-render during interaction
- keep overlay rendering isolated from card rendering

## Dependencies

- stable board state model
- stable host/webview message flow

## Exit Criteria

- drag feels reliable under normal use
- resize is predictable and bidirectional
- `T / S / M / L` each have clear semantics
- `Needs Human` no longer blocks the board
- interactive board remains the only true board surface
