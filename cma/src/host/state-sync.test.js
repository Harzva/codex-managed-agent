const assert = require("node:assert/strict");
const fs = require("fs");
const Module = require("module");
const os = require("os");
const path = require("path");
const test = require("node:test");

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "vscode") {
    return {
      workspace: { workspaceFolders: [] },
      window: { setStatusBarMessage() {}, showInformationMessage() {}, showWarningMessage() {} },
      env: {},
      Uri: { parse: (value) => ({ toString: () => value }) },
    };
  }
  if (request === "./server") {
    return {
      getConfig() { return {}; },
      serviceMetadataFromPayload() { return {}; },
      summarizeServiceState() { return {}; },
      fetchDashboardState: async () => ({}),
      fetchRunningThreadsState: async () => ({}),
      fetchThreadsByIds: async () => ({}),
      fetchThreadDetail: async () => null,
      probeServer: async () => ({ ok: false }),
      startServer: async () => ({ ok: false }),
    };
  }
  if (request === "./auto-continue") {
    return { readFileTail() { return ""; } };
  }
  if (request === "./team-coordination") {
    const actual = originalLoad.call(this, request, parent, isMain);
    return {
      readTeamCoordination() { return {}; },
      pathsForWorkspace: actual.pathsForWorkspace,
    };
  }
  if (request === "./usage-ledger") {
    return {
      ingestKnownCliUsageLogs() {},
      readLatestThreadUsageEvent() { return null; },
    };
  }
  if (request === "./thread-insight") {
    return { buildThreadInsight() { return null; } };
  }
  if (request === "./bundled-skills") {
    return {
      resolveCodexHome() { return ""; },
      bundledSkillState() { return null; },
      listBundledSkillStates() { return []; },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  buildThreadTracePreview,
  applyOpenAiSidebarLimitPatch,
  applyProviderSync,
  parseRootModelProviderFromToml,
  readOpenAiSidebarLimitPatchPreview,
  readProviderSyncPreview,
  readProviderVisibilityHealth,
  syncThreadTraceLane,
} = require("./state-sync");
const { readTrace } = require("./trace-core");

Module._load = originalLoad;

test("parseRootModelProviderFromToml reads only root-level model_provider", () => {
  assert.equal(parseRootModelProviderFromToml('model_provider = "openai"\n[projects."/tmp"]\nmodel_provider = "other"'), "openai");
  assert.equal(parseRootModelProviderFromToml('# model_provider = "ignored"\nmodel = "gpt-5.5"\n'), "");
  assert.equal(parseRootModelProviderFromToml("model_provider = 'google_gemini' # active\n"), "google_gemini");
});

test("readOpenAiSidebarLimitPatchPreview detects installed OpenAI sidebar limit", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cma-openai-limit-preview-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const extensionDir = path.join(root, "openai.chatgpt-26.5506.21252-linux-x64");
  const outDir = path.join(extensionDir, "out");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(extensionDir, "package.json"), JSON.stringify({ version: "26.5506.21252" }));
  fs.writeFileSync(path.join(outDir, "extension.js"), 'sendRequest(J7,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[nb]:null})');

  const preview = readOpenAiSidebarLimitPatchPreview({ extensionRoots: [root], targetLimit: 200 });

  assert.equal(preview.ok, true);
  assert.equal(preview.canApply, true);
  assert.equal(preview.currentLimit, 50);
  assert.equal(preview.targetLimit, 200);
  assert.equal(preview.matchCount, 1);
  assert.match(preview.extensionJsPath, /extension\.js$/);
});

test("applyOpenAiSidebarLimitPatch backs up and updates installed OpenAI sidebar limit", (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cma-openai-limit-apply-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const extensionDir = path.join(root, "openai.chatgpt-26.5506.21252-linux-x64");
  const outDir = path.join(extensionDir, "out");
  const backupRoot = path.join(root, "backup");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(extensionDir, "package.json"), JSON.stringify({ version: "26.5506.21252" }));
  const extensionJsPath = path.join(outDir, "extension.js");
  fs.writeFileSync(extensionJsPath, 'sendRequest(J7,r,"thread/list",{limit:50,cursor:null,sortKey:"created_at",modelProviders:e?[nb]:null})');

  const result = applyOpenAiSidebarLimitPatch({ extensionRoots: [root], targetLimit: 200, backupRoot });

  assert.equal(result.ok, true);
  assert.equal(result.applied, true);
  assert.equal(result.replacementCount, 1);
  assert.match(fs.readFileSync(extensionJsPath, "utf8"), /limit:200,cursor:null/);
  assert.match(fs.readFileSync(path.join(backupRoot, "extension.js"), "utf8"), /limit:50,cursor:null/);
});

