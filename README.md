# Codex-Managed-Agent

<p align="center">
  <img src="./media/codex-agent.png" alt="Codex-Managed-Agent icon" width="96" />
</p>

<h3 align="center">A VS Code control surface for managing Codex threads, board workflows, and local runtime behavior.</h3>

<p align="center">
  <strong>Board-based thread management</strong> · <strong>Inspector and logs</strong> · <strong>Loop-aware operations</strong> · <strong>Codex-linked workflow control</strong>
</p>

## What this extension is for

`Codex-Managed-Agent` is built for people who want to work across many Codex threads without treating the official Codex sidebar as the only control surface.

It turns VS Code into a working surface for:

- scanning many threads at once
- grouping and pinning active work
- surfacing `Needs Human` items
- inspecting logs and conversation context
- managing local runtime behavior
- operating across more than one project root

## Core workflows

### Thread management inside VS Code

Use the dashboard to:

- search, filter, sort, and pin threads
- inspect conversation and log context
- manage lifecycle actions
- move between list, board, and inspector views

### Board-based active work

Use the board when you need a higher-signal operating workspace:

- attach important threads to the board
- keep intervention work visible
- resize and reorganize cards
- scan active state without opening every thread manually

### Runtime and local service control

When paired with the local `codex_manager` service, the extension helps with:

- server reachability checks
- local service startup
- degraded-state recovery visibility
- local dashboard integration on `8787`

## Feature highlights

- Native VS Code dashboard in the editor, sidebar, or bottom panel
- Thread search, filter, sort, grouping, and pin workflows
- Board view for active, attached, and intervention work
- Inspector drawer with logs, conversation context, and actions
- Local server awareness with startup and recovery support
- Loop and background-control surfaces for ongoing work
- Cross-surface navigation between dashboard and Codex thread views

## Screenshots

The screenshot workflow is now organized in five layers:

- capture inventory: [`SCREENSHOT_INVENTORY.md`](./SCREENSHOT_INVENTORY.md)
- execution checklist: [`docs/screenshots/CAPTURE_CHECKLIST.md`](./docs/screenshots/CAPTURE_CHECKLIST.md)
- UI preparation plan: [`docs/screenshots/RESOURCE_PLAN.md`](./docs/screenshots/RESOURCE_PLAN.md)
- shoot order: [`docs/screenshots/SCREENSHOT_SHOOT_ORDER.md`](./docs/screenshots/SCREENSHOT_SHOOT_ORDER.md)
- per-shot scene design: [`docs/screenshots/SCENE_DESIGN.md`](./docs/screenshots/SCENE_DESIGN.md)

Planned final image paths:

- `docs/screenshots/main-dashboard.png`
- `docs/screenshots/board-active-cards.png`
- `docs/screenshots/needs-human-dock.png`
- `docs/screenshots/docked-layout.png`

Optional:

- `docs/screenshots/insights-topic-map.png`
- `docs/screenshots/inspector-detail.png`

## Installation

### Install from Marketplace

Search for:

- `Codex-Managed-Agent`

Publisher:

- `harzva`

### Install from VSIX

```bash
code --install-extension codex-managed-agent-0.0.3.vsix
```

Or inside VS Code:

1. Open Extensions
2. Click `...`
3. Choose `Install from VSIX...`
4. Select the generated package

## Local service setup

The extension works best with the local `codex_manager` service.

Start it like this:

```bash
cd <your-workspace>/codex_manager
source .venv/bin/activate
uvicorn codex_manager.app:app --reload --port 8787
```

If the service is not reachable, the extension can try to start it automatically.

## Development workflow

1. Open this extension folder in VS Code
2. Press `F5`
3. Choose `Run Codex Agent Extension` if prompted
4. In the Extension Development Host, run:
   - `Codex-Managed-Agent: Open Dashboard`

Useful placement commands:

- `Codex-Managed-Agent: Open Dashboard`
- `Codex-Managed-Agent: Show in Sidebar`
- `Codex-Managed-Agent: Show in Bottom Panel`
- `Codex-Managed-Agent: Open to Side`
- `Codex-Managed-Agent: Full Screen`
- `Codex-Managed-Agent: Move to New Window`

## Configuration

### `codexAgent.baseUrl`

- default: `http://127.0.0.1:8787/`
- use this when your local dashboard is running on a different URL or port

### `codexAgent.autoStartServer`

- default: `true`
- attempts to start the local service when the panel cannot connect

### `codexAgent.pythonPath`

- optional override for the Python executable used to launch the local service

### `codexAgent.serverRoot`

- optional absolute path to the local `codex_manager` service root

## Commands

- `Codex-Managed-Agent: Open Dashboard`
- `Codex-Managed-Agent: Show in Sidebar`
- `Codex-Managed-Agent: Show in Bottom Panel`
- `Codex-Managed-Agent: Open to Side`
- `Codex-Managed-Agent: Full Screen`
- `Codex-Managed-Agent: Move to New Window`
- `Codex-Managed-Agent: Refresh Panel`
- `Codex-Managed-Agent: Open in Browser`
- `Codex-Managed-Agent: Start Local Server`

## Release workflow

Package locally:

```bash
npm run package
```

Before calling a build release-ready, use:

- [`SMOKE_CHECKLIST.md`](./SMOKE_CHECKLIST.md)
- [`CHANGELOG.md`](./CHANGELOG.md)
- [`SCREENSHOT_INVENTORY.md`](./SCREENSHOT_INVENTORY.md)

## Current status

This extension is still a preview build.

The current focus is to make it:

- operationally reliable
- smoother as a board-based control surface
- more usable for multi-thread Codex work inside VS Code

## Repository

- Source: `https://github.com/Harzva/codex-managed-agent`
