const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { readFileTail } = require("./auto-continue");
const { resolveCodexHome } = require("./bundled-skills");

function normalizeWorkspacePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
}

function redactConfigContent(content) {
  return String(content || "")
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*#/.test(line)) return line;
      return line.replace(
        /^(\s*[^=\s]*(?:token|key|secret|password|credential)[^=\s]*\s*=\s*)(.+)$/i,
        "$1\"<redacted>\"",
      );
    })
    .join("\n");
}

function readCodexConfigFile(scope, label, filePath, options = {}) {
  const normalizedPath = normalizeWorkspacePath(filePath);
  const exists = Boolean(normalizedPath && fs.existsSync(normalizedPath));
  let content = "";
  let error = "";
  let mtime = "";
  let size = 0;
  if (exists) {
    try {
      const stat = fs.statSync(normalizedPath);
      size = stat.size;
      mtime = stat.mtime.toISOString();
      content = redactConfigContent(fs.readFileSync(normalizedPath, "utf8"));
      const maxChars = Number(options.maxChars || 12000);
      if (content.length > maxChars) {
        content = `${content.slice(0, maxChars)}\n# ... truncated by CMA preview ...`;
      }
    } catch (readError) {
      error = readError instanceof Error ? readError.message : String(readError);
    }
  }
  return {
    scope,
    label,
    path: normalizedPath || filePath,
    exists,
    optional: Boolean(options.optional),
    content,
    error,
    mtime,
    size,
    rootLabel: options.rootLabel || "",
  };
}

function readCodexConfigFiles(workspaceRoots = []) {
  const userConfigPath = normalizeWorkspacePath(path.join(resolveCodexHome(), "config.toml"));
  const extensionProjectRoot = normalizeWorkspacePath(path.resolve(__dirname, "..", ".."));
  const configs = [
    readCodexConfigFile("system", "System", "/root/.codex/config.toml", { optional: true }),
    readCodexConfigFile("user", "User / Global", userConfigPath),
  ];
  const roots = Array.isArray(workspaceRoots) ? workspaceRoots : [];
  let addedProjectConfig = false;
  roots.forEach((root, index) => {
    const rootPath = root && (root.path || root.rootKey);
    if (!rootPath) return;
    const candidatePath = normalizeWorkspacePath(path.join(rootPath, ".codex", "config.toml"));
    if (candidatePath && userConfigPath && candidatePath === userConfigPath) return;
    configs.push(readCodexConfigFile(
      "project",
      roots.length > 1 ? `Project ${index + 1}` : "Project / Local",
      candidatePath,
      {
        optional: true,
        rootLabel: root.name || root.rootLabel || rootPath,
      },
    ));
    addedProjectConfig = true;
  });
  if (!addedProjectConfig) {
    configs.push(readCodexConfigFile(
      "project",
      "Project / Local",
      path.join(extensionProjectRoot || process.cwd(), ".codex", "config.toml"),
      { optional: true, rootLabel: extensionProjectRoot || process.cwd() },
    ));
  }
  return configs;
}

function stripTomlInlineComment(value) {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\" && inDouble && !escaped) {
      escaped = true;
      continue;
    }
    if (char === "'" && !inDouble && !escaped) inSingle = !inSingle;
    if (char === '"' && !inSingle && !escaped) inDouble = !inDouble;
    if (char === "#" && !inSingle && !inDouble) return text.slice(0, index).trim();
    escaped = false;
  }
  return text.trim();
}

function unquoteTomlScalar(value) {
  const text = stripTomlInlineComment(value);
  const quoted = text.match(/^(['"])([\s\S]*)\1$/);
  return (quoted ? quoted[2] : text).trim();
}

function parseRootModelProviderFromToml(content) {
  const lines = String(content || "").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = String(rawLine || "").trim();
    if (!line || line.startsWith("#")) continue;
    if (/^\[[^\]]+\]\s*$/.test(line)) break;
    const match = line.match(/^model_provider\s*=\s*(.+)$/);
    if (match) return unquoteTomlScalar(match[1]) || "";
  }
  return "";
}

function readCurrentConfigProvider(configPath) {
  const filePath = normalizeWorkspacePath(configPath || path.join(resolveCodexHome(), "config.toml"));
  try {
    if (filePath && fs.existsSync(filePath)) {
      return {
        provider: parseRootModelProviderFromToml(fs.readFileSync(filePath, "utf8")) || "openai",
        path: filePath,
        exists: true,
      };
    }
  } catch {
    // Fall through to the Codex CLI default.
  }
  return { provider: "openai", path: filePath, exists: false };
}

function incrementProviderCount(counts, provider) {
  const key = String(provider || "unknown").trim() || "unknown";
  counts[key] = (counts[key] || 0) + 1;
}

function readJsonlProviderFromFile(filePath) {
  const head = (() => {
    try {
      const fd = fs.openSync(filePath, "r");
      try {
        const buffer = Buffer.alloc(8192);
        const bytes = fs.readSync(fd, buffer, 0, buffer.length, 0);
        return buffer.subarray(0, bytes).toString("utf8");
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return "";
    }
  })();
  const sample = `${head}\n${readFileTail(filePath, 8192)}`;
  const lines = sample.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      const payload = event && typeof event.payload === "object" && event.payload ? event.payload : {};
      if (event && event.type === "session_meta" && payload.model_provider) return String(payload.model_provider).trim();
      if (event && event.type === "thread.started" && event.provider) return String(event.provider).trim();
      if (payload.model_provider) return String(payload.model_provider).trim();
      if (payload.provider) return String(payload.provider).trim();
    } catch {
      // Ignore malformed or truncated JSONL lines in a sampled read.
    }
  }
  return "";
}

