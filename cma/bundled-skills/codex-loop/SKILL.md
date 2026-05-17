---
name: codex-loop
description: Plan-driven recurring iteration for Codex without a native /loop command. Use when Codex should keep advancing the same project across repeated passes, read an active plan, inspect prior evolution notes, execute one bounded slice, write the next evolution note, prepare the next handoff, or run a periodic automation daemon that resumes the same Codex thread.
---

# Codex Loop

## Overview

Use this skill when work should continue across many small iterations instead of stopping after one pass.

This is the Codex counterpart to a `/loop` workflow:

- anchor on one active plan
- execute one bounded iteration
- record what changed
- prepare the next handoff
- optionally reawaken the same Codex thread on a timer

## Modes

### 1. Manual loop mode

Use this when the user is present and wants one iteration now.

Preferred pattern:

1. Read one active plan file.
2. Read the latest evolution notes tied to that plan.
3. Reduce the current pass to one bounded target.
4. Execute the work.
5. Write one new evolution note.
6. End with the next handoff prompt.

### 2. Automation loop mode

Use this when the user wants Codex to wake up periodically and continue the same thread.

The bundled scripts:

- read a prompt file on every tick
- reuse the same Codex thread when possible
- write status, last message, and raw logs to a state directory
- avoid overlapping ticks with a lock file
- support detached launch patterns and monitoring

Read [references/automation-layout.md](./references/automation-layout.md) before using the automation scripts.
Read [references/cron-integration.md](./references/cron-integration.md) only when the user explicitly wants system-level scheduling.

## Recommended workspace layout

For plan-driven repo work, prefer:

- active plans in `.claude/plans/` or `.claude/plans/loloop/`
- short evolution notes beside those plans
- raw run logs in `.claude/logs/loloop/`
- automation prompt file in `.codex-loop/prompt.md`
- automation state in `.codex-loop/state/`

## Manual workflow

### 1. Anchor on one plan

Prefer, in order:

- the plan file named by the user
- the newest relevant `active-*.md`
- the newest relevant versioned plan in `.claude/plans/`

Extract:

- the current milestone
- unfinished checklist items
- the smallest useful next slice

### 2. Read recent evolution notes

Look for the latest `evolution-*.md` notes tied to that plan.

Focus on:

- repeated failures
- deferred work
- constraints that should shape the next pass

### 3. Bound the iteration

Reduce the pass to one concrete success condition.

Examples:

- close one unchecked item
- run one verification pass
- refine one prompt and record the result
- update one document section

### 4. Execute and review

Do the work normally, but stay locked to the active plan.

Before ending:

- review what changed
- note what failed or drifted
- decide the next smallest useful step

### 5. Write the next evolution note

Record:

- plan used
- bounded target
- completed work
- failures or deferrals
- next handoff

Use [references/evolution-template.md](./references/evolution-template.md) as the default shape.

## Automation workflow

### Prompt file

Store the recurring prompt in:

```text
.codex-loop/prompt.md
```

On each tick, the automation runner reads that file again, so editing the file changes future behavior without restarting the thread.

### Mailbox-aware loop mode (CMA Team Space)

When driving a CMA Team Space from a loop, use a supervisor prompt that reads `.codex-team/inbox/supervisor.jsonl` and writes scheduling decisions back to the mailbox:

```bash
CODEX_LOOP_PROMPT_FILE=.codex-loop/prompt-team-supervisor.sh \
  bash ~/.codex/skills/codex-loop/scripts/start_codex_loop.sh
```

The supervisor prompt should:
- read worker `task.completed` and `handoff.requested` messages from inbox
- update task states under `.codex-team/tasks/`
- assign queued tasks to idle agents via `.codex-team/inbox/<agent_id>.jsonl`
- append events to `.codex-team/events/events.jsonl`

Workers launched through CMA Team Space automatically receive inbox reporting instructions in their compiled prompt.

### Start the daemon

Run:

```bash
bash ~/.codex/skills/codex-loop/scripts/start_codex_loop.sh
```

Optional environment overrides:

- `CODEX_LOOP_WORKSPACE`
- `CODEX_LOOP_PROMPT_FILE`
- `CODEX_LOOP_STATE_DIR`
- `CODEX_LOOP_INTERVAL_MINUTES`
- `CODEX_LOOP_MAX_TICKS` (optional; stop after this many ticks, unset/0 means unlimited)
- `CODEX_LOOP_LAUNCHER` (`auto`, `tmux`, `nohup`)
- `CODEX_LOOP_REUSE_CURRENT_THREAD` (`1` only when you explicitly want to keep using the current interactive thread)
- `CODEX_LOOP_FORCE_THREAD_ID`

Operational preference:

- prefer `tmux` when available
- otherwise use `nohup`
- prefer a dedicated automation thread instead of stealing the currently active chat thread

### Inspect status

Run:

```bash
bash ~/.codex/skills/codex-loop/scripts/status_codex_loop.sh
```

This now reports launcher metadata too, including tmux session name when relevant.

### Monitor the loop

Run:

```bash
bash ~/.codex/skills/codex-loop/scripts/monitor_codex_loop.sh --watch
```

Use this from a separate terminal instead of keeping the interactive Codex conversation open just to watch progress.

### Stop the daemon

Run:

```bash
bash ~/.codex/skills/codex-loop/scripts/stop_codex_loop.sh
```

### Optional cron integration

Use cron only as an outer scheduler for the daemon lifecycle.

Good fits:

- restart the daemon after reboot
- periodically ensure the daemon is still alive
- start or stop looping on a daily schedule

Do not treat cron as a replacement for the daemon's thread-aware loop logic.

Use:

```bash
bash ~/.codex/skills/codex-loop/scripts/print_cron_entry.sh
```

Then install or adapt the emitted crontab line if the user wants it.

## Guardrails

- Do not claim background looping unless the automation daemon was actually started.
- Do not assume the current interactive `CODEX_THREAD_ID` should become the daemon thread; make that opt-in.
- Do not create new plan versions unless the current one is truly complete or needs a deliberate branch.
- Keep each iteration intentionally small for long-running loops.
- Prefer updating the prompt file over hardcoding task logic into the automation script.
- Treat the automation runner as optional infrastructure; the core skill is still the plan-review-handoff loop.

## Resources

### `scripts/codex_loop_automation.py`

Generic automation runner adapted from the repo's `zip/agent` example. It can run one tick, run as a daemon, or print status.

### `scripts/start_codex_loop.sh`

Starts the daemon for the current workspace.

### `scripts/status_codex_loop.sh`

Prints daemon and last-tick status.

### `scripts/monitor_codex_loop.sh`

Prints a human-readable loop monitor, optionally in watch mode.

### `scripts/stop_codex_loop.sh`

Stops the daemon for the current workspace.

### `references/automation-layout.md`

Prompt, state, and log layout for using automation safely.

### `references/evolution-template.md`

Lean template for one evolution note.

### `references/cron-integration.md`

Optional patterns for using system cron as an outer scheduler.

### `scripts/print_cron_entry.sh`

Prints example crontab entries for starting or health-checking the daemon.
