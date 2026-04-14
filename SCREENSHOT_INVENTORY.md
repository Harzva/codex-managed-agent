# Codex-Managed-Agent Screenshot Inventory

Use this file as the execution checklist for Marketplace-ready screenshots.

The goal is not to collect many screenshots. The goal is to collect a **small set of clear, real screenshots** that prove the extension is usable.

## Capture Rules

- Use real screenshots, not mockups.
- Use a dark VS Code theme.
- Use realistic thread titles and non-empty data.
- Do not capture broken layout, empty placeholders, or clipped cards.
- Hide unrelated desktop clutter.
- Keep the extension readable at Marketplace width.
- Prefer one strong screenshot per workflow over many similar screenshots.

## Required Shots

### Shot 1 — Main Dashboard

**Purpose**

Show the extension as a real in-editor control surface.

**Surface**

- editor-area dashboard

**Must show**

- thread list
- one visible board summary area
- one populated inspector/drawer state
- clear top navigation

**Avoid**

- blank sections
- collapsed empty states everywhere
- clipped cards or oversized debug content

**Suggested filename**

- `docs/screenshots/main-dashboard.png`

### Shot 2 — Board With Active Cards

**Purpose**

Show the board as the primary visual differentiator.

**Surface**

- full board page

**Must show**

- multiple cards
- a mix of card sizes
- at least one readable `Needs Human` or active card
- evidence that the board is an operating workspace, not just a list

**Avoid**

- huge empty board regions with only one tiny card
- drag/drop transitional states
- temporary debugging overlays

**Suggested filename**

- `docs/screenshots/board-active-cards.png`

### Shot 3 — Needs Human Dock

**Purpose**

Show that intervention work is visible but contained.

**Surface**

- expanded `Needs Human` area

**Must show**

- multiple urgent cards
- dock header
- compact but readable layout

**Avoid**

- content clipping
- cards covering the main workspace excessively
- oversized cards that hide the problem instead of showing the solution

**Suggested filename**

- `docs/screenshots/needs-human-dock.png`

### Shot 4 — Sidebar or Bottom Placement

**Purpose**

Show that the extension fits normal VS Code layout flows.

**Surface**

- sidebar placement or bottom panel placement

**Must show**

- the extension docked in a standard layout
- enough content to prove it still works outside the main editor area

**Avoid**

- tiny unreadable crops
- empty docked states

**Suggested filename**

- `docs/screenshots/docked-layout.png`

## Optional Shots

### Shot 5 — Topic Map / Insight View

Use only if the insight surface is visually stable and readable.

**Suggested filename**

- `docs/screenshots/insights-topic-map.png`

### Shot 6 — Inspector Detail

Use only if the drawer/detail state is dense but clean.

**Suggested filename**

- `docs/screenshots/inspector-detail.png`

## Capture Sequence

1. Start the local `codex_manager` service.
2. Load realistic thread data.
3. Prepare one clean state per shot.
4. Capture full-resolution screenshots.
5. Review for clipping, empty states, and noisy overlays.
6. Add the final image paths into `README.md`.

## Definition of Done

The screenshot pass is complete when:

- all 4 required shots exist
- each shot has a stable filename
- each shot is readable in the README / Marketplace layout
- the README uses the final paths instead of placeholder text