test("readProviderVisibilityHealth reports rollout providers with missing SQLite", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model_provider = "openai"\n');
  const sessionsDir = path.join(codexHome, "sessions", "2026", "04", "29");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(path.join(sessionsDir, "rollout-2026-04-29T00-00-00-thread-a.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-a", model_provider: "openai" } }),
    JSON.stringify({ type: "event_msg", payload: { type: "user_message", message: "hi" } }),
  ].join("\n"));
  fs.writeFileSync(path.join(sessionsDir, "rollout-2026-04-29T00-01-00-thread-b.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-b", model_provider: "google_gemini" } }),
  ].join("\n"));

  const health = readProviderVisibilityHealth({ codexHome, sqlite3Available: false });
  assert.equal(health.currentProvider, "openai");
  assert.deepEqual(health.rolloutProviderCounts, { openai: 1, google_gemini: 1 });
  assert.deepEqual(health.rolloutProviderCountsActive, { openai: 1, google_gemini: 1 });
  assert.deepEqual(health.rolloutProviderCountsArchived, {});
  assert.equal(health.sqliteExists, false);
  assert.equal(health.sqliteStatus, "missing");
  assert.equal(health.mismatch, false);
  assert.match(health.message, /SQLite unavailable/);
  assert.equal(health.rolloutScannedActiveFiles, 2);
  assert.equal(health.rolloutScannedArchivedFiles, 0);
});

test("readProviderVisibilityHealth reports rollout active and archived providers across sessions folders", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-both-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model_provider = "openai"\n');
  const activeSessionDir = path.join(codexHome, "sessions", "2026", "04", "29");
  const archivedSessionDir = path.join(codexHome, "archived_sessions", "2026", "04", "29");
  fs.mkdirSync(activeSessionDir, { recursive: true });
  fs.mkdirSync(archivedSessionDir, { recursive: true });
  fs.writeFileSync(path.join(activeSessionDir, "rollout-2026-04-29T00-00-00-thread-a.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-a", model_provider: "openai" } }),
    JSON.stringify({ type: "event_msg", payload: { type: "user_message", message: "hi" } }),
  ].join("\n"));
  fs.writeFileSync(path.join(activeSessionDir, "rollout-2026-04-29T00-01-00-thread-b.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-b", model_provider: "google_gemini" } }),
  ].join("\n"));
  fs.writeFileSync(path.join(archivedSessionDir, "rollout-2026-04-29T00-02-00-thread-c.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-c", model_provider: "anthropic" } }),
  ].join("\n"));
  fs.writeFileSync(path.join(archivedSessionDir, "rollout-2026-04-29T00-03-00-thread-d.jsonl"), [
    JSON.stringify({ type: "thread.started", provider: "openai" }),
  ].join("\n"));

  const health = readProviderVisibilityHealth({ codexHome, sqlite3Available: false });
  assert.deepEqual(health.rolloutProviderCounts, { openai: 2, google_gemini: 1, anthropic: 1 });
  assert.deepEqual(health.rolloutProviderCountsActive, { openai: 1, google_gemini: 1 });
  assert.deepEqual(health.rolloutProviderCountsArchived, { anthropic: 1, openai: 1 });
  assert.equal(health.rolloutScannedFiles, 4);
  assert.equal(health.rolloutScannedActiveFiles, 2);
  assert.equal(health.rolloutScannedArchivedFiles, 2);
});

test("readProviderVisibilityHealth degrades when SQLite exists without sqlite3 CLI", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-sqlite-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite"), "");

  const health = readProviderVisibilityHealth({ codexHome, sqlite3Available: false });
  assert.equal(health.sqliteExists, true);
  assert.equal(health.sqliteReadable, true);
  assert.equal(health.sqliteStatus, "no_sqlite3");
  assert.equal(health.mismatch, false);
  assert.match(health.message, /provider distribution unavailable/);
});

