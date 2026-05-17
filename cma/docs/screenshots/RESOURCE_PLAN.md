# Screenshot Resource Plan

This file defines what UI state should be prepared before taking the final screenshots.

## 1. Main Dashboard

Prepare:

- populated thread list
- at least one selected thread
- drawer open with useful detail
- top chrome fully loaded

Recommended state:

- not degraded
- not empty
- not focused on debug-only surfaces

## 2. Board With Active Cards

Prepare:

- several cards attached to the board
- visible size variety (`T / S / M / L` if useful)
- at least one readable active card
- calm layout with minimal empty dead space

Recommended state:

- no drag or resize gesture in progress
- no temporary green drop target visible

## 3. Needs Human Dock

Prepare:

- 2 to 4 meaningful urgent cards
- compact but readable layout
- dock expanded intentionally

Recommended state:

- avoid oversized cards that block the board
- avoid cases where the dock visually overwhelms the whole screenshot

## 4. Docked Layout

Prepare:

- sidebar or bottom panel placement
- readable content density
- dashboard clearly shown as part of a normal VS Code layout

Recommended state:

- avoid tiny unreadable UI
- avoid empty docked surfaces

## Optional: Insights View

Prepare:

- topic map with enough nodes to look intentional
- weekly shift / report text that is non-empty

## Optional: Inspector Detail

Prepare:

- a selected thread with logs and metadata visible
- detail dense enough to prove utility, but not visually chaotic
