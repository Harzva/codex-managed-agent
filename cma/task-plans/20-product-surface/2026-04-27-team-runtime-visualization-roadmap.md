# Team Runtime Visualization — Roadmap

## Status

- [x] Complete (2026-05-07)

Completion note:
- Operation type icons, phase badges, and persistent agent status bar are implemented in the Team runtime surface.
- Regression coverage is anchored in `src/webview/render-detail-regression.test.js`.
- Verification: `npm run validate:moa-dag` and `npm run validate:role-plugins`.

## Date

2026-04-27

## Objective

Borrow design patterns from Kimi Agent's multi-agent execution surface to make CMA's Team runtime feel honest, legible, and alive. The goal is not to copy Kimi pixel-for-pixel, but to adopt three interaction patterns that make parallel agent work understandable at a glance.

## Why This Matters

CMA already has:
- DAG scheduling (MoA core)
- Per-worker progress bars (shipped)
- Mini DAG graph (shipped)
- Timeline + evidence checklist

What it lacks is **narrative structure**: users see a pile of worker cards and logs, but they cannot answer "What phase is this task in?" or "What kind of work is happening right now?" without reading dense text. Kimi solves this with phase labels, operation icons, and a persistent agent status bar.

## Design Reference

Kimi Agent surface patterns observed:

```text
Top:    "Phase 7: 合并、构建、部署"  +  overall progress 7/7
Left:   Phase timeline + Agent cluster cards (avatar + name + mini progress)
Right:  Active Agent's full operation trace (icon + label + result)
Bottom: Fixed agent status pills (01 Completed, 02 Completed)
```

CMA adaptation principle: adopt the patterns that improve legibility without increasing UI chrome.

## Sub-Tasks

| # | Task | Est. | Detail Doc |
|---|------|------|------------|
| 1 | Operation Type Icons | Complete | [`2026-04-27-team-runtime-task-1-operation-icons.md`](./2026-04-27-team-runtime-task-1-operation-icons.md) |
| 2 | Phase Badges | Complete | [`2026-04-27-team-runtime-task-2-phase-badges.md`](./2026-04-27-team-runtime-task-2-phase-badges.md) |
| 3 | Persistent Agent Status Bar | Complete | [`2026-04-27-team-runtime-task-3-agent-status-bar.md`](./2026-04-27-team-runtime-task-3-agent-status-bar.md) |

### Execution Order

1. **Task 1 first** — it is low-risk, touches only rendering helpers, and provides immediate visual payoff.
2. **Task 2 second** — it builds on the existing `teamTaskCardProgress()` logic and introduces the Phase concept.
3. **Task 3 last** — it is the most invasive (fixed-position bar, scroll interactions), so it should go in after the simpler tasks are stable.

## Out of Scope

- Full Kimi-style split-pane layout (left macro / right micro)
- Dynamic phase inference from model output (phases are evidence-driven heuristics, not LLM-generated)
- Re-architecting the Team view into a dual-panel surface

## Dependencies

- `renderTeamOrchestrationSummary` with per-worker progress (shipped)
- `renderMiniDagGraph` (shipped)
- Stable `teamCoordination.agents` and `task.runtime` data contracts
- Light-theme CSS fixes (html background sync shipped)

## Global Exit Criteria

- [x] All three sub-tasks complete
- [x] All three features have light-theme CSS overrides or theme-neutral rendering
- [x] `npm run validate:moa-dag` and `npm run validate:role-plugins` pass
- [x] No regressions in existing Team Task Workspace layout
