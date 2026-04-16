# Codex-Managed-Agent Smoke Checklist

Use this checklist before handing out a VSIX or cutting a release candidate.

## 1. Package

- From the repo root, run:

```bash
npm run package
```

- Confirm a fresh `codex-managed-agent-0.0.3.vsix` is produced in the repo root.

## 2. Install

- In VS Code, open the Extensions view.
- Use `...` -> `Install from VSIX...`.
- Select the generated `codex-managed-agent-0.0.3.vsix`.
- Reload the window if VS Code asks for it.

## 3. Activation

- Confirm the `Codex-Managed-Agent` activity-bar container appears.
- Confirm the bottom-panel view also appears.
- Run `Codex-Managed-Agent: Open Dashboard`.
- Run `Codex-Managed-Agent: Show in Sidebar`.
- Run `Codex-Managed-Agent: Show in Bottom Panel`.

## 4. Local Server Path

- Open the dashboard with the local service stopped.
- Confirm the extension shows a recoverable service state instead of failing silently.
- Use `Codex-Managed-Agent: Start Local Server` if needed.
- Confirm the dashboard refreshes into a usable state once the service is reachable.

## 5. Core UI Smoke

- Confirm the main dashboard renders without a blank webview or boot error.
- Confirm the thread list is visible.
- Select one thread and confirm the drawer opens.
- Confirm at least one thread-level action is clickable.
- Confirm refresh still works after opening the drawer.

## 6. Packaging Gate

- If any step above fails, do not treat the VSIX as release-ready.
- If all steps pass, record the command used, the VSIX filename, and the VS Code version used for the smoke pass.
