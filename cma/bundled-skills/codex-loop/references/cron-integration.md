# Optional Cron Integration

Use this reference only when the user explicitly wants system-level scheduling.

## Principle

`cron` should sit outside `codex-loop`, not replace it.

Recommended split:

- `codex-loop` daemon:
  - owns the recurring thread-aware loop
  - reads the prompt file every tick
  - keeps state, logs, and lock files
  - ideally runs detached in `tmux` or `nohup`
- `cron`:
  - starts the daemon after reboot
  - checks whether the daemon is alive
  - restarts it if needed
  - optionally starts or stops it on a schedule

## When cron helps

- the machine reboots often
- the daemon should recover automatically
- the loop should only run during certain hours
- the user wants OS-level supervision in addition to the daemon

## When cron is not needed

- a manual background daemon is enough
- the loop is experimental and short-lived
- the user cares more about thread continuity than OS scheduling

## Example: reboot start

```cron
@reboot cd /absolute/workspace && CODEX_LOOP_WORKSPACE=/absolute/workspace CODEX_LOOP_LAUNCHER=tmux bash ~/.codex/skills/codex-loop/scripts/start_codex_loop.sh
```

## Example: periodic health check

```cron
*/10 * * * * cd /absolute/workspace && bash ~/.codex/skills/codex-loop/scripts/status_codex_loop.sh >/tmp/codex-loop-status.log 2>&1 || CODEX_LOOP_WORKSPACE=/absolute/workspace CODEX_LOOP_LAUNCHER=tmux bash ~/.codex/skills/codex-loop/scripts/start_codex_loop.sh >>/tmp/codex-loop-status.log 2>&1
```

## Warning

Keep cron entries simple.
Do not embed the entire task logic in crontab.
Put loop behavior in `.codex-loop/prompt.md` and let the daemon read it.
Treat `cron` as a supervisor and `tmux`/`nohup` as the detached runtime.
