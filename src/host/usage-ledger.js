const fs = require("fs");
const os = require("os");
const path = require("path");

function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function usageHome() {
  return ensureDirSync(path.join(os.homedir(), ".codex"));
}

function ledgerPath() {
  return path.join(usageHome(), "codex_managed_agent_usage_ledger.jsonl");
}

function reportPath() {
  return path.join(usageHome(), "codex_managed_agent_usage_report.json");
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function appendJsonl(filePath, payload) {
  ensureDirSync(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readJsonl(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function readLedgerEvents() {
  return readJsonl(ledgerPath());
}

function isoDay(value) {
  const date = new Date(value || Date.now());
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shortText(value, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…` : text;
}

function parseCodexJsonEvents(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("{"))
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function findUsageEvent(events) {
  for (const event of events) {
    if (event && event.type === "turn.completed" && event.usage) {
      const input = Number(event.usage.input_tokens || 0);
      const output = Number(event.usage.output_tokens || 0);
      return {
        input_tokens: input,
        output_tokens: output,
        total_tokens: input + output,
      };
    }
  }
  return null;
}

function findThreadId(events) {
  for (const event of events) {
    if (event && event.type === "thread.started" && event.thread_id) {
      return String(event.thread_id).trim();
    }
  }
  return "";
}

function buildEventKey(event) {
  return String(event.event_key || `${event.source}:${event.log_path || ""}:${event.thread_id || ""}:${event.finished_at || ""}`).trim();
}

function hasLedgerEvent(existingEvents, nextEvent) {
  const nextKey = buildEventKey(nextEvent);
  if (!nextKey) return false;
  return existingEvents.some((item) => buildEventKey(item) === nextKey);
}

function buildRecentDays(events) {
  const days = new Map();
  events.forEach((event) => {
    const day = isoDay(event.finished_at || event.started_at);
    days.set(day, (days.get(day) || 0) + 1);
  });
  return [...days.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-84)
    .map(([day, count]) => ({ day, count }));
}

function buildRecentTokenDays(events) {
  const days = new Map();
  events.forEach((event) => {
    const day = isoDay(event.finished_at || event.started_at);
    const totalTokens = Number(event.total_tokens || (Number(event.input_tokens || 0) + Number(event.output_tokens || 0)));
    const bucket = days.get(day) || { day, total_tokens: 0, events: 0 };
    bucket.total_tokens += totalTokens;
    bucket.events += 1;
    days.set(day, bucket);
  });
  return [...days.values()]
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-84);
}

function buildTopTokenThreads(events, existingTopThreads) {
  const existingMeta = new Map(
    (Array.isArray(existingTopThreads) ? existingTopThreads : [])
      .filter((item) => item && item.id)
      .map((item) => [String(item.id), item]),
  );
  const threads = new Map();
  events.forEach((event) => {
    const threadId = String(event.thread_id || "").trim();
    if (!threadId) return;
    const totalTokens = Number(event.total_tokens || (Number(event.input_tokens || 0) + Number(event.output_tokens || 0)));
    const inputTokens = Number(event.input_tokens || 0);
    const outputTokens = Number(event.output_tokens || 0);
    const source = String(event.source || "");
    const existing = threads.get(threadId) || {
      thread_id: threadId,
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      event_count: 0,
      latest_at: "",
      source_mix: {},
    };
    existing.total_tokens += totalTokens;
    existing.input_tokens += inputTokens;
    existing.output_tokens += outputTokens;
    existing.event_count += 1;
    if (!existing.latest_at || String(event.finished_at || event.started_at || "") > existing.latest_at) {
      existing.latest_at = String(event.finished_at || event.started_at || "");
    }
    existing.source_mix[source || "manual_cli"] = (existing.source_mix[source || "manual_cli"] || 0) + totalTokens;
    threads.set(threadId, existing);
  });
  return [...threads.values()]
    .sort((a, b) => b.total_tokens - a.total_tokens)
    .slice(0, 12)
    .map((item, index) => {
      const meta = existingMeta.get(item.thread_id) || {};
      return {
        rank: index + 1,
        thread_id: item.thread_id,
        title: meta.title || item.thread_id,
        cwd: meta.cwd || "",
        total_tokens: item.total_tokens,
        input_tokens: item.input_tokens,
        output_tokens: item.output_tokens,
        event_count: item.event_count,
        latest_at: item.latest_at,
        source_mix: item.source_mix,
      };
    });
}

function mergeAnalysisViews(existingViews, tokenStats) {
  const views = Array.isArray(existingViews) ? existingViews.filter(Boolean) : [];
  const filtered = views.filter((item) => !["Token Mix", "Token Pace"].includes(String(item.title || "")));
  filtered.unshift(
    {
      title: "Token Pace",
      signal: tokenStats.lastTokenEventAt ? "Recent" : "Waiting",
      description: tokenStats.lastTokenEventAt
        ? `24h ${tokenStats.tokens24h} tokens · 7d ${tokenStats.tokens7d} tokens · last event ${tokenStats.lastTokenEventAt}`
        : "No Codex token events have been recorded yet.",
    },
    {
      title: "Token Mix",
      signal: tokenStats.totalTokens ? "Tooling" : "Waiting",
      description: tokenStats.totalTokens
        ? `Total ${tokenStats.totalTokens} · manual ${tokenStats.manualTokens} · auto-continue ${tokenStats.autoContinueTokens} · loop ${tokenStats.loopTokens}`
        : "Token usage will appear here after loop or CLI events are ingested.",
    },
  );
  return filtered.slice(0, 8);
}

function buildTokenStats(events) {
  const now = Date.now();
  const tokenStats = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    loopTokens: 0,
    manualTokens: 0,
    autoContinueTokens: 0,
    loopInputTokens: 0,
    loopOutputTokens: 0,
    manualInputTokens: 0,
    manualOutputTokens: 0,
    autoContinueInputTokens: 0,
    autoContinueOutputTokens: 0,
    lastTokenEventAt: "",
    tokens24h: 0,
    tokens7d: 0,
  };
  events.forEach((event) => {
    const input = Number(event.input_tokens || 0);
    const output = Number(event.output_tokens || 0);
    const total = Number(event.total_tokens || (input + output));
    const source = String(event.source || "");
    const finishedAt = Date.parse(event.finished_at || event.started_at || "");
    tokenStats.totalInputTokens += input;
    tokenStats.totalOutputTokens += output;
    tokenStats.totalTokens += total;
    if (!tokenStats.lastTokenEventAt || String(event.finished_at || event.started_at || "") > tokenStats.lastTokenEventAt) {
      tokenStats.lastTokenEventAt = String(event.finished_at || event.started_at || "");
    }
    if (source === "loop") {
      tokenStats.loopTokens += total;
      tokenStats.loopInputTokens += input;
      tokenStats.loopOutputTokens += output;
    } else if (source === "auto_continue") {
      tokenStats.autoContinueTokens += total;
      tokenStats.autoContinueInputTokens += input;
      tokenStats.autoContinueOutputTokens += output;
    } else {
      tokenStats.manualTokens += total;
      tokenStats.manualInputTokens += input;
      tokenStats.manualOutputTokens += output;
    }
    if (Number.isFinite(finishedAt)) {
      if (now - finishedAt <= 24 * 60 * 60 * 1000) tokenStats.tokens24h += total;
      if (now - finishedAt <= 7 * 24 * 60 * 60 * 1000) tokenStats.tokens7d += total;
    }
  });
  return tokenStats;
}

function rebuildPersistedUsageReport() {
  const events = readLedgerEvents();
  const existingReport = readJson(reportPath(), {}) || {};
  if (!events.length) {
    if (existingReport && Object.keys(existingReport).length) return existingReport;
    return null;
  }
  const summary = { ...(existingReport.summary || {}) };
  const activity = { ...(existingReport.activity || {}) };
  const tokenStats = buildTokenStats(events);
  summary.total_input_tokens = tokenStats.totalInputTokens;
  summary.total_output_tokens = tokenStats.totalOutputTokens;
  summary.total_tokens = tokenStats.totalTokens;
  summary.loop_input_tokens = tokenStats.loopInputTokens;
  summary.loop_output_tokens = tokenStats.loopOutputTokens;
  summary.loop_tokens = tokenStats.loopTokens;
  summary.manual_cli_input_tokens = tokenStats.manualInputTokens;
  summary.manual_cli_output_tokens = tokenStats.manualOutputTokens;
  summary.manual_cli_tokens = tokenStats.manualTokens;
  summary.auto_continue_input_tokens = tokenStats.autoContinueInputTokens;
  summary.auto_continue_output_tokens = tokenStats.autoContinueOutputTokens;
  summary.auto_continue_tokens = tokenStats.autoContinueTokens;
  summary.last_token_event_at = tokenStats.lastTokenEventAt;
  activity.recent_days = buildRecentDays(events);
  activity.recent_token_days = buildRecentTokenDays(events);

  const nextReport = {
    ...existingReport,
    generated_at: new Date().toISOString(),
    summary,
    activity,
    analysis_views: mergeAnalysisViews(existingReport.analysis_views, tokenStats),
    token_top_threads: buildTopTokenThreads(events, existingReport.top_threads),
  };
  writeJson(reportPath(), nextReport);
  return nextReport;
}

function inferSourceFromFile(filePath) {
  const name = path.basename(filePath || "").toLowerCase();
  if (name.includes("auto-loop")) return "auto_continue";
  return "manual_cli";
}

function readCliLogMetadata(filePath) {
  const metaPath = `${filePath}.meta.json`;
  return readJson(metaPath, null);
}

function ingestUsageEvent(nextEvent) {
  if (!nextEvent || !nextEvent.log_path) return false;
  const events = readLedgerEvents();
  if (hasLedgerEvent(events, nextEvent)) return false;
  appendJsonl(ledgerPath(), nextEvent);
  rebuildPersistedUsageReport();
  return true;
}

function ingestKnownCliUsageLogs() {
  const logsDir = path.join(os.homedir(), ".codex-managed-agent", "logs");
  if (!fs.existsSync(logsDir)) return 0;
  const existing = readLedgerEvents();
  let ingested = 0;
  fs.readdirSync(logsDir)
    .filter((name) => name.endsWith(".log"))
    .sort()
    .forEach((name) => {
      const filePath = path.join(logsDir, name);
      const meta = readCliLogMetadata(filePath) || {};
      const events = parseCodexJsonEvents(filePath);
      const usage = findUsageEvent(events);
      if (!usage || usage.total_tokens <= 0) return;
      const stat = fs.statSync(filePath);
      const nextEvent = {
        event_key: `${meta.source || inferSourceFromFile(filePath)}:${filePath}`,
        source: meta.source || inferSourceFromFile(filePath),
        thread_id: String(meta.thread_id || findThreadId(events) || "").trim(),
        workspace: String(meta.workspace || "").trim(),
        started_at: meta.started_at || stat.birthtime.toISOString(),
        finished_at: meta.finished_at || stat.mtime.toISOString(),
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        total_tokens: usage.total_tokens,
        command_kind: meta.command_kind || "codex.exec.resume",
        log_path: filePath,
      };
      if (hasLedgerEvent(existing, nextEvent)) return;
      existing.push(nextEvent);
      appendJsonl(ledgerPath(), nextEvent);
      ingested += 1;
    });
  if (ingested) rebuildPersistedUsageReport();
  return ingested;
}

function readLatestThreadUsageEvent(threadId) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return null;
  const events = readLedgerEvents()
    .filter((item) => String(item.thread_id || "").trim() === nextThreadId)
    .sort((a, b) => String(b.finished_at || "").localeCompare(String(a.finished_at || "")));
  if (!events.length) return null;
  const latest = events[0];
  return {
    threadId: nextThreadId,
    source: latest.source || "",
    inputTokens: Number(latest.input_tokens || 0),
    outputTokens: Number(latest.output_tokens || 0),
    totalTokens: Number(latest.total_tokens || 0),
    finishedAt: latest.finished_at || "",
    commandKind: latest.command_kind || "",
    logPath: latest.log_path || "",
    summary: shortText(
      `${latest.source || "usage"} · in ${latest.input_tokens || 0} · out ${latest.output_tokens || 0} · total ${latest.total_tokens || 0}`,
      140,
    ),
  };
}

module.exports = {
  reportPath,
  ledgerPath,
  rebuildPersistedUsageReport,
  ingestUsageEvent,
  ingestKnownCliUsageLogs,
  readLatestThreadUsageEvent,
};
