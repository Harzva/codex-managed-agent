# MoA DAG Acceptance Demo (Local-First)

This is a concise local demo path for CMA MoA DAG acceptance and productization checks.

Source-of-truth gate checklist: [`SMOKE_CHECKLIST.md`](../../SMOKE_CHECKLIST.md) (`## 7. MoA DAG Acceptance Gate`).

Scope guard:

- local-first and Codex-first only
- no LAN, QR, mobile, relay, or provider abstraction work in this flow
- no Stage 2.5 Role Plugin implementation in this flow

## Preconditions

- Open this extension workspace in VS Code.
- Open the panel with `Codex-Managed-Agent: Open Dashboard`.
- Go to the `Team` view.

## Demo Path

1. `Plan Team Run` -> `Generate Orchestration Draft`
- Confirm worker write paths are non-conflicting where parallel launch is expected.

2. Save Draft as Team Space
- Click `Save Draft as Team Space`.
- Open the saved Team Space detail page.

3. Inspect DAG workers/conflicts/blackboard
- In `Orchestration`, verify worker cards, `Schedule Explanation`, and `Blackboard Highlights`.
- Confirm blocked nodes (if any) include explicit conflict reasons.

4. Run Team action and reconcile workers
- Click the Team run action on the Team Space page.
- Verify at least one scheduler tick result includes selected node ids, blocked node ids, and launched worker metadata (thread/model/log/pid when available).
- After runs complete, refresh/reopen the Team page and confirm node/result state was reconciled.

5. Inspect trace/archive evidence
- Check DAG run evidence under `.codex-team/dag-runs/<run_id>/`.
- Check Team trace lanes and run files remain visible from Team surfaces.
- Archive the Team Space and confirm audit files are retained under `.codex-team/workspaces-archive/`.

## Acceptance Checklist (Single Local Pass)

- [ ] Planned Team Run from orchestration draft.
- [ ] Saved draft as Team Space.
- [ ] Verified DAG workers, conflict explanations, and blackboard highlights.
- [ ] Launched workers and observed scheduler reconciliation.
- [ ] Verified DAG run trace and archive evidence retention.

<a id="canonical-5-step-local-pass"></a>
## Canonical 5-Step Local Pass (Copy/Paste + Click Path)

Run validation first from `extension/`:

```bash
npm run validate:moa-dag
```

Then execute one operator pass in Team UI:

1. `Plan Team Run` -> `Generate Orchestration Draft`
2. `Save Draft as Team Space`
3. Inspect `Orchestration` for workers/conflicts/blackboard
4. Run Team action and wait for scheduler launch/reconciliation
5. Verify `.codex-team/dag-runs/<run_id>/` and archive evidence paths

## Acceptance Evidence Locations (Quick Check)

- `.codex-team/dag-runs/<run_id>/` for DAG run state, scheduler evidence, and trace/index files.
- `.codex-team/dag-runs-archive/` for archived DAG run evidence snapshots.
- Team Trace lanes in the Team page for operator-visible run evidence.
- `.codex-team/workspaces-archive/` for archived Team Space audit retention.

## Focused Local Validation Commands

Run these from `extension/`:

```bash
npm run validate:moa-dag
```

Equivalent direct commands:

```bash
node --test src/host/moa-core.test.js
node --test src/host/team-coordination.test.js
node --test src/webview/render-detail-regression.test.js
```

These cover DAG contract/scheduling logic, orchestration lifecycle/reconciliation, and Team UI rendering for orchestration visibility.

## Latest Local Validation Snapshot

- Date: 2026-04-27
- Command: `npm run validate:moa-dag`
- Result: pass (`198` tests total across `134 + 44 + 20`, zero failures, command exit `0`)
- Rerun confirmation: validated again on 2026-04-27 during Stage 2.5 acceptance (same passing totals).
