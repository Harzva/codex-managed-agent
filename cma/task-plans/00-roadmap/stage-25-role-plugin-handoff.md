# Stage 2.5 Role Plugin System Handoff

Date: `2026-04-27`

Workspace:

```text
/home/clashuser/hzh/item_bo/codex_manager/vscode-extension/recovered/codex-managed-agent-0.0.71/extension
```

## Current State

Stage 2.5 is in final acceptance and handoff state. The local role-plugin foundation is implemented and heavily contract-tested. The remaining work should be treated as verification, demo-path cleanup, and final documentation parity rather than broad feature development.

No CMA execution daemon is currently running.

Stopped / inactive:

- Codex loop: stopped
- Gemini safe loop: stopped
- `claude-loop-OPTIMIZE_ROADMAP-60369e3f`: stopped
- Related `codex exec`, `gemini --model`, and `claude -p --model sonnet` processes: stopped

Known non-CMA external loops may exist outside this project, especially under `/home/clashuser/hzh/item_bo/agent_terminal`. Do not touch those unless explicitly asked.

## Product Direction

CMA should remain a transparent, fine-grained Agent Operations Workspace:

```text
User goal
  -> orchestration draft
  -> supervisor / workers / role plugins
  -> provider and model assignment
  -> DAG nodes and ownership paths
  -> visible schedule and progress
  -> trace / run / result evidence
  -> archive and recovery
```

The important differentiator is user control and observability, not simply launching many agents.

## Completed Capability

Stage 2.5 now includes:

- Built-in role templates:
  - `supervisor`
  - `planner`
  - `implementer`
  - `tester`
  - `reviewer`
  - `reflector`
  - `debugger`
  - `researcher`
  - `documenter`
  - `integrator`
- Local custom role loading from `.codex-team/roles/*.json`.
- Role template normalization and binding.
- Role alias/collision guards.
- Role-template immutability and idempotence contracts.
- Built-in role ID catalog exposure for Team UI stability.
- Team UI role picker foundation.
- Organization templates:
  - `Fast Build Team`
  - `Careful Build Team`
  - `Research Team`
  - `Bugfix Team`
- Organization template metadata propagation to orchestration drafts and DAG nodes.
- Team orchestration draft save/load round-trip coverage.
- Provider metadata on orchestration workers and DAG nodes.
- Default `codex-cli` worker provider preservation.
- Auxiliary `gemini-cli` provider support.
- Gemini model priority policy:

```text
gemini-3.1-pro-preview
gemini-3.1-flash-lite-preview
gemini-3-pro-preview
gemini-3-flash-preview
gemini-2.5-pro
gemini-2.5-flash
```

Gemini should remain auxiliary for review / reflection / patch proposals until direct write guards are stronger.

## Latest Verification Snapshot

Focused Stage 2.5 gate:

```bash
npm run validate:role-plugins
```

Latest recorded result:

```text
86 tests total
67 + 11 + 8
0 failures
```

MoA DAG acceptance gate:

```bash
npm run validate:moa-dag
```

Latest recorded result:

```text
198 tests total
134 + 44 + 20
0 failures
```

Older docs may still mention the earlier `108` or `178` MoA DAG snapshots. Snapshot references have been updated to `198` as of 2026-04-27.

## Important Files

Core implementation:

- `src/host/moa-core.js`
- `src/host/team-coordination.js`
- `src/webview-template.js`
- `src/webview/render-detail-regression.test.js`

Core tests:

- `src/host/moa-core.test.js`
- `src/host/team-coordination.test.js`
- `src/webview/render-detail-regression.test.js`

Docs and planning:

- `SMOKE_CHECKLIST.md`
- `docs/readme-knowledge-base.md`
- `docs/team-workspace.md`
- `docs/demo/moa-dag-acceptance.md`
- `task-plans/10-agent-orchestration/moa-core-inside-cma-task-plan.md`
- `task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md`
- `task-plans/00-roadmap/remote-workflow-reference-roadmap.md`

Experimental loop files created during handoff:

- `.codex-loop/gemini-stage25-safe-prompt.md`
- `.codex-loop/gemini-stage25-safe-loop.sh`
- `.codex-loop/state-gemini-stage25-safe/`

These Gemini loop files are diagnostic/experimental. Do not restart them by default.

## What Happened With Gemini

Gemini CLI was tested as an auxiliary provider.

Observed:

- `gemini-3.1-pro-preview` hit capacity limits.
- `gemini-3.1-flash-lite-preview` could answer a short `OK` probe.
- Long-running Gemini daemon-style execution was unreliable and ended with `exit=137`.

Conclusion:

- Use Gemini for short, explicit auxiliary calls.
- Do not use Gemini as the primary long-running daemon for this project yet.
- Keep `gemini-cli` as a provider option inside CMA, not as the default execution loop.

## Recommended Next Steps

The next agent should not start by adding large features. Start with acceptance.

1. Confirm no CMA loops are running:

```bash
tmux ls 2>/dev/null || true
ps -eo pid,ppid,stat,etime,cmd | rg 'codex-loop|codex exec|gemini-stage25-safe-loop|gemini --model|claude-loop-OPTIMIZE_ROADMAP|claude -p --model sonnet' | rg -v 'rg ' || true
```

2. Run Stage 2.5 focused validation:

```bash
npm run validate:role-plugins
```

3. Run full MoA DAG validation:

```bash
npm run validate:moa-dag
```

4. If both pass, update final acceptance parity in:

- `SMOKE_CHECKLIST.md`
- `docs/readme-knowledge-base.md`
- `task-plans/00-roadmap/remote-workflow-reference-roadmap.md`
- this handoff document if useful

5. Add a concise `Stage 2.5 Foundation Complete` note to the roadmap.

6. Only after Stage 2.5 acceptance is recorded, consider Stage 3 planning.

## Do Not Do Next

- Do not restart Codex loop automatically.
- Do not restart Gemini safe loop automatically.
- Do not use Gemini for long daemon execution.
- Do not start LAN / QR / mobile / relay implementation before Stage 2.5 acceptance is marked complete.
- Do not introduce a remote role marketplace or cloud sync.
- Do not run destructive git commands.
- Do not revert unrelated dirty files.

## Remaining Risks

- The working tree is dirty and contains many pre-existing unrelated changes. Treat all existing edits as user/agent work and do not revert them.
- Some documentation snapshots may be slightly inconsistent because the test count increased during Stage 2.5 hardening.
- Gemini provider support is intentionally auxiliary. It should not be advertised as safe for direct write-enabled workers yet.
- The Team UI role picker foundation exists, but full custom role editing UI is still future work.

## Suggested Final Acceptance Text

When validation passes, use wording like:

```text
Stage 2.5 Role Plugin System foundation is complete locally:

- Built-in and local custom role templates are supported.
- Team orchestration drafts preserve role/provider/model metadata.
- Organization templates are available and contract-tested.
- Codex remains the default worker provider.
- Gemini CLI is available as an auxiliary provider for review/proposal roles.
- Focused role-plugin validation and full MoA DAG validation pass.
```