function readFirstJsonlLine(filePath) {
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const chunks = [];
      let total = 0;
      let position = 0;
      while (total < 1024 * 1024) {
        const buffer = Buffer.alloc(64 * 1024);
        const bytes = fs.readSync(fd, buffer, 0, buffer.length, position);
        if (!bytes) break;
        position += bytes;
        total += bytes;
        const slice = buffer.subarray(0, bytes);
        const newlineIndex = slice.indexOf(0x0a);
        if (newlineIndex >= 0) {
          chunks.push(slice.subarray(0, newlineIndex + 1));
          break;
        }
        chunks.push(slice);
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      const newlineIndex = raw.indexOf("\n");
      const lineWithSeparator = newlineIndex >= 0 ? raw.slice(0, newlineIndex + 1) : raw;
      const separator = lineWithSeparator.endsWith("\r\n") ? "\r\n" : (lineWithSeparator.endsWith("\n") ? "\n" : "");
      const firstLine = separator ? lineWithSeparator.slice(0, -separator.length) : lineWithSeparator;
      return {
        firstLine,
        separator,
        offset: Buffer.byteLength(lineWithSeparator, "utf8"),
      };
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
}

function collectProviderSyncSessionChanges(codexHome, targetProvider, options = {}) {
  if (typeof options.sessionChangeCollector === "function") {
    return options.sessionChangeCollector(codexHome, targetProvider);
  }
  const roots = [
    { root: path.join(codexHome || "", "sessions"), scope: "sessions" },
    { root: path.join(codexHome || "", "archived_sessions"), scope: "archived_sessions" },
  ];
  const changes = [];
  const plannedByProvider = {};
  let scannedFiles = 0;
  let plannedFiles = 0;
  function visit(dirPath, scope) {
    let entries = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath, scope);
        return;
      }
      if (!entry.isFile() || !/^rollout-.*\.jsonl$/.test(entry.name)) return;
      scannedFiles += 1;
      const record = readFirstJsonlLine(entryPath);
      if (!record || !record.firstLine) return;
      try {
        const parsed = JSON.parse(record.firstLine);
        if (!parsed || parsed.type !== "session_meta" || !parsed.payload || typeof parsed.payload !== "object") return;
        const originalProvider = String(parsed.payload.model_provider || "(missing)").trim() || "(missing)";
        if (parsed.payload.model_provider === targetProvider) return;
        parsed.payload.model_provider = targetProvider;
        plannedFiles += 1;
        plannedByProvider[originalProvider] = (plannedByProvider[originalProvider] || 0) + 1;
        const stat = fs.statSync(entryPath);
        changes.push({
          path: entryPath,
          scope,
          threadId: String(parsed.payload.id || "").trim(),
          originalProvider,
          originalFirstLine: record.firstLine,
          originalSeparator: record.separator,
          originalOffset: record.offset,
          originalMtimeMs: stat.mtimeMs,
          updatedFirstLine: JSON.stringify(parsed),
        });
      } catch {
        // Ignore malformed rollout headers; provider sync only rewrites session_meta rows.
      }
    });
  }
  roots.forEach(({ root, scope }) => {
    if (root && fs.existsSync(root)) visit(root, scope);
  });
  return { changes, scannedFiles, plannedFiles, plannedByProvider };
}

