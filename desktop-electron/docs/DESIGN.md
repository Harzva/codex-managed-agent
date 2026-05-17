# Codex Managed Agent Desktop Design System

## Product Type

Developer operations workbench for local Codex sessions, background workers, and evidence review.

## Direction

- Quiet, dense, operational UI.
- Use a neutral graphite base with clear semantic accents: cyan for service, green for healthy work, amber for attention, red for destructive states.
- Avoid marketing hero layouts, oversized cards, decorative gradients, emoji icons, and single-hue palettes.
- Keep the first screen useful: backend health, Codex CLI state, session inventory, filters, and thread detail access.

## Layout Rules

- Desktop-first, responsive down to narrow laptop widths.
- Stable left rail, fixed app header, scrollable content area.
- Do not nest UI cards inside cards.
- Tables and lists must keep stable row heights and visible focus states.
- Use 8px radius or less for cards and controls unless a platform primitive requires otherwise.

## Interaction Rules

- Every async action shows immediate feedback.
- Keyboard focus must be visible.
- Icon-only controls need accessible labels.
- Destructive actions use explicit labels and semantic danger color.
- All buttons maintain at least 36px visual height and 44px hit area where practical.

## Typography

- Use platform UI fonts for native desktop fit: Segoe UI on Windows, SF Pro on macOS, system fallback elsewhere.
- Use tabular numerals for counts, ports, timestamps, and process data.
- Avoid viewport-scaled font sizes and negative letter spacing.

## Motion

- Keep transitions to 120-220ms.
- Prefer opacity and transform.
- Respect `prefers-reduced-motion`.

## Isolation Rules

- Desktop app settings live in Electron `userData`.
- Desktop backend state lives under Electron `userData/backend-state`.
- Read Codex sessions from the configured Codex home, but do not write CMA desktop sidecar state into the VS Code extension directory.
