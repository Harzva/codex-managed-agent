# Codex Skill Manager — Phase 4: Collections & Advanced

## Status

- [ ] Pending

## Date

2026-04-27

## Parent Roadmap

See: [`00-roadmap/2026-04-27-codex-skill-manager-roadmap.md`](../00-roadmap/2026-04-27-codex-skill-manager-roadmap.md)

## Predecessor

- [`2026-04-27-codex-skill-manager-phase-3-marketplace.md`](./2026-04-27-codex-skill-manager-phase-3-marketplace.md) — Search & Marketplace

## Objective

Add user-defined collections, skill enable/disable toggles, dependency tracking, and optional AI-powered SKILL.md summaries. This phase turns the skill manager from a browser into an organizer.

## Why This Matters

When a user has 20+ skills, browsing a flat list becomes painful. Collections let them group skills by project, by team, or by function (e.g., "Frontend Tools", "DevOps Scripts", "Code Review Helpers"). Enable/disable prevents accidental activation without uninstalling. Dependency tracking warns before installing a skill that requires another.

## Scope

### In Scope

- **Collections** — user-defined named groups of skills
- **Enable / Disable** — toggle skills on/off without uninstalling
- **Dependency tracking** — declare and validate `dependencies` in manifest
- **AI SKILL.md summary** — optional one-click summary generation for long SKILL.md files
- **Skill usage analytics** — track which skills are used most (local-only, no telemetry)

### Out of Scope

- Skill marketplace payments or authentication
- Skill versioning with semver resolution
- Automatic skill updates (still manual/batch)
- Cross-workspace skill sync

## Tasks

### Task 1 — Collections

User-defined skill groups.

- [ ] Data model: `collections` array in webview state or `.codex-team/skill-collections.json`
- [ ] Collection shape: `{ id, name, description, skillNames[], created_at }`
- [ ] Webview UI:
  - New `Collections` sub-tab in Skills page
  - Create / rename / delete collection
  - Add/remove skills via drag-drop or checkbox
  - Collection card: name, description, skill count, skill avatars
  - "Install All" button for collections (installs all not-yet-installed skills)
- [ ] Host helper: `saveCollections(collections)`, `loadCollections()`

Acceptance:
- User can create a collection and add skills to it
- Collection persists across CMA restarts
- "Install All" triggers individual installs with aggregated feedback

### Task 2 — Enable / Disable

Toggle skills without uninstalling.

- [ ] Extend manifest: `enabled: true|false` (default `true`)
- [ ] Host helper: `setSkillEnabled(skillName, enabled)`
- [ ] Disabled skills remain on disk but are skipped by:
  - Team Space skill attachment dropdown
  - Loop skill selection
  - Any auto-discovery logic
- [ ] Webview UI: toggle switch on skill card and in detail drawer
- [ ] Visual distinction: disabled cards are muted (grayscale, reduced opacity)

Acceptance:
- Disabling a skill hides it from agent attachment UI
- Re-enabling restores visibility immediately
- Disabled skills still appear in the Skills tab (with muted styling)

### Task 3 — Dependency Tracking

Declare and validate skill dependencies.

- [ ] Extend manifest schema: `dependencies: ["skill-name@^1.0.0"]`
- [ ] Host helper: `validateSkillDependencies(skillName)` — check if all deps are installed and version-compatible
- [ ] On install: block if dependencies missing, show "Install dependencies first" prompt
- [ ] On uninstall: warn if other skills depend on this one
- [ ] Webview UI: dependency tree in detail drawer

Acceptance:
- Installing a skill with missing deps surfaces a clear prompt
- Dependency tree renders at least 2 levels deep
- Circular dependencies are detected and rejected

### Task 4 — AI SKILL.md Summary

Optional one-click summary for long SKILL.md files.

- [ ] Host helper: `summarizeSkillMarkdown(skillPath)` — calls configured LLM with SKILL.md content
- [ ] Returns: 3-bullet summary + 1-sentence description
- [ ] Webview UI: "Generate Summary" button in detail drawer (only visible if SKILL.md > 1000 chars)
- [ ] Cache summary in manifest: `ai_summary: { text, generated_at, model }`
- [ ] Respect user model preferences (use CMA configured model)

Acceptance:
- Summary generation completes in <10 seconds
- Summary is cached and does not regenerate on every open
- Failed generation shows "Could not generate summary" without breaking UI

### Task 5 — Local Usage Analytics

Track which skills are used most, purely local.

- [ ] Data model: `skill-usage.json` in `.codex-team/`
- [ ] Track: skill name, action type (install, update, attach, run), timestamp
- [ ] Webview UI: "Most Used" sort option; usage sparkline on skill card (optional)
- [ ] No network telemetry; data never leaves the machine

Acceptance:
- Usage data is local-only
- Sort by "Most Used" works correctly
- Data file is bounded (keep last 90 days, auto-prune)

## Dependencies

- Phase 3 Search & Marketplace complete
- LLM API access for AI summary (reuses CMA existing model config)
- Stable manifest schema with `dependencies` field

## Exit Criteria

- [ ] User can create, edit, and delete collections
- [ ] Skills can be enabled/disabled without uninstalling
- [ ] Dependency conflicts are detected at install time
- [ ] AI summary button generates and caches a concise summary
- [ ] Usage analytics are local-only and sortable
- [ ] All features work in both dark and light themes
