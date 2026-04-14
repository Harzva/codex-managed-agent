# Main Dashboard Shot Spec

Target file:

- `docs/screenshots/main-dashboard.png`

## Goal

Produce the strongest default product screenshot for the README and Marketplace page.

This shot should answer one question immediately:

**What does Codex-Managed-Agent look like when it is actually being used?**

## Required Layout

- open the extension in the editor area
- keep the top navigation fully visible
- keep the thread list populated on the main surface
- keep one thread selected
- keep the inspector/drawer open and readable
- keep at least one board summary block visible, but do not let the board dominate the frame

## Required Content

The shot should show all of these at once:

- non-empty thread list
- one selected thread with meaningful title
- inspector/drawer content with readable metadata or log context
- enough dashboard chrome to prove this is the main control surface

## Suggested Screen State

Use a clean state with:

- one interesting thread selected
- no degraded-state warning
- no startup/loading skeletons
- no temporary drag/resize state
- no giant `Needs Human` overlay covering the page

## Composition Guidance

### Left / Main Surface

Prefer:

- visible thread list with several realistic titles
- at least one `Pinned`, `Linked`, or otherwise meaningfully different thread state visible if it does not clutter the frame

Avoid:

- empty list states
- giant dead space in the main column
- too many tiny chips competing with the selected row

### Right / Inspector Surface

Prefer:

- readable thread detail
- one useful log/detail block
- visible actions or summary state

Avoid:

- giant raw logs taking over the frame
- blank panels
- clipping or truncated detail that looks broken

## Concrete Capture Checklist for This Shot

- [ ] editor-area dashboard open
- [ ] thread list populated
- [ ] one thread selected
- [ ] inspector/drawer open
- [ ] top chrome fully visible
- [ ] no degraded-state banner
- [ ] no drag/drop overlay
- [ ] no clipped text
- [ ] saved as `docs/screenshots/main-dashboard.png`

## Acceptance Standard

Use this shot only if it makes the extension look:

- real
- readable
- useful
- stable

Reject it if it looks like:

- a prototype shell
- an empty dashboard
- a debug screen
- a layout in transition
