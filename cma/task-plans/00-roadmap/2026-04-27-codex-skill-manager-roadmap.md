# Codex Skill Manager — Long-Term Roadmap

## Status

- [x] Local Skill Manager complete (2026-05-07)
- [ ] Extended install/import, marketplace, and collections remain future phases

Completion note:
- CMA now has an Overview -> Skills surface for browsing installed and bundled skills.
- Host scanning, merged installed/bundled state, detail payloads, local search, cards, status badges, drawer preview, manifest/file tabs, and bundled install/update/open-folder actions are implemented.
- GitHub import, local path import, safe uninstall, marketplace index, and user collections are intentionally left as follow-up phases because they require broader trust, network, and destructive-operation UX.

## Date

2026-04-27

## Objective

Build a first-class skill management surface inside CMA for discovering, installing, updating, and organizing Codex skills. The design borrows proven patterns from `skills-manage` (central library + per-platform install flows) but keeps the scope strictly on the Codex ecosystem and inside the VS Code extension surface.

## Why This Matters

CMA currently ships with 2 bundled skills (`codex-loop`, `team-reflective-loop`) and a minimal install helper (`bundled-skills.js`). There is no:
- way for users to browse what skills are installed
- way to discover new skills beyond the bundled set
- way to update or uninstall skills from the UI
- way to search or categorize skills
- way to install skills from GitHub or local paths

As the Team Space and MoA DAG runtime mature, users will want to attach reusable skills to workers. A skill manager makes that attachment discoverable and safe.

## CMA Current State

```text
bundled-skills/
  ├── codex-loop/
  │   ├── .cma-skill-manifest.json
  │   ├── SKILL.md
  │   ├── agents/
  │   ├── references/
  │   └── scripts/
  └── team-reflective-loop/
      └── ...

~/.codex/skills/  (or $CODEX_HOME/skills/)
  └── <skill-name>/
      ├── .cma-skill-manifest.json
      └── ...
```

Host-side helpers in `src/host/bundled-skills.js`:
- `bundledSkillState()` — checks installed / managed / update-available state
- `installBundledSkill()` — copies bundled dir to `~/.codex/skills/`
- `listBundledSkillStates()` — returns status for all bundled skills

No deletion flow. No GitHub import. No search. No UI beyond a single button.

## Target Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│  CMA: Codex Skill Manager                                       │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Installed  │  │  Bundled    │  │  Discover   │             │
│  │  Skills     │  │  Skills     │  │  (GitHub)   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Skill Card Grid / List                                  │   │
│  │  [Icon] [Name] [Version] [Tags] [Status] [Actions]      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Skill Detail Drawer                                     │   │
│  │  - SKILL.md preview (rendered Markdown)                  │   │
│  │  - Manifest raw JSON                                     │   │
│  │  - Scripts & references tree                             │   │
│  │  - Install / Update / Uninstall / Enable                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Collections (Phase 4)                                   │   │
│  │  "Frontend Tools" → [skill-a, skill-b, skill-c]         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Reference Design

### Reference A — `skills-manage`

