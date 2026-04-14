# Codex-Managed-Agent

Manage Codex threads inside VS Code with a dedicated dashboard, board view, inspector, and local runtime controls.

`Codex-Managed-Agent` is built for people who want to work across many Codex threads without treating the official sidebar as the only control surface.

## Why this extension exists

Codex already gives you thread-level interaction. What it does not give you well is a strong in-editor management surface for:

- scanning many threads at once
- grouping and pinning active work
- watching `Needs Human` states
- inspecting logs and conversation context
- controlling loop and background runtime behavior
- managing work across more than one project root

`Codex-Managed-Agent` is the layer that sits above those threads and turns them into an operating workspace.

## Core workflows

### 1. Thread management inside VS Code

Use the dashboard to:

- search, filter, sort, and pin threads
- inspect logs and conversation context
- manage lifecycle actions
- move between list, board, and inspector views

### 2. Board-based active work

Use the board when you need a higher-signal working surface:

- attach important threads to the board
- keep `Needs Human` items visible
- resize and reorganize cards
- track active operational state without opening each thread one by one

### 3. Runtime and local service control

The extension can work with the local `codex_manager` service and help with:

- server reachability checks
- starting the local service when needed
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

Real screenshots should be used here for release-quality presentation. The current capture plan is tracked in:

- [`SCREENSHOT_INVENTORY.md`](./SCREENSHOT_INVENTORY.md)

Recommended screenshot sections for the marketplace page:

### Main Dashboard

Show:

- thread list
- board summary
- one populated inspector state

### Board With Active Cards

Show:

- active cards
- `Needs Human` presence
- readable card density

### Needs Human Dock

Show:

- multiple urgent cards
- compact but visible intervention space

### Sidebar or Bottom Placement

Show:

- the extension docked in a normal VS Code layout

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
