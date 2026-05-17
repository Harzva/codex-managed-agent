# Board Active Cards Shot Spec

Target file:

- `docs/screenshots/board-active-cards.png`

## Goal

Produce the most convincing board screenshot for the README and Marketplace page.

This shot should answer one question immediately:

**Why is the board better than a plain thread list?**

## Required Layout

- open the dedicated board page
- keep the board as the dominant surface
- show 4 to 8 cards in one frame
- keep enough spacing so the layout feels intentional, not chaotic
- make sure card edges are readable and not clipped

## Required Content

The shot should show all of these at once:

- more than one card size
- at least one card that reads as active or operationally meaningful
- at least one attached/supporting card
- visible but controlled intervention context
- enough card chrome to prove the board is interactive and useful

## Suggested Screen State

Use a clean state with:

- one or two larger anchor cards
- several smaller supporting cards
- one visible `Needs Human` presence if it does not dominate the frame
- no transition overlays
- no temporary drag target or resize state

## Composition Guidance

### Card Mix

Prefer:

- a balanced spread of `S / M / L` or `T / S / M` cards
- one clearly important card that draws the eye first
- supporting cards that make the board feel like a workspace, not a random grid

Avoid:

- only one lonely card in a huge empty board
- too many tiny cards that make the screenshot unreadable
- one giant card that hides the rest of the board

### Board Readability

Prefer:

- visible board structure
- enough card titles to imply real work
- cards with realistic content density

Avoid:

- temporary green drop target
- resize handles during active manipulation
- clipped titles or partially off-screen cards

## Concrete Capture Checklist for This Shot

- [ ] dedicated board page open
- [ ] 4 to 8 cards visible
- [ ] at least two card sizes visible
- [ ] one primary/anchor card is readable
- [ ] no drag overlay
- [ ] no resize gesture in progress
- [ ] no giant empty dead zone dominating the frame
- [ ] saved as `docs/screenshots/board-active-cards.png`

## Acceptance Standard

Use this shot only if it makes the board look:

- structured
- active
- readable
- worth using instead of a plain list

Reject it if it looks like:

- a sparse empty canvas
- an unstable drag-and-drop prototype
- a random pile of cards with no visual hierarchy
