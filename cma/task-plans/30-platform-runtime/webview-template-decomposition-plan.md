# Webview Template Decomposition Plan

## Goal

Reduce `src/webview-template.js` from roughly 15k lines to below 10k lines without changing generated webview behavior.

## Completed First Slice

- [x] Move the static `<style>` block into `src/webview/styles.js`.
- [x] Keep CSP behavior unchanged by still rendering CSS inside the inline `<style>` tag.
- [x] Keep `getWebviewHtml(...)` as the single HTML assembly entry point.
- [x] Verify syntax and existing Node tests.
- [x] Move the static boot status SVG renderer into `src/webview/boot.js`.
- [x] Move display/theme/filter constants into `src/webview/display.js`.
- [x] Move command/action rendering helpers into `src/webview/actions.js`.
- [x] Move thread explorer group and row rendering into `src/webview/thread-explorer.js`.
- [x] Move boot progress, hydration status, and retry helpers into `src/webview/boot-progress.js`.
- [x] Move theme, motion, and sound display-state helpers into `src/webview/display-state.js`.
- [x] Move webview media URI construction into `src/webview/media.js`.
- [x] Move static workspace shell and low-risk page panes into `src/webview/panes.js`.
- [x] Move small HTML utility renderers into `src/webview/html-utils.js`.
- [x] Move pure Insights runtime chart helpers into `src/webview/insights-runtime.js`.
- [x] Move Insights topic map helpers into `src/webview/insights-topic-map.js`.
- [x] Move Drawer leaf renderers into `src/webview/drawer-runtime.js`.
- [x] Move Thread Insight panel renderer into `src/webview/thread-insight-panel.js`.

Result:

- `src/webview-template.js`: 7042 lines.
- `src/webview/styles.js`: 6836 lines.
- `src/webview/media.js`: media URI construction for webview-safe asset URLs.
- `src/webview/panes.js`: static top chrome, overview/team/threads/live/loop panes, utility bar, and shell composition.
- `src/webview/html-utils.js`: small runtime HTML helpers shared by drawer/action renderers.
- `src/webview/boot.js`: boot loading visual.
- `src/webview/boot-progress.js`: runtime boot progress, hydration failure, and ready retry helpers.
- `src/webview/display.js`: UI-state version, theme orders, labels, and thread filter/sort labels.
- `src/webview/display-state.js`: runtime color theme, visual theme, motion, and sound state helpers.
- `src/webview/actions.js`: runtime command cards, terminal/git buttons, and lifecycle action buttons.
- `src/webview/thread-explorer.js`: runtime thread rows, root subgroups, project/status groups, and directory grouping helpers.
- `src/webview/insights-runtime.js`: runtime keyword chips, word cloud, interaction heatmap, token trend, model/tool charts, and token ranking helpers.
- `src/webview/insights-topic-map.js`: runtime topic-map fallback synthesis, node focus matching, SVG node rendering, and protected `data-topic-*` attributes.
- `src/webview/drawer-runtime.js`: runtime Drawer leaf renderers for key/value cells, summary stats, log rows, and conversation rows.
- `src/webview/thread-insight-panel.js`: runtime thread insight command-flow and vibe-advice panel renderer.

## Next Safe Slices

1. Extract boot/loading helpers:
   - done for boot progress/status helpers, hydration failure notice, and retry timers

2. Extract theme and display-state helpers:
   - done for color theme helpers, visual theme helpers, motion toggle, and sound style helpers

3. Extract board runtime helpers:
   - board grouping
   - board placement/layout
   - card sizing and drag/drop utilities

4. Extract thread explorer rendering:
   - done for group rendering, row rendering, root/project grouping, and base-directory rendering

5. Extract command/action rendering:
   - done for terminal resume button, git action buttons, lifecycle action buttons, quick action buttons, and command cards

## Medium-Risk Long-Term Roadmap

Principle: split slowly, one renderer family at a time. Each step should preserve the single generated webview script model, keep behavior unchanged, and stop immediately if a boundary starts pulling board drag/drop or drawer state mutation along with it.

### Phase 1 - Insights Runtime, Pure Helpers Only

Target file:

- `src/webview/insights-runtime.js`

Moved:

- keyword chip rendering
- horizontal bar chart rendering
- token trend rendering
- token model/tool rows
- word cloud rendering
- interaction heatmap rendering
- token thread ranking

Do not move yet:

- `render(...)`
- payload merge/cache logic
- topic focus mutation
- event handlers
- weekly report helpers
- thread insight advice helpers

Acceptance:

- [x] extracted functions are mostly data-in, markup-out
- [x] no direct writes to `state.ui`
- [x] no `vscode.postMessage`
- [x] no DOM mutation except returning markup strings

### Phase 2 - Insights Topic Map

Target file:

- `src/webview/insights-topic-map.js`

Moved:

- `renderTopicMap`
- topic node helpers
- fallback topic-map synthesis

Special care:

- [x] keep `data-topic-*` attributes identical
- [x] do not move click handlers yet
- [x] preserve `topicFocusMatches` in `src/webview-template.js`

Acceptance:

