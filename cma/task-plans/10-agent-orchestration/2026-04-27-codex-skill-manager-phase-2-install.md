# Codex Skill Manager — Phase 2: Install, Update & Uninstall

## Status

- [ ] Pending

## Date

2026-04-27

## Parent Roadmap

See: [`00-roadmap/2026-04-27-codex-skill-manager-roadmap.md`](../00-roadmap/2026-04-27-codex-skill-manager-roadmap.md)

## Predecessor

- [`2026-04-27-codex-skill-manager-phase-1-discovery.md`](./2026-04-27-codex-skill-manager-phase-1-discovery.md) — Discovery & Browser

## Objective

Expand the skill management surface to support installing from GitHub, installing from local paths, updating skills in bulk, and safely uninstalling skills. Wire these flows into the Phase 1 UI.

## Why This Matters

Phase 1 lets users browse what they have. Phase 2 lets them act on it. Without GitHub import, users are limited to the 2 skills CMA bundles. Without safe uninstall, the skill directory becomes a graveyard of stale experiments.

## Scope

### In Scope

- **GitHub import** — install a skill from a public GitHub repo URL
- **Local path import** — install a skill from an absolute path on disk
- **Bulk update** — check all installed skills for updates, apply selectively or all-at-once
- **Safe uninstall** — remove skill directory, with confirmation if not managed by CMA
- **Update diff preview** — show what files would change before applying an update
- **Action feedback** — toast / inline notification for install/update/uninstall results

### Out of Scope

- Marketplace browsing (Phase 3)
- Collections (Phase 4)
- Skill dependency resolution (Phase 4)
- Authenticated private GitHub repos (stretch)

## Tasks

### Task 1 — GitHub Import

Install a skill directly from a public GitHub repository.

- [ ] Host helper: `installSkillFromGitHub(repoUrl, skillName, options)`
- [ ] Download repo archive (zip) via `https://github.com/<owner>/<repo>/archive/refs/heads/main.zip`
- [ ] Extract to temp, validate structure (must contain `SKILL.md` or `.cma-skill-manifest.json`)
- [ ] Copy to `~/.codex/skills/<skillName>/`
- [ ] Write manifest with `source: "github"`, `repo_url`, `installed_at`
- [ ] Webview UI: "Import from GitHub" input (URL + optional custom name)
- [ ] Validation: reject URLs that don't look like GitHub repos; surface download errors

Acceptance:
- Public GitHub repo installs successfully
- Missing `SKILL.md` surfaces a clear error
- Duplicate name prompts for rename or overwrite
- Rate limit errors are surfaced gracefully

### Task 2 — Local Path Import

Install a skill from a directory on the local filesystem.

- [ ] Host helper: `installSkillFromLocalPath(localPath, skillName, options)`
- [ ] Validate path exists, contains `SKILL.md` or manifest
- [ ] Copy (or symlink?) to `~/.codex/skills/<skillName>/`
- [ ] Write manifest with `source: "local"`, `local_path`, `installed_at`
- [ ] Webview UI: "Import from Local Path" input with browse button (uses VS Code `showOpenDialog`)

Acceptance:
- Valid local skill path installs correctly
- Invalid paths show friendly error
- Symlink vs copy behavior is documented

### Task 3 — Safe Uninstall

Remove an installed skill with appropriate safeguards.

- [ ] Host helper: `uninstallSkill(skillName, options)`
- [ ] If skill is managed by CMA: remove directory, clean manifest
- [ ] If skill is NOT managed by CMA: show confirmation dialog with warning
- [ ] If skill has active references (e.g., used by a running Team Space): block uninstall with reason
- [ ] Webview UI: "Uninstall" button in detail drawer; confirmation modal
- [ ] Post-uninstall: refresh skill list

Acceptance:
- Managed skills uninstall silently
- Unmanaged skills require explicit confirmation
- Active-usage detection prevents accidental breakage
- Uninstalled skill disappears from Installed tab immediately

### Task 4 — Bulk Update

Check and apply updates across the skill library.

- [ ] Host helper: `checkAllSkillUpdates(panel)` — compare bundled versions with installed versions
- [ ] Returns list of skills with `updateAvailable: true` + `changelog` if available
- [ ] Webview UI: "Check for Updates" button in Skills tab header
- [ ] Update list shows: skill name | current version → new version | Update button
- [ ] "Update All" action with progress indicator
- [ ] Per-skill update: show diff preview (file list: added / modified / removed)

Acceptance:
- Update check completes in <3 seconds for <20 skills
- Diff preview shows at least file-level changes
- Failed updates roll back cleanly
- Progress indicator is visible during bulk update

### Task 5 — Action Feedback & Notifications

- [ ] Toast / banner component in webview for skill action results
- [ ] Success: "Installed `skill-name` from GitHub"
- [ ] Error: "Install failed: repository not found"
- [ ] Persistent notification log (last 10 actions)

## Data Contract Changes

Extend manifest to track source provenance:

```json
{
  "source": "bundled|github|local",
  "repo_url": "https://github.com/owner/repo",
  "local_path": "/path/to/skill",
  "installed_at": "2026-04-27T00:00:00Z",
  "updated_at": "2026-04-27T00:00:00Z"
}
```

## Dependencies

- Phase 1 Discovery & Browser complete
- `src/host/bundled-skills.js` extended with delete/update helpers
- Network access for GitHub downloads
- VS Code `showOpenDialog` API for local path browse

## Exit Criteria

- [ ] User can install a skill from a public GitHub URL
- [ ] User can install a skill from a local directory
- [ ] User can uninstall a skill with confirmation for unmanaged skills
- [ ] User can check for updates and apply them individually or in bulk
- [ ] Diff preview shows before applying an update
- [ ] Action feedback (success / error) is visible
- [ ] All flows work in both dark and light themes
