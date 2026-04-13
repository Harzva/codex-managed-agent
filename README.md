# Codex-Managed-Agent VS Code Extension

This extension now renders a native VS Code webview for `Codex-Managed-Agent` in the editor area instead of embedding the browser app through an iframe.

## What it does

- Opens `Codex-Managed-Agent` as an editor tab in the center area
- Opens a native sidebar dashboard rendered by the extension
- Detects whether the local `Codex-Managed-Agent` server is reachable
- Can auto-start the FastAPI server on `8787`
- Lets you reopen the dashboard in the browser when needed

## How to use

1. Make sure the FastAPI app is running:

   ```bash
   cd /home/clashuser/hzh/work_bo/codex_manager
   source .venv/bin/activate
   uvicorn codex_manager.app:app --reload --port 8787
   ```

2. In VS Code, open the `codex_manager/vscode-extension` folder
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

## Setting

- `codexAgent.baseUrl`
  - default: `http://127.0.0.1:8787/`
  - point this to another port if your local dashboard runs elsewhere
- `codexAgent.autoStartServer`
  - default: `true`
  - starts the local FastAPI service when the panel cannot connect
- `codexAgent.pythonPath`
  - optional override for the Python binary used to launch the server

## Commands

- `Codex-Managed-Agent: Focus Panel`
- `Codex-Managed-Agent: Refresh Panel`
- `Codex-Managed-Agent: Open in Browser`
- `Codex-Managed-Agent: Start Local Server`

## Package as VSIX

Local installable package:

```bash
cd /home/clashuser/hzh/work_bo/codex_manager/vscode-extension
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

## Publish more broadly

If you want to publish beyond local VSIX install, there are two paths:

1. Private / team-only distribution
   - keep sharing the `.vsix` file directly
   - simplest path for internal use

2. Visual Studio Marketplace
   - create a real publisher account
   - replace `"publisher": "local"` in `package.json`
   - create a Personal Access Token for Marketplace publishing
   - run:

   ```bash
   npx @vscode/vsce login <publisher-name>
   npx @vscode/vsce publish
   ```

For Marketplace publishing, the extension metadata usually needs a better publisher name, repository URL, and polished README/icon assets.