function applyProviderSyncSessionChanges(changes, options = {}) {
  if (typeof options.sessionChangeApplier === "function") return options.sessionChangeApplier(changes);
  const appliedPaths = [];
  const skippedPaths = [];
  (Array.isArray(changes) ? changes : []).forEach((change) => {
    let tmpPath = "";
    try {
      const current = readFirstJsonlLine(change.path);
      if (!current || current.firstLine !== change.originalFirstLine || current.offset !== change.originalOffset) {
        skippedPaths.push(change.path);
        return;
      }
      const stat = fs.statSync(change.path);
      const restSize = Math.max(0, stat.size - Number(change.originalOffset || 0));
      let rest = Buffer.alloc(0);
      if (restSize > 0) {
        const fd = fs.openSync(change.path, "r");
        try {
          rest = Buffer.alloc(restSize);
          fs.readSync(fd, rest, 0, restSize, change.originalOffset);
        } finally {
          fs.closeSync(fd);
        }
      }
      tmpPath = `${change.path}.provider-sync.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, `${change.updatedFirstLine}${change.originalSeparator || ""}`, "utf8");
      if (rest.length) fs.appendFileSync(tmpPath, rest);
      fs.renameSync(tmpPath, change.path);
      if (Number.isFinite(Number(change.originalMtimeMs))) {
        const statAfter = fs.statSync(change.path);
        fs.utimesSync(change.path, statAfter.atime, new Date(Number(change.originalMtimeMs)));
      }
      appliedPaths.push(change.path);
    } catch {
      if (tmpPath) {
        try {
          fs.rmSync(tmpPath, { force: true });
        } catch {}
      }
      skippedPaths.push(change.path);
    }
  });
  return { appliedChanges: appliedPaths.length, appliedPaths, skippedPaths };
}

function collectRolloutProviderCounts(sessionsDir, options = {}) {
  const activeRoot = normalizeWorkspacePath(sessionsDir);
  const parentRoot = activeRoot ? path.dirname(activeRoot) : "";
  const archivedRoot = normalizeWorkspacePath(options.archivedSessionsDir || (parentRoot ? path.join(parentRoot, "archived_sessions") : ""));
  const counts = {};
  const activeCounts = {};
  const archivedCounts = {};
  const limit = Math.max(1, Number(options.limit || 2000));
  let scannedFiles = 0;
  let scannedActiveFiles = 0;
  let scannedArchivedFiles = 0;
  let totalFiles = 0;

  function visit(dirPath, isArchived) {
    if (scannedFiles >= limit) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      if (scannedFiles >= limit) return;
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath, isArchived);
      } else if (entry.isFile() && /^rollout-.*\.jsonl$/.test(entry.name)) {
        totalFiles += 1;
        scannedFiles += 1;
        const provider = readJsonlProviderFromFile(entryPath) || "unknown";
        if (isArchived) {
          scannedArchivedFiles += 1;
          incrementProviderCount(archivedCounts, provider);
        } else {
          scannedActiveFiles += 1;
          incrementProviderCount(activeCounts, provider);
        }
        incrementProviderCount(counts, provider);
      }
    });
  }
  if (activeRoot && fs.existsSync(activeRoot)) visit(activeRoot, false);
  if (archivedRoot && archivedRoot !== activeRoot && fs.existsSync(archivedRoot)) visit(archivedRoot, true);
  return {
    counts,
    activeCounts,
    archivedCounts,
    scannedFiles,
    scannedActiveFiles,
    scannedArchivedFiles,
    totalFiles,
    sessionsDir: activeRoot,
    archivedSessionsDir: archivedRoot,
  };
}

function sqlite3Available() {
  try {
    childProcess.execFileSync("sqlite3", ["-version"], { encoding: "utf8", timeout: 1200, stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function quoteSqlIdentifier(identifier) {
  return `"${String(identifier || "").replace(/"/g, '""')}"`;
}

function runSqliteScalarList(sqlitePath, sql, options = {}) {
  if (typeof options.sqliteRunner === "function") return options.sqliteRunner(sqlitePath, sql);
  return childProcess.execFileSync("sqlite3", ["-readonly", sqlitePath, sql], {
    encoding: "utf8",
    timeout: Number(options.timeout || 1800),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runSqliteJson(sqlitePath, sql, options = {}) {
  if (typeof options.sqliteJsonRunner === "function") return options.sqliteJsonRunner(sqlitePath, sql);
  const output = childProcess.execFileSync("sqlite3", ["-readonly", "-json", sqlitePath, sql], {
    encoding: "utf8",
    timeout: Number(options.timeout || 1800),
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const parsed = JSON.parse(String(output || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function runSqliteWrite(sqlitePath, sql, options = {}) {
  if (typeof options.sqliteWriteRunner === "function") return options.sqliteWriteRunner(sqlitePath, sql);
  return childProcess.execFileSync("sqlite3", [sqlitePath, sql], {
    encoding: "utf8",
    timeout: Number(options.timeout || 3000),
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function quoteSqlLiteral(value) {
  return `'${String(value || "").replace(/'/g, "''")}'`;
}

function readSqliteProviderCounts(sqlitePath, options = {}) {
  const counts = {};
  const activeCounts = {};
  const archivedCounts = {};
  const totals = {
    active: 0,
    archived: 0,
    all: 0,
    missingProvider: 0,
    missingProviderActive: 0,
    missingProviderArchived: 0,
  };
  const tableOutput = String(runSqliteScalarList(sqlitePath, "SELECT name FROM sqlite_schema WHERE type='table' AND name='threads';", options) || "").trim();
  if (!tableOutput) {
    return {
      counts,
      activeCounts,
      archivedCounts,
      totals,
      hasProviderMetadata: false,
    };
  }

  const columnsOutput = String(runSqliteScalarList(sqlitePath, "PRAGMA table_info(threads);", options) || "").trim();
  const providerColumns = columnsOutput
    .split(/\r?\n/)
    .map((line) => line.split("|")[1])
    .filter((name) => /(^|_)(model_)?provider($|_)/i.test(String(name || "")));
  if (!providerColumns.length) {
    const totalOutput = Number(String(runSqliteScalarList(sqlitePath, "SELECT COUNT(*) FROM threads;", options) || "0").trim());
    if (Number.isFinite(totalOutput) && totalOutput >= 0) {
      totals.all = totalOutput;
      totals.active = totalOutput;
    }
    return {
      counts,
      activeCounts,
      archivedCounts,
      totals,
      hasProviderMetadata: false,
    };
  }
  const archiveColumns = columnsOutput
    .split(/\r?\n/)
    .map((line) => line.split("|")[1])
    .filter((name) => String(name || "").toLowerCase() === "archived");
  const providerColumn = quoteSqlIdentifier(providerColumns[0]);
  const archiveExpr = archiveColumns.length ? `CAST(COALESCE(${quoteSqlIdentifier(archiveColumns[0])}, 0) AS INTEGER)` : "0";
  const totalOutput = Number(String(runSqliteScalarList(sqlitePath, "SELECT COUNT(*) FROM threads;", options) || "0").trim());
  if (Number.isFinite(totalOutput) && totalOutput >= 0) {
    totals.all = totalOutput;
  }
  const rows = String(
    runSqliteScalarList(
      sqlitePath,
      `SELECT ${archiveExpr} AS archived_flag, TRIM(COALESCE(${providerColumn}, '')) AS provider, COUNT(*) FROM threads GROUP BY archived_flag, provider;`,
      options,
    ) || ""
  ).split(/\r?\n/).filter(Boolean);
  rows.forEach((row) => {
    const columns = row.split("|");
    if (columns.length < 3) return;
    const archiveFlag = String((columns[0] || "").trim());
    const provider = String((columns[1] || "")).trim();
    const count = Number((columns[2] || "0"));
    const activeBucket = archiveFlag === "1" ? "archived" : "active";
    if (!Number.isFinite(count) || count <= 0) return;
    totals[activeBucket] += count;
    if (!provider) {
      totals.missingProvider += count;
      totals[`missingProvider${activeBucket[0].toUpperCase() + activeBucket.slice(1)}`] += count;
      return;
    }
    counts[provider] = (counts[provider] || 0) + count;
    if (activeBucket === "archived") {
      archivedCounts[provider] = (archivedCounts[provider] || 0) + count;
    } else {
      activeCounts[provider] = (activeCounts[provider] || 0) + count;
    }
  });
  return {
    counts,
    activeCounts,
    archivedCounts,
    totals,
    hasProviderMetadata: true,
  };
}

function readSqliteSchemaOverview(sqlitePath, options = {}) {
  if (!sqlitePath) return { available: false, reason: "No SQLite path." };
  try {
    const objects = runSqliteJson(
      sqlitePath,
      "SELECT name, type FROM sqlite_schema WHERE type IN ('table','view','index','trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;",
      options,
    );
    const tables = objects.filter((item) => String(item && item.type || "") === "table").slice(0, 8).map((table) => {
      const name = String(table && table.name || "").trim();
      if (!name) return null;
      const columns = runSqliteJson(sqlitePath, `PRAGMA table_info(${quoteSqlIdentifier(name)});`, options)
        .map((column) => ({
          name: String(column && column.name || "").trim(),
          type: String(column && column.type || "").trim(),
          pk: Number(column && column.pk || 0) > 0,
          notnull: Number(column && column.notnull || 0) > 0,
        }))
        .filter((column) => column.name)
        .slice(0, 16);
      let rowCount = null;
      try {
        const countOutput = String(runSqliteScalarList(sqlitePath, `SELECT COUNT(*) FROM ${quoteSqlIdentifier(name)};`, options) || "").trim();
        const count = Number(countOutput);
        rowCount = Number.isFinite(count) && count >= 0 ? count : null;
      } catch {
        rowCount = null;
      }
      return { name, rowCount, columnCount: columns.length, columns };
    }).filter(Boolean);
    return {
      available: true,
      tableCount: objects.filter((item) => String(item && item.type || "") === "table").length,
      viewCount: objects.filter((item) => String(item && item.type || "") === "view").length,
      indexCount: objects.filter((item) => String(item && item.type || "") === "index").length,
      triggerCount: objects.filter((item) => String(item && item.type || "") === "trigger").length,
      tables,
      truncated: objects.filter((item) => String(item && item.type || "") === "table").length > tables.length,
    };
  } catch (error) {
    return {
      available: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function readSqliteThreadColumns(sqlitePath, options = {}) {
  const tableOutput = String(runSqliteScalarList(sqlitePath, "SELECT name FROM sqlite_schema WHERE type='table' AND name='threads';", options) || "").trim();
  if (!tableOutput) return { hasThreadsTable: false, columns: [] };
  const columnsOutput = String(runSqliteScalarList(sqlitePath, "PRAGMA table_info(threads);", options) || "").trim();
  const columns = columnsOutput
    .split(/\r?\n/)
    .map((line) => line.split("|")[1])
    .filter(Boolean);
  return { hasThreadsTable: true, columns };
}

function parseProviderSyncRows(output) {
  const plannedByProvider = {};
  let plannedRows = 0;
  let plannedActiveRows = 0;
  let plannedArchivedRows = 0;
  String(output || "").split(/\r?\n/).filter(Boolean).forEach((row) => {
    const columns = row.split("|");
    if (columns.length < 3) return;
    const archived = String(columns[0] || "").trim() === "1";
    const provider = String(columns[1] || "").trim() || "(missing)";
    const count = Math.max(0, Number(columns[2] || 0));
    if (!Number.isFinite(count) || count <= 0) return;
    plannedRows += count;
    if (archived) plannedArchivedRows += count;
    else plannedActiveRows += count;
    plannedByProvider[provider] = (plannedByProvider[provider] || 0) + count;
  });
  return { plannedRows, plannedActiveRows, plannedArchivedRows, plannedByProvider };
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function createProviderSyncSqliteBackup(sqlitePath, codexHome, options = {}) {
  if (typeof options.backupCreator === "function") return options.backupCreator(sqlitePath, codexHome);
  const backupRoot = path.join(codexHome || path.dirname(sqlitePath), "backups_state", "provider-sync", backupTimestamp());
  fs.mkdirSync(backupRoot, { recursive: true });
  const copied = [];
  [sqlitePath, `${sqlitePath}-wal`, `${sqlitePath}-shm`].forEach((sourcePath) => {
    if (!sourcePath || !fs.existsSync(sourcePath)) return;
    const targetPath = path.join(backupRoot, path.basename(sourcePath));
    fs.copyFileSync(sourcePath, targetPath);
    copied.push(targetPath);
  });
  return { backupDir: backupRoot, copied };
}

function compareVersionLike(a, b) {
  const left = String(a || "").match(/\d+/g) || [];
  const right = String(b || "").match(/\d+/g) || [];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const delta = Number(right[index] || 0) - Number(left[index] || 0);
    if (delta !== 0) return delta;
  }
  return String(b || "").localeCompare(String(a || ""));
}

function openAiExtensionSearchRoots(options = {}) {
  if (Array.isArray(options.extensionRoots) && options.extensionRoots.length) {
    return options.extensionRoots.map(normalizeWorkspacePath).filter(Boolean);
  }
  const home = normalizeWorkspacePath(options.homeDir || os.homedir());
  return [
    path.join(home, ".vscode-server", "extensions"),
    path.join(home, ".vscode", "extensions"),
    path.join(home, ".cursor-server", "extensions"),
    path.join(home, ".cursor", "extensions"),
  ];
}

function findOpenAiChatGptExtensionCandidates(options = {}) {
  const candidates = [];
  openAiExtensionSearchRoots(options).forEach((root) => {
    let entries = [];
    try {
      entries = fs.readdirSync(root, { withFileTypes: true });
    } catch {
      return;
    }
    entries.forEach((entry) => {
      if (!entry.isDirectory() || !/^openai\.chatgpt-/i.test(entry.name)) return;
      const extensionDir = path.join(root, entry.name);
      const extensionJsPath = path.join(extensionDir, "out", "extension.js");
      if (!fs.existsSync(extensionJsPath)) return;
      let version = entry.name.replace(/^openai\.chatgpt-/i, "");
      let installedTimestamp = 0;
      try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(extensionDir, "package.json"), "utf8"));
        version = String(packageJson.version || version);
        installedTimestamp = Number(packageJson.__metadata && packageJson.__metadata.installedTimestamp || 0);
      } catch {
        // The folder name is enough for sorting when package metadata is missing.
      }
      let mtimeMs = 0;
      try {
        mtimeMs = fs.statSync(extensionJsPath).mtimeMs;
      } catch {
        mtimeMs = 0;
      }
      candidates.push({ extensionDir, extensionJsPath, version, installedTimestamp, mtimeMs });
    });
  });
  return candidates.sort((left, right) => {
    const installedDelta = Number(right.installedTimestamp || 0) - Number(left.installedTimestamp || 0);
    if (installedDelta) return installedDelta;
    const versionDelta = compareVersionLike(left.version, right.version);
    if (versionDelta) return versionDelta;
    return Number(right.mtimeMs || 0) - Number(left.mtimeMs || 0);
  });
}

function parseOpenAiSidebarThreadLimit(content) {
  const matches = Array.from(String(content || "").matchAll(/("thread\/list",\{limit:)(\d+)(,cursor:null,sortKey:"created_at")/g));
  const limits = matches.map((match) => Number(match[2])).filter((value) => Number.isFinite(value));
  return {
    found: matches.length > 0,
    matchCount: matches.length,
    currentLimit: limits.length ? limits[0] : 0,
    limits,
  };
}

function readOpenAiSidebarLimitPatchPreview(options = {}) {
  const targetLimit = Math.min(500, Math.max(1, Number(options.targetLimit || 200)));
  const candidates = findOpenAiChatGptExtensionCandidates(options);
  const base = {
    mode: "openai-sidebar-limit-preview",
    ok: false,
    canApply: false,
    targetLimit,
    candidateCount: candidates.length,
    extensionDir: "",
    extensionJsPath: "",
    currentLimit: 0,
    matchCount: 0,
  };
  if (!candidates.length) {
    return { ...base, message: "No installed OpenAI ChatGPT/Codex VS Code extension was found." };
  }
  const candidate = candidates[0];
  const content = fs.readFileSync(candidate.extensionJsPath, "utf8");
  const parsed = parseOpenAiSidebarThreadLimit(content);
  const next = {
    ...base,
    ok: parsed.found,
    canApply: parsed.found && parsed.currentLimit !== targetLimit,
    extensionDir: candidate.extensionDir,
    extensionJsPath: candidate.extensionJsPath,
    version: candidate.version,
    currentLimit: parsed.currentLimit,
    matchCount: parsed.matchCount,
    limits: parsed.limits,
  };
  if (!parsed.found) {
    return { ...next, message: "OpenAI extension was found, but the sidebar thread/list limit pattern was not recognized." };
  }
  if (parsed.currentLimit === targetLimit) {
    return { ...next, message: `OpenAI sidebar thread limit is already ${targetLimit}.` };
  }
  return {
    ...next,
    message: `OpenAI sidebar currently requests ${parsed.currentLimit} recent thread${parsed.currentLimit === 1 ? "" : "s"}; CMA can patch it to ${targetLimit}.`,
  };
}

function createOpenAiSidebarLimitBackup(extensionJsPath, options = {}) {
  if (typeof options.backupCreator === "function") return options.backupCreator(extensionJsPath);
  const backupRoot = normalizeWorkspacePath(options.backupRoot || path.join(resolveCodexHome(), "backups_state", "openai-sidebar-limit", backupTimestamp()));
  fs.mkdirSync(backupRoot, { recursive: true });
  const backupPath = path.join(backupRoot, "extension.js");
  fs.copyFileSync(extensionJsPath, backupPath);
  return { backupDir: backupRoot, backupPath };
}

function applyOpenAiSidebarLimitPatch(options = {}) {
  const preview = readOpenAiSidebarLimitPatchPreview(options);
  if (!preview.canApply) {
    return { ...preview, mode: "openai-sidebar-limit-apply", applied: false, backupDir: "", backupPath: "" };
  }
  const backup = createOpenAiSidebarLimitBackup(preview.extensionJsPath, options);
  const content = fs.readFileSync(preview.extensionJsPath, "utf8");
  const targetLimit = String(preview.targetLimit);
  let replacementCount = 0;
  const nextContent = content.replace(/("thread\/list",\{limit:)(\d+)(,cursor:null,sortKey:"created_at")/g, (match, prefix, _limit, suffix) => {
    replacementCount += 1;
    return `${prefix}${targetLimit}${suffix}`;
  });
  if (!replacementCount) {
    return {
      ...preview,
      mode: "openai-sidebar-limit-apply",
      applied: false,
      backupDir: backup.backupDir,
      backupPath: backup.backupPath,
      message: "Backup was created, but no matching thread/list limit was found during apply.",
    };
  }
  fs.writeFileSync(preview.extensionJsPath, nextContent, "utf8");
  return {
    ...preview,
    mode: "openai-sidebar-limit-apply",
    ok: true,
    applied: true,
    replacementCount,
    backupDir: backup.backupDir,
    backupPath: backup.backupPath,
    message: `OpenAI sidebar thread limit patched from ${preview.currentLimit} to ${preview.targetLimit}. Reload the VS Code window for the OpenAI extension to pick it up.`,
  };
}

function writeProviderSyncSessionBackup(backupDir, changes) {
  if (!backupDir || !Array.isArray(changes) || !changes.length) return "";
  const manifestPath = path.join(backupDir, "session-meta-backup.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    files: changes.map((change) => ({
      path: change.path,
      originalFirstLine: change.originalFirstLine,
      originalSeparator: change.originalSeparator,
      originalOffset: change.originalOffset,
      originalMtimeMs: change.originalMtimeMs,
      originalProvider: change.originalProvider,
    })),
  }, null, 2)}\n`, "utf8");
  return manifestPath;
}

function restoreProviderSyncSessionChanges(changes) {
  const restoredPaths = [];
  (Array.isArray(changes) ? changes : []).forEach((change) => {
    try {
      const current = readFirstJsonlLine(change.path);
      if (!current) return;
      const stat = fs.statSync(change.path);
      const restSize = Math.max(0, stat.size - Number(current.offset || 0));
      let rest = Buffer.alloc(0);
      if (restSize > 0) {
        const fd = fs.openSync(change.path, "r");
        try {
          rest = Buffer.alloc(restSize);
          fs.readSync(fd, rest, 0, restSize, current.offset);
        } finally {
          fs.closeSync(fd);
        }
      }
      const tmpPath = `${change.path}.provider-sync-restore.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, `${change.originalFirstLine}${change.originalSeparator || ""}`, "utf8");
      if (rest.length) fs.appendFileSync(tmpPath, rest);
      fs.renameSync(tmpPath, change.path);
      restoredPaths.push(change.path);
    } catch {
      // Best effort rollback; the apply result will surface the original error.
    }
  });
  return restoredPaths;
}

function readProviderSyncPreview(options = {}) {
  const codexHome = normalizeWorkspacePath(options.codexHome || resolveCodexHome());
  const configPath = normalizeWorkspacePath(options.configPath || path.join(codexHome || "", "config.toml"));
  const sqlitePath = normalizeWorkspacePath(options.sqlitePath || path.join(codexHome || "", "state_5.sqlite"));
  const current = readCurrentConfigProvider(configPath);
  const targetProvider = String(options.targetProvider || current.provider || "openai").trim() || "openai";
  const sessionPlan = collectProviderSyncSessionChanges(codexHome, targetProvider, options);
  const base = {
    mode: "preview",
    ok: false,
    canApply: false,
    targetProvider,
    currentProvider: current.provider || "openai",
    configPath,
    sqlitePath,
    sqliteExists: Boolean(sqlitePath && fs.existsSync(sqlitePath)),
    plannedRows: 0,
    plannedActiveRows: 0,
    plannedArchivedRows: 0,
    plannedByProvider: {},
    plannedSessionFiles: Number(sessionPlan.plannedFiles || 0),
    scannedSessionFiles: Number(sessionPlan.scannedFiles || 0),
    plannedSessionByProvider: sessionPlan.plannedByProvider || {},
  };
  if (!base.sqliteExists) {
    return {
      ...base,
      ok: true,
      canApply: base.plannedSessionFiles > 0,
      sqliteStatus: "missing",
      message: base.plannedSessionFiles > 0
        ? `Provider sync can update ${base.plannedSessionFiles} rollout session file${base.plannedSessionFiles === 1 ? "" : "s"} to ${targetProvider}. state_5.sqlite was not found.`
        : "state_5.sqlite was not found; there is no Desktop metadata to sync.",
    };
  }
  try {
    fs.accessSync(sqlitePath, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    return {
      ...base,
      sqliteStatus: "unreadable",
      message: `state_5.sqlite is not readable/writable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const hasSqlite = options.sqlite3Available !== undefined ? Boolean(options.sqlite3Available) : sqlite3Available();
  if (!hasSqlite) {
    return { ...base, sqliteStatus: "no_sqlite3", message: "sqlite3 CLI is unavailable; provider sync cannot update SQLite metadata." };
  }
  try {
    const { hasThreadsTable, columns } = readSqliteThreadColumns(sqlitePath, options);
    if (!hasThreadsTable) {
      return { ...base, sqliteStatus: "no_threads_table", message: "state_5.sqlite has no threads table to sync." };
    }
    if (!columns.includes("model_provider")) {
      return { ...base, sqliteStatus: "no_provider_metadata", message: "threads.model_provider is missing; provider sync has no safe target column." };
    }
    const archiveExpr = columns.includes("archived") ? "CAST(COALESCE(archived, 0) AS INTEGER)" : "0";
    const target = quoteSqlLiteral(targetProvider);
    const rows = runSqliteScalarList(
      sqlitePath,
      `SELECT ${archiveExpr} AS archived_flag, TRIM(COALESCE(model_provider, '')) AS provider, COUNT(*) FROM threads WHERE COALESCE(model_provider, '') <> ${target} GROUP BY archived_flag, provider;`,
      options,
    );
    const parsed = parseProviderSyncRows(rows);
    const canApply = parsed.plannedRows > 0 || base.plannedSessionFiles > 0;
    return {
      ...base,
      ok: true,
      canApply,
      sqliteStatus: "readable",
      ...parsed,
      message: canApply
        ? `Provider sync can update ${parsed.plannedRows} SQLite thread row${parsed.plannedRows === 1 ? "" : "s"} and ${base.plannedSessionFiles} rollout session file${base.plannedSessionFiles === 1 ? "" : "s"} to ${targetProvider}.`
        : `SQLite thread metadata is already aligned to ${targetProvider}.`,
    };
  } catch (error) {
    return {
      ...base,
      sqliteStatus: "query_failed",
      error: error instanceof Error ? error.message : String(error),
      message: `Provider sync preview failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function applyProviderSync(options = {}) {
  const preview = readProviderSyncPreview(options);
  if (!preview.canApply) {
    return {
      ...preview,
      mode: "apply",
      applied: false,
      updatedRows: 0,
      backupDir: "",
    };
  }
  const codexHome = normalizeWorkspacePath(options.codexHome || resolveCodexHome());
  const sqlitePath = normalizeWorkspacePath(options.sqlitePath || preview.sqlitePath);
  const sessionPlan = collectProviderSyncSessionChanges(codexHome, preview.targetProvider, options);
  const sessionChanges = Array.isArray(sessionPlan.changes) ? sessionPlan.changes : [];
  let appliedSessionChanges = [];
  try {
    const backup = createProviderSyncSqliteBackup(sqlitePath, codexHome, options);
    const sessionBackupPath = writeProviderSyncSessionBackup(backup.backupDir, sessionChanges);
    const sessionApplyResult = applyProviderSyncSessionChanges(sessionChanges, options);
    const appliedPathSet = new Set(sessionApplyResult.appliedPaths || []);
    appliedSessionChanges = sessionChanges.filter((change) => appliedPathSet.has(change.path));
    let updatedRows = 0;
    if (preview.sqliteExists && preview.plannedRows > 0) {
      const target = quoteSqlLiteral(preview.targetProvider);
      const output = runSqliteWrite(
        sqlitePath,
        [
          "PRAGMA busy_timeout = 5000;",
          "BEGIN IMMEDIATE;",
          `UPDATE threads SET model_provider = ${target} WHERE COALESCE(model_provider, '') <> ${target};`,
          "SELECT changes();",
          "COMMIT;",
        ].join("\n"),
        options,
      );
      updatedRows = String(output || "")
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "")
        .map((line) => Number(line.trim()))
        .filter((value) => Number.isFinite(value))
        .pop() || 0;
    }
    return {
      ...preview,
      mode: "apply",
      ok: true,
      applied: true,
      updatedRows,
      updatedSessionFiles: Number(sessionApplyResult.appliedChanges || 0),
      skippedSessionFiles: Array.isArray(sessionApplyResult.skippedPaths) ? sessionApplyResult.skippedPaths : [],
      backupDir: backup.backupDir || "",
      backupFiles: backup.copied || [],
      sessionBackupPath,
      message: `Provider sync updated ${updatedRows} SQLite thread row${updatedRows === 1 ? "" : "s"} and ${Number(sessionApplyResult.appliedChanges || 0)} rollout session file${Number(sessionApplyResult.appliedChanges || 0) === 1 ? "" : "s"} to ${preview.targetProvider}.`,
    };
  } catch (error) {
    if (appliedSessionChanges.length) restoreProviderSyncSessionChanges(appliedSessionChanges);
    return {
      ...preview,
      mode: "apply",
      ok: false,
      applied: false,
      updatedRows: 0,
      error: error instanceof Error ? error.message : String(error),
      message: `Provider sync failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function providerCountKeys(counts) {
  return Object.keys(counts || {}).filter((key) => Number(counts[key] || 0) > 0).sort((a, b) => a.localeCompare(b));
}

function buildProviderVisibilityMessage(status, mismatch, options = {}) {
  const missingProviderCount = Number(options.missingProviderCount || 0);
  if (status === "missing") return "SQLite unavailable: CMA can still read rollout JSONL sessions, but Codex App/Desktop metadata was not found.";
  if (status === "unreadable") return "SQLite exists but is not readable; CMA remains JSONL-visible, while Desktop metadata could not be checked.";
  if (status === "no_sqlite3") return "SQLite present, provider distribution unavailable: install sqlite3 CLI to compare Desktop metadata.";
  if (status === "query_failed") return "SQLite present, but provider metadata could not be queried safely; CMA remains JSONL-visible.";
  if (status === "no_provider_metadata") return "SQLite readable, but no provider metadata columns were found; CMA remains JSONL-visible.";
  if (missingProviderCount > 0) return "SQLite readable, but some stored threads are missing provider metadata; CMA remains JSONL-visible.";
  if (mismatch) return "CMA visible, Desktop may differ: rollout/config providers do not fully match SQLite provider metadata.";
  return "Aligned: rollout/config provider signals are consistent with readable SQLite metadata.";
}

function sqliteInventoryRole(filename) {
  const name = String(filename || "");
  if (/^state_\d+\.sqlite$/i.test(name)) return "thread_state";
  if (/^logs_\d+\.sqlite$/i.test(name)) return "diagnostic_logs";
  return "sqlite_database";
}

function sqliteInventoryLabel(role) {
  if (role === "thread_state") return "Thread state";
  if (role === "diagnostic_logs") return "Diagnostic logs";
  return "SQLite database";
}

function sqliteInventoryFileKind(filename) {
  const name = String(filename || "");
  const companion = name.match(/^(.+\.(?:sqlite|sqlite3|db))-(wal|shm)$/i);
  if (companion) return companion[2].toLowerCase();
  if (/\.(?:sqlite|sqlite3|db)$/i.test(name)) return "main";
  return "sqlite";
}

function sqliteInventoryCompanionMainName(filename) {
  const match = String(filename || "").match(/^(.+\.(?:sqlite|sqlite3|db))-(wal|shm)$/i);
  return match ? match[1] : "";
}

function isSqliteInventoryMainFile(filename) {
  return /\.(?:sqlite|sqlite3|db)$/i.test(String(filename || ""));
}

function isSqliteInventoryRelatedFile(filename) {
  const name = String(filename || "");
  return isSqliteInventoryMainFile(name) || Boolean(sqliteInventoryCompanionMainName(name));
}

function sqliteInventoryFileLabel(kind) {
  if (kind === "main") return "Main database";
  if (kind === "wal") return "WAL journal";
  if (kind === "shm") return "SHM index";
  return "SQLite file";
}

function fileStatSummary(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return {
      exists: true,
      size: Number(stat.size || 0),
      mtimeMs: Number(stat.mtimeMs || 0),
    };
  } catch {
    return { exists: false, size: 0, mtimeMs: 0 };
  }
}

function readCodexSqliteInventory(codexHome) {
  const root = normalizeWorkspacePath(codexHome || "");
  if (!root || !fs.existsSync(root)) {
    return {
      root,
      databases: [],
      sqliteFiles: [],
      extraFiles: [],
      databaseCount: 0,
      companionCount: 0,
      sqliteFileCount: 0,
      extraFileCount: 0,
      totalBytes: 0,
    };
  }
  let names = [];
  try {
    names = fs.readdirSync(root).filter(isSqliteInventoryRelatedFile);
  } catch {
    names = [];
  }
  const sortSqliteNames = (a, b) => {
    const rank = (name) => (/^state_/i.test(name) ? 0 : (/^logs_/i.test(name) ? 1 : 2));
    return rank(a) - rank(b) || a.localeCompare(b);
  };
  const mainNames = names.filter(isSqliteInventoryMainFile).sort(sortSqliteNames);
  const mainNameSet = new Set(mainNames);
  const attachedFileNames = new Set();
  const sqliteFileSummary = (name, options = {}) => {
    const kind = options.kind || sqliteInventoryFileKind(name);
    const filePath = options.filePath || path.join(root, name);
    return {
      name,
      path: filePath,
      kind,
      label: sqliteInventoryFileLabel(kind),
      attachedTo: options.attachedTo || "",
      ...fileStatSummary(filePath),
    };
  };
  const databases = mainNames.map((name) => {
    const mainPath = path.join(root, name);
    const main = sqliteFileSummary(name, { kind: "main", filePath: mainPath, attachedTo: name });
    const companions = [
      sqliteFileSummary(`${name}-wal`, { kind: "wal", filePath: `${mainPath}-wal`, attachedTo: name }),
      sqliteFileSummary(`${name}-shm`, { kind: "shm", filePath: `${mainPath}-shm`, attachedTo: name }),
    ];
    const role = sqliteInventoryRole(name);
    const files = [main, ...companions.filter((item) => item.exists)];
    files.forEach((item) => attachedFileNames.add(item.name));
    return {
      name,
      path: mainPath,
      role,
      label: sqliteInventoryLabel(role),
      exists: main.exists,
      size: main.size,
      mtimeMs: main.mtimeMs,
      companions,
      files,
      companionCount: companions.filter((item) => item.exists).length,
      totalBytes: main.size + companions.reduce((sum, item) => sum + Number(item.size || 0), 0),
    };
  });
  const extraFiles = names
    .filter((name) => !mainNameSet.has(name) && !attachedFileNames.has(name))
    .sort(sortSqliteNames)
    .map((name) => sqliteFileSummary(name, { attachedTo: sqliteInventoryCompanionMainName(name) }));
  const sqliteFiles = [
    ...databases.flatMap((item) => Array.isArray(item.files) ? item.files : []),
    ...extraFiles,
  ].filter((item) => item && item.exists);
  return {
    root,
    databases,
    sqliteFiles,
    extraFiles,
    databaseCount: databases.length,
    companionCount: databases.reduce((sum, item) => sum + Number(item.companionCount || 0), 0),
    sqliteFileCount: sqliteFiles.length,
    extraFileCount: extraFiles.length,
    totalBytes: sqliteFiles.reduce((sum, item) => sum + Number(item.size || 0), 0),
  };
}

function readProviderVisibilityHealth(options = {}) {
  const codexHome = normalizeWorkspacePath(options.codexHome || resolveCodexHome());
  const configPath = normalizeWorkspacePath(options.configPath || path.join(codexHome || "", "config.toml"));
  const sessionsDir = normalizeWorkspacePath(options.sessionsDir || path.join(codexHome || "", "sessions"));
  const archivedSessionsDir = normalizeWorkspacePath(options.archivedSessionsDir || path.join(path.dirname(sessionsDir || ""), "archived_sessions"));
  const sqlitePath = normalizeWorkspacePath(options.sqlitePath || path.join(codexHome || "", "state_5.sqlite"));
  const current = readCurrentConfigProvider(configPath);
  const rollout = collectRolloutProviderCounts(sessionsDir, { ...options, archivedSessionsDir });
  const sqliteInventory = readCodexSqliteInventory(codexHome);
  const sqliteExists = Boolean(sqlitePath && fs.existsSync(sqlitePath));
  let sqliteReadable = false;
  let sqliteStatus = sqliteExists ? "present" : "missing";
  let sqliteProviderCounts = {};
  let sqliteProviderCountsActive = {};
  let sqliteProviderCountsArchived = {};
  let sqliteProviderTotals = {
    active: 0,
    archived: 0,
    all: 0,
    missingProvider: 0,
    missingProviderActive: 0,
    missingProviderArchived: 0,
  };
  let sqliteError = "";
  let sqliteSchema = { available: false, reason: "state_5.sqlite not readable yet." };
  if (sqliteExists) {
    try {
      fs.accessSync(sqlitePath, fs.constants.R_OK);
      sqliteReadable = true;
    } catch (error) {
      sqliteStatus = "unreadable";
      sqliteError = error instanceof Error ? error.message : String(error);
    }
  }
  if (sqliteReadable) {
    const hasSqlite = options.sqlite3Available !== undefined ? Boolean(options.sqlite3Available) : sqlite3Available();
    if (!hasSqlite) {
      sqliteStatus = "no_sqlite3";
    } else {
      try {
        const sqliteCounts = readSqliteProviderCounts(sqlitePath, options);
        sqliteProviderCounts = sqliteCounts.counts || {};
        sqliteProviderCountsActive = sqliteCounts.activeCounts || {};
        sqliteProviderCountsArchived = sqliteCounts.archivedCounts || {};
        sqliteProviderTotals = sqliteCounts.totals || sqliteProviderTotals;
        sqliteStatus = sqliteCounts.hasProviderMetadata ? "readable" : "no_provider_metadata";
        sqliteSchema = readSqliteSchemaOverview(sqlitePath, options);
      } catch (error) {
        sqliteStatus = "query_failed";
        sqliteError = error instanceof Error ? error.message : String(error);
        sqliteSchema = readSqliteSchemaOverview(sqlitePath, options);
      }
    }
  }
  const rolloutKeys = providerCountKeys(rollout.counts);
  const sqliteKeys = providerCountKeys(sqliteProviderCounts);
  const compareSqlite = sqliteKeys.length > 0;
  const expectedProviders = new Set([current.provider, ...rolloutKeys].filter(Boolean));
  const mismatch = compareSqlite
    ? [...expectedProviders].some((provider) => !sqliteKeys.includes(provider))
    : false;
  const sqliteMissingProviderCount = Math.max(0, Number(sqliteProviderTotals.missingProvider || 0));
  return {
    currentProvider: current.provider || "openai",
    configPath,
    configExists: Boolean(current.exists),
    codexHome,
    sessionsDir,
    rolloutProviderCounts: rollout.counts,
    rolloutProviderCountsActive: rollout.activeCounts,
    rolloutProviderCountsArchived: rollout.archivedCounts,
    rolloutScannedFiles: rollout.scannedFiles,
    rolloutScannedActiveFiles: rollout.scannedActiveFiles,
    rolloutScannedArchivedFiles: rollout.scannedArchivedFiles,
    archivedSessionsDir: rollout.archivedSessionsDir,
    sqlitePath,
    sqliteExists,
    sqliteReadable,
    sqliteProviderCounts,
    sqliteProviderCountsActive,
    sqliteProviderCountsArchived,
    sqliteProviderTotals,
    sqliteMissingProviderCount,
    sqliteStatus,
    sqliteError,
    sqliteSchema,
    sqliteInventory,
    mismatch,
    message: buildProviderVisibilityMessage(sqliteStatus, mismatch, { missingProviderCount: sqliteMissingProviderCount }),
  };
}

module.exports = {
  applyOpenAiSidebarLimitPatch,
  readOpenAiSidebarLimitPatchPreview,
  parseRootModelProviderFromToml,
  readCodexConfigFiles,
  readProviderSyncPreview,
  applyProviderSync,
  readProviderVisibilityHealth,
};
