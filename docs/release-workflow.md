# CMA release workflow

This repository is the clean publishing mirror for Codex-Managed-Agent. The active development workspace can live elsewhere, but every Marketplace release should be packaged from the current development source and then mirrored here for traceability.

## Why we keep a publishing mirror

The development workspace is optimized for fast iteration: F5 debugging, recovered work, local loop state, experimental plans, and frequent UI changes. That is the place where the extension is shaped.

The publishing mirror is optimized for release hygiene. It should be good enough to explain and reproduce the published VSIX, but it does not need to carry every temporary development artifact. Its main job is to keep GitHub and the Marketplace package aligned.

This split avoids two common problems:

- The Marketplace package accidentally includes local-only files, stale assets, or non-ASCII asset paths that can break upload.
- The clean GitHub repository drifts away from the actual development version that users install.

## Source of truth

The source of truth for a release is the current working development extension directory, for example:

```text
/home/clashuser/hzh/work_bo/codex_manager/vscode-extension/recovered/codex-managed-agent-0.0.71/extension
```

The publishing mirror lives at:

```text
/home/clashuser/export/codex-managed-agent
```

For each release, sync the development extension into the publishing mirror, excluding generated package files and local-only caches, then package from the synchronized tree or copy the VSIX that was built directly from the development source.

## Release checklist

1. Confirm the development extension works in VS Code with F5.
2. Set `package.json` to the release version and `preview: false` for stable releases.
3. Ensure `media/` asset filenames are ASCII-safe.
4. Build the VSIX from the development source.
5. Copy the VSIX to the publishing mirror release path.
6. Run VSIX path checks to make sure it has no non-ASCII paths.
7. Sync and commit the publishing mirror to GitHub.
8. Create or update the GitHub Release with the VSIX asset.
9. Upload the same VSIX to the VS Code Marketplace.

## Current release artifact

The current release artifact is:

```text
/home/clashuser/export/codex-managed-agent/codex-managed-agent-1.0.3.vsix
```

This file is intentionally not committed to git. It is uploaded as a GitHub Release asset and to the Marketplace.

