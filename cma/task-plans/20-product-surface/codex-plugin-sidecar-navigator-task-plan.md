# Codex Plugin Sidecar Navigator Long-Term Plan

## Summary

CMA should integrate with the official Codex VS Code extension as a sidecar, not by injecting into or rewriting the official extension UI. CMA owns indexing, navigation, board mapping, diagnostics, and cross-thread operations. The official Codex extension remains the native conversation/runtime surface.

This plan has two product tracks:

- **Sidecar integration**: detect the official Codex extension, expose bridge health, open the Codex sidebar/editor, and keep thread link state visible.
- **CMA AI conversation navigation**: parse Codex JSONL history into turn-level anchors inside CMA, so clicking a navigation item opens CMA's own drawer, scrolls to the corresponding turn, and offers action buttons.

## Goals

- Make CMA aware of the official Codex extension without relying on private webview DOM access.
- Give users reliable actions: Open Codex, Resume, Copy Prompt, Locate Board.
- Build exact turn-level navigation inside CMA where the webview is under CMA control.
- Keep official Codex integration best-effort and visibly diagnostic.
- Avoid presenting CMA as a repair tool for official Codex metadata or as a replacement for Codex itself.

## Non-Goals

- Do not inject a navigation bar into the official Codex extension webview.
- Do not attempt to scroll the official Codex extension to an exact message turn in v1.
- Do not patch official extension files.
- Do not rely on undocumented DOM structure.
- Do not modify Codex session JSONL, `state_5.sqlite`, `auth.json`, or config files as part of navigation.

## Architecture

### Track A: Sidecar Integration

CMA keeps a small adapter around official Codex extension capabilities:

- extension presence: `openai.chatgpt`
- extension version and active state
- contributed command availability:
  - `chatgpt.openSidebar`
  - `chatgpt.newChat`
  - `chatgpt.addToThread`
  - `chatgpt.addFileToThread`
- custom editor route:
  - `chatgpt.conversationEditor`
  - `openai-codex://route/local/<threadId>`
- VS Code tab projection:
  - open Codex thread ids
  - focused Codex thread id
  - last requested sidebar thread id

The UI should label this as **Official Codex Sidecar** or **Codex Plugin Bridge**, with a plain diagnostic tone.

### Track B: CMA AI Conversation Navigation

CMA parses rollout JSONL and normalized thread detail into a navigation model:

- one nav item per meaningful user prompt
- assistant response excerpts as secondary context
- turn metadata:
  - timestamp
  - model/provider when available
  - files mentioned
  - commands/tools observed
  - test/build/error signals
  - board attachment
  - handoff/needs-human signals

Click behavior in v1:

1. Open CMA Thread Drawer.
2. Select the target session/thread.
3. Scroll CMA drawer to the turn anchor.
4. Highlight the user prompt and nearby assistant response.
5. Show actions:
   - Open Codex
   - Resume
   - Copy Prompt
   - Locate Board

## Phases

### Phase 1: Bridge Health

- Add host-side capability summary for the official Codex extension.
- Add Overview panel for extension installed/version/commands/custom editor/link state.
- Keep existing Open Codex actions, but make their availability visible.

### Phase 2: Thread Drawer Turn Anchors

- Normalize thread history into `conversationTurns`.
- Add stable `turnId`/anchor keys.
- Render a compact conversation timeline in the drawer.
- Support scroll + highlight inside CMA.

### Phase 3: Navigator Rail

- Add AI conversation navigator to Thread detail and optionally Overview.
- Group turns by thread, board group, project root, and recency.
- Add search/filter by prompt text, files, commands, and provider.

### Phase 4: Board-Aware Navigation

- Connect navigator items to board cards.
- Add `Locate Board`.
- Add board tab filters derived from active conversation groups.

### Phase 5: Best-Effort Official Codex Resume

- Harden `Open Codex`, `New Chat`, and `Reveal Sidebar` flows.
- Add fallbacks when official commands or URI routes fail.
- Keep exact-turn jump scoped to CMA unless a stable official API appears.

## Risks

- Official command names can change between Codex extension versions.
- `openai-codex:` routes and `chatgpt.conversationEditor` are implementation details, not a public contract.
- VS Code extensions cannot safely manipulate another extension's webview DOM.
- JSONL schema can evolve, so turn parsing must be tolerant.

## Test Plan

- Syntax:
  - `node -c src/host/codex-link.js`
  - `node -c src/panel.js`
  - `node -c src/host/state-sync.js`
  - `node -c src/webview-template.js`
  - `node -c src/webview/panes.js`
  - `node -c src/webview/styles.js`
- Webview regression:
  - `node --test src/webview/render-detail-regression.test.js`
- Manual:
  - Official Codex extension installed: Overview shows version and available bridge.
  - Official Codex extension missing/disabled: Overview shows unavailable bridge without errors.
  - Open Codex from a thread row still opens the official editor.
  - Link badges update when a Codex editor tab is opened/focused.

## Current Recommendation

Build the two tracks in order:

1. Sidecar integration first, because it is low risk and gives visible confidence.
2. CMA conversation navigation next, because exact scrolling and highlighting are reliable only inside CMA's own webview.
