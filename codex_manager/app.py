from __future__ import annotations

import asyncio
import collections
import functools
import json
import os
import re
import shutil
import sqlite3
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import Body, FastAPI, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates


CODEX_HOME_DEFAULT = Path.home() / ".codex"
SESSION_INDEX_PATH = CODEX_HOME_DEFAULT / "session_index.jsonl"


def _pick_latest_db(pattern: str, codex_home: Path) -> Path | None:
    candidates = sorted(codex_home.glob(pattern))
    if not candidates:
        return None

    def score(path: Path) -> tuple[int, float]:
        stem = path.stem
        suffix_number = -1
        if "_" in stem:
            tail = stem.rsplit("_", 1)[-1]
            if tail.isdigit():
                suffix_number = int(tail)
        return (suffix_number, path.stat().st_mtime)

    return max(candidates, key=score)


@dataclass(frozen=True)
class DbPaths:
    codex_home: Path
    state_db: Path
    logs_db: Path | None
    session_index: Path
    manager_state: Path
    history_log: Path
    insights_report: Path
    usage_ledger: Path


def resolve_db_paths() -> DbPaths:
    codex_home = Path(os.environ.get("CODEX_HOME", CODEX_HOME_DEFAULT)).expanduser()
    state_db = os.environ.get("CODEX_STATE_DB")
    logs_db = os.environ.get("CODEX_LOG_DB")

    state_path = Path(state_db).expanduser() if state_db else _pick_latest_db("state_*.sqlite", codex_home)
    if not state_path or not state_path.exists():
        raise RuntimeError(f"Missing state db. Looked for {codex_home/'state_*.sqlite'}")

    logs_path: Path | None
    if logs_db:
        logs_path = Path(logs_db).expanduser()
    else:
        logs_path = _pick_latest_db("logs_*.sqlite", codex_home)
    if logs_path and not logs_path.exists():
        logs_path = None

    return DbPaths(
        codex_home=codex_home,
        state_db=state_path,
        logs_db=logs_path,
        session_index=codex_home / "session_index.jsonl",
        manager_state=codex_home / "thread_manager_state.json",
        history_log=codex_home / "history.jsonl",
        insights_report=codex_home / "codex_managed_agent_usage_report.json",
        usage_ledger=codex_home / "codex_managed_agent_usage_ledger.jsonl",
    )


def _load_manager_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"soft_deleted": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"soft_deleted": {}}
    if not isinstance(data, dict):
        return {"soft_deleted": {}}
    if not isinstance(data.get("soft_deleted"), dict):
        data["soft_deleted"] = {}
    return data


def _save_manager_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def _prune_manager_state(paths: DbPaths) -> dict[str, Any]:
    state = _load_manager_state(paths.manager_state)
    soft_deleted = state.get("soft_deleted", {})
    if not soft_deleted:
        return state

    with _connect_ro(paths.state_db) as state_conn:
        rows = state_conn.execute("SELECT id FROM threads").fetchall()
    valid_ids = {str(row["id"]) for row in rows}
    cleaned = {thread_id: meta for thread_id, meta in soft_deleted.items() if thread_id in valid_ids}
    if cleaned != soft_deleted:
        state["soft_deleted"] = cleaned
        _save_manager_state(paths.manager_state, state)
    return state


def _soft_delete_map(paths: DbPaths) -> dict[str, dict[str, Any]]:
    state = _prune_manager_state(paths)
    return state.get("soft_deleted", {})


def _set_soft_deleted(paths: DbPaths, ids: list[str], deleted: bool) -> dict[str, Any]:
    state = _load_manager_state(paths.manager_state)
    soft_deleted = state.setdefault("soft_deleted", {})
    now = int(time.time())
    changed: list[str] = []
    for thread_id in ids:
        if deleted:
            soft_deleted[thread_id] = {"at": now}
            changed.append(thread_id)
        else:
            if thread_id in soft_deleted:
                soft_deleted.pop(thread_id, None)
                changed.append(thread_id)
    _save_manager_state(paths.manager_state, state)
    return {"changed": changed, "soft_deleted_count": len(soft_deleted)}


