const fs = require("fs");

const SESSION_REPLAY_TAIL_BYTES = 2 * 1024 * 1024;
const SESSION_REPLAY_CACHE_LIMIT = 20;
const SESSION_REPLAY_EVENT_LIMIT = 120;
const SESSION_REPLAY_TURN_LIMIT = 32;
const SESSION_REPLAY_CODE_CHANGE_LIMIT = 24;
const DIFF_PREVIEW_LIMIT = 12000;
const DIFF_FILE_LIMIT = 12;
const TRACE_PREVIEW_LIST_LIMIT = 160;

const sessionReplayCache = new Map();

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function shortText(value, limit = 180) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.length > limit ? `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...` : text;
}

function parseJsonLine(line) {
  try {
    const parsed = JSON.parse(line);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function statFor(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const stat = fs.statSync(filePath);
    return {
      size: Number(stat.size || 0),
      mtimeMs: Number(stat.mtimeMs || 0),
    };
  } catch {
    return null;
  }
}

function cacheGet(cacheKey) {
  const cached = sessionReplayCache.get(cacheKey);
  if (!cached) return null;
  sessionReplayCache.delete(cacheKey);
  sessionReplayCache.set(cacheKey, cached);
  return cached;
}

function cacheSet(cacheKey, value) {
  sessionReplayCache.set(cacheKey, value);
  while (sessionReplayCache.size > SESSION_REPLAY_CACHE_LIMIT) {
    const oldest = sessionReplayCache.keys().next().value;
    if (!oldest) break;
    sessionReplayCache.delete(oldest);
  }
}

function readSessionTail(filePath) {
  const target = String(filePath || "").trim();
  const stat = statFor(target);
  if (!target || !stat) {
    return {
      exists: false,
      filePath: target,
      size: 0,
      mtimeMs: 0,
      truncated: false,
      lines: [],
    };
  }
  const cacheKey = `${target}:${stat.size}:${stat.mtimeMs}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let text = "";
  let truncated = false;
  try {
    if (stat.size > SESSION_REPLAY_TAIL_BYTES) {
      truncated = true;
      const fd = fs.openSync(target, "r");
      try {
        const start = Math.max(0, stat.size - SESSION_REPLAY_TAIL_BYTES);
        const buffer = Buffer.alloc(stat.size - start);
        fs.readSync(fd, buffer, 0, buffer.length, start);
        text = buffer.toString("utf8");
        const firstNewline = text.indexOf("\n");
        if (firstNewline >= 0) text = text.slice(firstNewline + 1);
      } finally {
        fs.closeSync(fd);
      }
    } else {
      text = fs.readFileSync(target, "utf8");
    }
  } catch {
    text = "";
  }

  const result = {
    exists: true,
    filePath: target,
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    truncated,
    lines: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
  };
  cacheSet(cacheKey, result);
  return result;
}

function textFromContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => {
      const entry = safeObject(item);
      return String(entry.text || entry.content || "").trim();
    })
    .filter(Boolean)
    .join("\n");
}

function parseMaybeJson(value) {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function stringFromValue(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }
  return String(value);
}

function compactDiffPreview(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.length <= DIFF_PREVIEW_LIMIT) return value;
  return `${value.slice(0, DIFF_PREVIEW_LIMIT).trimEnd()}\n...`;
}

function uniqueLimited(items, limit) {
  const out = [];
  const seen = new Set();
  safeArray(items).forEach((item) => {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out.slice(0, Math.max(0, Number(limit || 0)));
}

function normalizeDiffFilePath(value) {
  const text = String(value || "").trim().replace(/^"|"$/g, "");
  if (!text || text === "/dev/null") return "";
  return text.replace(/^[ab]\//, "");
}

function extractDiffFiles(text) {
  const files = [];
  const source = String(text || "");
  const patterns = [
    /^\*\*\* (?:Add|Update|Delete) File:\s+(.+)$/gm,
    /^diff --git a\/(.+?) b\/(.+)$/gm,
    /^\+\+\+\s+(.+)$/gm,
    /^---\s+(.+)$/gm,
  ];
  patterns.forEach((pattern) => {
    for (const match of source.matchAll(pattern)) {
      if (match[2]) {
        files.push(normalizeDiffFilePath(match[1]));
        files.push(normalizeDiffFilePath(match[2]));
      } else {
        files.push(normalizeDiffFilePath(match[1]));
      }
    }
  });
  return uniqueLimited(files, DIFF_FILE_LIMIT);
}

function lineDeltaStats(text) {
  let additions = 0;
  let deletions = 0;
  String(text || "").split(/\r?\n/).forEach((line) => {
    if (line.startsWith("+++") || line.startsWith("---")) return;
    if (line.startsWith("+")) additions += 1;
    if (line.startsWith("-")) deletions += 1;
  });
  return { additions, deletions };
}

function looksLikeDiffText(text) {
  const value = String(text || "");
  if (!value.trim()) return false;
  if (/\*\*\* Begin Patch[\s\S]*\*\*\* End Patch/.test(value)) return true;
  if (/^diff --git\s+a\/.+\s+b\/.+/m.test(value)) return true;
  if (/^@@\s+[-+0-9, ]+@@/m.test(value) && /^---\s+/m.test(value) && /^\+\+\+\s+/m.test(value)) return true;
  return false;
}

function diffTextCandidates(payload) {
  const data = safeObject(payload);
  const candidates = [
    data.input,
    data.arguments,
    data.output,
    data.formatted_output,
    data.message,
    data.delta,
    data.result,
  ].map(stringFromValue).filter(Boolean);
  const parsedInput = parseMaybeJson(data.input);
  const parsedArguments = parseMaybeJson(data.arguments);
  [parsedInput, parsedArguments].forEach((parsed) => {
    const object = safeObject(parsed);
    ["patch", "diff", "input", "output", "text"].forEach((key) => {
      const value = stringFromValue(object[key]);
      if (value) candidates.push(value);
    });
  });
  return candidates;
}

function diffMetadataFromPayload(payload, category, subtype, toolName) {
  if (category !== "tool_call" && category !== "tool_result") return null;
  const name = String(toolName || "").toLowerCase();
  const candidates = diffTextCandidates(payload);
  const directPatch = candidates.find((text) => /\*\*\* Begin Patch/.test(text));
  const unifiedDiff = directPatch || candidates.find(looksLikeDiffText);
  if (!unifiedDiff) return null;
  const kind = /\*\*\* Begin Patch/.test(unifiedDiff) || name.includes("apply_patch") ? "apply_patch" : "unified_diff";
  const files = extractDiffFiles(unifiedDiff);
  const stats = lineDeltaStats(unifiedDiff);
  const fileLabel = files.length
    ? `${files.length} file${files.length === 1 ? "" : "s"}`
    : "files unknown";
  return {
    kind,
    summary: `${kind === "apply_patch" ? "Patch" : "Diff"} · ${fileLabel} · +${stats.additions} -${stats.deletions}`,
    files,
    file_count: files.length,
    additions: stats.additions,
    deletions: stats.deletions,
    preview: compactDiffPreview(unifiedDiff),
    source: String(subtype || category || ""),
  };
}

function eventSubtype(topType, payload) {
  if (typeof payload.type === "string" && payload.type) return payload.type;
  if (["message", "reasoning", "tool_call", "tool_result", "token_count", "compaction"].includes(topType)) {
    return topType;
  }
  return "";
}

function toolNameFromPayload(payload, subtype) {
  const direct = String(payload.name || payload.tool_name || payload.tool || "").trim();
  if (direct) return direct;
  const invocation = safeObject(payload.invocation);
  const server = String(invocation.server || "").trim();
  const tool = String(invocation.tool || "").trim();
  if (server && tool) return `mcp__${server}__${tool}`;
  if (tool || server) return tool || server;
  return subtype || "tool";
}

function commandFromPayload(payload, subtype) {
  const rawArgs = subtype === "function_call" ? payload.arguments : payload.input;
  const parsed = parseMaybeJson(rawArgs);
  if (!parsed) return "";
  return String(parsed.cmd || parsed.command || "").trim();
}

function tokenSnapshot(payload) {
  const info = safeObject(payload.info || payload);
  const totalUsage = safeObject(info.total_token_usage);
  const lastUsage = safeObject(info.last_token_usage);
  const total = Number(totalUsage.total_tokens || payload.total || lastUsage.total_tokens || 0);
  const context = Number(lastUsage.total_tokens || total || 0);
  const windowTokens = Number(info.model_context_window || payload.contextWindow || 0);
  return {
    total_tokens: Number.isFinite(total) ? total : 0,
    context_tokens: Number.isFinite(context) ? context : 0,
    model_context_window: Number.isFinite(windowTokens) ? windowTokens : 0,
    context_fill_percent: windowTokens > 0 && context > 0 ? (context / windowTokens) * 100 : null,
  };
}

function eventCategory(topType, subtype, payload) {
  if (topType === "session_meta" || topType === "turn_context") return "context";
  if (topType === "compacted" || subtype === "context_compacted" || subtype === "compaction" || subtype === "compaction_summary") return "compaction";
  if (topType === "message" || subtype === "user_message" || subtype === "agent_message" || subtype === "message") return "message";
  if (topType === "reasoning" || String(subtype).startsWith("agent_reasoning") || subtype === "reasoning") return "reasoning";
  if (topType === "token_count" || subtype === "token_count") return "token";
  if (
    topType === "tool_call"
    || subtype === "exec_command_begin"
    || subtype === "mcp_tool_call_begin"
    || subtype === "web_search_begin"
    || subtype === "function_call"
    || subtype === "custom_tool_call"
    || subtype === "local_shell_call"
    || subtype === "web_search_call"
  ) {
    return "tool_call";
  }
  if (
    topType === "tool_result"
    || subtype === "exec_command_end"
    || subtype === "exec_command_output_delta"
    || subtype === "mcp_tool_call_end"
    || subtype === "web_search_end"
    || subtype === "function_call_output"
    || subtype === "custom_tool_call_output"
  ) {
    return "tool_result";
  }
  if (/error|failed|panic|exception/i.test(JSON.stringify(payload || {}))) return "error";
  return "system";
}

function eventSummary(topType, subtype, payload, category) {
  if (subtype === "user_message") return shortText(payload.message, 260);
  if (subtype === "agent_message") return shortText(payload.message, 260);
  if (subtype === "message") return shortText(textFromContent(payload.content), 260);
  if (category === "reasoning") return shortText(payload.message || textFromContent(payload.summary) || textFromContent(payload.content), 260);
  if (category === "tool_call") {
    const command = commandFromPayload(payload, subtype);
    return command ? shortText(command, 260) : shortText(payload.name || payload.call_id || subtype || topType, 260);
  }
  if (category === "tool_result") {
    return shortText(payload.formatted_output || payload.output || payload.message || payload.delta || payload.call_id || subtype, 260);
  }
  if (category === "token") {
    const token = tokenSnapshot(payload);
    return token.model_context_window
      ? `${token.context_tokens.toLocaleString()} / ${token.model_context_window.toLocaleString()} context tokens`
      : `${token.total_tokens.toLocaleString()} total tokens`;
  }
  if (category === "compaction") return shortText(payload.message || payload.summary || "Context compaction signal observed.", 260);
  if (topType === "session_meta") return shortText([payload.cwd, payload.model, payload.cli_version].filter(Boolean).join(" · "), 260);
  if (subtype === "task_started") return "Turn started.";
  if (subtype === "task_complete") return "Turn completed.";
  return shortText(payload.message || payload.text || payload.detail || subtype || topType, 260);
}

function eventTitle(topType, subtype, payload, category) {
  if (subtype === "user_message") return "User Message";
  if (subtype === "agent_message") return "Assistant Message";
  if (category === "message") return payload.role === "user" ? "User Message" : "Message";
  if (category === "reasoning") return "Reasoning";
  if (category === "tool_call") return `${toolNameFromPayload(payload, subtype)} Call`;
  if (category === "tool_result") return `${toolNameFromPayload(payload, subtype)} Result`;
  if (category === "token") return "Token Snapshot";
  if (category === "compaction") return "Compaction";
  if (topType === "session_meta") return "Session Metadata";
  if (subtype === "task_started") return "Turn Started";
  if (subtype === "task_complete") return "Turn Complete";
  return subtype || topType || "Event";
}

function eventTone(category, summary) {
  if (category === "error" || /error|failed|panic|exception|blocked/i.test(summary)) return "warn";
  if (category === "tool_call" || category === "tool_result") return "tooling";
  if (category === "token") return "token";
  return "live";
}

function addCount(record, key, delta = 1) {
  if (!key) return;
  record[key] = Number(record[key] || 0) + delta;
}

function ensureTurn(turns, turnMap, turnId, timestamp) {
  const id = String(turnId || "").trim() || `turn-${turns.length + 1}`;
  if (!turnMap.has(id)) {
    const turn = {
      turn_id: id,
      started_at: timestamp || "",
      completed_at: "",
      user_message: "",
      final_answer: "",
      message_count: 0,
      tool_count: 0,
      token_total: 0,
      status: "ongoing",
    };
    turnMap.set(id, turn);
    turns.push(turn);
  }
  return turnMap.get(id);
}

function parseSessionReplay(filePath) {
  const source = readSessionTail(filePath);
  if (!source.exists) {
    return {
      available: false,
      source_path: source.filePath,
      event_count: 0,
      events: [],
      turns: [],
      token_series: [],
      tool_counts: [],
      code_changes: [],
      truncated: false,
    };
  }

  const events = [];
  const codeChanges = [];
  const counts = {};
  const toolCounts = {};
  const tokenSeries = [];
  const turns = [];
  const turnMap = new Map();
  let currentTurnId = "";
  let syntheticTurn = 0;
  let sessionMeta = {};

  source.lines.forEach((line, offset) => {
    const raw = parseJsonLine(line);
    if (!raw) return;
    const topType = String(raw.type || raw.entry_type || raw.kind || "").trim();
    const payload = safeObject(raw.payload || raw.item || raw);
    const subtype = eventSubtype(topType, payload);
    const category = eventCategory(topType, subtype, payload);
    const timestamp = String(raw.timestamp || raw.ts || payload.timestamp || payload.ts || "");
    const callId = String(payload.call_id || payload.id || "").trim();
    const toolName = category === "tool_call" || category === "tool_result" ? toolNameFromPayload(payload, subtype) : "";
    const diff = diffMetadataFromPayload(payload, category, subtype, toolName);
    let summary = eventSummary(topType, subtype, payload, category);
    if (diff && (!summary || String(toolName || "").toLowerCase().includes("apply_patch"))) summary = diff.summary;
    const title = eventTitle(topType, subtype, payload, category);

    if (topType === "session_meta") sessionMeta = payload;
    addCount(counts, category);
    if (toolName && category === "tool_call") addCount(toolCounts, toolName);

    if (subtype === "task_started") {
      currentTurnId = String(payload.turn_id || `turn-${turns.length + 1}`);
      ensureTurn(turns, turnMap, currentTurnId, timestamp);
    } else if (subtype === "user_message" && !currentTurnId) {
      syntheticTurn += 1;
      currentTurnId = `turn-${syntheticTurn}`;
    }

    const turnId = String(payload.turn_id || currentTurnId || "").trim();
    const turn = turnId ? ensureTurn(turns, turnMap, turnId, timestamp) : null;
    if (turn) {
      if (category === "message") {
        turn.message_count += 1;
        if ((subtype === "user_message" || payload.role === "user") && !turn.user_message) {
          turn.user_message = summary;
        }
        if ((subtype === "agent_message" || payload.role === "assistant") && !turn.final_answer) {
          turn.final_answer = summary;
        }
      }
      if (category === "tool_call") turn.tool_count += 1;
      if (category === "token") {
        const token = tokenSnapshot(payload);
        turn.token_total = Math.max(Number(turn.token_total || 0), token.total_tokens || token.context_tokens || 0);
      }
      if (subtype === "task_complete") {
        turn.completed_at = timestamp;
        turn.status = "complete";
        currentTurnId = "";
      }
    }

    if (category === "token") {
      tokenSeries.push({
        index: events.length,
        timestamp,
        ...tokenSnapshot(payload),
      });
    }

    const normalizedEvent = {
      index: offset,
      timestamp,
      category,
      type: topType || subtype,
      subtype,
      title,
      summary,
      tone: eventTone(category, summary),
      tool_name: toolName,
      call_id: callId,
      ...(diff ? { diff } : {}),
    };
    events.push(normalizedEvent);
    if (diff) {
      codeChanges.push({
        event_index: offset,
        timestamp,
        title,
        summary,
        tool_name: toolName,
        call_id: callId,
        diff,
      });
    }
  });

  return {
    available: true,
    source_path: source.filePath,
    source_size: source.size,
    truncated: source.truncated,
    event_count: source.lines.length,
    parsed_event_count: events.length,
    session_meta: {
      id: String(sessionMeta.id || ""),
      cwd: String(sessionMeta.cwd || ""),
      model: String(sessionMeta.model || ""),
      cli_version: String(sessionMeta.cli_version || ""),
      model_provider: String(sessionMeta.model_provider || ""),
    },
    counts,
    events: events.slice(-SESSION_REPLAY_EVENT_LIMIT),
    turns: turns.slice(-SESSION_REPLAY_TURN_LIMIT),
    token_series: tokenSeries.slice(-SESSION_REPLAY_EVENT_LIMIT),
    tool_counts: Object.entries(toolCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
      .slice(0, 16),
    code_changes: codeChanges.slice(-SESSION_REPLAY_CODE_CHANGE_LIMIT),
  };
}

function selectedThreadFor(dashboard, detail, selectedThreadId) {
  const threads = safeArray(dashboard && dashboard.threads);
  const detailThread = safeObject(detail && detail.thread);
  const selectedId = String(selectedThreadId || detailThread.id || "").trim();
  const summaryThread = threads.find((thread) => thread && thread.id === selectedId) || threads[0] || {};
  return {
    ...safeObject(summaryThread),
    ...detailThread,
  };
}

function explorerThreadFor(thread) {
  const item = safeObject(thread);
  const messageCount = Math.max(0, Number(item.rollout_user_message_count || 0) + Number(item.assistant_message_count || 0));
  const commandCount = Math.max(0, Number(item.tool_call_count || 0));
  const logCount = Math.max(0, Number(item.log_count || safeArray(item.preview_logs).length));
  const compactions = Math.max(0, Number(item.compaction_count || 0));
  const tokens = Math.max(0, Number(item.tokens_used || 0));
  const hasTrace = Boolean(item.rollout_path || messageCount || commandCount || logCount || compactions || tokens);
  return {
    id: String(item.id || ""),
    title: String(item.title || item.id || "Thread"),
    cwd: String(item.cwd || ""),
    status: String(item.status || "idle"),
    updated_at_iso: String(item.updated_at_iso || ""),
    updated_age: String(item.updated_age || ""),
    model: String(item.model || ""),
    rollout_path: String(item.rollout_path || ""),
    storage_label: String(item.storage_label || ""),
    counts: {
      messages: messageCount,
      commands: commandCount,
      logs: logCount,
      compactions,
      tokens,
    },
    latest: shortText(
      safeArray(item.preview_logs)[0]?.message
      || item.first_user_message
      || item.title
      || "",
      180,
    ),
    has_trace: hasTrace,
    trace_score: messageCount + commandCount + logCount + compactions + (tokens > 0 ? 1 : 0),
  };
}

function findLinkedTeamTrace(teamCoordination, threadId) {
  const id = String(threadId || "").trim();
  if (!id) return null;
  const tasks = safeArray(teamCoordination && teamCoordination.tasks);
  const task = tasks.find((item) => {
    const runtime = safeObject(item && item.runtime);
    return String(runtime.thread_id || item.owner || "").trim() === id;
  });
  if (!task) return null;
  return {
    task_id: String(task.task_id || ""),
    title: String(task.title || ""),
    status: String(task.status || ""),
    trace_files: safeObject(task.trace_files),
    trace_preview: safeObject(task.trace_preview),
  };
}

function tracePreviewCounts(preview = {}) {
  const counts = safeObject(preview && preview.counts);
  return {
    timeline: Math.max(0, Number(counts.timeline || safeArray(preview.events).length)),
    files: Math.max(0, Number(counts.files || safeArray(preview.file_events).length)),
    commands: Math.max(0, Number(counts.commands || safeArray(preview.command_events).length)),
    checks: Math.max(0, Number(counts.checks || safeArray(preview.check_events).length)),
    errors: Math.max(0, Number(counts.errors || safeArray(preview.error_events).length)),
    raw: Math.max(0, Number(counts.raw_jsonl || 0)),
  };
}

function normalizeTraceItem(category, item, selectedId) {
  const entry = safeObject(item);
  const timestamp = String(entry.timestamp || entry.ts || "").trim();
  const summary = String(entry.summary || entry.copy || entry.path || entry.command || "").trim();
  return {
    id: [
      String(category || "trace"),
      String(entry.call_id || entry.path || entry.command || entry.title || summary || "item"),
      timestamp || String(summary.length),
    ].join(":"),
    thread_id: String(selectedId || ""),
    category: String(category || "system"),
    tone: String(entry.tone || "").trim(),
    title: String(entry.title || entry.label || entry.source || category || "Trace item"),
    summary,
    timestamp,
    path: String(entry.path || "").trim(),
    command: String(entry.command || "").trim(),
    call_id: String(entry.call_id || "").trim(),
    tool_name: String(entry.tool_name || entry.label || entry.source || "").trim(),
    meta: String(entry.level || entry.source || "").trim(),
    raw: entry,
  };
}

function buildSelectedTraceList(selected, preview) {
  const events = safeArray(preview.events).map((item) => normalizeTraceItem(item.category || item.tone || "timeline", item, selected.id));
  const files = safeArray(preview.file_events).map((item) => normalizeTraceItem("file", item, selected.id));
  const commands = safeArray(preview.command_events).map((item) => normalizeTraceItem("command", item, selected.id));
  const checks = safeArray(preview.check_events).map((item) => normalizeTraceItem("check", item, selected.id));
  const errors = safeArray(preview.error_events).map((item) => normalizeTraceItem("error", item, selected.id));
  const items = [...events, ...files, ...commands, ...checks, ...errors]
    .sort((left, right) => {
      const timeA = Date.parse(left.timestamp || "") || 0;
      const timeB = Date.parse(right.timestamp || "") || 0;
      return timeB - timeA || left.category.localeCompare(right.category) || left.title.localeCompare(right.title);
    });
  return items;
}

function buildTraceDashboardPayload({ dashboard, detail, selectedThreadId, teamCoordination, includeSessionReplay = false } = {}) {
  const selected = selectedThreadFor(dashboard, detail, selectedThreadId);
  const preview = safeObject(detail && detail.thread_trace_preview);
  const sourceSummary = safeObject(preview.source_summary);
  const rawTracePath = String(sourceSummary.trace_lane || "").trim();
  const linkedTeamTrace = findLinkedTeamTrace(teamCoordination, selected.id);
  const previewCounts = tracePreviewCounts(preview);
  const selectedList = buildSelectedTraceList(selected, preview);
  const sessionReplay = includeSessionReplay
    ? parseSessionReplay(selected.rollout_path || selected.path || "")
    : {
      available: false,
      source_path: String(selected.rollout_path || selected.path || ""),
      event_count: 0,
      parsed_event_count: 0,
      events: [],
      turns: [],
      token_series: [],
      tool_counts: [],
      code_changes: [],
      truncated: false,
      deferred: true,
    };
  const explorerThreads = safeArray(dashboard && dashboard.threads)
    .map(explorerThreadFor)
    .filter((thread) => thread.id && thread.has_trace)
    .sort((left, right) => {
      const timeA = Date.parse(left.updated_at_iso || "") || 0;
      const timeB = Date.parse(right.updated_at_iso || "") || 0;
      return timeB - timeA;
    })
    .slice(0, TRACE_PREVIEW_LIST_LIMIT);
  const totals = explorerThreads.reduce((acc, thread) => {
    acc.messages += Number(thread.counts.messages || 0);
    acc.commands += Number(thread.counts.commands || 0);
    acc.logs += Number(thread.counts.logs || 0);
    acc.compactions += Number(thread.counts.compactions || 0);
    acc.tokens += Number(thread.counts.tokens || 0);
    return acc;
  }, { messages: 0, commands: 0, logs: 0, compactions: 0, tokens: 0 });

  return {
    version: 1,
    selected_thread_id: String(selected.id || selectedThreadId || ""),
    selected: {
      id: String(selected.id || ""),
      title: String(selected.title || selected.id || "Selected thread"),
      cwd: String(selected.cwd || ""),
      status: String(selected.status || "idle"),
      updated_at_iso: String(selected.updated_at_iso || ""),
      updated_age: String(selected.updated_age || ""),
      model: String(selected.model || ""),
      rollout_path: String(selected.rollout_path || ""),
      raw_trace_path: rawTracePath,
    },
    thread_trace_preview: preview,
    trace_list: selectedList,
    linked_team_trace: linkedTeamTrace,
    session_replay: sessionReplay,
    explorer: {
      threads: explorerThreads,
      totals,
      thread_count: explorerThreads.length,
    },
    summary: {
      raw_trace_path: rawTracePath,
      raw_trace_events: previewCounts.raw,
      timeline_events: previewCounts.timeline,
      session_events: Number(sessionReplay.parsed_event_count || 0),
      explorer_threads: explorerThreads.length,
    },
    preview_first: true,
    selected_counts: previewCounts,
  };
}

module.exports = {
  buildTraceDashboardPayload,
  parseSessionReplay,
};
