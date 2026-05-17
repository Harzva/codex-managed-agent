# Automation Layout

Use this reference when enabling the optional Codex loop automation scripts.

## Recommended project-local files

```text
<workspace>/
  .codex-loop/
    prompt.md
    state/
      daemon.pid
      daemon_heartbeat.json
      daemon_launcher.json
      status.json
      thread_id.txt
      last_message.txt
      last_raw_output.log
      logs/
```

## Prompt file

`prompt.md` should contain the full recurring instruction for one tick.

Recommended shape:

```text
基于 <active-plan-path> 继续一次 loop 迭代。
先读取最近的 evolution 记录；
本轮只完成一个最小可验证推进；
完成后更新 evolution note，并给出下一轮 handoff。
```

Keep it short and stable.
Change the prompt file when you want future ticks to behave differently.

## State directory

The automation runner writes:

- `daemon.pid`
- `daemon_heartbeat.json`
- `daemon_launcher.json`
- `status.json`
- `thread_id.txt`
- `last_message.txt`
- `last_raw_output.log`
- `logs/tick_*.log`

If you start through the wrapper, `daemon_launcher.json` also records whether the loop was launched through `tmux` or `nohup`, plus any tmux session name.

## Defaults

If no environment variables are set, the wrappers assume:

- workspace: current directory
- prompt file: `<workspace>/.codex-loop/prompt.md`
- state dir: `<workspace>/.codex-loop/state`
- interval: `20` minutes

## Good uses

- long-running paper or repo iteration
- recurring analysis after experiments finish
- continuing a plan-driven maintenance queue
- starting a detached automation session and monitoring it from a separate terminal

## Avoid

- using automation when each pass needs heavy human judgment
- packing too many tasks into one tick
- assuming the runner can replace a real scheduler or workflow engine
- reusing the currently active interactive Codex thread unless you explicitly want the loop to continue inside that same thread

## Operational preference

Prefer a detached launcher:

- `tmux` when available, because you can inspect or kill the session directly
- `nohup` as a fallback on simpler systems

Prefer a dedicated automation thread by default.
Only set `CODEX_LOOP_REUSE_CURRENT_THREAD=1` when you deliberately want the daemon to resume the current interactive thread.