def _connect_ro(db_path: Path) -> sqlite3.Connection:
    uri = f"file:{db_path.as_posix()}?mode=ro&immutable=1"
    conn = sqlite3.connect(uri, uri=True, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _connect_rw(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _to_iso_local(epoch_seconds: int | None) -> str | None:
    if epoch_seconds is None:
        return None
    dt = datetime.fromtimestamp(epoch_seconds, tz=timezone.utc).astimezone()
    return dt.isoformat(timespec="seconds")


def _iso_to_epoch_seconds(value: str | None) -> int | None:
    if not value:
        return None
    try:
        return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp())
    except Exception:
        return None


def _age_seconds(epoch_seconds: int | None, now: int) -> int | None:
    if epoch_seconds is None:
        return None
    return max(0, now - epoch_seconds)


def _human_age(seconds: int | None) -> str | None:
    if seconds is None:
        return None
    if seconds < 60:
        return f"{seconds}s"
    if seconds < 3600:
        return f"{seconds // 60}m"
    if seconds < 86400:
        return f"{seconds // 3600}h"
    return f"{seconds // 86400}d"


def _file_size_bytes(path_value: str | None) -> int:
    if not path_value:
        return 0
    try:
        path = Path(str(path_value)).expanduser()
        if not path.is_file():
            return 0
        return int(path.stat().st_size)
    except Exception:
        return 0


def _human_bytes(byte_count: int | None) -> str:
    size = max(0, int(byte_count or 0))
    if size < 1024:
        return f"{size} B"
    value = float(size)
    for unit in ("KB", "MB", "GB", "TB"):
        value /= 1024.0
        if value < 1024 or unit == "TB":
            if value < 10:
                return f"{value:.1f} {unit}"
            return f"{value:.0f} {unit}"
    return f"{size} B"


def _parse_json_maybe(value: str | None) -> Any:
    if not value:
        return None
    try:
        return json.loads(value)
    except Exception:
        return value


def _clean_text(value: str | None, limit: int = 240) -> str | None:
    if not value:
        return None
    text = " ".join(value.split())
    return text[:limit]


def _message_text_from_content(content: list[dict[str, Any]] | None) -> str:
    if not content:
        return ""
    parts: list[str] = []
    for item in content:
        text = item.get("text")
        if isinstance(text, str) and text.strip():
            parts.append(text.strip())
    return "\n".join(parts).strip()


def _find_session_files(codex_home: Path) -> list[Path]:
    sessions_dir = codex_home / "sessions"
    if not sessions_dir.exists():
        return []
    return sorted(sessions_dir.glob("**/rollout-*.jsonl"), key=lambda item: item.stat().st_mtime, reverse=True)


def _session_id_from_rollout_path(path: Path) -> str:
    match = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", path.name)
    return match.group(1) if match else ""


def _read_session_file_summary(path: Path) -> dict[str, Any] | None:
    thread_id = _session_id_from_rollout_path(path)
    session_meta: dict[str, Any] = {}
    first_user_message = ""
    updated_at = None
    tokens_used = 0
    has_user_event = 0
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return None

    for line in lines:
        try:
            obj = json.loads(line)
        except Exception:
            continue
        timestamp = obj.get("timestamp")
        timestamp_epoch = _iso_to_epoch_seconds(timestamp)
        if timestamp_epoch is not None:
            updated_at = max(updated_at or timestamp_epoch, timestamp_epoch)
        payload = obj.get("payload")
        if obj.get("type") == "session_meta" and isinstance(payload, dict):
            session_meta = payload
            thread_id = str(payload.get("id") or thread_id).strip()
            created_from_meta = _iso_to_epoch_seconds(str(payload.get("timestamp") or ""))
            if created_from_meta is not None and updated_at is None:
                updated_at = created_from_meta
        elif obj.get("type") == "response_item" and isinstance(payload, dict) and payload.get("type") == "message":
            role = payload.get("role")
            text = _message_text_from_content(payload.get("content"))
            if role == "user" and text and not first_user_message and not text.startswith("<environment_context>"):
                first_user_message = _clean_text(text, 500) or ""
                has_user_event = 1
        elif obj.get("type") == "event_msg" and isinstance(payload, dict) and payload.get("type") == "user_message":
            text = str(payload.get("message") or "").strip()
            if text and not first_user_message:
                first_user_message = _clean_text(text, 500) or ""
                has_user_event = 1
        elif obj.get("type") == "event_msg" and isinstance(payload, dict) and payload.get("type") == "token_count":
            info = payload.get("info")
            total_usage = info.get("total_token_usage") if isinstance(info, dict) else None
            if isinstance(total_usage, dict):
                tokens_used = max(tokens_used, int(total_usage.get("total_tokens") or 0))

    if not thread_id:
        return None

    try:
        stat = path.stat()
        created_at = int(stat.st_ctime)
        fallback_updated_at = int(stat.st_mtime)
    except OSError:
        created_at = int(time.time())
        fallback_updated_at = created_at

    created_at = _iso_to_epoch_seconds(str(session_meta.get("timestamp") or "")) or created_at
    updated_at = updated_at or fallback_updated_at
    title = first_user_message or str(session_meta.get("source") or "").strip() or thread_id
    return {
        "id": thread_id,
        "rollout_path": str(path),
        "created_at": created_at,
        "updated_at": updated_at,
        "source": str(session_meta.get("source") or "cli"),
        "model_provider": str(session_meta.get("model_provider") or "openai"),
        "cwd": str(session_meta.get("cwd") or ""),
        "title": _clean_text(title, 240) or thread_id,
        "sandbox_policy": json.dumps(session_meta.get("sandbox_policy") or {}, ensure_ascii=False),
        "approval_mode": str(session_meta.get("approval_policy") or ""),
        "tokens_used": tokens_used,
        "has_user_event": has_user_event,
        "cli_version": str(session_meta.get("cli_version") or ""),
        "first_user_message": first_user_message,
        "model": str(session_meta.get("model") or ""),
        "reasoning_effort": str(session_meta.get("reasoning_effort") or ""),
    }


def _append_missing_session_index_titles(session_index: Path, imported: list[dict[str, Any]]) -> int:
    existing = _read_session_index_titles(session_index)
    missing = [item for item in imported if item.get("id") and item.get("id") not in existing]
    if not missing:
        return 0
    session_index.parent.mkdir(parents=True, exist_ok=True)
    with session_index.open("a", encoding="utf-8") as fh:
      for item in missing:
          updated_at = datetime.fromtimestamp(int(item.get("updated_at") or time.time()), tz=timezone.utc).isoformat()
          fh.write(json.dumps({"id": item["id"], "thread_name": item.get("title") or item["id"], "updated_at": updated_at}, ensure_ascii=False) + "\n")
    return len(missing)


def scan_codex_sessions(limit: int = 500) -> dict[str, Any]:
    paths = resolve_db_paths()
    summaries = []
    for path in _find_session_files(paths.codex_home)[: max(1, min(int(limit or 500), 2000))]:
        summary = _read_session_file_summary(path)
        if summary:
            summaries.append(summary)
    if not summaries:
        return {"imported": [], "skipped": [], "summary": {"scanned": 0, "imported": 0, "existing": 0}}

    ids = [item["id"] for item in summaries]
    with _connect_ro(paths.state_db) as state_conn:
        rows = state_conn.execute(
            f"SELECT id FROM threads WHERE id IN ({','.join('?' for _ in ids)})",
            ids,
        ).fetchall()
    existing = {str(row["id"]) for row in rows}
    missing = [item for item in summaries if item["id"] not in existing]

    imported: list[dict[str, Any]] = []
    if missing:
        with _connect_rw(paths.state_db) as state_conn:
            state_conn.execute("BEGIN")
            for item in missing:
                state_conn.execute(
                    """
                    INSERT OR IGNORE INTO threads (
                      id, rollout_path, created_at, updated_at, source, model_provider, cwd, title,
                      sandbox_policy, approval_mode, tokens_used, has_user_event, archived, archived_at,
                      cli_version, first_user_message, model, reasoning_effort
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?)
                    """,
                    (
                        item["id"],
                        item["rollout_path"],
                        item["created_at"],
                        item["updated_at"],
                        item["source"],
                        item["model_provider"],
                        item["cwd"],
                        item["title"],
                        item["sandbox_policy"],
                        item["approval_mode"],
                        item["tokens_used"],
                        item["has_user_event"],
                        item["cli_version"],
                        item["first_user_message"],
                        item["model"],
                        item["reasoning_effort"],
                    ),
                )
                imported.append(item)
            state_conn.commit()

    session_index_added = _append_missing_session_index_titles(paths.session_index, imported)
    return {
        "imported": [{"id": item["id"], "title": item["title"], "cwd": item["cwd"]} for item in imported],
        "skipped": [{"id": item["id"], "reason": "already_indexed"} for item in summaries if item["id"] in existing],
        "summary": {
            "scanned": len(summaries),
            "imported": len(imported),
            "existing": len(existing),
            "session_index_added": session_index_added,
        },
    }


@functools.lru_cache(maxsize=256)
def _read_rollout_messages_cached(rollout_path: str, mtime_ns: int, limit: int) -> list[dict[str, Any]]:
    path = Path(rollout_path)
    messages: list[dict[str, Any]] = []
    if not path.exists():
        return messages

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return messages

    for line in lines:
        try:
            obj = json.loads(line)
        except Exception:
            continue

        event_type = obj.get("type")
        timestamp = obj.get("timestamp")
        payload = obj.get("payload", {})

        if event_type == "response_item" and payload.get("type") == "message":
            role = payload.get("role")
            if role not in {"user", "assistant"}:
                continue
            text = _message_text_from_content(payload.get("content"))
            if not text or text.startswith("<environment_context>"):
                continue
            messages.append(
                {
                    "role": role,
                    "text": text,
                    "ts": timestamp,
                    "kind": "message",
                }
            )

    deduped: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for item in messages:
        key = (item["role"], item["text"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)

    return deduped[-limit:]


def read_rollout_messages(rollout_path: str | None, limit: int = 8) -> list[dict[str, Any]]:
    if not rollout_path:
        return []
    path = Path(rollout_path)
    if not path.exists():
        return []
    try:
        mtime_ns = path.stat().st_mtime_ns
    except OSError:
        return []
    return _read_rollout_messages_cached(str(path), mtime_ns, limit)


@functools.lru_cache(maxsize=256)
def _read_rollout_metrics_cached(rollout_path: str, mtime_ns: int) -> dict[str, Any]:
    path = Path(rollout_path)
    metrics = {
        "compaction_count": 0,
        "last_compacted_at": None,
        "assistant_message_count": 0,
        "user_message_count": 0,
    }
    if not path.exists():
        return metrics

    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return metrics

    top_level_compactions = 0
    payload_compactions = 0
    last_compacted_at: str | None = None

    for line in lines:
        try:
            obj = json.loads(line)
        except Exception:
            continue

        event_type = obj.get("type")
        timestamp = obj.get("timestamp")
        payload = obj.get("payload", {})
        payload_type = payload.get("type") if isinstance(payload, dict) else None

        if event_type == "compacted":
            top_level_compactions += 1
            last_compacted_at = timestamp or last_compacted_at
        elif payload_type == "context_compacted":
            payload_compactions += 1
            last_compacted_at = timestamp or last_compacted_at

        if event_type == "response_item" and payload_type == "message":
            role = payload.get("role")
            text = _message_text_from_content(payload.get("content"))
            if not text or text.startswith("<environment_context>"):
                continue
            if role == "assistant":
                metrics["assistant_message_count"] += 1
            elif role == "user":
                metrics["user_message_count"] += 1

    metrics["compaction_count"] = top_level_compactions or payload_compactions
    metrics["last_compacted_at"] = last_compacted_at
    return metrics


def read_rollout_metrics(rollout_path: str | None) -> dict[str, Any]:
    if not rollout_path:
        return {
            "compaction_count": 0,
            "last_compacted_at": None,
            "assistant_message_count": 0,
            "user_message_count": 0,
        }
    path = Path(rollout_path)
    if not path.exists():
        return {
            "compaction_count": 0,
            "last_compacted_at": None,
            "assistant_message_count": 0,
            "user_message_count": 0,
        }
    try:
        mtime_ns = path.stat().st_mtime_ns
    except OSError:
        return {
            "compaction_count": 0,
            "last_compacted_at": None,
            "assistant_message_count": 0,
            "user_message_count": 0,
        }
    return _read_rollout_metrics_cached(str(path), mtime_ns)


@functools.lru_cache(maxsize=8)
def _read_history_counts_cached(history_path: str, mtime_ns: int) -> dict[str, int]:
    path = Path(history_path)
    counts: dict[str, int] = {}
    if not path.exists():
        return counts
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return counts
    for line in lines:
        try:
            obj = json.loads(line)
        except Exception:
            continue
        session_id = str(obj.get("session_id") or "").strip()
        text = str(obj.get("text") or "").strip()
        if not session_id or not text:
            continue
        counts[session_id] = counts.get(session_id, 0) + 1
    return counts


def read_history_counts(history_path: Path) -> dict[str, int]:
    if not history_path.exists():
        return {}
    try:
        mtime_ns = history_path.stat().st_mtime_ns
    except OSError:
        return {}
    return _read_history_counts_cached(str(history_path), mtime_ns)


def _read_history_entries(history_path: Path) -> list[dict[str, Any]]:
    if not history_path.exists():
        return []
    entries: list[dict[str, Any]] = []
    try:
        lines = history_path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return entries
    for line in lines:
        try:
            obj = json.loads(line)
        except Exception:
            continue
        session_id = str(obj.get("session_id") or "").strip()
        text = str(obj.get("text") or "").strip()
        ts = obj.get("ts")
        if not session_id or not text:
            continue
        try:
            ts_int = int(ts) if ts is not None else None
        except Exception:
            ts_int = None
        entries.append({"session_id": session_id, "text": text, "ts": ts_int})
    return entries


def _insights_source_signature(paths: DbPaths) -> dict[str, int | None]:
    result: dict[str, int | None] = {}
    for label, source_path in {
        "history_log": paths.history_log,
        "session_index": paths.session_index,
        "state_db": paths.state_db,
        "usage_ledger": paths.usage_ledger,
    }.items():
        try:
            result[label] = source_path.stat().st_mtime_ns
        except OSError:
            result[label] = None
    return result


def _read_usage_ledger(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    if not path.exists():
        return events
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except Exception:
        return events
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except Exception:
            continue
        if isinstance(event, dict):
            events.append(event)
    return events


def _usage_event_total(event: dict[str, Any]) -> int:
    total = event.get("total_tokens")
    try:
        total_int = int(total)
    except Exception:
        total_int = 0
    if total_int > 0:
        return total_int
    try:
        return int(event.get("input_tokens") or 0) + int(event.get("output_tokens") or 0)
    except Exception:
        return 0


def _usage_event_day(event: dict[str, Any]) -> str:
    value = str(event.get("finished_at") or event.get("started_at") or "").strip()
    if len(value) >= 10:
        return value[:10]
    return datetime.now().astimezone().date().isoformat()


def _token_stats(events: list[dict[str, Any]]) -> dict[str, Any]:
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
    }
    for event in events:
        try:
            input_tokens = int(event.get("input_tokens") or 0)
            output_tokens = int(event.get("output_tokens") or 0)
        except Exception:
            input_tokens = 0
            output_tokens = 0
        total_tokens = _usage_event_total(event)
        source = str(event.get("source") or "manual_cli")
        finished_at = str(event.get("finished_at") or event.get("started_at") or "")

        stats["total_input_tokens"] += input_tokens
        stats["total_output_tokens"] += output_tokens
        stats["total_tokens"] += total_tokens
        if finished_at and finished_at > str(stats["last_token_event_at"]):
            stats["last_token_event_at"] = finished_at

        if source == "loop":
            prefix = "loop"
        elif source == "auto_continue":
            prefix = "auto_continue"
        else:
            prefix = "manual_cli"
        stats[f"{prefix}_input_tokens"] += input_tokens
        stats[f"{prefix}_output_tokens"] += output_tokens
        stats[f"{prefix}_tokens"] += total_tokens
    return stats


def _recent_token_days(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    days: dict[str, dict[str, Any]] = {}
    for event in events:
        day = _usage_event_day(event)
        bucket = days.setdefault(day, {"day": day, "total_tokens": 0, "events": 0})
        bucket["total_tokens"] += _usage_event_total(event)
        bucket["events"] += 1
    return sorted(days.values(), key=lambda item: item["day"])[-84:]


def _top_token_threads(events: list[dict[str, Any]], threads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    thread_meta = {str(item.get("id") or ""): item for item in threads}
    buckets: dict[str, dict[str, Any]] = {}
    for event in events:
        thread_id = str(event.get("thread_id") or "").strip()
        if not thread_id:
            continue
        bucket = buckets.setdefault(thread_id, {
            "thread_id": thread_id,
            "total_tokens": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "event_count": 0,
            "latest_at": "",
            "source_mix": {},
        })
        try:
            input_tokens = int(event.get("input_tokens") or 0)
            output_tokens = int(event.get("output_tokens") or 0)
        except Exception:
            input_tokens = 0
            output_tokens = 0
        total_tokens = _usage_event_total(event)
        source = str(event.get("source") or "manual_cli")
        finished_at = str(event.get("finished_at") or event.get("started_at") or "")
        bucket["total_tokens"] += total_tokens
        bucket["input_tokens"] += input_tokens
        bucket["output_tokens"] += output_tokens
        bucket["event_count"] += 1
        bucket["source_mix"][source] = int(bucket["source_mix"].get(source, 0)) + total_tokens
        if finished_at and finished_at > str(bucket["latest_at"]):
            bucket["latest_at"] = finished_at

    ranked: list[dict[str, Any]] = []
    for index, item in enumerate(sorted(buckets.values(), key=lambda value: int(value["total_tokens"]), reverse=True)[:12], start=1):
        meta = thread_meta.get(str(item["thread_id"]), {})
        ranked.append({
            "rank": index,
            **item,
            "title": meta.get("title") or item["thread_id"],
            "cwd": meta.get("cwd") or "",
        })
    return ranked


def _merge_token_analysis_views(views: list[dict[str, Any]], stats: dict[str, Any]) -> list[dict[str, Any]]:
    filtered = [item for item in views if str(item.get("title") or "") not in {"Token Pace", "Token Mix"}]
    total_tokens = int(stats.get("total_tokens") or 0)
    filtered.insert(0, {
        "title": "Token Mix",
        "signal": "Tooling" if total_tokens else "Waiting",
        "description": (
            f"Total {total_tokens} · manual {int(stats.get('manual_cli_tokens') or 0)} · "
            f"auto-continue {int(stats.get('auto_continue_tokens') or 0)} · loop {int(stats.get('loop_tokens') or 0)}"
            if total_tokens else
            "Token usage will appear after local CLI or loop events are ingested."
        ),
    })
    filtered.insert(0, {
        "title": "Token Pace",
        "signal": "Recent" if stats.get("last_token_event_at") else "Waiting",
        "description": (
            f"Last token event {stats.get('last_token_event_at')}"
            if stats.get("last_token_event_at") else
            "No Codex token event has been recorded yet."
        ),
    })
    return filtered[:8]


def _vibe_guidance_from_report(report: dict[str, Any]) -> list[str]:
    suggestions: list[str] = []
    summary = report.get("summary", {})
    style = report.get("style", {})
    total_inputs = int(summary.get("total_inputs") or 0)
    avg_prompt_len = float(summary.get("avg_prompt_length") or 0)
    short_ratio = float(summary.get("short_prompt_ratio") or 0)
    compactions = int(summary.get("total_compactions") or 0)
    threads = int(summary.get("threads_total") or 0)
    automation_ratio = float(style.get("automation_ratio") or 0)
    planning_ratio = float(style.get("planning_ratio") or 0)
    ui_ratio = float(style.get("ui_ratio") or 0)

    if short_ratio >= 0.35 or avg_prompt_len < 18:
        suggestions.append("多给目标、约束、验收标准，减少只有“continue/继续/改一下”这类短提示，能明显降低来回试错。")
    if threads and compactions >= max(6, threads // 2):
        suggestions.append("上下文压缩较频繁，适合在开工前先写小计划、模块边界和索引清单，这更符合 Vibe Coding 里“规划驱动 + 索引构建”的做法。")
    if total_inputs >= 20 and planning_ratio < 0.12:
        suggestions.append("你的使用更偏直接推进，建议在大任务前先让 AI 产出一步一步的执行计划，并要求每步完成后再继续。")
    if automation_ratio >= 0.12:
        suggestions.append("你已经开始偏向 loop/自动化工作流，建议继续用 detached runtime、监控面板和日志回看，不要把自动续跑绑在前台对话。")
    if ui_ratio >= 0.16:
        suggestions.append("你的需求里有明显的 UI/布局打磨倾向，适合先固定 2~3 套视觉主题和组件契约，再让 AI 扩展页面，能减少后期反复改样式。")
    if not suggestions:
        suggestions.append("当前节奏已经比较均衡，继续保持“先说明目标与限制、再让 AI 分步执行并回报结果”的工作方式会最稳。")
    return suggestions[:4]


_STOP_WORDS = {
    "the", "and", "for", "with", "that", "this", "from", "into", "then", "just", "more",
    "need", "want", "make", "show", "card", "board", "thread", "agent", "codex", "managed",
    "continue", "open", "send", "loop", "mode", "view", "layout", "please", "help",
    "home", "clashuser", "hzh", "work_bo", "item_bo", "learn", "likecc", "bin", "local", "json",
    "我们", "这个", "那个", "一下", "继续", "需要", "支持", "可以", "然后", "还有", "就是", "里面",
    "一个", "一下子", "当前", "现在", "进行", "显示", "改成", "优化", "对话", "线程", "卡片",
}


def _keyword_report(history_entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    counter: collections.Counter[str] = collections.Counter()
    for item in history_entries:
        text = str(item.get("text") or "")
        lowered = text.lower()
        english_tokens = re.findall(r"[a-z][a-z0-9_\\-]{2,}", lowered)
        chinese_tokens = re.findall(r"[\u4e00-\u9fff]{2,8}", text)
        for token in [*english_tokens, *chinese_tokens]:
            if "_" in token or token.startswith("codex"):
                continue
            if token in _STOP_WORDS:
                continue
            counter[token] += 1
    return [{"keyword": key, "count": count} for key, count in counter.most_common(10)]


def _analysis_views(report: dict[str, Any]) -> list[dict[str, str]]:
    summary = report.get("summary", {})
    style = report.get("style", {})
    return [
        {
            "title": "话题地图",
            "description": "把高频关键词、项目目录和线程标题聚成主题簇，适合做思维导图或最近关注点总览。",
            "signal": "高频词 / 线程标题 / cwd",
        },
        {
            "title": "工作节奏",
            "description": "按小时和日期看输入分布，判断你更像夜间冲刺型、持续推进型，还是集中爆发型。",
            "signal": "活跃时段 / 活跃天数 / 输入节奏",
        },
        {
            "title": "上下文压力",
            "description": "看压缩次数、短提示比例和线程切换频率，识别哪里最容易丢上下文。",
            "signal": f"压缩 {int(summary.get('total_compactions') or 0)} 次 / 短提示占比 {round(float(summary.get('short_prompt_ratio') or 0) * 100)}%",
        },
        {
            "title": "协作画像",
            "description": "把输入习惯拆成规划、执行、探索、自动化、界面打磨几类，形成更像使用风格的画像，而不是武断的人格判断。",
            "signal": "规划 / 执行 / 探索 / 自动化 / UI",
        },
        {
            "title": "Vibe Coding 建议",
            "description": "结合最简单技术栈、规划驱动、逐步验证、模块索引化这些准则，给出适合你的使用建议。",
            "signal": "简栈 / 分步 / 验证 / 模块边界",
        },
    ]


def _entries_in_window(
    history_entries: list[dict[str, Any]],
    *,
    start_ts: int,
    end_ts: int,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for item in history_entries:
        ts = item.get("ts")
        if ts is None:
            continue
        try:
            ts_int = int(ts)
        except Exception:
            continue
        if start_ts <= ts_int < end_ts:
            items.append(item)
    return items


def _weekly_shift_report(history_entries: list[dict[str, Any]], now_ts: int) -> dict[str, Any]:
    current_start = now_ts - 7 * 24 * 3600
    previous_start = now_ts - 14 * 24 * 3600
    current_entries = _entries_in_window(history_entries, start_ts=current_start, end_ts=now_ts)
    previous_entries = _entries_in_window(history_entries, start_ts=previous_start, end_ts=current_start)
    current_style = _style_report(current_entries)
    previous_style = _style_report(previous_entries)

    label_map = {
        "planner_ratio": "规划",
        "executor_ratio": "执行",
        "explorer_ratio": "探索",
        "automation_ratio": "自动化",
        "ui_ratio": "UI 打磨",
    }
    shifts: list[dict[str, Any]] = []
    for key, label in label_map.items():
        current_value = float(current_style.get(key) or 0.0)
        previous_value = float(previous_style.get(key) or 0.0)
        delta = round(current_value - previous_value, 3)
        direction = "flat"
        if delta > 0.035:
            direction = "up"
        elif delta < -0.035:
            direction = "down"
        shifts.append(
            {
                "key": key,
                "label": label,
                "current": round(current_value, 3),
                "previous": round(previous_value, 3),
                "delta": delta,
                "direction": direction,
            }
        )
    shifts.sort(key=lambda item: abs(float(item["delta"])), reverse=True)

    highlights: list[str] = []
    for item in shifts[:3]:
        if item["direction"] == "up":
            highlights.append(f"本周更偏{item['label']}（+{round(item['delta'] * 100)}%）")
        elif item["direction"] == "down":
            highlights.append(f"{item['label']}倾向比上周回落（{round(item['delta'] * 100)}%）")
    if not highlights:
        highlights.append("本周整体风格比较稳定，没有特别明显的方向漂移。")

    return {
        "current_window": "最近 7 天",
        "previous_window": "前 7 天",
        "current_inputs": len(current_entries),
        "previous_inputs": len(previous_entries),
        "current_persona": [item["label"] for item in current_style.get("dominant", [])[:2]],
        "previous_persona": [item["label"] for item in previous_style.get("dominant", [])[:2]],
        "shifts": shifts,
        "highlights": highlights,
    }


def _interaction_heatmap_report(history_entries: list[dict[str, Any]], now_ts: int, weeks: int = 16) -> dict[str, Any]:
    total_days = max(7, int(weeks) * 7)
    tz = datetime.now().astimezone().tzinfo
    today_local = datetime.fromtimestamp(now_ts, tz=timezone.utc).astimezone(tz).date()
    start_day = today_local - timedelta(days=total_days - 1)
    counts_by_day: collections.Counter[str] = collections.Counter()

    for item in history_entries:
        ts = item.get("ts")
        if ts is None:
            continue
        try:
            dt = datetime.fromtimestamp(int(ts), tz=timezone.utc).astimezone(tz)
        except Exception:
            continue
        day = dt.date()
        if day < start_day or day > today_local:
            continue
        counts_by_day[day.isoformat()] += 1

    max_count = max(counts_by_day.values(), default=0)
    total_inputs = sum(counts_by_day.values())
    active_days = sum(1 for value in counts_by_day.values() if value > 0)
    weekday_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    month_labels: list[dict[str, Any]] = []
    days: list[dict[str, Any]] = []

    for offset in range(total_days):
        day = start_day + timedelta(days=offset)
        iso = day.isoformat()
        count = int(counts_by_day.get(iso, 0))
        level = 0
        if max_count > 0 and count > 0:
            ratio = count / max_count
            if ratio >= 0.8:
                level = 4
            elif ratio >= 0.55:
                level = 3
            elif ratio >= 0.3:
                level = 2
            else:
                level = 1
        days.append(
            {
                "date": iso,
                "count": count,
                "level": level,
                "week_index": offset // 7,
                "weekday_index": day.weekday(),
                "weekday_label": weekday_labels[day.weekday()],
            }
        )
        if day.day == 1 or offset == 0:
            month_labels.append(
                {
                    "label": day.strftime("%b"),
                    "week_index": offset // 7,
                }
            )

    return {
        "title": "User Interaction Heatmap",
        "window_label": f"最近 {weeks} 周",
        "weeks": weeks,
        "total_inputs": total_inputs,
        "active_days": active_days,
        "max_count": max_count,
        "weekday_labels": weekday_labels,
        "month_labels": month_labels,
        "days": days,
        "basis": "Only direct user inputs from local history.jsonl are counted. Background loop or daemon activity is excluded.",
    }


def _topic_map_report(
    *,
    style: dict[str, Any],
    keywords: list[dict[str, Any]],
    top_threads: list[dict[str, Any]],
) -> dict[str, Any]:
    nodes: list[dict[str, Any]] = [
        {"id": "center", "label": "Codex Workbench", "group": "center", "weight": 1.0},
    ]
    edges: list[dict[str, str]] = []

    style_nodes = style.get("dominant", [])[:3]
    for index, item in enumerate(style_nodes, start=1):
        node_id = f"style-{index}"
        nodes.append(
            {
                "id": node_id,
                "label": str(item.get("label") or "风格"),
                "group": "style",
                "weight": max(0.3, min(1.0, float(item.get("score") or 1) / 12)),
                "focus_value": str(item.get("label") or "风格"),
            }
        )
        edges.append({"from": "center", "to": node_id})

    for index, item in enumerate(keywords[:8], start=1):
        node_id = f"keyword-{index}"
        nodes.append(
            {
                "id": node_id,
                "label": str(item.get("keyword") or ""),
                "group": "keyword",
                "weight": max(0.25, min(1.0, float(item.get("count") or 1) / 10)),
                "focus_value": str(item.get("keyword") or ""),
            }
        )
        anchor = "center"
        if style_nodes:
            anchor = f"style-{((index - 1) % len(style_nodes)) + 1}"
        edges.append({"from": anchor, "to": node_id})

    for index, item in enumerate(top_threads[:4], start=1):
        node_id = f"thread-{index}"
        nodes.append(
            {
                "id": node_id,
                "label": str(item.get("title") or item.get("id") or "Thread"),
                "group": "thread",
                "weight": max(0.35, min(1.0, (float(item.get("user_command_count") or 0) + float(item.get("compaction_count") or 0)) / 12)),
                "thread_id": str(item.get("id") or ""),
            }
        )
        edges.append({"from": "center", "to": node_id})

    return {
        "title": "话题地图",
        "nodes": nodes,
        "edges": edges,
    }


def _style_report(history_entries: list[dict[str, Any]]) -> dict[str, Any]:
    joined = "\n".join(item["text"] for item in history_entries)
    corpus = joined.lower()
    def count(pattern: str) -> int:
        return len(re.findall(pattern, corpus, flags=re.IGNORECASE))

    planner = count(r"\b(plan|planning|roadmap|outline|architecture|constraint|spec)\b|计划|规划|方案|大纲|架构|约束")
    executor = count(r"\b(fix|implement|run|build|package|deploy|test)\b|修改|修|实现|跑|构建|部署|测试")
    explorer = count(r"\b(analyze|analysis|inspect|compare|search|find|why)\b|分析|查看|比较|查找|为什么|检索")
    automator = count(r"\b(loop|daemon|tmux|nohup|schedule|monitor|batch|auto)\b|循环|自动|守护|定时|监控|批量")
    ui_builder = count(r"\b(ui|theme|layout|card|board|dashboard|color|icon)\b|界面|主题|布局|卡片|面板|仪表盘|颜色|图标")
    total = max(1, planner + executor + explorer + automator + ui_builder)
    style_scores = {
        "planner_ratio": round(planner / total, 3),
        "executor_ratio": round(executor / total, 3),
        "explorer_ratio": round(explorer / total, 3),
        "automation_ratio": round(automator / total, 3),
        "ui_ratio": round(ui_builder / total, 3),
    }
    top = sorted(
        [
            ("规划型", planner, "倾向先搭框架、讲约束、做整体路线。"),
            ("执行型", executor, "倾向快速改文件、跑命令、闭环交付。"),
            ("探索型", explorer, "倾向分析、比较、先看清问题再推进。"),
            ("自动化型", automator, "倾向做 loop、daemon、监控和批处理。"),
            ("界面型", ui_builder, "倾向持续打磨 UI、交互、视觉和布局。"),
        ],
        key=lambda item: item[1],
        reverse=True,
    )
    dominant = [{"label": label, "score": score, "description": desc} for label, score, desc in top if score > 0][:3]
    return {"dominant": dominant, **style_scores}


def generate_usage_report(force: bool = False) -> dict[str, Any]:
    paths = resolve_db_paths()
    signature = _insights_source_signature(paths)
    if not force and paths.insights_report.exists():
        try:
            cached = json.loads(paths.insights_report.read_text(encoding="utf-8"))
            if cached.get("source_signature") == signature:
                return cached
        except Exception:
            pass

    session_titles = _read_session_index_titles(paths.session_index)
    history_entries = _read_history_entries(paths.history_log)
    history_counts = read_history_counts(paths.history_log)
    usage_events = _read_usage_ledger(paths.usage_ledger)
    token_stats = _token_stats(usage_events)
    now = int(time.time())

    with _connect_ro(paths.state_db) as conn:
        rows = conn.execute(
            """
            SELECT id, title, cwd, archived, created_at, updated_at, rollout_path, tokens_used
            FROM threads
            ORDER BY updated_at DESC
            """
        ).fetchall()

    by_thread: list[dict[str, Any]] = []
    compaction_total = 0
    last_compacted_at = None
    for row in rows:
        thread_id = str(row["id"])
        rollout_metrics = read_rollout_metrics(row["rollout_path"])
        compaction_count = int(rollout_metrics.get("compaction_count") or 0)
        rollout_user_count = int(rollout_metrics.get("user_message_count") or 0)
        user_command_count = rollout_user_count or int(history_counts.get(thread_id, 0))
        if rollout_metrics.get("last_compacted_at"):
            last_compacted_at = max(filter(None, [last_compacted_at, rollout_metrics.get("last_compacted_at")]))
        compaction_total += compaction_count
        by_thread.append(
            {
                "id": thread_id,
                "title": session_titles.get(thread_id) or row["title"] or thread_id,
                "cwd": row["cwd"],
                "archived": bool(row["archived"]),
                "updated_at": int(row["updated_at"]) if row["updated_at"] is not None else None,
                "user_command_count": user_command_count,
                "rollout_user_message_count": rollout_user_count,
                "compaction_count": compaction_count,
                "tokens_used": int(row["tokens_used"] or 0),
            }
        )

    prompt_lengths = [len(item["text"]) for item in history_entries if item.get("text")]
    short_prompt_ratio = (
        sum(1 for length in prompt_lengths if length <= 16) / len(prompt_lengths)
        if prompt_lengths else 0.0
    )
    hour_counter = collections.Counter()
    day_counter = collections.Counter()
    for item in history_entries:
        ts = item.get("ts")
        if ts is None:
            continue
        dt = datetime.fromtimestamp(int(ts), tz=timezone.utc).astimezone()
        hour_counter[dt.hour] += 1
        day_counter[dt.strftime("%Y-%m-%d")] += 1

    top_threads = sorted(
        by_thread,
        key=lambda item: (item["user_command_count"], item["compaction_count"], item["updated_at"] or 0),
        reverse=True,
    )[:8]
    style = _style_report(history_entries)
    keywords = _keyword_report(history_entries)
    weekly_report = _weekly_shift_report(history_entries, now)
    topic_map = _topic_map_report(style=style, keywords=keywords, top_threads=top_threads)
    interaction_heatmap = _interaction_heatmap_report(history_entries, now)
    summary = {
        "threads_total": len(by_thread),
        "threads_archived": sum(1 for item in by_thread if item["archived"]),
        "total_inputs": len(history_entries),
        "total_compactions": compaction_total,
        "avg_prompt_length": round(sum(prompt_lengths) / len(prompt_lengths), 1) if prompt_lengths else 0,
        "short_prompt_ratio": round(short_prompt_ratio, 3),
        "active_days": len(day_counter),
        "last_compacted_at": last_compacted_at,
        **token_stats,
    }
    activity = {
        "top_hours": [{"hour": hour, "count": count} for hour, count in hour_counter.most_common(6)],
        "recent_days": [{"day": day, "count": count} for day, count in sorted(day_counter.items(), reverse=True)[:10]],
        "recent_token_days": _recent_token_days(usage_events),
    }
    analysis_views = _merge_token_analysis_views(_analysis_views({
        "summary": {
            "total_compactions": compaction_total,
            "short_prompt_ratio": round(short_prompt_ratio, 3),
        },
        "style": style,
    }), token_stats)
    report = {
        "generated_at": _to_iso_local(now),
        "source_signature": signature,
        "summary": summary,
        "style": style,
        "keywords": keywords,
        "top_threads": top_threads,
        "token_top_threads": _top_token_threads(usage_events, by_thread),
        "topic_map": topic_map,
        "word_cloud": keywords[:20],
        "analysis_views": analysis_views,
        "weekly_report": weekly_report,
        "interaction_heatmap": interaction_heatmap,
        "activity": activity,
        "guidance": {
            "usage_persona": [item["label"] for item in style.get("dominant", [])[:2]],
            "vibe_coding_suggestions": _vibe_guidance_from_report({"summary": {
                "total_inputs": len(history_entries),
                "avg_prompt_length": round(sum(prompt_lengths) / len(prompt_lengths), 1) if prompt_lengths else 0,
                "short_prompt_ratio": round(short_prompt_ratio, 3),
                "total_compactions": compaction_total,
                "threads_total": len(by_thread),
            }, "style": style}),
            "basis": [
                "优先简单技术栈和最短路径",
                "规划驱动，先明确目标/约束/验收标准",
                "分步骤推进，并在每步后验证结果",
                "模块化与索引化，降低上下文压缩压力",
            ],
        },
    }
    paths.insights_report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    return report


def _extract_pid(process_uuid: str | None) -> int | None:
    if not process_uuid:
        return None
    if not process_uuid.startswith("pid:"):
        return None
    parts = process_uuid.split(":", 2)
    if len(parts) < 2 or not parts[1].isdigit():
        return None
    return int(parts[1])


def _pid_is_alive(pid: int | None) -> bool:
    if not pid or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
    except OSError:
        return False
    return True


def _describe_pid(pid: int | None) -> dict[str, Any]:
    if not pid:
        return {"pid": None, "alive": False, "summary": None}
    alive = _pid_is_alive(pid)
    if not alive:
        return {"pid": pid, "alive": False, "summary": f"pid {pid} offline"}

    try:
        result = subprocess.run(
            ["ps", "-p", str(pid), "-o", "pid=,etime=,comm=,args="],
            check=False,
            capture_output=True,
            text=True,
        )
        summary = " ".join(result.stdout.split()) if result.stdout else f"pid {pid} alive"
    except Exception:
        summary = f"pid {pid} alive"

    return {"pid": pid, "alive": True, "summary": summary}


ThreadSort = Literal["updated_desc", "updated_asc", "log_desc", "log_asc", "created_desc", "created_asc"]
ThreadStatus = Literal["running", "active", "recent", "idle", "archived"]
ThreadScope = Literal["live", "soft_deleted", "all"]


def _fetch_log_previews(
    conn: sqlite3.Connection,
    thread_ids: list[str],
    preview_limit: int,
    now: int,
) -> dict[str, dict[str, Any]]:
    if not thread_ids:
        return {}

    placeholders = ",".join("?" for _ in thread_ids)
    sql = f"""
    SELECT *
    FROM (
      SELECT
        thread_id,
        ts,
        ts_nanos,
        level,
        target,
        file,
        line,
        process_uuid,
        substr(coalesce(feedback_log_body, ''), 1, 240) AS message,
        ROW_NUMBER() OVER (
          PARTITION BY thread_id
          ORDER BY ts DESC, ts_nanos DESC, id DESC
        ) AS rn
      FROM logsdb.logs
      WHERE thread_id IN ({placeholders})
    )
    WHERE rn <= ?
    ORDER BY thread_id, ts DESC, ts_nanos DESC
    """
    rows = conn.execute(sql, (*thread_ids, preview_limit)).fetchall()

    grouped: dict[str, dict[str, Any]] = {}
    for row in rows:
        thread_id = str(row["thread_id"])
        entry = grouped.setdefault(
            thread_id,
            {
                "last_process_uuid": None,
                "last_pid": None,
                "process": None,
                "preview_logs": [],
            },
        )
        if entry["last_process_uuid"] is None:
            process_uuid = row["process_uuid"]
            pid = _extract_pid(process_uuid)
            entry["last_process_uuid"] = process_uuid
            entry["last_pid"] = pid
            entry["process"] = _describe_pid(pid)

        ts = int(row["ts"]) if row["ts"] is not None else None
        message = _clean_text(row["message"]) or _clean_text(row["target"]) or "log event"
        if row["file"] and row["line"]:
            message = f"{message} ({row['file']}:{row['line']})"

        entry["preview_logs"].append(
            {
                "ts": ts,
                "ts_iso": _to_iso_local(ts),
                "age": _human_age(_age_seconds(ts, now)),
                "level": row["level"],
                "target": row["target"],
                "message": message,
            }
        )

    return grouped


def _compute_status(
    *,
    archived: int,
    process_alive: bool,
    log_age: int | None,
    updated_age: int | None,
) -> str:
    if archived == 1:
        return "archived"
    if process_alive and log_age is not None and log_age <= 300:
        return "running"
    if log_age is not None and log_age <= 60:
        return "active"
    if updated_age is not None and updated_age <= 600:
        return "recent"
    return "idle"


def fetch_threads(
    *,
    q: str | None,
    archived: int | None,
    status: ThreadStatus | None,
    scope: ThreadScope = "live",
    limit: int,
    offset: int,
    sort: ThreadSort,
    include_logs: bool = False,
    include_history: bool = False,
    history_limit: int = 6,
    preview_limit: int = 3,
) -> dict[str, Any]:
    paths = resolve_db_paths()
    now = int(time.time())
    soft_deleted = _soft_delete_map(paths)
    session_titles = _read_session_index_titles(paths.session_index)
    history_counts = read_history_counts(paths.history_log)

    with _connect_ro(paths.state_db) as conn:
        if paths.logs_db:
            conn.execute("ATTACH DATABASE ? AS logsdb", (str(paths.logs_db),))

        where: list[str] = []
        params: list[Any] = []

        if q:
            where.append("(title LIKE ? OR id LIKE ? OR cwd LIKE ?)")
            like = f"%{q}%"
            params.extend([like, like, like])

        if archived in (0, 1):
            where.append("archived = ?")
            params.append(archived)

        where_sql = f"WHERE {' AND '.join(where)}" if where else ""

        logs_join = ""
        if paths.logs_db:
            logs_join = """
            LEFT JOIN (
              SELECT thread_id AS log_thread_id,
                     MAX(ts) AS last_log_ts,
                     COUNT(*) AS log_count
              FROM logsdb.logs
              WHERE thread_id IS NOT NULL
              GROUP BY thread_id
            ) lg ON lg.log_thread_id = t.id
            """

        order_by = {
            "updated_desc": "t.updated_at DESC",
            "updated_asc": "t.updated_at ASC",
            "created_desc": "t.created_at DESC",
            "created_asc": "t.created_at ASC",
            "log_desc": "COALESCE(lg.last_log_ts, 0) DESC, t.updated_at DESC",
            "log_asc": "COALESCE(lg.last_log_ts, 0) ASC, t.updated_at ASC",
        }[sort]

        sql = f"""
        SELECT
          t.id,
          t.title,
          t.cwd,
          t.source,
          t.model_provider,
          t.model,
          t.reasoning_effort,
          t.sandbox_policy,
          t.approval_mode,
          t.tokens_used,
          t.has_user_event,
          t.archived,
          t.created_at,
          t.updated_at,
          t.rollout_path,
          t.cli_version
          {", lg.last_log_ts, lg.log_count" if paths.logs_db else ""}
        FROM threads t
        {logs_join}
        {where_sql}
        ORDER BY {order_by}
        """
        rows = conn.execute(sql, params).fetchall()

        thread_ids = [str(row["id"]) for row in rows]
        log_details = {}
        if paths.logs_db:
            log_details = _fetch_log_previews(conn, thread_ids, preview_limit if include_logs else 1, now)

    all_items = []
    counts = {"running": 0, "active": 0, "recent": 0, "idle": 0, "archived": 0}
    for row in rows:
        thread_id = str(row["id"])
        created_at = int(row["created_at"]) if row["created_at"] is not None else None
        updated_at = int(row["updated_at"]) if row["updated_at"] is not None else None
        last_log_ts = int(row["last_log_ts"]) if "last_log_ts" in row.keys() and row["last_log_ts"] is not None else None
        log_count = int(row["log_count"]) if "log_count" in row.keys() and row["log_count"] is not None else 0
        rollout_metrics = read_rollout_metrics(row["rollout_path"])
        rollout_user_count = int(rollout_metrics.get("user_message_count") or 0)
        user_command_count = rollout_user_count or int(history_counts.get(thread_id, 0))
        storage_bytes = _file_size_bytes(row["rollout_path"])

        updated_age = _age_seconds(updated_at, now)
        log_age = _age_seconds(last_log_ts, now)
        runtime = log_details.get(thread_id, {})
        process = runtime.get("process") or {"pid": None, "alive": False, "summary": None}
        computed_status = _compute_status(
            archived=int(row["archived"]),
            process_alive=bool(process.get("alive")),
            log_age=log_age,
            updated_age=updated_age,
        )
        counts[computed_status] = counts.get(computed_status, 0) + 1

        item = {
            "id": thread_id,
            "title": session_titles.get(thread_id) or row["title"],
            "db_title": row["title"],
            "cwd": row["cwd"],
            "archived": int(row["archived"]),
            "status": computed_status,
            "created_at": created_at,
            "updated_at": updated_at,
            "created_at_iso": _to_iso_local(created_at),
            "updated_at_iso": _to_iso_local(updated_at),
            "updated_age": _human_age(updated_age),
            "last_log_ts": last_log_ts,
            "last_log_iso": _to_iso_local(last_log_ts),
            "log_age": _human_age(log_age),
            "log_count": log_count,
            "tokens_used": int(row["tokens_used"] or 0),
            "has_user_event": int(row["has_user_event"] or 0),
            "model_provider": row["model_provider"],
            "model": row["model"],
            "reasoning_effort": row["reasoning_effort"],
            "sandbox_policy": _parse_json_maybe(row["sandbox_policy"]),
            "approval_mode": row["approval_mode"],
            "cli_version": row["cli_version"],
            "rollout_path": row["rollout_path"],
            "storage_bytes": storage_bytes,
            "storage_label": _human_bytes(storage_bytes),
            "source": row["source"],
            "process": process,
            "process_uuid": runtime.get("last_process_uuid"),
            "preview_logs": runtime.get("preview_logs", []),
            "soft_deleted": thread_id in soft_deleted,
            "soft_deleted_at": soft_deleted.get(thread_id, {}).get("at"),
            "history": read_rollout_messages(row["rollout_path"], limit=history_limit) if include_history else [],
            "compaction_count": int(rollout_metrics.get("compaction_count") or 0),
            "last_compacted_at": rollout_metrics.get("last_compacted_at"),
            "user_command_count": user_command_count,
            "assistant_message_count": int(rollout_metrics.get("assistant_message_count") or 0),
            "rollout_user_message_count": rollout_user_count,
        }
        all_items.append(item)

    filtered_items = [item for item in all_items if status is None or item["status"] == status]
    if scope == "live":
        filtered_items = [item for item in filtered_items if not item["soft_deleted"]]
    elif scope == "soft_deleted":
        filtered_items = [item for item in filtered_items if item["soft_deleted"]]
    total = len(filtered_items)
    items = filtered_items[offset : offset + limit]

    return {
        "meta": {
            "now": now,
            "now_iso": _to_iso_local(now),
            "state_db": str(paths.state_db),
            "logs_db": str(paths.logs_db) if paths.logs_db else None,
            "session_index": str(paths.session_index),
            "total": total,
            "limit": limit,
            "offset": offset,
            "q": q,
            "archived": archived,
            "status": status,
            "scope": scope,
            "sort": sort,
            "counts": counts,
            "soft_deleted_total": len(soft_deleted),
        },
        "items": items,
    }


def fetch_thread_detail(thread_id: str, *, log_limit: int = 200) -> dict[str, Any]:
    paths = resolve_db_paths()
    now = int(time.time())
    session_titles = _read_session_index_titles(paths.session_index)
    history_counts = read_history_counts(paths.history_log)

    with _connect_ro(paths.state_db) as conn:
        row = conn.execute("SELECT * FROM threads WHERE id = ?", (thread_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"thread not found: {thread_id}")
        thread = dict(row)

    logs: list[dict[str, Any]] = []
    process = {"pid": None, "alive": False, "summary": None}
    process_uuid = None
    if paths.logs_db:
        with _connect_ro(paths.logs_db) as log_conn:
            log_rows = log_conn.execute(
                """
                SELECT ts, ts_nanos, level, target, feedback_log_body, file, line, process_uuid
                FROM logs
                WHERE thread_id = ?
                ORDER BY ts DESC, ts_nanos DESC, id DESC
                LIMIT ?
                """,
                (thread_id, log_limit),
            ).fetchall()
            for index, log_row in enumerate(log_rows):
                ts = int(log_row["ts"]) if log_row["ts"] is not None else None
                if index == 0:
                    process_uuid = log_row["process_uuid"]
                    process = _describe_pid(_extract_pid(process_uuid))
                message = _clean_text(log_row["feedback_log_body"]) or _clean_text(log_row["target"]) or "log event"
                logs.append(
                    {
                        "ts": ts,
                        "ts_iso": _to_iso_local(ts),
                        "age": _human_age(_age_seconds(ts, now)),
                        "level": log_row["level"],
                        "target": log_row["target"],
                        "message": message,
                        "file": log_row["file"],
                        "line": log_row["line"],
                        "process_uuid": log_row["process_uuid"],
                    }
                )

    created_at = int(thread.get("created_at")) if thread.get("created_at") is not None else None
    updated_at = int(thread.get("updated_at")) if thread.get("updated_at") is not None else None
    rollout_metrics = read_rollout_metrics(thread.get("rollout_path"))
    rollout_user_count = int(rollout_metrics.get("user_message_count") or 0)
    user_command_count = rollout_user_count or int(history_counts.get(thread_id, 0))

    return {
        "meta": {
            "now": now,
            "now_iso": _to_iso_local(now),
            "state_db": str(paths.state_db),
            "logs_db": str(paths.logs_db) if paths.logs_db else None,
        },
        "thread": {
            **thread,
            "title": session_titles.get(thread_id) or thread.get("title"),
            "db_title": thread.get("title"),
            "created_at_iso": _to_iso_local(created_at),
            "updated_at_iso": _to_iso_local(updated_at),
            "sandbox_policy": _parse_json_maybe(thread.get("sandbox_policy")),
            "process_uuid": process_uuid,
            "process": process,
            "history": read_rollout_messages(thread.get("rollout_path"), limit=24),
            "compaction_count": int(rollout_metrics.get("compaction_count") or 0),
            "last_compacted_at": rollout_metrics.get("last_compacted_at"),
            "user_command_count": user_command_count,
            "assistant_message_count": int(rollout_metrics.get("assistant_message_count") or 0),
            "rollout_user_message_count": rollout_user_count,
        },
        "logs": logs,
        "hint_commands": {
            "resume": f"codex resume {thread_id}",
            "fork": f"codex fork {thread_id}",
        },
    }


def fetch_live_snapshot(*, running_limit: int = 8, log_limit: int = 40) -> dict[str, Any]:
    payload = fetch_threads(
        q=None,
        archived=0,
        status="running",
        scope="live",
        limit=running_limit,
        offset=0,
        sort="log_desc",
        include_logs=True,
        include_history=True,
        history_limit=10,
        preview_limit=4,
    )
    thread_ids = [item["id"] for item in payload["items"]]
    logs: list[dict[str, Any]] = []

    paths = resolve_db_paths()
    now = int(time.time())
    if paths.logs_db and thread_ids:
        with _connect_ro(paths.logs_db) as log_conn:
            sql = f"""
            SELECT id, thread_id, ts, ts_nanos, level, target, feedback_log_body, file, line, process_uuid
            FROM logs
            WHERE thread_id IN ({','.join('?' for _ in thread_ids)})
            ORDER BY ts DESC, ts_nanos DESC, id DESC
            LIMIT ?
            """
            rows = log_conn.execute(sql, (*thread_ids, log_limit)).fetchall()
            for row in rows:
                ts = int(row["ts"]) if row["ts"] is not None else None
                message = _clean_text(row["feedback_log_body"]) or _clean_text(row["target"]) or "log event"
                logs.append(
                    {
                        "id": int(row["id"]),
                        "thread_id": row["thread_id"],
                        "ts": ts,
                        "ts_iso": _to_iso_local(ts),
                        "age": _human_age(_age_seconds(ts, now)),
                        "level": row["level"],
                        "target": row["target"],
                        "message": message,
                        "file": row["file"],
                        "line": row["line"],
                        "process_uuid": row["process_uuid"],
                    }
                )
    return {"threads": payload["items"], "logs": logs, "meta": payload["meta"]}


async def _live_event_generator(running_limit: int, log_limit: int, interval: float):
    last_snapshot = ""
    while True:
        snapshot = fetch_live_snapshot(running_limit=running_limit, log_limit=log_limit)
        encoded = json.dumps(snapshot, ensure_ascii=False, sort_keys=True)
        if encoded != last_snapshot:
            yield f"event: snapshot\ndata: {encoded}\n\n"
            last_snapshot = encoded
        else:
            yield f"event: heartbeat\ndata: {json.dumps({'ts': int(time.time())})}\n\n"
        await asyncio.sleep(interval)


def _remove_rollout_artifacts(rollout_path: str | None) -> list[str]:
    removed: list[str] = []
    if not rollout_path:
        return removed

    path = Path(rollout_path)
    if path.exists():
        try:
            if path.is_file() or path.is_symlink():
                path.unlink()
            elif path.is_dir():
                shutil.rmtree(path)
            removed.append(str(path))
        except Exception:
            pass
    return removed


def _rewrite_session_index(session_index: Path, ids_to_delete: set[str]) -> int:
    if not session_index.exists():
        return 0

    kept_lines: list[str] = []
    removed = 0
    for line in session_index.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            data = json.loads(stripped)
        except Exception:
            kept_lines.append(line)
            continue
        if data.get("id") in ids_to_delete:
            removed += 1
            continue
        kept_lines.append(line)

    new_content = ("\n".join(kept_lines) + "\n") if kept_lines else ""
    session_index.write_text(new_content, encoding="utf-8")
    return removed


def _rewrite_session_index_titles(session_index: Path, title_updates: dict[str, str]) -> int:
    if not session_index.exists() or not title_updates:
        return 0

    rewritten_lines: list[str] = []
    updated = 0
    for line in session_index.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            data = json.loads(stripped)
        except Exception:
            rewritten_lines.append(line)
            continue
        thread_id = str(data.get("id") or "").strip()
        if thread_id and thread_id in title_updates:
            data["thread_name"] = title_updates[thread_id]
            line = json.dumps(data, ensure_ascii=False)
            updated += 1
        rewritten_lines.append(line)

    new_content = ("\n".join(rewritten_lines) + "\n") if rewritten_lines else ""
    session_index.write_text(new_content, encoding="utf-8")
    return updated


def _read_session_index_titles(session_index: Path) -> dict[str, str]:
    if not session_index.exists():
        return {}

    titles: dict[str, str] = {}
    for line in session_index.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        try:
            data = json.loads(stripped)
        except Exception:
            continue
        thread_id = str(data.get("id") or "").strip()
        thread_name = str(data.get("thread_name") or "").strip()
        if thread_id and thread_name:
            titles[thread_id] = thread_name
    return titles


def _ensure_not_running(ids: list[str], paths: DbPaths) -> tuple[list[str], list[dict[str, Any]]]:
    now = int(time.time())
    runtime_map: dict[str, dict[str, Any]] = {}
    if paths.logs_db:
        with _connect_ro(paths.state_db) as conn:
            conn.execute("ATTACH DATABASE ? AS logsdb", (str(paths.logs_db),))
            runtime_map = _fetch_log_previews(conn, ids, 1, now)

    allowed: list[str] = []
    skipped: list[dict[str, Any]] = []
    for thread_id in ids:
        process = (runtime_map.get(thread_id) or {}).get("process") or {"alive": False}
        if process.get("alive"):
            skipped.append({"id": thread_id, "reason": "running", "process": process})
            continue
        allowed.append(thread_id)
    return allowed, skipped


def archive_threads(ids: list[str], archived: bool) -> dict[str, Any]:
    ids = [thread_id for thread_id in ids if thread_id]
    if not ids:
        raise HTTPException(status_code=400, detail="ids is empty")

    paths = resolve_db_paths()
    with _connect_ro(paths.state_db) as state_conn:
        rows = state_conn.execute(
            f"SELECT id FROM threads WHERE id IN ({','.join('?' for _ in ids)})",
            ids,
        ).fetchall()
    existing = {str(row["id"]) for row in rows}
    missing = [{"id": thread_id, "reason": "not found"} for thread_id in ids if thread_id not in existing]
    allowed, skipped = _ensure_not_running(list(existing), paths)
    skipped = missing + skipped
    if not allowed:
        return {"updated": [], "skipped": skipped}

    with _connect_rw(paths.state_db) as state_conn:
        state_conn.execute("BEGIN")
        state_conn.execute(
            f"UPDATE threads SET archived = ? WHERE id IN ({','.join('?' for _ in allowed)})",
            [1 if archived else 0, *allowed],
        )
        state_conn.commit()

    return {"updated": [{"id": thread_id, "archived": archived} for thread_id in allowed], "skipped": skipped}


def soft_delete_threads(ids: list[str], deleted: bool) -> dict[str, Any]:
    ids = [thread_id for thread_id in ids if thread_id]
    if not ids:
        raise HTTPException(status_code=400, detail="ids is empty")

    paths = resolve_db_paths()
    with _connect_ro(paths.state_db) as state_conn:
        rows = state_conn.execute(
            f"SELECT id FROM threads WHERE id IN ({','.join('?' for _ in ids)})",
            ids,
        ).fetchall()
    existing = {str(row["id"]) for row in rows}
    missing = [{"id": thread_id, "reason": "not found"} for thread_id in ids if thread_id not in existing]
    allowed, skipped = _ensure_not_running(list(existing), paths) if deleted else (list(existing), [])
    skipped = missing + skipped
    state_result = _set_soft_deleted(paths, allowed, deleted)
    return {
        "updated": [{"id": thread_id, "soft_deleted": deleted} for thread_id in allowed],
        "skipped": skipped,
        "summary": state_result,
    }


def rename_thread(thread_id: str, title: str) -> dict[str, Any]:
    thread_id = str(thread_id or "").strip()
    title = str(title or "").strip()
    if not thread_id:
        raise HTTPException(status_code=400, detail="thread_id is empty")
    if not title:
        raise HTTPException(status_code=400, detail="title is empty")

    paths = resolve_db_paths()
    with _connect_ro(paths.state_db) as state_conn:
        row = state_conn.execute(
            "SELECT id, title FROM threads WHERE id = ?",
            (thread_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="thread not found")

    previous_title = str(row["title"] or "")
    with _connect_rw(paths.state_db) as state_conn:
        state_conn.execute("BEGIN")
        state_conn.execute(
            "UPDATE threads SET title = ? WHERE id = ?",
            (title, thread_id),
        )
        state_conn.commit()

    session_index_updated = _rewrite_session_index_titles(paths.session_index, {thread_id: title})
    return {
        "updated": {
            "id": thread_id,
            "title": title,
            "previous_title": previous_title,
            "session_index_updated": session_index_updated,
        }
    }


def delete_threads(ids: list[str], *, delete_files: bool = True) -> dict[str, Any]:
    ids = [thread_id for thread_id in ids if thread_id]
    if not ids:
        raise HTTPException(status_code=400, detail="ids is empty")

    paths = resolve_db_paths()
    with _connect_rw(paths.state_db) as state_conn:
        existing_rows = state_conn.execute(
            f"SELECT id, rollout_path, archived, updated_at FROM threads WHERE id IN ({','.join('?' for _ in ids)})",
            ids,
        ).fetchall()

    existing_by_id = {str(row["id"]): dict(row) for row in existing_rows}
    if not existing_by_id:
        return {"deleted": [], "skipped": [{"id": thread_id, "reason": "not found"} for thread_id in ids]}

    deletable, skipped = _ensure_not_running(list(existing_by_id.keys()), paths)

    if not deletable:
        return {"deleted": [], "skipped": skipped}

    removed_files: dict[str, list[str]] = {thread_id: [] for thread_id in deletable}
    if delete_files:
        for thread_id in deletable:
            removed_files[thread_id] = _remove_rollout_artifacts(existing_by_id[thread_id].get("rollout_path"))

    with _connect_rw(paths.state_db) as state_conn:
        state_conn.execute("BEGIN")
        state_conn.execute(
            f"DELETE FROM threads WHERE id IN ({','.join('?' for _ in deletable)})",
            deletable,
        )
        state_conn.commit()

    log_rows_deleted = 0
    if paths.logs_db:
        with _connect_rw(paths.logs_db) as logs_conn:
            logs_conn.execute("BEGIN")
            cur = logs_conn.execute(
                f"DELETE FROM logs WHERE thread_id IN ({','.join('?' for _ in deletable)})",
                deletable,
            )
            log_rows_deleted = cur.rowcount if cur.rowcount is not None else 0
            logs_conn.commit()

    session_index_removed = _rewrite_session_index(paths.session_index, set(deletable))
    _set_soft_deleted(paths, deletable, False)

    deleted = [
        {
            "id": thread_id,
            "removed_files": removed_files.get(thread_id, []),
        }
        for thread_id in deletable
    ]
    return {
        "deleted": deleted,
        "skipped": skipped,
        "summary": {
            "threads_deleted": len(deleted),
            "log_rows_deleted": log_rows_deleted,
            "session_index_removed": session_index_removed,
        },
    }


app = FastAPI(title="Codex Thread Manager", version="0.2.0")

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/", response_class=HTMLResponse)
def index(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "index.html")


@app.get("/thread/{thread_id}", response_class=HTMLResponse)
def thread_page(request: Request, thread_id: str) -> HTMLResponse:
    return templates.TemplateResponse(request, "thread.html", {"thread_id": thread_id})


@app.get("/api/threads", response_class=JSONResponse)
def api_threads(
    q: str | None = Query(default=None, description="search title/id/cwd"),
    archived: int | None = Query(default=None, description="0 or 1"),
    status: ThreadStatus | None = Query(default=None),
    scope: ThreadScope = Query(default="live"),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    sort: ThreadSort = Query(default="updated_desc"),
    include_logs: bool = Query(default=False),
    include_history: bool = Query(default=False),
    history_limit: int = Query(default=6, ge=1, le=24),
    preview_limit: int = Query(default=3, ge=1, le=8),
) -> JSONResponse:
    try:
        payload = fetch_threads(
            q=q,
            archived=archived,
            status=status,
            scope=scope,
            limit=limit,
            offset=offset,
            sort=sort,
            include_logs=include_logs,
            include_history=include_history,
            history_limit=history_limit,
            preview_limit=preview_limit,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return JSONResponse(payload)


@app.post("/api/threads/scan-codex-sessions", response_class=JSONResponse)
def api_scan_codex_sessions(payload: dict[str, Any] = Body(default={})) -> JSONResponse:
    limit = int(payload.get("limit") or 500)
    try:
        result = scan_codex_sessions(limit=limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return JSONResponse(result)


@app.get("/api/thread/{thread_id}", response_class=JSONResponse)
def api_thread(thread_id: str, log_limit: int = Query(default=200, ge=0, le=2000)) -> JSONResponse:
    try:
        payload = fetch_thread_detail(thread_id, log_limit=log_limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return JSONResponse(payload)


@app.post("/api/thread/{thread_id}/rename", response_class=JSONResponse)
def api_rename_thread(thread_id: str, payload: dict[str, Any] = Body(...)) -> JSONResponse:
    title = payload.get("title", "")
    try:
        result = rename_thread(thread_id, str(title))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return JSONResponse(result)


@app.post("/api/threads/delete", response_class=JSONResponse)
def api_delete_threads(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    ids_raw = payload.get("ids", [])
    if not isinstance(ids_raw, list):
        raise HTTPException(status_code=400, detail="ids must be a list")
    ids = [str(item).strip() for item in ids_raw if str(item).strip()]
    delete_files = bool(payload.get("delete_files", True))
    try:
        result = delete_threads(ids, delete_files=delete_files)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return JSONResponse(result)


@app.post("/api/threads/lifecycle", response_class=JSONResponse)
def api_threads_lifecycle(payload: dict[str, Any] = Body(...)) -> JSONResponse:
    ids_raw = payload.get("ids", [])
    action = str(payload.get("action", "")).strip()
    if not isinstance(ids_raw, list):
        raise HTTPException(status_code=400, detail="ids must be a list")
    ids = [str(item).strip() for item in ids_raw if str(item).strip()]
    delete_files = bool(payload.get("delete_files", True))

    if action == "archive":
        result = archive_threads(ids, True)
    elif action == "unarchive":
        result = archive_threads(ids, False)
    elif action == "soft_delete":
        result = soft_delete_threads(ids, True)
    elif action == "restore":
        result = soft_delete_threads(ids, False)
    elif action == "hard_delete":
        result = delete_threads(ids, delete_files=delete_files)
    else:
        raise HTTPException(status_code=400, detail="unknown action")
    return JSONResponse(result)


@app.get("/api/insights/report", response_class=JSONResponse)
def api_insights_report(refresh: bool = Query(default=False)) -> JSONResponse:
    try:
        payload = generate_usage_report(force=bool(refresh))
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return JSONResponse(payload)


@app.get("/api/stream/live")
async def api_stream_live(
    running_limit: int = Query(default=8, ge=1, le=40),
    log_limit: int = Query(default=40, ge=1, le=200),
    interval: float = Query(default=1.5, ge=0.5, le=10.0),
) -> StreamingResponse:
    return StreamingResponse(
        _live_event_generator(running_limit=running_limit, log_limit=log_limit, interval=interval),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