test("readProviderVisibilityHealth inventories every Codex SQLite database and companions", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-sqlite-inventory-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite"), "state");
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite-wal"), "wal");
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite-shm"), "shm");
  fs.writeFileSync(path.join(codexHome, "logs_2.sqlite"), "logs");
  fs.writeFileSync(path.join(codexHome, "custom.sqlite"), "custom");
  fs.writeFileSync(path.join(codexHome, "orphan.sqlite-shm"), "orphan");

  const health = readProviderVisibilityHealth({ codexHome, sqlite3Available: false });
  assert.equal(health.sqliteInventory.databaseCount, 3);
  assert.equal(health.sqliteInventory.companionCount, 2);
  assert.equal(health.sqliteInventory.sqliteFileCount, 6);
  assert.equal(health.sqliteInventory.extraFileCount, 1);
  assert.deepEqual(health.sqliteInventory.databases.map((item) => item.name), [
    "state_5.sqlite",
    "logs_2.sqlite",
    "custom.sqlite",
  ]);
  assert.equal(health.sqliteInventory.databases[0].role, "thread_state");
  assert.equal(health.sqliteInventory.databases[1].role, "diagnostic_logs");
  assert.equal(health.sqliteInventory.databases[0].companionCount, 2);
  assert.deepEqual(health.sqliteInventory.databases[0].companions.filter((item) => item.exists).map((item) => item.name), [
    "state_5.sqlite-wal",
    "state_5.sqlite-shm",
  ]);
  assert.deepEqual(health.sqliteInventory.databases[0].files.map((item) => item.name), [
    "state_5.sqlite",
    "state_5.sqlite-wal",
    "state_5.sqlite-shm",
  ]);
  assert.deepEqual(health.sqliteInventory.extraFiles.map((item) => item.name), ["orphan.sqlite-shm"]);
});

test("readProviderVisibilityHealth degrades when SQLite query fails", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-sqlite-query-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite"), "");
  const health = readProviderVisibilityHealth({
    codexHome,
    sqlite3Available: true,
    sqliteRunner() {
      throw new Error("sqlite query unavailable");
    },
  });
  assert.equal(health.sqliteExists, true);
  assert.equal(health.sqliteReadable, true);
  assert.equal(health.sqliteStatus, "query_failed");
  assert.equal(health.mismatch, false);
  assert.match(health.message, /provider metadata could not be queried/);
});

test("readProviderVisibilityHealth detects provider mismatch from readable SQLite metadata", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-mismatch-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model_provider = "openai"\n');
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite"), "");
  const sessionsDir = path.join(codexHome, "sessions", "2026", "04", "29");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(path.join(sessionsDir, "rollout-2026-04-29T00-00-00-thread-c.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { id: "thread-c", model_provider: "google_gemini" } }),
  ].join("\n"));
  const health = readProviderVisibilityHealth({
    codexHome,
    sqlite3Available: true,
    sqliteRunner(_sqlitePath, sql) {
      if (/SELECT name FROM sqlite_schema WHERE type='table' AND name='threads';/.test(sql)) return "threads\n";
      if (/PRAGMA table_info\(threads\)/.test(sql)) return "0|id|INTEGER|0||0\n1|archived|INTEGER|0||0\n2|model_provider|TEXT|0||0\n";
      if (/SELECT COUNT\(\*\) FROM threads/.test(sql)) return "3\n";
      if (/SELECT CAST\(.+?FROM threads GROUP BY archived_flag, provider/.test(sql)) return "0|openai|3\n";
      if (/SELECT .* FROM threads GROUP BY archived_flag, provider/.test(sql)) return "0|openai|3\n";
      return "";
    },
  });
  assert.deepEqual(health.sqliteProviderCounts, { openai: 3 });
  assert.deepEqual(health.sqliteProviderCountsActive, { openai: 3 });
  assert.deepEqual(health.sqliteProviderCountsArchived, {});
  assert.deepEqual(health.sqliteProviderTotals, { active: 3, archived: 0, all: 3, missingProvider: 0, missingProviderActive: 0, missingProviderArchived: 0 });
  assert.equal(health.sqliteStatus, "readable");
  assert.equal(health.mismatch, true);
  assert.match(health.message, /Desktop may differ/);
});

test("readProviderVisibilityHealth reports SQLite active/archived and missing-provider counts", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-health-sqlite-split-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model_provider = "openai"\n');
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite"), "");
  const health = readProviderVisibilityHealth({
    codexHome,
    sqlite3Available: true,
    sqliteRunner(_sqlitePath, sql) {
      if (/SELECT name FROM sqlite_schema WHERE type='table' AND name='threads';/.test(sql)) return "threads\n";
      if (/PRAGMA table_info\(threads\)/.test(sql)) return "0|id|INTEGER|0||0\n1|archived|INTEGER|0||0\n2|model_provider|TEXT|0||0\n3|other_provider|TEXT|0||0\n";
      if (/SELECT COUNT\(\*\) FROM threads/.test(sql)) return "6\n";
      if (/SELECT CAST\(.+?FROM threads GROUP BY archived_flag, provider/.test(sql)) return "0|openai|2\n1|openai|2\n0||1\n1||1\n";
      if (/SELECT .* FROM threads GROUP BY archived_flag, provider/.test(sql)) return "0|openai|2\n1|openai|2\n0||1\n1||1\n";
      return "";
    },
  });
  assert.deepEqual(health.sqliteProviderCountsActive, { openai: 2 });
  assert.deepEqual(health.sqliteProviderCountsArchived, { openai: 2 });
  assert.deepEqual(health.sqliteProviderTotals, {
    active: 3,
    archived: 3,
    all: 6,
    missingProvider: 2,
    missingProviderActive: 1,
    missingProviderArchived: 1,
  });
  assert.equal(health.sqliteMissingProviderCount, 2);
  assert.equal(health.rolloutScannedFiles, 0);
});

