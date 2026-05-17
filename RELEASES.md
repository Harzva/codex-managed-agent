# Codex Managed Agent Release Workflows

This repository keeps the VS Code extension and the desktop shell in one codebase, but publishes them through separate release lanes.

Current source directories:

- `cma/`: the complete VS Code extension source used for VSIX builds.
- `desktop-electron/`: the isolated Windows/macOS desktop shell.
- `extension/`: legacy partial extraction, not used by release workflows.
- `extension.zip`: local partial export archive, ignored by Git.
- `reference/` directories: local research/reference material, ignored by Git and not included in release branches.

## Workflows

- `.github/workflows/desktop-electron-build.yml`
  - Manual build: run `Desktop Electron Build` from GitHub Actions.
  - Desktop release: push a tag like `desktop-v0.1.0`.
  - Produces Windows EXE/portable output and macOS DMG/ZIP artifacts.
  - Pull requests and normal branch pushes run tests only; installers are built only for manual runs and `desktop-v*` tags.

- `.github/workflows/vsix-build.yml`
  - Manual build: run `VSIX Build` from GitHub Actions.
  - VSIX release: push a tag like `vsix-v1.0.38`.
  - Produces `codex-managed-agent-<version>.vsix`.

- `.github/workflows/release.yml`
  - Unified release: push a tag like `v1.1.0`.
  - Manual unified build: run `Unified Release` from GitHub Actions.
  - Produces the VSIX, Windows desktop package, and macOS desktop package in one run.
  - When manually publishing to an existing tag, the workflow checks out that tag before building.

## Tag Rules

- `desktop-vX.Y.Z` must match `desktop-electron/package.json`.
- `vsix-vX.Y.Z` must match `cma/package.json`.
- `vX.Y.Z` is the combined product release tag and can include all three artifacts even when the internal package versions differ.

## Source Requirement

The VSIX workflows intentionally fail if `cma/src/panel.js` is missing. This prevents GitHub Actions from publishing a broken extension package from a partial local export.

VSIX packaging uses the pinned `@vscode/vsce` dev dependency from `cma/package-lock.json` through `npm run publish:vsix`, so CI does not fetch an unpinned packaging tool.

## Release Evidence

Each build uploads a small `release-manifest-*.json` file with the package version, source directory, ref, commit SHA, run id, and generated time. Keep these manifests attached to GitHub Releases; they are useful when checking which source produced an artifact.

## Signing

The current desktop workflows produce unsigned preview artifacts. Add Windows code-signing and macOS signing/notarization secrets before treating the desktop packages as a public trusted release.