`skills-manage` (https://github.com/iamzhihuix/skills-manage) is a Tauri desktop app for managing AI agent skills across multiple platforms.

| Pattern | skills-manage | CMA Adaptation |
|---------|---------------|----------------|
| Central library | `~/.agents/skills/` | `~/.codex/skills/` (already exists) |
| Per-platform install | Symlink to platform dirs | Direct copy to `~/.codex/skills/` (Codex only) |
| Skill detail view | Markdown preview + raw source + AI explanation | Markdown preview + raw manifest + script tree |
| Collections | User-defined groups for batch install | User-defined tags/collections |
| Discover scan | Project-level skill library detection | Optional: scan workspace for `.cma-skill/` dirs |
| Marketplace | GitHub repo import + browse | GitHub URL import + simple index JSON |
| Search | Deferred queries + lazy indexing | Simple name/description search (Phase 3) |

### Reference B — VS Code Agent Skills TreeView Panel

Another VS Code extension implements skill management as a native TreeView sidebar panel (see screenshot). Patterns worth borrowing:

| Pattern | Their Implementation | CMA Adaptation |
|---------|---------------------|----------------|
| **Accordion sections** | `INSTALLED` / `SOURCE MANAGE` / `MARKETPLACE` as collapsible tree sections | Use in webview Skills tab: collapsible panels for `Installed`, `Bundled`, `Discover` |
| **Skill count badges** | `Claude 133`, `Codex 70` — count appended to source name | Show count on section headers: `Installed (3)`, `Bundled (2)`, `Marketplace (12)` |
| **Built-in vs Custom sources** | `Built-in Sources` and `Custom Sources` as separate tree groups | Distinguish `bundled` (shipped with CMA), `managed` (installed by CMA), `external` (user dropped in manually) |
| **Source selection highlight** | Active source row is highlighted; skills under that source are shown | Click a source filter → grid refreshes to show only skills from that source |
| **Marketplace search with history** | `Find Skills...` input + `Last Query: pdf 6` displayed below | Debounced search + show last query as a quick-restore chip |
| **Install from Git URL** | `Install Repository... Owner/repo or Git URL` as a tree action | Prominent "Import from GitHub" button with `owner/repo` shorthand support |
| **Browse before install** | `List Repository Skills... Browse before install` | Phase 2: show repo file tree / manifest preview before confirming install |
| **Install count** | `pdf 86.1K installs` under each skill | Marketplace index includes `install_count`; render as muted meta text |
| **CLI status** | `CLI Status` section showing current binary and fallback | Show `codex` CLI availability and version in Skills tab footer |
| **Error state** | `OpenClaw Path not found` shown inline with red accent | If a skill's required binary is missing, show inline warning with fix action |

## Phases

### Phase 1 — Discovery & Browser
*See: [`2026-04-27-codex-skill-manager-phase-1-discovery.md`](../10-agent-orchestration/2026-04-27-codex-skill-manager-phase-1-discovery.md)*

Status: complete.

Build the foundational UI: scan installed skills, render a browsable grid/list, search local skill metadata, and show a detail drawer with Markdown preview.

### Phase 2 — Install, Update & Uninstall
*See: [`2026-04-27-codex-skill-manager-phase-2-install.md`](../10-agent-orchestration/2026-04-27-codex-skill-manager-phase-2-install.md)*

Status: partial. Bundled install/update and open-folder actions are implemented; GitHub import, local path import, safe uninstall, and diff preview remain pending.

Expand the host-side skill API to support GitHub import, local path install, safe uninstall, and batch update. Wire these into the UI action buttons.

### Phase 3 — Search & Marketplace
*See: [`2026-04-27-codex-skill-manager-phase-3-marketplace.md`](../10-agent-orchestration/2026-04-27-codex-skill-manager-phase-3-marketplace.md)*

Status: partial. Local search is implemented for names, descriptions, tags, files, and SKILL.md preview; marketplace browsing remains pending.

Add search across skill names, descriptions, and SKILL.md contents. Build a lightweight marketplace index (static JSON or GitHub topics) for discovering community skills.

### Phase 4 — Collections & Advanced
*See: [`2026-04-27-codex-skill-manager-phase-4-collections.md`](../10-agent-orchestration/2026-04-27-codex-skill-manager-phase-4-collections.md)*

User-defined collections, skill enable/disable toggles, dependency declaration in manifests, and optional AI-generated SKILL.md summaries.

## Data Contracts

### Skill Manifest (`.cma-skill-manifest.json`)

Already in use; may need extensions for Phase 3/4.

```json
{
  "name": "codex-loop",
  "version": "1.0.0",
  "title": "Codex Loop",
  "description": "Plan-driven recurring iteration for Codex.",
  "managed_by": "codex-managed-agent",
  "installed_at": "2026-04-27T00:00:00Z",
  "source": "bundled",
  "tags": ["automation", "cron"],
  "author": "CMA Team",
  "homepage": "",
  "dependencies": []
}
```

### Skill Index (for marketplace, Phase 3)

```json
{
  "index_version": 1,
  "updated_at": "2026-04-27T00:00:00Z",
  "skills": [
    {
      "name": "codex-loop",
      "repo_url": "https://github.com/...",
      "description": "...",
      "version": "1.0.0",
      "tags": ["automation"]
    }
  ]
}
```

## UI Surface Decision

The skill manager should live as a **new top-level tab** in the CMA dashboard (next to `Overview`, `Board`, `Team`, `Insights`, `Loop`).

Tab label: `Skills`

Layout (inspired by the VS Code TreeView reference):

```
┌─ Skills Tab ───────────────────────────────────────────────────┐
│  [Search: Find skills...        ]  [Import] [Check Updates]   │
├─────────────────────────────────────────────────────────────────┤
│  ▼ INSTALLED (3)          ← accordion, count badge            │
│    🤖 codex-loop        v1.0.0  [Update]                       │
│    🤖 team-reflective   v0.2.1  [Update]                       │
│    ⚠️  custom-skill     v1.0.0  (external, not managed)        │
├─────────────────────────────────────────────────────────────────┤
│  ▼ BUNDLED (2)                                                │
│    📦 codex-loop        v1.0.0  [Installed]                    │
│    📦 team-reflective   v0.2.1  [Installed]                    │
├─────────────────────────────────────────────────────────────────┤
│  ▼ DISCOVER (0)            ← collapsed by default              │
│    [Expand to browse marketplace...]                           │
├─────────────────────────────────────────────────────────────────┤
│  CLI: codex 1.2.3 ✓   Fallback: npx codex                     │
└─────────────────────────────────────────────────────────────────┘
```

Key layout decisions:
- **Accordion sections** instead of sub-tabs — saves horizontal space, allows multiple sections open at once
- **Count badges** on every section header — instant inventory awareness
- **Inline actions** on each skill row — Install / Update / Open, not buried in a drawer
- **Footer status bar** — CLI availability, version, and refresh action
- **Detail drawer** still used when a skill row is clicked — for SKILL.md preview, manifest, file tree

Sub-views (as accordion sections, not tabs):
- `Installed` — skills currently in `~/.codex/skills/`
- `Bundled` — skills shipped with CMA (install/update actions)
- `Discover` — marketplace / GitHub import (Phase 3), collapsed by default
- `Collections` — user groups (Phase 4)

## Dependencies

- Stable `bundled-skills.js` host API
- Webview panel rendering pipeline
- Markdown rendering in webview (already used for README)
- GitHub API access (for Phase 2/3, optional authenticated)

## Exit Criteria (per Phase)

| Phase | Exit Criteria |
|-------|---------------|
| 1 | User can open Skills tab, see installed + bundled skills, open detail drawer with rendered SKILL.md |
| 2 | User can install from GitHub URL, update bundled skills, uninstall safely |
| 3 | User can search across skill library; marketplace index is browsable |
| 4 | User can create collections, enable/disable skills, dependency conflicts are surfaced |

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GitHub API rate limits | Cache index locally; support personal access token |
| Skill conflicts (same name, different source) | Namespace by source (`bundled/`, `github/<owner>/`, `local/`) |
| Breaking skill interface changes | Version pinning in manifest; update warning for major versions |
| Security of arbitrary skill scripts | Install confirmation for scripts; scan for known patterns |
