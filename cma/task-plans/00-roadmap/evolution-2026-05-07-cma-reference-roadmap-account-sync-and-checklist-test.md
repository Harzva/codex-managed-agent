# Evolution: Roadmap Account Sync And Checklist Test

Date: 2026-05-07

## Scope

Closed remaining unchecked items in the main CMA reference roadmap and added regression coverage for the live Board TODO checklist reader.

## Completed

- Marked the Phase 4 account items complete in the main roadmap:
  - re-login/switch recommendation copy for invalid or expired profiles
  - failure states for invalid/missing auth
- Added a sync note pointing to the implemented account behavior:
  - `Token blocked`
  - `Token health`
  - `Switch recommended`
  - `No auth.json`
  - activation blocked before native auth overwrite
- Exported `readRoadmapTaskChecklist` for focused testing.
- Added a state-sync regression test that builds a temporary `task-plans/subtask_json` index and verifies completed/open task summarization.

## Verification

- `node --check src/host/state-sync.js`
- `node --check src/host/state-sync.test.js`
- `node --test src/host/state-sync.test.js`
- `node -e "JSON.parse(require('fs').readFileSync('task-plans/subtask_json/index.json','utf8')); console.log('index ok')"`
- `rg -n "\\[ \\]" task-plans/00-roadmap/cma-reference-inspired-product-roadmap.md` returned no matches.
