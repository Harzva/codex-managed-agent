#!/usr/bin/env python3

import argparse
import fcntl
import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def load_json(path: Path, default):
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def append_jsonl(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(payload, ensure_ascii=False) + "\n")


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)


def pid_is_running(pid: int) -> bool:
    if pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def ensure_prompt(prompt_path: Path) -> str:
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    prompt = read_text(prompt_path).strip()
    if not prompt:
        raise ValueError(f"Prompt file is empty: {prompt_path}")
    return prompt


def parse_json_events(raw_lines):
    events = []
    for line in raw_lines:
        stripped = line.strip()
        if not stripped.startswith("{"):
            continue
        try:
            events.append(json.loads(stripped))
        except json.JSONDecodeError:
            continue
    return events


def find_last_agent_message(events):
    last_message = None
    for event in events:
        if event.get("type") == "item.completed":
            item = event.get("item", {})
            if item.get("type") == "agent_message":
                last_message = item.get("text")
    return last_message


def find_thread_id(events):
    for event in events:
        if event.get("type") == "thread.started":
            return event.get("thread_id")
    return None


def find_usage(events):
    for event in events:
        if event.get("type") == "turn.completed":
            usage = event.get("usage") or {}
            input_tokens = int(usage.get("input_tokens") or 0)
            output_tokens = int(usage.get("output_tokens") or 0)
            return {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
            }
    return None


def usage_home() -> Path:
    path = Path.home() / ".codex"
    path.mkdir(parents=True, exist_ok=True)
    return path


def usage_ledger_path() -> Path:
    return usage_home() / "codex_managed_agent_usage_ledger.jsonl"


def usage_report_path() -> Path:
    return usage_home() / "codex_managed_agent_usage_report.json"


def read_jsonl(path: Path):
    if not path.exists():
        return []
    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            events.append(json.loads(stripped))
        except json.JSONDecodeError:
            continue
    return events


