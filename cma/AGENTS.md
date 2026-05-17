# Codex-Managed-Agent Project Instructions

This repository is a VS Code extension for managing Codex agent threads,
dashboard surfaces, lifecycle actions, account/profile switching, trace-backed
inspection, and local backend coordination.

## Project Priorities

- Preserve the existing product meaning: this is an operator dashboard for
  Codex-managed work, not a generic chat UI or marketing site.
- Keep changes compatible with the VS Code extension host and the local
  dashboard/backend split already present in `src/host` and `src/webview`.
- Prefer small, traceable implementation steps. Avoid broad rewrites of panel,
  lifecycle, account, backend, or webview runtime code unless a task explicitly
  calls for that scope.
- Keep docs, task plans, and evolution notes aligned with code behavior when a
  change affects user-visible workflows.

## Repository Conventions

- JavaScript is the primary implementation language. Follow the existing
  CommonJS style unless the touched file already uses a different pattern.
- Use Node's built-in test runner patterns already present in `*.test.js`.
- Keep webview code modular. When editing `src/webview-template.js` or runtime
  bundles, prefer existing split modules under `src/webview/`.
- Do not casually edit generated, backup, demo, screenshot, `node_modules`,
  `tmp`, publisher output, or recovered artifacts unless the task is about
  those files.
- Avoid changing package metadata, version numbers, extension contribution
  points, and publish scripts unless the task requires release or packaging
  changes.

## Validation

- For host/backend changes, run the closest `node --test ...` file.
- For webview rendering changes, run the closest webview test and inspect the
  affected UI logic for layout regressions.
- For packaging or manifest changes, run `npm run package` only when the task
  needs a VSIX or publish verification.
- If validation cannot run, record the exact reason.

## Documentation

- Documentation must describe actual behavior. Do not write future-tense claims
  as if they are already implemented.
- Preserve existing Chinese or English terminology in nearby docs unless the
  task is explicitly a rewrite.
- When documenting operational flows, include file paths, commands, and failure
  modes that a maintainer can verify.

## Completion Checklist

- Run `git status --short` before finishing.
- Summarize only the files intentionally changed.
- Report the validation command and result.
- If there are uncommitted intended changes, explicitly say whether they are
  ready to commit. Do not silently skip this step.
