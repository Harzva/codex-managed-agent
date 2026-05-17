# Codex-Managed-Agent Smoke Checklist

Use this checklist before handing out a VSIX or cutting a release candidate.

## 1. Package

- From the repo root, run:

```bash
npm run package
```

- Confirm a fresh VSIX is produced under `publisher/` with the current package version, for example:
  - `publisher/codex-managed-agent-1.0.37.vsix`

## 2. Install

- In VS Code, open the Extensions view.
- Use `...` -> `Install from VSIX...`.
- Select the generated VSIX from `publisher/`.
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
- Use `Codex-Managed-Agent: Start Local Backend` if needed.
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

## 7. MoA DAG Acceptance Gate (Local-First)

- Run focused acceptance validation from `extension/`:

```bash
npm run validate:moa-dag
```

- Use the canonical 5-step local operator flow in [`docs/demo/moa-dag-acceptance.md#canonical-5-step-local-pass`](docs/demo/moa-dag-acceptance.md#canonical-5-step-local-pass):

1. Plan Team Run (`Generate Orchestration Draft`).
2. Save Draft as Team Space.
3. Inspect DAG workers/conflicts/blackboard.
4. Run Team action and reconcile workers.
5. Inspect trace/archive evidence.
- Keep this gate local-first and Codex-first:
  - do not include LAN/QR/mobile/relay/provider-abstraction work in this acceptance pass
  - do not start Stage 2.5 Role Plugin implementation until MoA DAG acceptance/demo/readme cleanup is complete
- For bounded local worker iterations in this gate, keep worker model policy on `gpt-5.3-codex`.
- Source-of-truth status/checklist references:
  - [`readme.md`](readme.md) (`### MoA DAG acceptance demo path`)
  - [`docs/readme-knowledge-base.md`](docs/readme-knowledge-base.md) (`## MoA DAG Acceptance Slice`)
  - [`docs/demo/moa-dag-acceptance.md`](docs/demo/moa-dag-acceptance.md)
  - [`docs/team-workspace.md`](docs/team-workspace.md)
  - [`task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md`](task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md)
  - [`task-plans/00-roadmap/remote-workflow-reference-roadmap.md`](task-plans/00-roadmap/remote-workflow-reference-roadmap.md)
- Latest focused local validation snapshot (sync with README/demo/roadmap notes):
  - Date: `2026-04-27`
  - Command: `npm run validate:moa-dag`
  - Result: pass (`198` tests total across `134 + 44 + 20`, zero failures, command exit `0`)
  - Rerun confirmation: validated again on 2026-04-27 during Stage 2.5 acceptance (same passing totals)

## 8. Stage 2.5 Role Plugin Gate (Local/Additive)

- Run focused Stage 2.5 validation from `extension/`:

```bash
npm run validate:role-plugins
```

- Keep this gate local-first and additive:
  - built-in role templates and local custom role-template loading only
  - no marketplace/cloud sync/remote role registry/provider abstraction
  - no LAN/QR/mobile/relay work in this gate
- Latest focused local validation snapshot:
  - Date: `2026-04-27`
  - Command: `npm run validate:role-plugins`
  - Result: pass (`86` tests total across `67 + 11 + 8`, zero failures, command exit `0`)
  - Rerun confirmation: validated again on `2026-04-27` (same passing totals)