def iso_day(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.strftime("%Y-%m-%d")


def merge_analysis_views(existing, token_stats):
    items = [item for item in (existing or []) if item and item.get("title") not in {"Token Mix", "Token Pace"}]
    items.insert(0, {
        "title": "Token Pace",
        "signal": "Recent" if token_stats["last_token_event_at"] else "Waiting",
        "description": (
            f"24h {token_stats['tokens_24h']} tokens · 7d {token_stats['tokens_7d']} tokens"
            if token_stats["last_token_event_at"]
            else "No Codex token events have been recorded yet."
        ),
    })
    items.insert(0, {
        "title": "Token Mix",
        "signal": "Tooling" if token_stats["total_tokens"] else "Waiting",
        "description": (
            f"Total {token_stats['total_tokens']} · manual {token_stats['manual_cli_tokens']} · auto-continue {token_stats['auto_continue_tokens']} · loop {token_stats['loop_tokens']}"
            if token_stats["total_tokens"]
            else "Token usage will appear here after loop or CLI events are ingested."
        ),
    })
    return items[:8]


def build_recent_token_days(events):
    grouped = {}
    for event in events:
        day = iso_day(event.get("finished_at") or event.get("started_at") or utc_now())
        total_tokens = int(event.get("total_tokens") or (int(event.get("input_tokens") or 0) + int(event.get("output_tokens") or 0)))
        bucket = grouped.get(day) or {"day": day, "total_tokens": 0, "events": 0}
        bucket["total_tokens"] += total_tokens
        bucket["events"] += 1
        grouped[day] = bucket
    return [grouped[key] for key in sorted(grouped.keys())[-84:]]


def build_top_token_threads(events, existing_top_threads):
    existing_meta = {
        str(item.get("id")): item
        for item in (existing_top_threads or [])
        if item and item.get("id")
    }
    grouped = {}
    for event in events:
        thread_id = str(event.get("thread_id") or "").strip()
        if not thread_id:
            continue
        input_tokens = int(event.get("input_tokens") or 0)
        output_tokens = int(event.get("output_tokens") or 0)
        total_tokens = int(event.get("total_tokens") or (input_tokens + output_tokens))
        source = str(event.get("source") or "manual_cli")
        bucket = grouped.get(thread_id) or {
            "thread_id": thread_id,
            "total_tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "event_count": 0,
            "latest_at": "",
            "source_mix": {},
        }
        bucket["total_tokens"] += total_tokens
        bucket["input_tokens"] += input_tokens
        bucket["output_tokens"] += output_tokens
        bucket["event_count"] += 1
        finished_at = str(event.get("finished_at") or event.get("started_at") or "")
        if (not bucket["latest_at"]) or finished_at > bucket["latest_at"]:
            bucket["latest_at"] = finished_at
        bucket["source_mix"][source] = int(bucket["source_mix"].get(source) or 0) + total_tokens
        grouped[thread_id] = bucket
    ranked = sorted(grouped.values(), key=lambda item: int(item.get("total_tokens") or 0), reverse=True)[:12]
    result = []
    for index, item in enumerate(ranked, start=1):
        meta = existing_meta.get(item["thread_id"]) or {}
        result.append({
            "rank": index,
            "thread_id": item["thread_id"],
            "title": meta.get("title") or item["thread_id"],
            "cwd": meta.get("cwd") or "",
            "total_tokens": item["total_tokens"],
            "input_tokens": item["input_tokens"],
            "output_tokens": item["output_tokens"],
            "event_count": item["event_count"],
            "latest_at": item["latest_at"],
            "source_mix": item["source_mix"],
        })
    return result


def rebuild_usage_report():
    events = read_jsonl(usage_ledger_path())
    report = load_json(usage_report_path(), {}) or {}
    summary = dict(report.get("summary") or {})
    activity = dict(report.get("activity") or {})
    now = datetime.now(timezone.utc)
    recent_days = {}
    stats = {
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "total_tokens": 0,
        "loop_input_tokens": 0,
        "loop_output_tokens": 0,
        "loop_tokens": 0,
        "manual_cli_input_tokens": 0,
        "manual_cli_output_tokens": 0,
        "manual_cli_tokens": 0,
        "auto_continue_input_tokens": 0,
        "auto_continue_output_tokens": 0,
        "auto_continue_tokens": 0,
        "last_token_event_at": "",
        "tokens_24h": 0,
        "tokens_7d": 0,
    }
    for event in events:
        finished_at = event.get("finished_at") or event.get("started_at") or utc_now()
        recent_days[iso_day(finished_at)] = recent_days.get(iso_day(finished_at), 0) + 1
        input_tokens = int(event.get("input_tokens") or 0)
        output_tokens = int(event.get("output_tokens") or 0)
        total_tokens = int(event.get("total_tokens") or (input_tokens + output_tokens))
        source = str(event.get("source") or "")
        stats["total_input_tokens"] += input_tokens
        stats["total_output_tokens"] += output_tokens
        stats["total_tokens"] += total_tokens
        if not stats["last_token_event_at"] or finished_at > stats["last_token_event_at"]:
            stats["last_token_event_at"] = finished_at
        if source == "loop":
            stats["loop_input_tokens"] += input_tokens
            stats["loop_output_tokens"] += output_tokens
            stats["loop_tokens"] += total_tokens
        elif source == "auto_continue":
            stats["auto_continue_input_tokens"] += input_tokens
            stats["auto_continue_output_tokens"] += output_tokens
            stats["auto_continue_tokens"] += total_tokens
        else:
            stats["manual_cli_input_tokens"] += input_tokens
            stats["manual_cli_output_tokens"] += output_tokens
            stats["manual_cli_tokens"] += total_tokens
        try:
            finished_dt = datetime.fromisoformat(finished_at.replace("Z", "+00:00"))
            delta = now - finished_dt
            if delta.total_seconds() <= 24 * 60 * 60:
                stats["tokens_24h"] += total_tokens
            if delta.total_seconds() <= 7 * 24 * 60 * 60:
                stats["tokens_7d"] += total_tokens
        except ValueError:
            pass
    summary.update(stats)
    activity["recent_days"] = [
        {"day": day, "count": count}
        for day, count in sorted(recent_days.items())[-84:]
    ]
    activity["recent_token_days"] = build_recent_token_days(events)
    next_report = dict(report)
    next_report["generated_at"] = utc_now()
    next_report["summary"] = summary
    next_report["activity"] = activity
    next_report["analysis_views"] = merge_analysis_views(report.get("analysis_views"), stats)
    next_report["token_top_threads"] = build_top_token_threads(events, report.get("top_threads"))
    write_json(usage_report_path(), next_report)


def ingest_usage_event(payload):
    existing = read_jsonl(usage_ledger_path())
    event_key = payload.get("event_key")
    if any((item.get("event_key") == event_key) for item in existing):
        return
    append_jsonl(usage_ledger_path(), payload)
    rebuild_usage_report()


def shorten_text(text: str, limit: int = 220) -> str:
    text = " ".join(text.strip().split())
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def print_tick_banner(message: str) -> None:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    print(f"[codex-loop] {timestamp} | {message}", flush=True)


def summarize_command(command: str, limit: int = 160) -> str:
    command = " ".join(command.strip().split())
    if len(command) <= limit:
        return command
    return command[: limit - 3] + "..."


def format_event_for_display(event):
    event_type = event.get("type")
    if event_type == "thread.started":
        return f"[codex] thread.started | id={event.get('thread_id')}"
    if event_type == "turn.started":
        return "[codex] turn.started"
    if event_type == "turn.completed":
        usage = event.get("usage", {})
        return (
            "[codex] turn.completed | "
            f"input_tokens={usage.get('input_tokens')} | output_tokens={usage.get('output_tokens')}"
        )

    if event_type not in {"item.started", "item.completed"}:
        return None

    item = event.get("item", {})
    item_type = item.get("type")
    status = item.get("status", "")

    if item_type == "agent_message":
        return f"[codex] message | {shorten_text(item.get('text', ''), limit=320)}"

    if item_type == "command_execution":
        command = summarize_command(item.get("command", ""))
        if event_type == "item.started":
            return f"[codex] cmd.start | {command}"
        exit_code = item.get("exit_code")
        output = shorten_text(item.get("aggregated_output", ""), limit=220)
        suffix = f" | output={output}" if output else ""
        if exit_code in (0, None):
            return f"[codex] cmd.done | exit={exit_code} | {command}{suffix}"
        return f"[codex] cmd.fail | exit={exit_code} | {command}{suffix}"

    if item_type == "reasoning":
        text = shorten_text(item.get("text", ""), limit=220)
        return f"[codex] reasoning | {text}" if text else f"[codex] reasoning | status={status}"

    return None


def should_print_raw_line(stripped: str) -> bool:
    markers = [
        "Traceback",
        "ERROR",
        "FAILED",
        "RuntimeError",
        "ValueError",
        "FileNotFoundError",
        "ModuleNotFoundError",
    ]
    return any(marker in stripped for marker in markers)


def build_codex_command(args, workspace: Path, thread_id: str | None, last_message_file: Path):
    common = ["--json", "-o", str(last_message_file)]
    if args.model:
        common.extend(["-m", args.model])
    if args.profile:
        common.extend(["-p", args.profile])
    if args.dangerous:
        common.append("--dangerously-bypass-approvals-and-sandbox")
    else:
        common.extend(["--sandbox", "workspace-write"])

    if thread_id:
        return ["codex", "exec", "resume", *common, thread_id, "-"]

    return ["codex", "exec", *common, "-C", str(workspace), "--skip-git-repo-check", "-"]


def resolve_thread_id(args, thread_path: Path) -> str | None:
    if args.thread_id:
        return args.thread_id.strip()
    if thread_path.exists():
        saved = thread_path.read_text(encoding="utf-8").strip()
        if saved:
            return saved
    env_thread_id = os.environ.get("CODEX_THREAD_ID", "").strip()
    if env_thread_id:
        return env_thread_id
    return None


def run_tick(args):
    workspace = args.workspace.resolve()
    prompt_path = args.prompt_file.resolve()
    state_dir = args.state_dir.resolve()
    state_dir.mkdir(parents=True, exist_ok=True)
    logs_dir = state_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    lock_path = state_dir / "tick.lock"
    lock_file = lock_path.open("w", encoding="utf-8")
    try:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return 3

    prompt = ensure_prompt(prompt_path)
    status_path = state_dir / "status.json"
    thread_path = state_dir / "thread_id.txt"
    latest_message_path = state_dir / "last_message.txt"
    latest_raw_path = state_dir / "last_raw_output.log"

    thread_id = resolve_thread_id(args, thread_path)
    started_at = utc_now()
    run_tag = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    raw_log_path = logs_dir / f"tick_{run_tag}.log"
    last_message_file = logs_dir / f"tick_{run_tag}_last_message.txt"

    command = build_codex_command(args, workspace, thread_id, last_message_file)
    print_tick_banner(
        f"tick start | thread={thread_id or 'new_thread'} | prompt={prompt_path} | workspace={workspace}"
    )

    status = load_json(status_path, {})
    status.update(
        {
            "phase": "running",
            "started_at": started_at,
            "workspace": str(workspace),
            "prompt_file": str(prompt_path),
            "thread_id": thread_id,
            "command": command,
            "raw_log_path": str(raw_log_path),
            "last_message_file": str(last_message_file),
        }
    )
    write_json(status_path, status)

    process = subprocess.Popen(
        command,
        cwd=workspace,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        bufsize=1,
    )

    raw_lines = []
    assert process.stdin is not None
    process.stdin.write(prompt)
    if not prompt.endswith("\n"):
        process.stdin.write("\n")
    process.stdin.close()

    assert process.stdout is not None
    with raw_log_path.open("w", encoding="utf-8") as raw_log:
        for line in process.stdout:
            raw_lines.append(line)
            raw_log.write(line)
            raw_log.flush()
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith("{"):
                try:
                    event = json.loads(stripped)
                except json.JSONDecodeError:
                    event = None
                if event is not None:
                    formatted = format_event_for_display(event)
                    if formatted:
                        print(formatted, flush=True)
                    continue
            if should_print_raw_line(stripped):
                print(f"[codex][raw] {shorten_text(stripped, limit=320)}", flush=True)

    returncode = process.wait()
    write_text(latest_raw_path, "".join(raw_lines))

    events = parse_json_events(raw_lines)
    new_thread_id = find_thread_id(events) or thread_id
    usage = find_usage(events)
    if new_thread_id:
        write_text(thread_path, new_thread_id)

    last_message = last_message_file.read_text(encoding="utf-8").strip() if last_message_file.exists() else ""
    if not last_message:
        maybe_message = find_last_agent_message(events)
        if maybe_message:
            last_message = maybe_message.strip()
            write_text(last_message_file, last_message + "\n")
    if last_message:
        write_text(latest_message_path, last_message + "\n")

    finished_status = {
        "phase": "idle" if returncode == 0 else "failed",
        "started_at": started_at,
        "finished_at": utc_now(),
        "workspace": str(workspace),
        "prompt_file": str(prompt_path),
        "thread_id": new_thread_id,
        "returncode": returncode,
        "raw_log_path": str(raw_log_path),
        "last_message_file": str(last_message_file),
        "last_message_preview": last_message[:500],
        "command": command,
    }
    if usage:
        finished_status["last_input_tokens"] = usage["input_tokens"]
        finished_status["last_output_tokens"] = usage["output_tokens"]
        finished_status["last_total_tokens"] = usage["total_tokens"]
    write_json(status_path, finished_status)
    if usage and usage["total_tokens"] > 0:
        ingest_usage_event(
            {
                "event_key": f"loop:{raw_log_path}",
                "source": "loop",
                "thread_id": new_thread_id or "",
                "workspace": str(workspace),
                "started_at": started_at,
                "finished_at": finished_status["finished_at"],
                "input_tokens": usage["input_tokens"],
                "output_tokens": usage["output_tokens"],
                "total_tokens": usage["total_tokens"],
                "command_kind": "codex-loop.tick",
                "log_path": str(raw_log_path),
            }
        )
    summary = shorten_text(last_message or "No assistant summary was captured for this tick.")
    print_tick_banner(f"tick end | phase={finished_status['phase']} | returncode={returncode} | summary={summary}")
    return returncode


def normalized_max_ticks(value) -> int:
    try:
        max_ticks = int(value or 0)
    except (TypeError, ValueError):
        return 0
    return max(0, max_ticks)


def annotate_tick_budget(status_path: Path, max_ticks: int, completed_ticks: int, stop_reason: str = "") -> None:
    status = load_json(status_path, {}) or {}
    remaining_ticks = max(max_ticks - completed_ticks, 0) if max_ticks > 0 else None
    status.update(
        {
            "max_ticks": max_ticks or None,
            "completed_ticks": completed_ticks,
            "remaining_ticks": remaining_ticks,
        }
    )
    if stop_reason:
        status["stop_reason"] = stop_reason
    elif status.get("stop_reason") == "max_ticks_reached":
        status.pop("stop_reason", None)
    write_json(status_path, status)


def daemon_loop(args):
    state_dir = args.state_dir.resolve()
    state_dir.mkdir(parents=True, exist_ok=True)
    pid_path = state_dir / "daemon.pid"
    stop_flag = state_dir / "stop.flag"
    heartbeat_path = state_dir / "daemon_heartbeat.json"
    status_path = state_dir / "status.json"
    max_ticks = normalized_max_ticks(args.max_ticks)
    completed_ticks = 0

    if pid_path.exists():
        try:
            existing_pid = int(pid_path.read_text(encoding="utf-8").strip())
        except ValueError:
            existing_pid = -1
        if pid_is_running(existing_pid):
            print(f"Codex loop daemon already running with PID {existing_pid}", file=sys.stderr)
            return 2
        pid_path.unlink(missing_ok=True)

    write_text(pid_path, f"{os.getpid()}\n")
    stop_flag.unlink(missing_ok=True)
    should_stop = False

    def _handle_signal(signum, _frame):
        nonlocal should_stop
        should_stop = True

    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    try:
        while not should_stop:
            print_tick_banner(f"daemon awake | interval={args.interval_minutes} min | pid={os.getpid()}")
            write_json(
                heartbeat_path,
                {
                    "pid": os.getpid(),
                    "interval_minutes": args.interval_minutes,
                    "max_ticks": max_ticks or None,
                    "completed_ticks": completed_ticks,
                    "remaining_ticks": max(max_ticks - completed_ticks, 0) if max_ticks > 0 else None,
                    "last_loop_started_at": utc_now(),
                    "phase": "tick",
                },
            )
            run_tick(args)
            completed_ticks += 1
            max_reached = max_ticks > 0 and completed_ticks >= max_ticks
            annotate_tick_budget(
                status_path,
                max_ticks,
                completed_ticks,
                "max_ticks_reached" if max_reached else "",
            )
            if max_reached:
                write_json(
                    heartbeat_path,
                    {
                        "pid": os.getpid(),
                        "interval_minutes": args.interval_minutes,
                        "max_ticks": max_ticks,
                        "completed_ticks": completed_ticks,
                        "remaining_ticks": 0,
                        "completed_at": utc_now(),
                        "phase": "completed",
                        "stop_reason": "max_ticks_reached",
                    },
                )
                print_tick_banner(f"daemon completed | max ticks reached ({completed_ticks}/{max_ticks})")
                break
            if should_stop or stop_flag.exists():
                break

            write_json(
                heartbeat_path,
                {
                    "pid": os.getpid(),
                    "interval_minutes": args.interval_minutes,
                    "max_ticks": max_ticks or None,
                    "completed_ticks": completed_ticks,
                    "remaining_ticks": max(max_ticks - completed_ticks, 0) if max_ticks > 0 else None,
                    "last_sleep_started_at": utc_now(),
                    "phase": "sleeping",
                },
            )
            print_tick_banner(f"daemon sleep | next tick in {args.interval_minutes} min")
            for _ in range(int(args.interval_minutes * 60)):
                if should_stop or stop_flag.exists():
                    break
                time.sleep(1)
    finally:
        pid_path.unlink(missing_ok=True)
        stop_flag.unlink(missing_ok=True)
        write_json(
            heartbeat_path,
            {
                "pid": os.getpid(),
                "interval_minutes": args.interval_minutes,
                "max_ticks": max_ticks or None,
                "completed_ticks": completed_ticks,
                "remaining_ticks": max(max_ticks - completed_ticks, 0) if max_ticks > 0 else None,
                "stopped_at": utc_now(),
                "phase": "completed" if max_ticks > 0 and completed_ticks >= max_ticks else "stopped",
                "stop_reason": "max_ticks_reached" if max_ticks > 0 and completed_ticks >= max_ticks else "",
            },
        )
        print_tick_banner("daemon stopped")
    return 0


def print_status(args):
    state_dir = args.state_dir.resolve()
    pid_path = state_dir / "daemon.pid"
    heartbeat_path = state_dir / "daemon_heartbeat.json"
    status_path = state_dir / "status.json"
    thread_path = state_dir / "thread_id.txt"

    payload = {
        "daemon_running": False,
        "pid": None,
        "thread_id": thread_path.read_text(encoding="utf-8").strip() if thread_path.exists() else None,
        "heartbeat": load_json(heartbeat_path, {}),
        "last_tick": load_json(status_path, {}),
    }
    if pid_path.exists():
        try:
            pid = int(pid_path.read_text(encoding="utf-8").strip())
        except ValueError:
            pid = -1
        payload["pid"] = pid
        payload["daemon_running"] = pid_is_running(pid)

    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


def parse_args():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--workspace", type=Path, default=Path.cwd())
    common.add_argument("--prompt-file", type=Path, default=Path.cwd() / ".codex-loop" / "prompt.md")
    common.add_argument("--state-dir", type=Path, default=Path.cwd() / ".codex-loop" / "state")
    common.add_argument("--interval-minutes", type=float, default=20.0)
    common.add_argument("--max-ticks", type=int, default=0)
    common.add_argument("--thread-id", default=None)
    common.add_argument("--model", default=None)
    common.add_argument("--profile", default=None)
    common.add_argument("--dangerous", action=argparse.BooleanOptionalAction, default=True)

    subparsers.add_parser("tick", parents=[common])
    subparsers.add_parser("daemon", parents=[common])
    subparsers.add_parser("status", parents=[common])
    return parser.parse_args()


def main():
    args = parse_args()
    if args.command == "tick":
        raise SystemExit(run_tick(args))
    if args.command == "daemon":
        raise SystemExit(daemon_loop(args))
    if args.command == "status":
        raise SystemExit(print_status(args))
    raise SystemExit(1)


if __name__ == "__main__":
    main()
