# Screenshot Shoot Order

Use this order to minimize layout resets and repeated setup work.

## Shoot Strategy

Start with the broadest, most reusable UI state first, then branch into narrower views.

This reduces:

- repeated dashboard loading
- repeated board setup
- repeated drawer preparation
- repeated window rearrangement

## Step 1 — Prepare Base State

Before taking any shot:

- start local `codex_manager`
- ensure the extension is fully loaded
- make thread data visible
- keep one representative thread selected
- make sure there are multiple meaningful cards on the board
- make sure `Needs Human` has usable content

This base state should support Shot 1, Shot 2, and Shot 3 with minimal changes.

## Step 2 — Capture `main-dashboard.png`

Why first:

- it uses the broadest, most neutral state
- it becomes the baseline state for the next shots

Use:

- editor-area dashboard
- populated thread list
- visible board summary
- readable inspector/drawer

## Step 3 — Capture `board-active-cards.png`

Why second:

- it reuses the same loaded workspace
- you only need to switch to the full board view

Use:

- full board page
- several attached cards
- mixed card sizes
- no drag overlay or temporary resize state

## Step 4 — Capture `needs-human-dock.png`

Why third:

- it reuses the board state from the previous shot
- only the dock presentation needs adjustment

Use:

- board still open
- `Needs Human` expanded intentionally
- 2 to 4 urgent cards visible
- no clipping

## Step 5 — Capture `docked-layout.png`

Why fourth:

- this is the first shot that requires layout movement
- doing it last avoids redoing the main editor-layout shots

Use:

- sidebar or bottom panel placement
- enough visible data to prove the docked view is usable

## Step 6 — Optional Insight Shot

Take only if the view is stable and visually useful.

Use:

- topic map
- weekly shift or usage report blocks
- non-empty, readable content

Suggested file:

- `insights-topic-map.png`

## Step 7 — Optional Inspector Shot

Take only if the drawer/detail state is visually strong.

Use:

- selected thread
- readable metadata
- readable logs or detail
- no empty placeholders

Suggested file:

- `inspector-detail.png`

## Final Review

Before finalizing:

- compare all shots side by side
- remove any shot with clipping or dead space
- confirm filenames match README references exactly
