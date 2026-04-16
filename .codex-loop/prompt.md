Continue one bounded `codex-loop` iteration for this repo.

Read in this exact order:

1. `ROADMAP.md`
   - treat it as the top-level index only
   - identify the current milestone and the task-plan file(s) it points to
2. `task-plans/codex-team-mailbox-loop-task-plan.md`
   - treat this as the mailbox-team long-form execution plan
   - complete one bounded slice only
3. the relevant file(s) under `task-plans/`
   - use these as the concrete task breakdown for the current milestone
4. `.claude/plans/ACTIVE_PLAN.md`
   - use it as the current active slice tracker
5. the newest relevant note(s) in `.claude/plans/loloop/`
   - use them to avoid repeating work and to inherit constraints

Execution rules:

- Complete exactly one bounded, reviewable slice.
- Do not expand scope beyond the current mailbox loop track.
- Prefer the mailbox-team plan before reopening older paused tracks.
- Treat `ROADMAP.md` as the spine and `task-plans/*.md` as the execution docs.
- If `task-plans/codex-team-mailbox-loop-task-plan.md` is active, follow it instead of inventing a new plan.
- If the active slice is already done, choose the next smallest slice from the same task-plan.
- Keep changes runnable and validate package/build state when code changes.
- Default loop cadence for this track is 1 minute unless the user explicitly overrides it.
- In every two-loop window, make at least one loop an analysis loop that audits recent completion quality, drift, regressions, and plan quality before authorizing more execution work.
- If the analysis loop detects that work is drifting, weakening the current version, or creating regression risk, revise `.claude/plans/ACTIVE_PLAN.md` first and steer the next loop toward containment or hardening instead of feature expansion.
- The immediate analysis gate for this mailbox track is satisfied; continue using the two-loop review rule instead of forcing every next pass to be analysis-only.
- When a pass is an analysis loop, explicitly audit legacy thread lifecycle safety, board/tab semantic safety, loop-only cadence impact, task-plan/code alignment, and whether the next execution slice should be hardening-first.

Before finishing the iteration:

1. update `.claude/plans/ACTIVE_PLAN.md`
2. write one new evolution note in `.claude/plans/loloop/`
3. if code changed, validate packaging
4. if the dev workspace mirror is relevant, sync important repo-facing changes back to `/home/clashuser/hzh/work_bo/codex_manager/vscode-extension`
5. end with the next smallest handoff for the same roadmap track

Evolution note rules:

- treat `.claude/plans/ACTIVE_PLAN.md` as the only plan reference in the note
- do not restate roadmap background unless the milestone actually changed
- keep the `Plan` section minimal: active-plan path, current milestone, bounded target
- keep `Next Handoff` minimal and anchored on `.claude/plans/ACTIVE_PLAN.md`
- avoid repeating product principles, full milestone lists, or roadmap prose inside the evolution note
- keep the mailbox track non-destructive; do not break current single-thread, board, loop, or dashboard behavior while extending team mode
- note whether the current pass was an execution loop or an analysis loop when that distinction matters for the next handoff

Do not stop at roadmap interpretation alone. Advance the repo by one concrete slice.
