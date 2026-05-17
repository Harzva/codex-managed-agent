# Codex Managed Agent Desktop

Isolated Electron desktop shell for Codex-Managed-Agent.

This project is intentionally separate from `../cma`, the VSIX source directory. It reuses the Node backend contract from the VS Code extension package, but desktop settings, backend cache, lifecycle sidecar state, and watch state are stored under Electron `userData`.

## Commands

```powershell
npm install
npm run dev
npm test
```

Notes:

- Windows and macOS packages are produced by GitHub Actions in `.github/workflows/desktop-electron-build.yml`.
- Local packaging is intentionally avoided so release artifacts are created in a clean CI runner.
- Use the manual `Desktop Electron Build` workflow dispatch to produce artifacts without pushing a release tag.
- Push a `desktop-vX.Y.Z` tag to publish the desktop artifacts to a GitHub Release.
- Push a root `vX.Y.Z` tag to build the unified VSIX + Windows + macOS release workflow.
- Pull requests and ordinary branch pushes run desktop tests; installer packaging is reserved for manual runs and release tags.
- macOS signing/notarization is not configured yet; CI sets `CSC_IDENTITY_AUTO_DISCOVERY=false` and produces unsigned MVP artifacts.
- The desktop backend starts on `127.0.0.1:18787` by default and scans nearby ports if occupied.
- The configured Codex home defaults to `CODEX_HOME` or `~/.codex`.

## Isolation

The `cma` VS Code extension source directory is not modified. The desktop app reads Codex session files from the configured Codex home, while its own backend state is kept in app data:

- Windows: `%APPDATA%\Codex Managed Agent Desktop`
- macOS: `~/Library/Application Support/Codex Managed Agent Desktop`

## Current MVP

- Native Electron shell.
- Isolated local Node backend.
- Backend health and Codex CLI inventory.
- Thread list, search, filters, detail drawer, and safe lifecycle actions.
- Settings view for port and Codex home.
