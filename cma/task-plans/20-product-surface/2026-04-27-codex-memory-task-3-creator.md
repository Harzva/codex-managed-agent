# Task 3 — Memory Creator & Templates

## Parent

[`2026-04-27-codex-memory-manager-roadmap.md`](./2026-04-27-codex-memory-manager-roadmap.md)

## Objective

Lower the barrier to entry by letting users create a project `AGENTS.md` from a template when one does not exist.

## Why

Most projects start without Codex memory. Users shouldn't need to know the exact format of `AGENTS.md` to get started. A one-click "Create from Template" with sensible defaults removes friction.

## Templates

### Template A — Minimal

```markdown
# Project Instructions

## Commands

```bash
# Dev
npm run dev

# Test
npm test
```

## Rules

- Always run tests before committing.
```

### Template B — Full (for complex projects)

```markdown
# Project Instructions

## Commands

```bash
# Dev
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```

## Architecture

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** PostgreSQL

## Rules

- Always write tests for new features.
- Prefer TypeScript strict mode.
- Do not commit `.env` files.
```

### Template C — From Global

Copy the global `~/.codex/AGENTS.md` as a starting point, then let the user edit it.

## Files to Modify

### `src/webview-template.js` — Creator UI

Add a "Create Project Memory" modal/flow:

```javascript
function renderMemoryCreator() {
  return '<div class="memory-creator-overlay">' +
    '<div class="memory-creator-modal">' +
      '<h3 class="memory-creator-title">Create Project AGENTS.md</h3>' +
      '<p class="memory-creator-desc">Choose a template to get started.</p>' +
      '<div class="memory-creator-options">' +
        '<button class="memory-creator-option" data-memory-template="minimal" type="button">' +
          '<strong>Minimal</strong><span>A simple starter with commands and basic rules.</span>' +
        '</button>' +
        '<button class="memory-creator-option" data-memory-template="full" type="button">' +
          '<strong>Full</strong><span>Architecture, commands, testing, and lint rules.</span>' +
        '</button>' +
        '<button class="memory-creator-option" data-memory-template="from-global" type="button">' +
          '<strong>Copy from Global</strong><span>Start with your global AGENTS.md as a base.</span>' +
        '</button>' +
      '</div>' +
      '<div class="memory-creator-actions">' +
        '<button class="chip" data-memory-creator-close type="button">Cancel</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}
```

### `src/host/memory-manager.js` — Template Engine

```javascript
const TEMPLATES = {
  minimal: `# Project Instructions

## Commands

\`\`\`bash
# Dev
npm run dev

# Test
npm test
\`\`\`

## Rules

- Always run tests before committing.
`,
  full: `# Project Instructions

## Commands

\`\`\`bash
# Dev
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
\`\`\`

## Architecture

- Add your stack here.

## Rules

- Always write tests for new features.
- Do not commit secrets.
`,
};

function createAgentsMdFromTemplate(templateKey, targetPath, options = {}) {
  let content = TEMPLATES[templateKey] || TEMPLATES.minimal;

  if (templateKey === "from-global") {
    const globalPath = path.join(resolveCodexHome(), "AGENTS.md");
    try {
      content = fs.readFileSync(globalPath, "utf8");
    } catch {
      content = TEMPLATES.minimal;
    }
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, "utf8");

  return { ok: true, filePath: targetPath, content };
}

module.exports = { ..., createAgentsMdFromTemplate };
```

### `src/webview/styles.js` — Creator CSS

```css
.memory-creator-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 250; display: flex; align-items: center; justify-content: center; }
.memory-creator-modal { width: 480px; max-width: 92vw; background: var(--bg); border: 1px solid var(--line); border-radius: 16px; padding: 24px; display: grid; gap: 16px; }
.memory-creator-title { font-size: 16px; font-weight: 800; margin: 0; }
.memory-creator-desc { color: var(--muted); font-size: 13px; margin: 0; }
.memory-creator-options { display: grid; gap: 10px; }
.memory-creator-option { display: grid; gap: 4px; padding: 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); cursor: pointer; text-align: left; }
.memory-creator-option:hover { border-color: var(--cyan); background: var(--panel-elevated); }
.memory-creator-option strong { font-size: 13px; }
.memory-creator-option span { font-size: 12px; color: var(--muted); }
.memory-creator-actions { display: flex; justify-content: flex-end; padding-top: 8px; }
```

**Light theme overrides:**
```css
body:is(.color-theme-light, ...) .memory-creator-overlay { background: rgba(0,0,0,0.32); }
body:is(.color-theme-light, ...) .memory-creator-modal { background: var(--bg); border-color: var(--line); }
body:is(.color-theme-light, ...) .memory-creator-option { background: var(--panel-elevated); border-color: var(--line); }
```

## Acceptance

- [x] Clicking "+ Create Project Memory" opens the template chooser
- [x] Three templates are available: Minimal, Full, Copy from Global
- [x] Selecting a template creates `.codex/AGENTS.md` in the project root
- [x] If global AGENTS.md does not exist, "Copy from Global" falls back to Minimal
- [x] After creation, the memory list refreshes and shows the new file as "exists"
- [x] The newly created file can be immediately edited via the Edit button
- [x] Modal can be cancelled without side effects
- [x] Light theme renders correctly

2026-05-07 verification: creator UI is rendered in `src/webview-template.js`, creation is routed through `createAgentsMdFromTemplate`, and template fallback is covered by `src/host/memory-manager.test.js`.
