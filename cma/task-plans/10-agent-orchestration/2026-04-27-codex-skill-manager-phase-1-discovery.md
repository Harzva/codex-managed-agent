# Codex Skill Manager — Phase 1: Discovery & Browser

## Status

- [x] Complete (2026-05-07)

Completion note:
- Host scanner lives in `src/host/skill-manager.js` and is covered by `src/host/skill-manager.test.js`.
- Webview Skills surface lives in Overview -> Skills, with installed/bundled sections, search, cards, status badges, drawer tabs, and bundled install/update/open-folder actions.
- Payload now exposes `skillMdPreview` for drawer rendering while keeping the raw `skillMd` field out of the serialized payload.

## Date

2026-04-27

## Parent Roadmap

See: [`00-roadmap/2026-04-27-codex-skill-manager-roadmap.md`](../00-roadmap/2026-04-27-codex-skill-manager-roadmap.md)

## Objective

Build the foundational skill management UI: scan the local skill directory, render a browsable grid/list of skills, and open a detail drawer with a rendered Markdown preview of SKILL.md.

This phase does **not** add new install/update/uninstall flows. It surfaces what already exists in `bundled-skills.js` and on disk.

## Why This Matters

Today users have no visibility into which skills are installed, what they do, or whether an update is available. The only UI hint is a single "Update" button when a bundled skill has changed. Phase 1 makes the skill inventory legible.

## Scope

### In Scope

- New `Skills` tab in the CMA dashboard top navigation
- Scan `~/.codex/skills/` (or `$CODEX_HOME/skills/`) for installed skills
- Scan `bundled-skills/` for bundled skills
- Render skills in a grid/list view with:
  - Skill icon (from manifest or default)
  - Name + version
  - Short description
  - Status badge: `Installed` | `Not Installed` | `Update Available` | `Managed by CMA`
  - Tags (from manifest)
- Sub-tabs: `Installed` | `Bundled`
- Detail drawer on click:
  - Rendered `SKILL.md` preview
  - Raw manifest JSON (collapsible)
  - Scripts & references file tree
  - Action buttons: `Install` | `Update` | `Open Folder` (context-aware: show only applicable actions)

### Out of Scope

- GitHub import
- Local path import
- Uninstall flow
- Search / filter
- Collections
- Marketplace

## Tasks

### Task 1 — Host-Side Skill Scanner

Extend `src/host/bundled-skills.js` (or create `src/host/skill-manager.js`) with a generic skill scanner.

- [x] `scanInstalledSkills()` — walk `~/.codex/skills/*/.cma-skill-manifest.json` and return normalized skill objects
- [x] `scanBundledSkills(panel)` — walk `bundled-skills/*` and return normalized skill objects
- [x] `readSkillDetail(skillPath)` — read manifest + SKILL.md + list scripts/references
- [x] Merge bundled and installed scan results so the same skill appears once with merged state

Data shape:

```javascript
{
  name: "codex-loop",
  title: "Codex Loop",
  description: "Plan-driven recurring iteration for Codex.",
  version: "1.0.0",
  installed: true,
  bundled: true,
  managed: true,
  updateAvailable: false,
  tags: ["automation", "cron"],
  manifest: { /* full manifest */ },
  skillPath: "/home/user/.codex/skills/codex-loop",
  bundledPath: "/path/to/extension/bundled-skills/codex-loop",
  hasSkillMd: true,
  scripts: ["scripts/codex_loop_automation.py", "scripts/start_codex_loop.sh"],
  references: ["references/automation-layout.md"]
}
```

Acceptance:
- Scanner handles missing manifests gracefully (skip or default)
- Scanner distinguishes skills that exist only as bundled vs only as installed vs both
- Unit tests for scanner logic

### Task 2 — Webview Tab & Navigation

Add `Skills` as a top-level view in the CMA dashboard.

- [x] Add `skills` to the Overview subview navigation
- [x] Add `renderSkillsPanel()` in `webview-template.js`
- [x] Sections: `Installed` | `Bundled`
- [x] Empty state when no skills found
- [x] Light-theme-compatible CSS for the new page

Acceptance:
- Skills tab is reachable from the top bar
- Switching to Skills does not break other views
- Empty state is friendly and actionable

### Task 3 — Skill Card Grid

Render skills as a responsive card grid.

- [x] Card layout: icon (40×40) | name + version | description (2 lines) | status badge row | tag pills
- [x] Status badge logic:
  - Green: `Installed` and up-to-date
  - Blue: `Update Available`
  - Gray: `Not Installed` (bundled-only)
  - Orange: `Installed` but not managed by CMA
- [x] Click card → open detail drawer
- [x] CSS: `.skill-card`, `.skill-card-grid`, `.skill-badge-*`, `.skill-tag-pill`

Acceptance:
- Grid is responsive (1 col mobile, 2-3 col tablet, 4 col desktop)
- Cards do not clip at any width
- Status badges are colorblind-safe (icon + text, not just color)

### Task 4 — Skill Detail Drawer

Drawer content on card click:

- [x] Tab 1: `SKILL.md` preview — render Markdown to HTML in webview
- [x] Tab 2: `Manifest` — raw JSON
- [x] Tab 3: `Files` — tree of `scripts/`, `references/`, `agents/`
- [x] Action rail at bottom:
  - `Install` (if not installed and bundled)
  - `Update` (if update available)
  - `Open Folder` (reveal in VS Code explorer)
  - Disabled / hidden if action does not apply

Acceptance:
- Markdown renders headers, lists, and code blocks legibly
- File tree shows at least 2 levels
- Action buttons are context-aware

### Task 5 — CSS & Polish

- [x] Dark theme styles for all new components
- [x] Light theme-compatible styles
- [x] Hover states on cards
- [x] Focus states for accessibility
- [x] Reduced-motion-compatible transitions

## Dependencies

- `src/host/bundled-skills.js` stable
- Existing drawer/panel rendering in `webview-template.js`
- Existing top navigation tab system

## Exit Criteria

- [x] User can open Skills tab from the dashboard Overview nav
- [x] Installed skills and bundled skills are both visible
- [x] Status badges (installed / update available / not installed) are correct
- [x] Clicking a skill opens a drawer with SKILL.md preview, manifest, and file tree
- [x] Install / Update / Open Folder actions work from the drawer for bundled/local skills
- [x] Light theme-compatible styles are present
- [x] `node --test src/host/skill-manager.test.js` passes