test("readProviderSyncPreview plans SQLite provider visibility updates to current provider", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-sync-preview-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  const sessionsDir = path.join(codexHome, "sessions", "2026", "05", "06");
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.writeFileSync(
    path.join(sessionsDir, "rollout-thread-1.jsonl"),
    `${JSON.stringify({ type: "session_meta", payload: { id: "thread-1", model_provider: "google_gemini", cwd: codexHome } })}\n${JSON.stringify({ type: "event_msg", payload: { type: "user_message", message: "hi" } })}\n`,
  );
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model_provider = "openai"\n');
  fs.writeFileSync(path.join(codexHome, "state_5.sqlite"), "");

  const preview = readProviderSyncPreview({
    codexHome,
    sqlite3Available: true,
    sqliteRunner(_sqlitePath, sql) {
      if (/SELECT name FROM sqlite_schema WHERE type='table' AND name='threads';/.test(sql)) return "threads\n";
      if (/PRAGMA table_info\(threads\)/.test(sql)) return "0|id|INTEGER|0||0\n1|archived|INTEGER|0||0\n2|model_provider|TEXT|0||0\n";
      if (/WHERE COALESCE\(model_provider, ''\) <> 'openai'/.test(sql)) return "0|google_gemini|2\n1|anthropic|1\n0||1\n";
      return "";
    },
  });

  assert.equal(preview.ok, true);
  assert.equal(preview.canApply, true);
  assert.equal(preview.targetProvider, "openai");
  assert.equal(preview.plannedRows, 4);
  assert.equal(preview.plannedActiveRows, 3);
  assert.equal(preview.plannedArchivedRows, 1);
  assert.deepEqual(preview.plannedByProvider, { google_gemini: 2, anthropic: 1, "(missing)": 1 });
  assert.equal(preview.plannedSessionFiles, 1);
  assert.equal(preview.scannedSessionFiles, 1);
  assert.deepEqual(preview.plannedSessionByProvider, { google_gemini: 1 });
});

