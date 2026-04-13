# Codex-Managed-Agent VS Code Extension

`Codex-Managed-Agent` is a VS Code extension for managing Codex agent threads inside the editor.

It provides a native VS Code surface for:

- browsing and filtering threads
- pinning and grouping active work
- inspecting logs and conversation history
- running lifecycle actions
- opening and controlling the local dashboard service

## What it does

- Opens `Codex-Managed-Agent` in the editor area, sidebar, or bottom panel
- Detects whether the local `Codex-Managed-Agent` server is reachable
- Can auto-start the local FastAPI server on `8787`
- Supports thread search, filter, sort, and pin workflows
- Includes an inspector drawer with conversation, logs, and command helpers
- Supports single-thread and batch lifecycle actions

## Current status

This extension is currently a preview build intended for local and team workflows.

It works best when paired with the local `codex_manager` service that exposes thread and log data.

## Development usage

1. Start the local service:

   ```bash
   cd <your-workspace>/codex_manager
   source .venv/bin/activate
   uvicorn codex_manager.app:app --reload --port 8787
   ```

2. In VS Code, open this extension folder
3. Press `F5`
4. Choose `Run Codex Agent Extension` if VS Code asks for a launch target
5. A new `Extension Development Host` window opens
6. Run `Codex-Managed-Agent: Open Dashboard` from the Command Palette

Useful placement commands:

- `Codex-Managed-Agent: Open Dashboard`
- `Codex-Managed-Agent: Show in Sidebar`
- `Codex-Managed-Agent: Show in Bottom Panel`
- `Codex-Managed-Agent: Open to Side`
- `Codex-Managed-Agent: Full Screen`
- `Codex-Managed-Agent: Move to New Window`

Notes:

- The extension now also shows a left Activity Bar icon.
- The editor tab can be opened in the center area, beside another editor, or moved to a new window.
- The docked view can be opened in the Sidebar or the bottom Panel.
- If you want it on the right side, drag the view container to the Secondary Side Bar or move the Side Bar position in VS Code.

If the server is not running, the extension will try to start it automatically when the panel opens.

## Settings

- `codexAgent.baseUrl`
  - default: `http://127.0.0.1:8787/`
  - point this to another port if your local dashboard runs elsewhere
- `codexAgent.autoStartServer`
  - default: `true`
  - starts the local FastAPI service when the panel cannot connect
- `codexAgent.pythonPath`
  - optional override for the Python binary used to launch the server
- `codexAgent.serverRoot`
  - optional absolute path to the local `codex_manager` server root

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

## Package as VSIX

Local installable package:

```bash
cd /path/to/codex-managed-agent
npx @vscode/vsce package
```

This produces a file like:

```text
codex-managed-agent-0.0.1.vsix
```

Then install it in VS Code:

1. Open Extensions view
2. Click `...`
3. Choose `Install from VSIX...`
4. Select the generated `.vsix`

## Publish to Marketplace

Typical release flow:

```bash
npx @vscode/vsce package
npx @vscode/vsce publish
```

Publishing requires:

- a valid Visual Studio Marketplace publisher
- authentication for `vsce publish`

## Repository

- Source: `https://github.com/Harzva/codex-managed-agent`
