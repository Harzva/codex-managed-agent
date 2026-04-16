# Changelog

All notable release-facing changes to this extension should be recorded here.

## 0.0.17

- Merged the `Left / Bottom / Editor / Fullscreen` surface controls into a single dropdown card in the header.
- Simplified `Overview` into a lightweight topic snapshot page that only shows brief summaries for each workspace area.
- Updated the `More` and `Service` dropdowns so clicking anywhere outside the menu closes them automatically, and aligned the shared dropdown behavior across header controls.

## 0.0.18

- Fixed header dropdown layering so `Surface`, `Service`, and `More` menus stay above the frosted panels below instead of being visually clipped or covered.

## 0.0.19

- Fixed the webview boot error caused by reading `threadSearch.value` after the overview search input was removed from the simplified layout.

## 0.0.20

- Tightened the `Overview` snapshot card layout so the page reads more like a clean dashboard instead of a verbose data wall.
- Reduced the visual weight of overview card typography and clamped card copy so long summaries stop blowing up the grid.
- Reworked the `Loop Daemon` overview card into a short status digest instead of dumping long detail text into the snapshot surface.

## 0.0.21

- Moved the service health, refresh summary, and surface position pills into a top header status strip so those signals read first instead of sitting inside the brand block.

## 0.0.22

- Fixed the top `Surface` trigger layout so the label and current value no longer run together as `SurfaceLeft`.

## 0.0.23

- Unified the top header controls into a shared visual system with consistent width, spacing, alignment, and wording across `Layout`, `Density`, and `Service`.

## 0.0.24

- Fixed header dropdown usability by letting the topbar grow while `Layout`, `Service`, or `More` menus are open, so the menus no longer get blocked by the content below.

## 0.0.25

- Reworked the header into two cleaner single-line bands: a top status strip and a second navigation/control strip, removing the repeated status presentation and aligning the layout with the dashboard information hierarchy.

## 0.0.26

- Fixed the `Layout` dropdown anchor so it opens from the trigger's left edge instead of drifting off-screen when the header controls wrap onto a narrower line.

## 0.0.27

- Reworked `Overview` topic cards into single-row summary lines so each topic gets its own full-width lane instead of being packed into a cramped grid.

## 0.0.28

- Restored the colorful `Codex-Managed-Agent-Loop` branding as an `Overview` footer banner so the signature stays visible without competing for the limited top header space.

## 0.0.29

- Moved the colorful `Codex-Managed-Agent-Loop` signature to the very bottom of `Overview` and scaled it up into a much larger footer banner.

## 0.0.16

- Tightened dashboard status semantics so backend `active` threads no longer fall through into idle-like treatment on the frontend.
- Narrowed the inferred `Tooling` phase and split log-reading / code-inspection activity into a separate `Inspecting` phase.
- Improved manual-blocker detection so cards waiting on user input are surfaced as `Needs Input` in the inferred phase lane instead of being mislabeled as generic tooling.

## 0.0.15

- Added explicit shared board tab management closer to the Overleaf model: create global tabs first, then assign threads into an existing tab.
- The board rail now shows persisted tabs even before they contain cards, and includes a `+ Tab` creation affordance.
- Assigning a thread tab now uses an existing-tab picker instead of relying only on free-text tab creation.

## 0.0.14

- Reduced normal board card title size again, while letting only the selected card and `L` cards read slightly larger.
- Fixed board title width behavior so long titles stay inside a fixed title region and truncate with ellipsis instead of affecting card layout.

## 0.0.13

- Reduced default board card title sizes again so the header typography feels more compact, especially on `S` and `M` cards.

## 0.0.12

- Turned board card bodies into internal scroll regions so long tooling content can scroll without ever displacing the bottom `Status + T/S/M/L` rail.
- Added lightweight card-body scrollbar styling to keep the new overflow behavior readable without being visually loud.

## 0.0.11

- Fixed board cards whose long tooling/content bodies could push the footer out of view, so the bottom `Status + T/S/M/L` rail now stays visible.
- Made the card body a compressible content region so verbose cards no longer eat the reserved footer space.

## 0.0.10

- Reworked board cards so the header stays `title + Codex` and the footer becomes a dedicated `Status + T/S/M/L` rail.
- Removed the old action-heavy footer from board cards so status and size controls always have a stable place on the card edge.

## 0.0.9

- Reduced board card title sizing so dense multi-card layouts feel less crowded.
- Removed the duplicate in-card title when a board title bar is already present, leaving the header as the single source of the card title.
- Slightly softened supporting board card copy sizing for `S`, `M`, and `L` cards.

## 0.0.8

- Added a global `Guide Copy` toggle so helper text and explanatory microcopy can be hidden for a cleaner dashboard.
- The toggle persists in webview state, so the dashboard stays clean after refreshes and reopen.

## 0.0.7

- Added `codexAgent.defaultSurface` so the dashboard can default to `fullscreen`, `editor`, `bottom`, or `left` when first opened.
- Set the default open surface to `fullscreen` so opening the extension no longer lands on the left sidebar first.

## 0.0.6

- Fixed board and completion feed status semantics so timed-out or erroring threads are no longer mislabeled as `Completed`.
- Added stop-outcome classification in the host sync layer to distinguish `Failed`, `Completed`, and `Stopped` from recent log evidence.
- Updated the board completion rail and live timeline copy to reflect stop outcomes instead of assuming every stopped agent finished successfully.

## 0.0.5

- Swapped the fullscreen action to `workbench.action.toggleMaximizeEditorGroup` because `workbench.action.maximizeEditor` is not available in VS Code 1.115 remote sessions.

## 0.0.4

- Fixed release builds where dashboard placement controls such as `Left`, `Bottom`, `Editor`, and `Fullscreen` could stop responding after installation.
- Added a webview-side command URI fallback for VS Code UI actions so packaged installs behave the same as the local development version.
- Enabled command URIs on the dashboard webview so release builds can drive workbench layout actions more reliably.

## 0.0.3

- Closed the `no-editor-first-workflows` follow-on track after making editor and terminal fallback actions explicit across board card, drawer, and spotlight surfaces.
- Aligned roadmap and active-plan docs so completed task plans now use `Status: complete` plus `[x] / [ ]` task markers.
- Prepared the repo for a new packaged preview build as `codex-managed-agent-1.0.2.vsix`.
- Renamed publish-facing media assets to ASCII-safe filenames and excluded unused non-ASCII art files from the VSIX to avoid Marketplace upload collisions.

## 0.0.2

- Current preview release packaged during the Milestone 1-5 roadmap execution loop.
- Core surfaces include the dashboard, sidebar, bottom panel, board interactions, insights, operational reliability improvements, and initial publishability docs.
