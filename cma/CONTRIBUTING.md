# Contributing to Codex-Managed-Agent

Thanks for your interest in making CMA better!

## Development Setup

1. Open this extension folder in VS Code
2. Press `F5`
3. Choose `Run Codex Agent Extension` if prompted
4. In the Extension Development Host, run:
   - `Codex-Managed-Agent: Open Dashboard`

## Testing

Run the full validation suite:

```bash
npm run validate:moa-dag
npm run validate:role-plugins
```

Or run individual test files:

```bash
node --test src/host/moa-core.test.js
node --test src/host/team-coordination.test.js
node --test src/webview/render-detail-regression.test.js
```

## Demo Workflows

### Snake Demo

Open [`docs/demo/snake.html`](docs/demo/snake.html) directly in a browser. No build or server is required.

### MoA DAG Acceptance Demo

- Demo recipe: [`docs/demo/moa-dag-acceptance.md`](docs/demo/moa-dag-acceptance.md)
- Canonical 5-step local pass: [`docs/demo/moa-dag-acceptance.md#canonical-5-step-local-pass`](docs/demo/moa-dag-acceptance.md#canonical-5-step-local-pass)
- Focused validation: `npm run validate:moa-dag`

## Screenshot Capture Rules

When updating UI, capture screenshots for:
- Overview dashboard
- Thread explorer
- Agent board
- Insights
- Loop control
- Team Core

Place screenshots in `docs/screenshots/` and update `SCREENSHOT_INVENTORY.md`.

## Commit Style

- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Move cursor to..." not "Moves cursor to...")
- Reference issues when applicable