test("applyProviderSync backs up SQLite and updates provider metadata plus rollout session headers", (t) => {
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-provider-sync-apply-"));
  t.after(() => fs.rmSync(codexHome, { recursive: true, force: true }));
  const sqlitePath = path.join(codexHome, "state_5.sqlite");
  const sessionsDir = path.join(codexHome, "sessions");
  fs.mkdirSync(sessionsDir, { recursive: true });
  const rolloutPath = path.join(sessionsDir, "rollout-thread-1.jsonl");
  fs.writeFileSync(
    rolloutPath,
    `${JSON.stringify({ type: "session_meta", payload: { id: "thread-1", model_provider: "google_gemini", cwd: codexHome } })}\n${JSON.stringify({ type: "event_msg", payload: { type: "user_message", message: "hello" } })}\n`,
  );
  const originalMtime = new Date("2026-05-06T01:00:00.000Z");
  fs.utimesSync(rolloutPath, originalMtime, originalMtime);
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model_provider = "openai"\n');
  fs.writeFileSync(sqlitePath, "sqlite");
  fs.writeFileSync(`${sqlitePath}-wal`, "wal");
  const writeCalls = [];

  const result = applyProviderSync({
    codexHome,
    sqlite3Available: true,
    sqliteRunner(_sqlitePath, sql) {
      if (/SELECT name FROM sqlite_schema WHERE type='table' AND name='threads';/.test(sql)) return "threads\n";
      if (/PRAGMA table_info\(threads\)/.test(sql)) return "0|id|INTEGER|0||0\n1|archived|INTEGER|0||0\n2|model_provider|TEXT|0||0\n";
      if (/WHERE COALESCE\(model_provider, ''\) <> 'openai'/.test(sql)) return "0|google_gemini|2\n1|anthropic|1\n";
      return "";
    },
    backupCreator(sourcePath, homePath) {
      assert.equal(sourcePath, sqlitePath);
      assert.equal(homePath, codexHome);
      return { backupDir: path.join(codexHome, "backups_state", "provider-sync", "test"), copied: [sqlitePath] };
    },
    sqliteWriteRunner(pathArg, sql) {
      writeCalls.push({ pathArg, sql });
      return "3\n";
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.applied, true);
  assert.equal(result.updatedRows, 3);
  assert.equal(result.updatedSessionFiles, 1);
  assert.equal(result.skippedSessionFiles.length, 0);
  assert.match(result.backupDir, /provider-sync/);
  assert.ok(fs.existsSync(result.sessionBackupPath));
  assert.equal(writeCalls.length, 1);
  assert.equal(writeCalls[0].pathArg, sqlitePath);
  assert.match(writeCalls[0].sql, /BEGIN IMMEDIATE/);
  assert.match(writeCalls[0].sql, /UPDATE threads SET model_provider = 'openai'/);
  const firstLine = fs.readFileSync(rolloutPath, "utf8").split(/\r?\n/)[0];
  assert.equal(JSON.parse(firstLine).payload.model_provider, "openai");
  assert.equal(Math.round(fs.statSync(rolloutPath).mtimeMs), originalMtime.getTime());
});

test("syncThreadTraceLane creates a real append-only thread trace lane and avoids duplicate appends", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-thread-trace-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const detail = {
    thread: {
      id: "thread-alpha",
      cwd: workspace,
      status: "running",
      updated_at_iso: "2026-04-25T01:20:00.000Z",
      tool_call_count: 2,
      tool_call_counts: [
        { name: "exec_command", count: 2 },
        { name: "apply_patch", count: 1 },
      ],
      history: [
        { role: "user", content: "Continue with the trace lane.", ts: "2026-04-25T01:18:00.000Z" },
        { role: "assistant", content: "Working on the thread trace migration.", ts: "2026-04-25T01:19:00.000Z" },
      ],
    },
    logs: [
      {
        level: "INFO",
        ts_iso: "2026-04-25T01:19:30.000Z",
        message: "Touched src/webview/drawer-runtime.js and src/host/state-sync.js while tracing the thread lane.",
      },
      {
        level: "INFO",
        ts_iso: "2026-04-25T01:19:40.000Z",
        message: "Verification check passed for the host trace suite.",
      },
      {
        level: "ERROR",
        ts_iso: "2026-04-25T01:19:50.000Z",
        message: "Error: build failed during trace sync.",
      },
    ],
    hint_commands: {
      resume: "codex resume thread-alpha",
      fork: "codex fork thread-alpha",
    },
  };
  const summary = {
    updated_age: "just now",
    tool_call_count: 2,
    process: { summary: "Thread is currently running." },
  };

  const first = syncThreadTraceLane(detail, summary);
  assert.ok(first.filePath.endsWith(path.join(".codex-team", "traces", "threads", "thread-alpha.jsonl")));
  assert.equal(first.appended, 12);
  assert.ok(first.summary);
  assert.equal(first.summary.event_count, 12);

  const entries = readTrace(first.filePath);
  assert.equal(entries.length, 12);
  assert.ok(entries.some((entry) => entry.kind === "thread.message_observed"));
  assert.equal(entries.filter((entry) => entry.kind === "thread.file_observed").length, 2);
  assert.equal(entries.filter((entry) => entry.kind === "thread.command_observed").length, 4);
  assert.equal(entries.filter((entry) => entry.kind === "thread.check_observed").length, 2);
  assert.equal(entries.filter((entry) => entry.kind === "thread.error_observed").length, 1);
  assert.ok(entries.some((entry) => entry.kind === "thread.checkpoint_captured"));

  const second = syncThreadTraceLane(detail, summary);
  assert.equal(second.appended, 0);
  assert.equal(readTrace(first.filePath).length, 12);

  const preview = buildThreadTracePreview(detail, summary, second);
  assert.equal(preview.counts.raw_jsonl, 12);
  assert.equal(preview.counts.files, 2);
  assert.equal(preview.counts.commands, 4);
  assert.equal(preview.counts.checks, 2);
  assert.equal(preview.counts.errors, 1);
  assert.deepEqual(preview.file_events.map((entry) => entry.path), ["src/webview/drawer-runtime.js", "src/host/state-sync.js"]);
  assert.deepEqual(preview.command_events.map((entry) => entry.label), ["exec_command", "apply_patch", "Resume", "Fork"]);
  assert.equal(preview.check_events.length, 2);
  assert.match(preview.check_events[0].summary, /Verification check passed|build failed/);
  assert.match(preview.error_events[0].summary, /build failed during trace sync/);
  assert.equal(preview.source_summary.thread_id, "thread-alpha");
});
