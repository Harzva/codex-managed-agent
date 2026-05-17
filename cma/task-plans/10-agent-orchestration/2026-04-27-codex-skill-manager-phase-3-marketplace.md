# Codex Skill Manager — Phase 3: Search & Marketplace

## Status

- [ ] Pending

## Date

2026-04-27

## Parent Roadmap

See: [`00-roadmap/2026-04-27-codex-skill-manager-roadmap.md`](../00-roadmap/2026-04-27-codex-skill-manager-roadmap.md)

## Predecessor

- [`2026-04-27-codex-skill-manager-phase-2-install.md`](./2026-04-27-codex-skill-manager-phase-2-install.md) — Install, Update & Uninstall

## Objective

Make the skill library searchable and introduce a lightweight marketplace for discovering community skills. Users should be able to find skills by name, description, or content, and browse a curated index of publicly available Codex skills.

## Why This Matters

Phase 1 and 2 handle skills the user already knows about. Phase 3 answers "What skills exist that I don't know about?" This is the difference between a package manager and a package manager with a registry.

## Scope

### In Scope

- **Local search** — search across installed + bundled skill names, descriptions, tags, and SKILL.md content
- **Marketplace index** — a static JSON index of community skills, hosted on GitHub or fetched from a configurable URL
- **Marketplace browse** — filter by tag, sort by popularity/recency
- **GitHub topic search** — discover skills by searching GitHub repos tagged `codex-skill` or `cma-skill`
- **Install from marketplace** — one-click install from marketplace entry (reuses Phase 2 GitHub import)

### Out of Scope

- Skill ratings / reviews
- Paid skills or authentication-gated marketplace
- Real-time marketplace (index is static JSON, refreshed periodically)
- Dependency resolution (Phase 4)

## Tasks

### Task 1 — Local Search

Fast search across the local skill library.

- [ ] Host helper: `searchSkills(query, options)`
- [ ] Search fields: `name`, `title`, `description`, `tags`, `SKILL.md` content (first 2000 chars)
- [ ] Fuzzy matching (case-insensitive, token-based)
- [ ] Webview UI: search input in Skills tab header, debounced 200ms
- [ ] Search results update grid in real time
- [ ] Empty search state: "No skills match 'query'"

Acceptance:
- Search returns results in <100ms for <50 skills
- Searching "cron" finds `codex-loop` (tag match)
- Searching "reflective" finds `team-reflective-loop` (title match)
- Search works across all sub-tabs (Installed, Bundled, Discover)

### Task 2 — Marketplace Index

A lightweight, static index of community skills.

- [ ] Define index schema (see Data Contracts in parent roadmap)
- [ ] Host index JSON at a known URL (e.g., `https://raw.githubusercontent.com/Harzva/codex-managed-agent/main/skill-marketplace/index.json`)
- [ ] Host helper: `fetchMarketplaceIndex(url)` — fetch, cache locally for 1 hour, fallback to stale cache
- [ ] Webview UI: new `Discover` sub-tab showing marketplace skills
- [ ] Marketplace cards show: name, description, author, tags, install count (if available), "Install" button

Acceptance:
- Index loads successfully from URL
- Network failure shows cached data or friendly offline state
- Install button triggers Phase 2 GitHub import flow

### Task 3 — GitHub Topic Discovery

Use GitHub Search API to discover skills by topic.

- [ ] Host helper: `searchGitHubSkills(query, topic)` — wraps `https://api.github.com/search/repositories?q=topic:codex-skill`
- [ ] Optional: support GitHub personal access token for higher rate limits
- [ ] Webview UI: "Search GitHub" input + topic filter chips (`codex-skill`, `cma-skill`, `ai-skill`)
- [ ] Results show: repo name, description, stars, last updated, "Import" button

Acceptance:
- Search returns relevant repos
- Rate limit handled gracefully (show remaining calls, suggest PAT)
- Import button fills GitHub URL into Phase 2 import flow

### Task 4 — Search UX Polish

- [ ] Highlight matching terms in search results
- [ ] Search history (last 10 queries, clickable)
- [ ] Filter pills: by tag, by source (bundled / installed / marketplace / github)
- [ ] Sort options: name, install date, last updated

## Dependencies

- Phase 2 Install, Update & Uninstall complete
- Network access for index fetch and GitHub API
- GitHub Search API familiarity (rate limits: 10 req/min unauthenticated, 30 req/min authenticated)

## Exit Criteria

- [ ] User can search across local skills by name, description, tag, and content
- [ ] Search results update in real time with debounced input
- [ ] Marketplace index is browsable in the Discover tab
- [ ] GitHub topic search finds relevant skill repositories
- [ ] Installing from marketplace or GitHub search works end-to-end
- [ ] Offline / rate-limit states are handled gracefully
