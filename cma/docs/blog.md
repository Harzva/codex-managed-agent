---
title: "Codex-Managed-Agent: a VS Code control surface for Codex threads"
description: "A VS Code extension that manages Codex threads with search, lifecycle actions, Board workflows, Inspector views, and a built-in local Node backend."
date: "2026-04-22"
tags: ["VS Code", "Codex", "Agent", "Dashboard", "Observability", "Workflow"]
---

Codex work often becomes multi-threaded quickly: feature work, debugging, docs, CI repair, and refactors all move in parallel. The official Codex sidebar is useful for conversation, but it is not a whole-workspace control surface for scanning state, pinning important threads, spotting human handoffs, and keeping loop work visible.

**Codex-Managed-Agent (CMA)** turns VS Code into that control surface. It gives you a thread explorer, Board, Inspector, loop visibility, and local insights backed by a built-in Node service.

## What It Solves

- Thread overload: search, sort, group, and pin a large Codex thread set.
- Context spread: show title, cwd, git branch, recent logs, token totals, compaction pressure, and hint commands in one place.
- Operational actions: archive, restore, soft-delete, attach to Board, and open the original Codex thread.
- Loop visibility: surface loop daemon state, recent logs, heartbeat status, and control actions.
- Cross-directory work: filter by base directory and git presence so a large session set becomes navigable.

## Architecture

CMA has three main pieces:

- **Webview UI**: Threads, Board, Inspector, Insights, Live, and Loop views.
- **Extension Host**: VS Code commands, panel placement, Codex sidebar routing, local state, and state broadcasts to the webview.
- **Built-in Node backend**: local HTTP API on the configured `codexAgent.baseUrl`, reading Codex session files and local CMA sidecar state.

The Node backend reads Codex rollout JSONL and local usage data directly. It also maintains CMA-only sidecar state for safe lifecycle actions and display aliases, without mutating Codex session files.

Key source areas:

- `src/panel.js`: extension activation and panel orchestration.
- `src/host/server.js`: local backend startup, probing, and dashboard fetches.
- `src/host/node-backend/`: built-in Node backend, session parsing, indexing, and sidecar state.
- `src/host/state-sync.js`: dashboard refresh and webview payload assembly.
- `src/host/lifecycle.js`: thread actions, Board state, loop controls, and Codex routing.
- `src/webview-template.js`: rendered dashboard experience.

## Quick Start

Install the extension, then run:

- `Codex-Managed-Agent: Open Dashboard`

The extension starts the built-in local backend automatically on `codexAgent.baseUrl` or the next available local candidate. The default base URL is:

```text
http://127.0.0.1:8787/
```

Useful placement commands:

- `Codex-Managed-Agent: Show in Sidebar`
- `Codex-Managed-Agent: Show in Bottom Panel`
- `Codex-Managed-Agent: Open to Side`
- `Codex-Managed-Agent: Full Screen`
- `Codex-Managed-Agent: Move to New Window`

## Core Workflows

### Threads

The thread explorer is the scanning surface:

- Search by title, id, cwd, or base directory.
- Sort by updated time, created time, title, or token count.
- Filter by factual lifecycle state: running, stopped, needs human attention, archived, soft deleted, pinned, and tab membership.
- Filter by base directory and git presence.
- See git branch and full base directory on each thread.

### Board

Board is for the active subset you care about right now:

- Attach important threads to persistent cards.
- Group cards by tabs.
- Keep handoffs and loop-attached work visible.
- Use factual badges for lifecycle state and separate attention markers for human intervention.

### Inspector

Inspector collects the context you usually need before deciding the next action:

- Recent logs and history snippets.
- cwd, rollout path, model, token totals, storage size, and compaction counts.
- Resume/fork hints.
- Lifecycle and Board actions.

### Loop

Loop support makes background automation observable:

- Detect running/stopped loop state from workspace loop state files.
- Show heartbeat and recent stdout.
- Start, stop, and restart the loop from VS Code commands.

## Configuration

Most users only need:

- `codexAgent.baseUrl`: local backend URL, default `http://127.0.0.1:8787/`.
- `codexAgent.defaultSurface`: initial dashboard placement.
- `codexAgent.smartMode`: optional API/model-aware status surfacing.

The extension is Node-native. It does not require a separate local backend package for normal dashboard operation.

## Troubleshooting

If VS Code reports `Microsoft Foundry YAML Validator Server crashed`, that error comes from the Microsoft Foundry extension, not CMA. It does not affect the CMA Node backend. Install `redhat.vscode-yaml` so Microsoft Foundry skips its bundled YAML validator, or disable the Microsoft Foundry extension if you do not use it in the workspace.

## Why This Control Surface Matters

The productivity jump is not only that one conversation becomes smarter. It is that a workspace can safely run many strands of work while preserving:

- Visibility: what is running, stopped, pinned, or waiting for you.
- Operability: actions live next to the state they affect.
- Recoverability: loop and dashboard health are visible instead of hidden in terminal scrollback.

CMA is designed to make Codex feel less like scattered conversations and more like an agent workbench.
