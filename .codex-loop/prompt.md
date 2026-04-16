Continue one bounded `codex-loop` iteration for this repo.

Read in this exact order:

1. `ROADMAP.md`
   - treat it as the top-level index only
   - identify the current milestone and the task-plan file(s) it points to
2. the relevant file(s) under `task-plans/`
   - use these as the concrete task breakdown for the current milestone
3. `.claude/plans/ACTIVE_PLAN.md`
   - use it as the current active slice tracker
4. the newest relevant note(s) in `.claude/plans/loloop/`
   - use them to avoid repeating work and to inherit constraints

Execution rules:

- Complete exactly one bounded, reviewable slice.
- Do not expand scope beyond the current milestone.
- Prefer Milestone 2 first until its task-plan is meaningfully advanced.
- Treat `ROADMAP.md` as the spine and `task-plans/*.md` as the execution docs.
- If a task-plan exists for the current milestone, follow it instead of inventing a new plan.
- If the active slice is already done, choose the next smallest slice from the same task-plan.
- Keep changes runnable and validate package/build state when code changes.

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

Do not stop at roadmap interpretation alone. Advance the repo by one concrete slice.
