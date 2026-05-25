const fs = require("fs");
const os = require("os");
const path = require("path");

const IS_WINDOWS = process.platform === "win32";

function safeChmodSync(filePath, mode) {
  try {
    fs.chmodSync(filePath, mode);
    return true;
  } catch {
    return false;
  }
}

function pathCompareKey(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  let resolved = text;
  try {
    resolved = fs.realpathSync(text);
  } catch {
    resolved = path.normalize(text);
  }
  return IS_WINDOWS ? resolved.toLowerCase() : resolved;
}

function executableNames(command) {
  const raw = String(command || "").trim();
  if (!raw) return [];
  const ext = path.extname(raw).toLowerCase();
  if (!IS_WINDOWS || ext) return [raw];
  return [`${raw}.cmd`, `${raw}.exe`, `${raw}.bat`, raw];
}

function executablePathCandidates(command, options = {}) {
  const raw = String(command || "").trim();
  if (!raw) return [];
  const env = options.env || process.env;
  const extraDirs = Array.isArray(options.extraDirs) ? options.extraDirs : [];
  const cwd = String(options.cwd || process.cwd() || "").trim();
  const pathEntries = String(env.PATH || env.Path || env.path || "")
    .split(IS_WINDOWS ? ";" : ":")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const names = executableNames(raw);
  const candidates = [];

  if (path.isAbsolute(raw) || raw.includes("/") || raw.includes("\\")) {
    candidates.push(...names.map((name) => (path.isAbsolute(name) ? name : path.resolve(cwd || process.cwd(), name))));
  }

  for (const dir of extraDirs.concat(pathEntries)) {
    for (const name of names) {
      candidates.push(path.join(dir, name));
    }
  }

  return dedupePaths(candidates);
}

function resolveExecutablePath(command, options = {}) {
  for (const candidate of executablePathCandidates(command, options)) {
    try {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) return candidate;
    } catch {
      // Keep searching.
    }
  }
  return String(command || "").trim();
}

function dedupePaths(values) {
  const seen = new Set();
  const out = [];
  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text) continue;
    const key = pathCompareKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function quotePowerShell(value) {
  return "'" + String(value || "").replace(/'/g, "''") + "'";
}

function quotePosixShell(value) {
  return "'" + String(value || "").replace(/'/g, "'\"'\"'") + "'";
}

function quoteForTerminal(value) {
  return IS_WINDOWS ? quotePowerShell(value) : quotePosixShell(value);
}

function terminalEnvSet(name, value) {
  return IS_WINDOWS
    ? `$env:${name} = ${quotePowerShell(value)}`
    : `export ${name}=${quotePosixShell(value)}`;
}

function managedTerminalOptions(options = {}) {
  const terminalOptions = {
    name: options.name || "Codex-Managed-Agent",
  };
  if (options.cwd) terminalOptions.cwd = options.cwd;
  if (options.env) terminalOptions.env = options.env;
  if (IS_WINDOWS) {
    terminalOptions.shellPath = "powershell.exe";
    terminalOptions.shellArgs = ["-NoLogo"];
  }
  return terminalOptions;
}

function codexResumeCommand(sessionId) {
  return `codex resume ${quoteForTerminal(sessionId)}`;
}

function tailFileCommand(filePath) {
  return IS_WINDOWS
    ? `Get-Content -LiteralPath ${quotePowerShell(filePath)} -Wait`
    : `tail -f ${quotePosixShell(filePath)}`;
}

function isSymlinkPrivilegeError(error) {
  const code = error && typeof error === "object" ? String(error.code || "") : "";
  const message = error instanceof Error ? error.message : String(error || "");
  return code === "EPERM"
    || code === "EACCES"
    || /privilege|symbolic link|symlink|operation not permitted/i.test(message);
}

function atomicCopyFileSync(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true, mode: 0o700 });
  const tmp = `${targetPath}.${process.pid}.${Date.now()}.tmp-copy`;
  try {
    fs.copyFileSync(sourcePath, tmp);
    safeChmodSync(tmp, 0o600);
    fs.renameSync(tmp, targetPath);
  } catch (error) {
    try { fs.rmSync(tmp, { force: true }); } catch {}
    throw error;
  }
}

module.exports = {
  IS_WINDOWS,
  atomicCopyFileSync,
  codexResumeCommand,
  dedupePaths,
  executableNames,
  executablePathCandidates,
  isSymlinkPrivilegeError,
  managedTerminalOptions,
  pathCompareKey,
  quoteForTerminal,
  quotePosixShell,
  quotePowerShell,
  resolveExecutablePath,
  safeChmodSync,
  tailFileCommand,
  terminalEnvSet,
};