- [x] generated HTML still contains topic-map renderer, SVG markup, and topic data attributes
- [x] extracted helpers do not touch `state`, `vscode.postMessage`, or DOM mutation

### Phase 3 - Drawer Leaf Components

Target file:

- `src/webview/drawer-runtime.js`

Moved:

- `kv`
- `drawerStat`
- log row rendering
- conversation row rendering

Do not move yet:

- `renderDetail`
- drawer open/close logic
- pending drawer action mutation
- lifecycle dispatch or quick action event handling

Acceptance:

- [x] extracted functions do not mutate `state`
- [x] extracted functions do not bind events or mutate DOM
- [x] `renderDetail` remains in `src/webview-template.js`

### Phase 4 - Thread Insight Panel

Target file:

- `src/webview/thread-insight-panel.js`

Moved:

- `renderThreadInsightPanel`
- command flow/vibe advice mini cards
- any helper that is only used by that panel

Special care:

- [x] keep `renderIconBadge` and `renderInsightCard` as generated-script dependencies
- [x] keep loading/ready/error/idle states unchanged
- [x] keep `data-generate-thread-advice` on the generate button

Acceptance:

- [x] generated HTML still contains the thread insight renderer and generate-advice data attribute
- [x] extracted panel does not touch `state`, `vscode.postMessage`, or DOM mutation

### Phase 5 - Drawer Orchestrator, Last

Target file:

- `src/webview/drawer-runtime.js`

Current boundary:

- `renderDetail`

Do not combine with other changes. `renderDetail` currently owns DOM lookup, closed-state reset, derived drawer view state, header/meta rendering, summary stats, action rail, body sections, and per-render event binding.

Recommended split order:

1. Add/keep focused UI regression first:
   - `src/webview/render-detail-regression.test.js`
   - run `node --test src/webview/render-detail-regression.test.js`
   - keep this test green before and after each sub-slice

2. Extract markup builders only:
   - [x] `renderDrawerMeta(...)`
   - [x] `renderDrawerSummaryStats(...)`
   - [x] `renderDrawerActionRail(...)`
   - [x] `renderDrawerBodySections(...)`
   - all should be data-in, markup-out and should not call `document`, mutate `state`, or post messages

3. Keep event binding local until the markup builders are stable:
   - lifecycle action binding
   - quick action binding
   - drawer cancel/confirm binding
   - generate thread advice binding

4. Extract a small view-model helper only if it stays narrow:
   - [x] `buildDrawerDetailContext(payload)` returning thread, summary, logs, history, labels, phase, coordination, pending action metadata
   - stop if this starts passing a large dependency bag or re-implementing existing global helpers

5. Move the orchestrator last:
   - only after markup builders and regression tests are stable
   - final `renderDetail(payload)` may still remain a generated-script function that performs DOM lookup, open/close class toggles, HTML assignment, and event binding
   - current decision: stop here for now; do not move the full orchestrator until there is a stronger reason than line-count reduction

Acceptance:

- drawer closed state unchanged
- selected thread, stale detail, soft delete, restore, hard delete, handoff, terminal, and command cards all remain functional
- one full regression pass before any further refactor
- `renderDetail` regression test covers:
  - populated drawer opens and renders title, stats, actions, logs, conversation, and Thread Insight
  - pending drawer action renders confirm rail
  - closed drawer resets title/body and removes open classes

Stop rules for this phase:

- Stop if moving event binding changes which elements receive listeners.
- Stop if action rail extraction changes `data-lifecycle-*`, `data-quick-*`, `data-drawer-*`, or `data-generate-thread-advice`.
- Stop if a helper needs direct access to `document`, `window`, or `vscode`.
- Stop if body-section extraction starts pulling board drag/drop, running card, or Thread Explorer state.

## Medium-Risk Stop Rules

- Stop if an extraction requires changing event handler behavior.
- Stop if an extracted function needs to own board layout, drag/drop, or resize state.
- Stop if a helper starts accepting more than a small dependency bag just to avoid globals.
- Stop if rendered markup changes are not intentional and reviewable.

## Medium-Risk Regression Checklist

- Run all existing Node tests listed below.
- Run `node --check` on every touched `src/webview/*.js` file.
- Add a small module smoke check for each new runtime module, requiring it and asserting expected function names appear in the generated script.
- Run the focused drawer UI regression before touching and after touching `renderDetail`:
  - `node --test src/webview/render-detail-regression.test.js`
- Open the dashboard manually after each phase and check:
  - Overview renders
  - Threads renders
  - Board renders
  - Insights renders charts/topic map
  - Drawer opens for a thread
  - command buttons still dispatch

## Regression Checklist

- `node --check src/webview-template.js`
- `node --check src/webview/styles.js`
- `node --check src/webview/render-detail-regression.test.js`
- `node --test src/webview/render-detail-regression.test.js`
- Require `src/webview/styles.js` and assert key selectors exist.
- Run existing Node tests:
  - `src/host/service-capabilities.test.js`
  - `src/host/team-coordination.test.js`
  - `src/host/server.test.js`
  - `src/host/node-backend/node-backend.test.js`
  - `src/host/node-backend/parity-smoke.test.js`
