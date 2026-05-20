const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const usageLedger = require("./usage-ledger");
const { httpsGetJson, httpsPostForm, httpsPostJson } = require("./account-http");
const { createAccountUsage } = require("./account-usage");
const {
  atomicCopyFileSync,
  isSymlinkPrivilegeError,
  safeChmodSync,
} = require("./platform-runtime");

const ACCOUNTS_STATE_VERSION = 1;
const ACCOUNTS_STATE_FILENAME = "accounts-state.json";
const VAULT_ROOT_DIR = ".codex-managed-agent";
const VAULT_PROFILES_DIR = "accounts";
const VAULT_BACKUPS_DIR = "backups";
const ACCOUNT_FILE_NAMES = Object.freeze({
  AUTH: "auth.json",
  CONFIG: "config.toml",
  META: "meta.json",
});
const BACKUP_FILE_NAMES = Object.freeze({
  META: "backup-meta.json",
});
const RETRY_SECOND_PER_UNIT = Object.freeze({
  second: 1,
  seconds: 1,
  s: 1,
  minute: 60,
  minutes: 60,
  min: 60,
  mins: 60,
  hour: 3600,
  hours: 3600,
  h: 3600,
  day: 86400,
  days: 86400,
  d: 86400,
});
const ACCOUNT_TOKEN_HEALTH_STATES = Object.freeze([
  "ok",
  "expiring_soon",
  "expired",
  "invalid",
  "refresh_failed",
  "rate_limited",
  "unknown",
]);
const RATE_LIMIT_SIGNAL_PATTERNS = Object.freeze([
  {
    key: "status_429",
    message: "Rate limited (HTTP 429)",
    matcher: /\b429\b|\btoo many requests\b|\brate limit\b|\bratelimit\b/i,
  },
  {
    key: "quota_quota_exhausted",
    message: "Quota exhausted (usage cap reached)",
    matcher: /\bquota\b.*\b(exhausted|exceeded|limit\s*(?:reached|exceeded)?)|\b(credits?|balance)\b.*\b(exhaust(ed|ion)|low|depleted)\b|\b(plan|subscription)\b.*\b(upgrade|purchase|bill|usage)\b|\busage\s+limit\b(?:.*\b(upgrade|plan|reached)\b)?/i,
  },
  {
    key: "auth_retry",
    message: "Rate-limiting retry window detected",
    matcher: /\bretry\s+(?:after|at|in)\b|\btry again (?:in|after)\b/i,
  },
  {
    key: "payment_required",
    message: "Quota or billing block detected",
    matcher: /\b402\b|\bbilling\b|\bsubscription\b|\bupgrade\s+(?:plan|account)\b/i,
  },
]);
const RATE_LIMIT_RETRY_PATTERNS = Object.freeze([
  /\b(?:retry|try again)\s*(?:in|after)?\s*(\d+)\s*(second|seconds|minute|minutes|min|mins|hour|hours|h|day|days|d)\b/i,
]);
const INVALID_CREDENTIAL_SIGNAL_PATTERNS = Object.freeze([
  {
    key: "http_401",
    message: "Invalid credentials (401)",
    matcher: /\b401\b.*\b(unauthorized|forbidden|authentication|credential|token|key|auth|access)\b/i,
  },
  {
    key: "http_403",
    message: "Invalid credentials (403)",
    matcher: /\b403\b.*\b(unauthorized|forbidden|authentication|credential|token|key|auth|access|permission denied)\b/i,
  },
  {
    key: "invalid_token",
    message: "Invalid credentials",
    matcher: /\binvalid\b.*\b(token|api key|credentials?|authorization|authorization header|bearer|jwt)\b|\b(credential|authentication|api key)\b.*\binvalid\b|token expired|token has expired/i,
  },
]);
const ACCOUNT_VAULT_METADATA_VERSION = 1;
const ACCOUNT_BACKUP_METADATA_VERSION = 1;
const CODEX_DEFAULT_USAGE_BASE_URL = "https://chatgpt.com/backend-api/";
const CODEX_OAUTH_REFRESH_URL = "https://auth.openai.com/oauth/token";
const CODEX_OAUTH_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const ACCOUNT_VAULT_SCHEMA = Object.freeze({
  schemaVersion: 1,
  stateFile: ACCOUNTS_STATE_FILENAME,
  layout: {
    rootDir: VAULT_ROOT_DIR,
    profilesDir: VAULT_PROFILES_DIR,
    backupsDir: VAULT_BACKUPS_DIR,
    files: ACCOUNT_FILE_NAMES,
    backupFiles: BACKUP_FILE_NAMES,
  },
  profileMetadata: {
    schemaVersion: ACCOUNT_VAULT_METADATA_VERSION,
    requiredFields: [
      "name",
      "schema_version",
      "createdAt",
      "lastUsedAt",
      "sourceAuthPath",
      "managedAuthPath",
      "managedProfilePath",
      "credentialId",
      "fingerprint",
      "lastActivationAt",
    ],
  },
  backupMetadata: {
    schemaVersion: ACCOUNT_BACKUP_METADATA_VERSION,
    requiredFields: [
      "schema_version",
      "accountName",
      "sourceAuthPath",
      "targetAuthPath",
      "backupPath",
      "createdAt",
      "sourceHash",
    ],
  },
});

function accountsRoot() {
  return path.join(os.homedir(), VAULT_ROOT_DIR, VAULT_PROFILES_DIR);
}

function accountsHome() {
  return path.join(os.homedir(), VAULT_ROOT_DIR);
}

function accountVaultSchema() {
  return ACCOUNT_VAULT_SCHEMA;
}

function resolveAccountsHome() {
  const root = accountsHome();
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  }
  return root;
}

function resolveAccountsStatePath() {
  return path.join(accountsHome(), ACCOUNTS_STATE_FILENAME);
}

function ensureAccountsLayout() {
  const root = accountsRoot();
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
}

function accountDir(name) {
  return path.join(accountsRoot(), name);
}

function accountAuthPath(name) {
  return path.join(accountDir(name), ACCOUNT_FILE_NAMES.AUTH);
}

function accountConfigPath(name) {
  return path.join(accountDir(name), ACCOUNT_FILE_NAMES.CONFIG);
}

function accountMetaPath(name) {
  return path.join(accountDir(name), ACCOUNT_FILE_NAMES.META);
}

function accountBackupsPath(name) {
  return path.join(accountDir(name), VAULT_BACKUPS_DIR);
}

function accountBackupMetadataPath(name, backupFileName) {
  return path.join(accountBackupsPath(name), backupFileName || BACKUP_FILE_NAMES.META);
}

function buildProfileMetadataTemplate(name, overrides = {}) {
  const now = new Date().toISOString();
  return {
    schema_version: ACCOUNT_VAULT_METADATA_VERSION,
    name,
    createdAt: typeof overrides.createdAt === "string" ? overrides.createdAt : now,
    lastUsedAt: typeof overrides.lastUsedAt === "string" ? overrides.lastUsedAt : now,
    sourceAuthPath: overrides.sourceAuthPath || null,
    managedAuthPath: overrides.managedAuthPath || accountAuthPath(name),
    managedProfilePath: overrides.managedProfilePath || accountDir(name),
    credentialId: overrides.credentialId || null,
    fingerprint: overrides.fingerprint || null,
    lastActivationAt: overrides.lastActivationAt || null,
    tokenHealth: overrides.tokenHealth || "unknown",
    lastActivationStatus: overrides.lastActivationStatus || "not_attempted",
  };
}

function buildBackupMetadataTemplate(options = {}) {
  const now = new Date().toISOString();
  return {
    schema_version: ACCOUNT_BACKUP_METADATA_VERSION,
    accountName: options.accountName || "",
    sourceAuthPath: options.sourceAuthPath || null,
    sourceHash: options.sourceHash || null,
    targetAuthPath: options.targetAuthPath || null,
    backupPath: options.backupPath || null,
    createdAt: now,
    status: options.status || "pending",
    note: options.note || null,
  };
}

function normalizeAuthPath(rawPath) {
  if (!rawPath || typeof rawPath !== "string") return null;
  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  let normalized = trimmed;
  if (normalized === "~") {
    normalized = os.homedir();
  } else if (normalized.startsWith("~/") || normalized.startsWith("~\\")) {
    normalized = path.join(os.homedir(), normalized.slice(2));
  }

  normalized = path.normalize(normalized);
  if (!path.isAbsolute(normalized)) {
    normalized = path.resolve(normalized);
  }

  try {
    normalized = fs.realpathSync(normalized);
  } catch {
    // keep the resolved absolute path when realpath fails (file may not exist yet).
  }

  if (os.platform() === "win32") {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

function validateAccountName(name) {
  return /^[A-Za-z0-9._-]+$/.test(name);
}

function sanitizeAccountNameSegment(value) {
  const segment = String(value || "")
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return segment || "profile";
}

function createEmptyState() {
  return {
    version: ACCOUNTS_STATE_VERSION,
    accounts: [],
    currentIndex: null,
    preferredAccountName: null,
    lastSuccessfulAccount: null,
    retryAvailabilityByAccount: {},
    ignoredBackupSourcePaths: [],
    updatedAt: new Date().toISOString(),
  };
}

function loadAccountsState() {
  const statePath = resolveAccountsStatePath();
  if (!fs.existsSync(statePath)) {
    return createEmptyState();
  }
  try {
    const raw = fs.readFileSync(statePath, "utf8");
    const state = JSON.parse(raw);
    if (!state || typeof state !== "object") return createEmptyState();
    const version = Number(state.version) || 0;
    if (version !== ACCOUNTS_STATE_VERSION) return createEmptyState();
    const accounts = Array.isArray(state.accounts) ? state.accounts : [];
    const hasStoredCurrentIndex = Object.prototype.hasOwnProperty.call(state, "currentIndex");
    const currentIndex =
      typeof state.currentIndex === "number" && state.currentIndex >= 0 && state.currentIndex < accounts.length
        ? state.currentIndex
        : (hasStoredCurrentIndex ? null : (accounts.length > 0 ? 0 : null));
    return {
      version: ACCOUNTS_STATE_VERSION,
      accounts,
      currentIndex,
      preferredAccountName:
        state.preferredAccountName && accounts.includes(state.preferredAccountName)
          ? state.preferredAccountName
          : (currentIndex !== null ? accounts[currentIndex] : null),
      lastSuccessfulAccount:
        state.lastSuccessfulAccount && accounts.includes(state.lastSuccessfulAccount)
          ? state.lastSuccessfulAccount
          : null,
      retryAvailabilityByAccount: typeof state.retryAvailabilityByAccount === "object" && state.retryAvailabilityByAccount
        ? Object.fromEntries(
            Object.entries(state.retryAvailabilityByAccount).filter(([account]) => accounts.includes(account))
          )
        : {},
      ignoredBackupSourcePaths: Array.isArray(state.ignoredBackupSourcePaths)
        ? state.ignoredBackupSourcePaths.map(normalizeAuthPath).filter(Boolean)
        : [],
      updatedAt: state.updatedAt || new Date().toISOString(),
    };
  } catch {
    return createEmptyState();
  }
}

function saveAccountsState(state) {
  const statePath = resolveAccountsStatePath();
  const updated = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  const tmp = statePath + "." + process.pid + "." + Date.now() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(updated, null, 2), "utf8");
  fs.renameSync(tmp, statePath);
}

function writeMeta(accountName, overrides = {}) {
  const overridesValue = overrides && typeof overrides === "object" ? overrides : {};
  const metaPath = accountMetaPath(accountName);
  const now = new Date().toISOString();
  const auth = readAccountAuth(accountName);
  const existingMeta = readMeta(accountName) || {};
  const sourceAuthPath = typeof overridesValue.sourceAuthPath === "string" && overridesValue.sourceAuthPath
    ? overridesValue.sourceAuthPath
    : accountAuthPath(accountName);
  const managedAuthPath = typeof overridesValue.managedAuthPath === "string" && overridesValue.managedAuthPath
    ? overridesValue.managedAuthPath
    : accountAuthPath(accountName);
  const managedProfilePath = typeof overridesValue.managedProfilePath === "string" && overridesValue.managedProfilePath
    ? overridesValue.managedProfilePath
    : accountDir(accountName);
  const merged = Object.assign({}, buildProfileMetadataTemplate(accountName, {
    sourceAuthPath,
    managedAuthPath,
    managedProfilePath,
    credentialId: getCredentialIdFromAuth(auth) || existingMeta.credentialId || null,
    fingerprint: getAccountFingerprint(sourceAuthPath, auth) || existingMeta.fingerprint || null,
    createdAt: existingMeta.createdAt || null,
    tokenHealth: existingMeta.tokenHealth || "unknown",
    lastActivationAt: existingMeta.lastActivationAt || null,
    lastActivationStatus: existingMeta.lastActivationStatus || "not_attempted",
  }), existingMeta, overridesValue, {
    lastUsedAt: now,
    sourceAuthPath,
    managedAuthPath,
    managedProfilePath,
  });
  merged.createdAt = merged.createdAt || now;
  const meta = merged;
  const tmp = metaPath + "." + process.pid + "." + Date.now() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(meta, null, 2), "utf8");
  fs.renameSync(tmp, metaPath);
}

function writeBackupMetadata(accountName, backupFileName, options = {}) {
  const optionsValue = options && typeof options === "object" ? options : {};
  const backupDir = accountBackupsPath(accountName);
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

  const backupPath = typeof optionsValue.backupPath === "string" ? optionsValue.backupPath : null;
  const metadata = buildBackupMetadataTemplate({
    accountName: typeof optionsValue.accountName === "string" ? optionsValue.accountName : accountName,
    sourceAuthPath: typeof optionsValue.sourceAuthPath === "string" ? optionsValue.sourceAuthPath : null,
    sourceHash: typeof optionsValue.sourceHash === "string" ? optionsValue.sourceHash : null,
    targetAuthPath: typeof optionsValue.targetAuthPath === "string" ? optionsValue.targetAuthPath : null,
    backupPath,
    status: typeof optionsValue.status === "string" ? optionsValue.status : "pending",
    note: optionsValue.note || null,
  });
  if (typeof optionsValue.createdAt === "string") metadata.createdAt = optionsValue.createdAt;
  if (typeof optionsValue.note === "string" && optionsValue.note.trim()) metadata.note = optionsValue.note.trim();
  if (typeof optionsValue.status === "string") metadata.status = optionsValue.status;

  const finalMetadata = Object.assign({}, metadata, optionsValue, {
    accountName: metadata.accountName,
    sourceAuthPath: metadata.sourceAuthPath,
    sourceHash: metadata.sourceHash,
    targetAuthPath: metadata.targetAuthPath,
    backupPath: metadata.backupPath,
    createdAt: metadata.createdAt,
    status: metadata.status,
    note: metadata.note,
  });

  const metadataPath = accountBackupMetadataPath(accountName, backupFileName);
  const tmp = metadataPath + "." + process.pid + "." + Date.now() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(finalMetadata, null, 2), "utf8");
  safeChmodSync(tmp, 0o600);
  fs.renameSync(tmp, metadataPath);
  return {
    backupMetadataPath: metadataPath,
    backupPath,
  };
}

function readMeta(accountName) {
  const metaPath = accountMetaPath(accountName);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch {
    return null;
  }
}

function getAccountTypeFromAuth(auth) {
  if (!auth || typeof auth !== "object") return "unknown";
  if (auth.tokens && auth.tokens.access_token) return "official";
  if (auth.OPENAI_API_KEY && typeof auth.OPENAI_API_KEY === "string" && auth.OPENAI_API_KEY.startsWith("sk-")) return "relay";
  return "unknown";
}

function readAccountAuth(name) {
  const authPath = accountAuthPath(name);
  if (!fs.existsSync(authPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(authPath, "utf8"));
  } catch {
    return null;
  }
}

function getAccountType(name) {
  const auth = readAccountAuth(name);
  return getAccountTypeFromAuth(auth);
}

function discoverBackupAuthSources(options = {}) {
  const backupRoot = normalizeAuthPath(options.backupRoot || path.join(os.homedir(), ".codex", "backup"));
  if (!backupRoot || !fs.existsSync(backupRoot)) return [];
  const results = [];
  const seen = new Set();
  function visit(dir, depth) {
    if (depth < 0) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const authPath = path.join(dir, ACCOUNT_FILE_NAMES.AUTH);
    if (fs.existsSync(authPath)) {
      const normalizedAuthPath = normalizeAuthPath(authPath);
      if (normalizedAuthPath && !seen.has(normalizedAuthPath)) {
        seen.add(normalizedAuthPath);
        const configPath = path.join(dir, ACCOUNT_FILE_NAMES.CONFIG);
        results.push({
          authPath: normalizedAuthPath,
          configTomlPath: fs.existsSync(configPath) ? configPath : null,
          backupRoot,
          label: path.basename(dir) || "backup",
        });
      }
    }
    entries
      .filter((entry) => entry.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((entry) => visit(path.join(dir, entry.name), depth - 1));
  }
  visit(backupRoot, Number.isFinite(Number(options.depth)) ? Number(options.depth) : 2);
  return results.sort((a, b) => a.authPath.localeCompare(b.authPath));
}

function findAccountNameBySourcePath(state, sourceAuthPath) {
  const normalizedSource = normalizeAuthPath(sourceAuthPath);
  if (!normalizedSource) return null;
  for (const name of state.accounts || []) {
    const meta = readMeta(name) || {};
    const metaSource = normalizeAuthPath(meta.sourceAuthPath || "");
    const discoveredSource = normalizeAuthPath(meta.discoveredBackupSourcePath || "");
    if (metaSource === normalizedSource || discoveredSource === normalizedSource) return name;
  }
  return null;
}

function findAccountNameByAuthChecksum(state, authPath) {
  const sourceHash = computeFileChecksum(authPath);
  if (!sourceHash) return null;
  for (const name of state.accounts || []) {
    const accountHash = computeFileChecksum(accountAuthPath(name));
    if (accountHash && accountHash === sourceHash) return name;
  }
  return null;
}

function uniqueAccountName(baseName, state) {
  const base = sanitizeAccountNameSegment(baseName);
  if (!state.accounts.includes(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = base + "-" + String(index);
    if (!state.accounts.includes(candidate)) return candidate;
  }
  return base + "-" + Date.now();
}

function refreshBackupCandidateFiles(name, source) {
  const authSource = normalizeAuthPath(source && source.authPath);
  if (!authSource || !fs.existsSync(authSource)) return false;
  const dir = accountDir(name);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const authDest = accountAuthPath(name);
  fs.copyFileSync(authSource, authDest);
  safeChmodSync(authDest, 0o600);
  const configSource = source.configTomlPath ? normalizeAuthPath(source.configTomlPath) : null;
  if (configSource && fs.existsSync(configSource)) {
    const configDest = accountConfigPath(name);
    fs.copyFileSync(configSource, configDest);
    safeChmodSync(configDest, 0o600);
  }
  const existingMeta = readMeta(name) || {};
  writeMeta(name, {
    sourceAuthPath: authSource,
    managedAuthPath: authDest,
    managedProfilePath: dir,
    origin: "codex-backup",
    sourceKind: "backup",
    activationMode: "manual",
    backupCandidate: true,
    discoveredFrom: source.backupRoot || path.dirname(authSource),
    discoveredBackupSourcePath: authSource,
    lastActivationStatus: existingMeta.lastActivationStatus || "not_activated",
    type: getAccountType(name),
  });
  return true;
}

function syncBackupAccounts(options = {}) {
  const sources = discoverBackupAuthSources(options);
  if (!sources.length) return { ok: true, imported: [], refreshed: [] };
  ensureAccountsLayout();
  let state = loadAccountsState();
  const ignoredSources = new Set((state.ignoredBackupSourcePaths || []).map(normalizeAuthPath).filter(Boolean));
  const imported = [];
  const refreshed = [];
  sources.forEach((source, index) => {
    const normalizedSourcePath = normalizeAuthPath(source.authPath);
    if (normalizedSourcePath && ignoredSources.has(normalizedSourcePath)) return;
    const parsed = validateImportedAuthJson(source.authPath);
    if (!parsed.ok) return;
    const existingName = findAccountNameBySourcePath(state, source.authPath);
    if (existingName) {
      if (refreshBackupCandidateFiles(existingName, source)) refreshed.push(existingName);
      return;
    }
    const baseName = index === 0 && path.basename(path.dirname(source.authPath)) === "backup"
      ? "backup"
      : "backup-" + sanitizeAccountNameSegment(source.label || path.basename(path.dirname(source.authPath)));
    const name = uniqueAccountName(baseName, state);
    const result = addAccount(name, {
      authPath: source.authPath,
      configTomlPath: source.configTomlPath,
      sourceAuthPath: source.authPath,
      selectAsCurrent: false,
      meta: {
        origin: "codex-backup",
        sourceKind: "backup",
        activationMode: "manual",
        backupCandidate: true,
        discoveredFrom: source.backupRoot,
        discoveredBackupSourcePath: source.authPath,
        lastActivationStatus: "not_activated",
      },
    });
    if (result.ok) {
      imported.push(name);
      state = loadAccountsState();
    }
  });
  return { ok: true, imported, refreshed };
}

function syncCurrentCodexAuth(options = {}) {
  const codexHome = options.codexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const authPath = normalizeAuthPath(path.join(codexHome, ACCOUNT_FILE_NAMES.AUTH));
  if (!authPath || !fs.existsSync(authPath)) return { ok: true, skipped: true, reason: "No current Codex auth found." };
  const parsed = validateImportedAuthJson(authPath);
  if (!parsed.ok) return { ok: true, skipped: true, reason: parsed.error };

  ensureAccountsLayout();
  let state = loadAccountsState();
  const existingBySource = findAccountNameBySourcePath(state, authPath);
  if (existingBySource) return { ok: true, skipped: true, existingName: existingBySource };
  const existingByHash = findAccountNameByAuthChecksum(state, authPath);
  if (existingByHash) return { ok: true, skipped: true, existingName: existingByHash };

  const configPath = path.join(codexHome, ACCOUNT_FILE_NAMES.CONFIG);
  const name = uniqueAccountName("codex-current", state);
  const result = adoptCurrentCodexAuthAsProfile(name, authPath, {
    codexHome,
    configTomlPath: fs.existsSync(configPath) ? configPath : undefined,
  });
  return result.ok
    ? { ok: true, imported: [name] }
    : result;
}

function adoptCurrentCodexAuthAsProfile(name, authPath, options = {}) {
  if (!validateAccountName(name)) {
    return { ok: false, error: 'Invalid account name. Use letters, digits, ".", "_", or "-".' };
  }
  const normalizedAuthPath = normalizeAuthPath(authPath);
  if (!normalizedAuthPath || !fs.existsSync(normalizedAuthPath)) {
    return { ok: false, error: "Current auth file not found." };
  }
  ensureAccountsLayout();
  const state = loadAccountsState();
  if (state.accounts.includes(name)) {
    return { ok: false, error: 'Account "' + name + '" already exists.' };
  }

  const dir = accountDir(name);
  const authDest = accountAuthPath(name);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  try {
    fs.renameSync(normalizedAuthPath, authDest);
    safeChmodSync(authDest, 0o600);
    const linkResult = linkAccountAuthIntoCodexHome(name, authDest, options.codexHome || path.dirname(normalizedAuthPath));
    if (!linkResult.ok) return linkResult;

    const configDest = accountConfigPath(name);
    if (!fs.existsSync(configDest)) {
      fs.writeFileSync(configDest, 'cli_auth_credentials_store = "file"\n', "utf8");
      safeChmodSync(configDest, 0o600);
    }

    const auth = readAccountAuth(name);
    const accountType = getAccountTypeFromAuth(auth);
    writeMeta(name, {
      sourceAuthPath: authDest,
      managedAuthPath: authDest,
      managedProfilePath: dir,
      type: accountType,
      origin: "codex-current",
      sourceKind: "current",
      activationMode: linkResult.method || "symlink",
      backupCandidate: false,
      discoveredFrom: options.codexHome || path.dirname(normalizedAuthPath),
      fingerprint: getAccountFingerprint(authDest, auth),
    });

    saveAccountsState({
      ...state,
      accounts: state.accounts.concat([name]),
      currentIndex: state.currentIndex,
      preferredAccountName: state.preferredAccountName,
    });
    return { ok: true, type: accountType };
  } catch (error) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function listAccounts() {
  const state = loadAccountsState();
  const root = accountsRoot();
  return (state.accounts || []).map(function (name) {
    const dir = path.join(root, name);
    return {
      name,
      hasAuth: fs.existsSync(path.join(dir, "auth.json")),
      hasConfig: fs.existsSync(path.join(dir, "config.toml")),
      hasMeta: fs.existsSync(path.join(dir, "meta.json")),
      type: getAccountType(name),
    };
  });
}

function getCurrentAccount() {
  const state = loadAccountsState();
  if (state.currentIndex !== null && state.currentIndex >= 0 && state.currentIndex < state.accounts.length) {
    return state.accounts[state.currentIndex];
  }
  return null;
}

function addAccount(name, options = {}) {
  if (!validateAccountName(name)) {
    return { ok: false, error: 'Invalid account name. Use letters, digits, ".", "_", or "-".' };
  }

  ensureAccountsLayout();
  const state = loadAccountsState();

  if (state.accounts.includes(name)) {
    return { ok: false, error: 'Account "' + name + '" already exists.' };
  }

  const dir = accountDir(name);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  try {
    // Copy auth.json from source
    const sourceHome = options.codexHome ? normalizeAuthPath(options.codexHome) : null;
    const authSource = options.authPath ? normalizeAuthPath(options.authPath)
      : (sourceHome ? path.join(sourceHome, ACCOUNT_FILE_NAMES.AUTH) : null);
    if (authSource && fs.existsSync(authSource)) {
      const authDest = accountAuthPath(name);
      fs.copyFileSync(authSource, authDest);
      safeChmodSync(authDest, 0o600);
    }

    // Detect account type from imported auth
    const auth = readAccountAuth(name);
    const accountType = getAccountTypeFromAuth(auth);

    // Write config.toml
    // If a configTomlPath is provided (relay accounts), copy it
    // Otherwise write a minimal config ensuring cli_auth_credentials_store = "file"
    const configDest = accountConfigPath(name);
    const configSource = options.configTomlPath ? normalizeAuthPath(options.configTomlPath)
      : (sourceHome ? path.join(sourceHome, ACCOUNT_FILE_NAMES.CONFIG) : null);
    if (configSource && fs.existsSync(configSource)) {
      fs.copyFileSync(configSource, configDest);
      safeChmodSync(configDest, 0o600);
    } else {
      const configContent = 'cli_auth_credentials_store = "file"\n';
      fs.writeFileSync(configDest, configContent, "utf8");
    }

    // Write meta.json with account type
    const metaSource = authSource ? authSource : accountAuthPath(name);
    const metaAuthPath = accountAuthPath(name);
    const metadataOverrides = options.meta && typeof options.meta === "object" ? options.meta : {};
    writeMeta(name, Object.assign({}, metadataOverrides, {
      sourceAuthPath: metaSource,
      managedAuthPath: metaAuthPath,
      managedProfilePath: dir,
      type: accountType,
      fingerprint: getAccountFingerprint(metaAuthPath, readAccountAuth(name)),
    }));

    // Update state
    const nextAccounts = state.accounts.concat([name]);
    const shouldSelectAsCurrent = options.selectAsCurrent !== false && state.accounts.length === 0;
    const nextIndex = shouldSelectAsCurrent ? 0 : state.currentIndex;
    const nextPreferred = shouldSelectAsCurrent ? name : state.preferredAccountName;

    saveAccountsState({
      ...state,
      accounts: nextAccounts,
      currentIndex: nextIndex,
      preferredAccountName: nextPreferred,
    });

    return { ok: true, type: accountType };
  } catch (error) {
    // Clean up on failure
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {}
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function removeAccount(name) {
  const state = loadAccountsState();
  if (!state.accounts.includes(name)) {
    return { ok: false, error: 'Account "' + name + '" not found.' };
  }
  const meta = readMeta(name) || {};
  const backupSourcePath = meta.backupCandidate || meta.origin === "codex-backup"
    ? normalizeAuthPath(meta.discoveredBackupSourcePath || meta.sourceAuthPath || "")
    : null;

  // Remove directory
  const dir = accountDir(name);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {}

  // Update state
  const nextAccounts = state.accounts.filter(function (a) { return a !== name; });
  const removedIndex = state.accounts.indexOf(name);
  let nextIndex = state.currentIndex;
  if (nextAccounts.length === 0) {
    nextIndex = null;
  } else if (removedIndex !== -1 && nextIndex !== null && nextIndex > removedIndex) {
    nextIndex -= 1;
  } else if (removedIndex !== -1 && nextIndex !== null && nextIndex === removedIndex) {
    nextIndex = Math.min(removedIndex, nextAccounts.length - 1);
  }

  const retryByAccount = {};
  Object.keys(state.retryAvailabilityByAccount || {}).forEach(function (key) {
    if (key !== name && nextAccounts.includes(key)) {
      retryByAccount[key] = state.retryAvailabilityByAccount[key];
    }
  });
  const ignoredBackupSourcePaths = Array.from(new Set([].concat(
    state.ignoredBackupSourcePaths || [],
    backupSourcePath ? [backupSourcePath] : [],
  ).map(normalizeAuthPath).filter(Boolean)));

  saveAccountsState({
    ...state,
    accounts: nextAccounts,
    currentIndex: nextIndex,
    preferredAccountName:
      state.preferredAccountName === name
        ? (nextAccounts[0] || null)
        : state.preferredAccountName,
    lastSuccessfulAccount:
      state.lastSuccessfulAccount === name ? null : state.lastSuccessfulAccount,
    retryAvailabilityByAccount: retryByAccount,
    ignoredBackupSourcePaths,
  });

  return { ok: true };
}

function setCurrentAccount(name) {
  const state = loadAccountsState();
  const idx = state.accounts.indexOf(name);
  if (idx === -1) {
    return { ok: false, error: 'Account "' + name + '" not found.' };
  }

  saveAccountsState({
    ...state,
    currentIndex: idx,
    preferredAccountName: name,
  });

  // Update meta.json lastUsedAt
  try {
    writeMeta(name);
  } catch {}

  return { ok: true };
}

function bootstrapDefaultAccount(codexHome) {
  const state = loadAccountsState();
  if (state.accounts.length > 0) return { ok: true, skipped: true };

  const sourceHome = codexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const authSource = path.join(sourceHome, ACCOUNT_FILE_NAMES.AUTH);
  if (!fs.existsSync(authSource)) {
    return { ok: true, skipped: true, reason: "No auth.json found at " + authSource };
  }
  return importCurrentAuthAsProfile("default", { codexHome: sourceHome });
}

function importCurrentAuthAsProfile(name, options = {}) {
  if (!validateAccountName(name)) {
    return { ok: false, error: 'Invalid account name. Use letters, digits, ".", "_", or "-".' };
  }

  const sourceHome = options.codexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const normalizedHome = normalizeAuthPath(sourceHome) || sourceHome;
  const authSource = path.join(normalizedHome, ACCOUNT_FILE_NAMES.AUTH);

  if (!fs.existsSync(authSource)) {
    return { ok: false, error: `No auth.json found at ${authSource}` };
  }

  const configSource = path.join(normalizedHome, ACCOUNT_FILE_NAMES.CONFIG);
  const importOptions = {
    authPath: authSource,
    sourceAuthPath: authSource,
  };
  if (fs.existsSync(configSource)) {
    importOptions.configTomlPath = configSource;
  }

  return addAccount(name, importOptions);
}

function validateImportedAuthJson(authPath) {
  try {
    const raw = fs.readFileSync(authPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {
        ok: false,
        error: `Auth file at ${authPath} is not a valid object`,
      };
    }
    return { ok: true, auth: parsed };
  } catch (error) {
    return {
      ok: false,
      error: `Failed to parse auth file at ${authPath}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function importAuthFileAsProfile(name, options = {}) {
  if (!validateAccountName(name)) {
    return { ok: false, error: 'Invalid account name. Use letters, digits, ".", "_", or "-".' };
  }

  if (!options || typeof options !== "object") {
    return { ok: false, error: "Auth file path is required." };
  }

  const authSource = normalizeAuthPath(options.authPath);
  if (!authSource) {
    return { ok: false, error: "Auth file path is required." };
  }
  if (!fs.existsSync(authSource)) {
    return { ok: false, error: `Auth file not found: ${authSource}` };
  }

  const parsed = validateImportedAuthJson(authSource);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const importOptions = {
    authPath: authSource,
    sourceAuthPath: authSource,
  };

  const configSource = options.configTomlPath ? normalizeAuthPath(options.configTomlPath) : null;
  if (configSource && !fs.existsSync(configSource)) {
    return { ok: false, error: `Config file not found: ${configSource}` };
  }
  if (configSource) {
    importOptions.configTomlPath = configSource;
  }

  return addAccount(name, importOptions);
}

function prepareAccountLogin(name) {
  const state = loadAccountsState();
  if (!state.accounts.includes(name)) {
    return { ok: false, error: 'Account "' + name + '" not found.' };
  }
  const dir = accountDir(name);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });

  const configPath = accountConfigPath(name);
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, 'cli_auth_credentials_store = "file"\n', "utf8");
    safeChmodSync(configPath, 0o600);
  }

  const authPath = accountAuthPath(name);
  writeMeta(name, {
    sourceAuthPath: authPath,
    managedAuthPath: authPath,
    managedProfilePath: dir,
    origin: "codex-login",
    sourceKind: "managed-login",
    backupCandidate: false,
    lastLoginStatus: "started",
    lastLoginAt: new Date().toISOString(),
  });

  return {
    ok: true,
    accountName: name,
    codexHome: dir,
    authPath,
    configPath,
  };
}

async function activateAccountForCodex(name, codexHome) {
  const state = loadAccountsState();
  if (!state.accounts.includes(name)) {
    return { ok: false, error: 'Account "' + name + '" not found.' };
  }

  const targetHome = codexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");

  // Before activating, try refresh if a refresh token exists.
  try {
    const authForRefresh = readAccountAuth(name);
    if (authForRefresh && authForRefresh.tokens && authForRefresh.tokens.refresh_token) {
      const refreshResult = await refreshAccountToken(name);
      if (!refreshResult.ok && !refreshResult.skipped) {
        const currentTokenInfo = getTokenInfo(authForRefresh);
        if (currentTokenInfo && currentTokenInfo.status !== "expired") {
          try {
            writeMeta(name, {
              tokenHealth: "refresh_failed",
              lastActivationStatus: "activation_with_refresh_warning",
              lastActivationError: refreshResult.error || "refresh failed",
              lastActivationHint: "Activated with the current access token, but this account needs Login before the token expires.",
              lastActivationAt: new Date().toISOString(),
            });
          } catch {}
        } else {
        const refreshFailureHint = [
          "Try re-login in official Codex and then re-import this profile,",
          "or switch to a different profile that has a working auth file.",
        ].join(" ");
        const invalidSignal = detectInvalidCredentialSignal(refreshResult.error);
        if (invalidSignal) {
          try {
            writeMeta(name, {
              tokenHealth: "invalid",
              lastActivationStatus: "failed",
              lastActivationError: invalidSignal.message,
              lastActivationHint: refreshFailureHint,
              lastActivationAt: new Date().toISOString(),
            });
          } catch {}
          return {
            ok: false,
            error: "Failed to refresh token before activation: " + (refreshResult.error || "unknown error"),
            recommendation: refreshFailureHint,
          };
        }
        try {
          writeMeta(name, {
            tokenHealth: "refresh_failed",
            lastActivationStatus: "failed",
            lastActivationError: refreshResult.error || "unknown refresh error",
            lastActivationHint: refreshFailureHint,
            lastActivationAt: new Date().toISOString(),
          });
        } catch {}
        return {
          ok: false,
          error: "Failed to refresh token before activation: " + (refreshResult.error || "unknown error"),
          recommendation: refreshFailureHint,
        };
        }
        }
        if (refreshResult.ok && !refreshResult.skipped) {
          try {
            writeMeta(name, {
              tokenHealth: "ok",
            lastActivationStatus: "refresh_succeeded",
            lastActivationError: null,
            lastActivationHint: null,
          });
        } catch {}
      }
    }
  } catch {}

  // Link auth.json globally so every new default `codex` process follows the selected account.
  const sourceAuth = accountAuthPath(name);
  if (!fs.existsSync(sourceAuth)) {
    return { ok: false, error: 'No auth.json for account "' + name + '".' };
  }

  const linkResult = linkAccountAuthIntoCodexHome(name, sourceAuth, targetHome);
  if (!linkResult.ok) return linkResult;

  // Update state
  const idx = state.accounts.indexOf(name);
  saveAccountsState({
    ...state,
    currentIndex: idx >= 0 ? idx : state.currentIndex,
    preferredAccountName: name,
    lastSuccessfulAccount: name,
  });

  const activationMethod = linkResult.method || "symlink";
  try {
    writeMeta(name, {
      activationMode: activationMethod,
      lastActivationStatus: activationMethod === "copy" ? "copied" : "symlinked",
      lastActivationAt: new Date().toISOString(),
      lastActivationError: null,
      lastActivationHint: activationMethod === "copy"
        ? "Global ~/.codex/auth.json was copied from this account auth because symlink activation is unavailable on this system."
        : "Global ~/.codex/auth.json points to this account auth. New terminal codex processes use this account.",
    });
  } catch {}
  try { writeActiveProfileMarker(name); } catch {}

  return { ok: true, method: activationMethod, targetAuthPath: linkResult.targetAuthPath, sourceAuthPath: sourceAuth };
}

function linkAccountAuthIntoCodexHome(name, sourceAuth, targetHome) {
  try {
    fs.mkdirSync(targetHome, { recursive: true, mode: 0o700 });
    const targetAuth = path.join(targetHome, "auth.json");
    const normalizedSource = normalizeAuthPath(sourceAuth);
    const normalizedTarget = normalizeAuthPath(targetAuth) || targetAuth;
    if (!normalizedSource || !fs.existsSync(normalizedSource)) {
      return { ok: false, error: 'No auth.json for account "' + name + '".' };
    }

    let existingStat = null;
    try { existingStat = fs.lstatSync(targetAuth); } catch {}
    if (existingStat) {
      if (existingStat.isSymbolicLink()) {
        const resolved = fs.realpathSync(targetAuth);
        if (normalizeAuthPath(resolved) === normalizedSource) {
          return { ok: true, method: "symlink", targetAuthPath: targetAuth, alreadyLinked: true };
        }
        fs.unlinkSync(targetAuth);
      } else {
        moveExistingGlobalAuthToBackup(name, targetAuth, normalizedTarget);
      }
    }

    const tmpLink = targetAuth + "." + process.pid + "." + Date.now() + ".tmp-link";
    try { fs.unlinkSync(tmpLink); } catch {}
    try {
      fs.symlinkSync(normalizedSource, tmpLink);
      fs.renameSync(tmpLink, targetAuth);
      return { ok: true, method: "symlink", targetAuthPath: targetAuth };
    } catch (error) {
      try { fs.unlinkSync(tmpLink); } catch {}
      if (!isSymlinkPrivilegeError(error)) throw error;
      atomicCopyFileSync(normalizedSource, targetAuth);
      return {
        ok: true,
        method: "copy",
        targetAuthPath: targetAuth,
        sourceAuthPath: normalizedSource,
        symlinkError: error instanceof Error ? error.message : String(error),
      };
    }
  } catch (error) {
    return { ok: false, error: "Failed to link global Codex auth: " + (error instanceof Error ? error.message : String(error)) };
  }
}

function moveExistingGlobalAuthToBackup(name, targetAuth, normalizedTarget) {
  const backupDir = accountBackupsPath(name);
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  const backupFile = "auth-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
  const backupPath = path.join(backupDir, backupFile);
  const sourceHash = computeFileChecksum(targetAuth);
  fs.renameSync(targetAuth, backupPath);
  safeChmodSync(backupPath, 0o600);
  writeBackupMetadata(name, backupFile + ".meta", {
    accountName: name,
    sourceAuthPath: normalizedTarget,
    sourceHash,
    targetAuthPath: targetAuth,
    backupPath,
    status: "moved",
    note: "Moved aside before activating global auth for account " + name,
  });
}

function readAccountRateLimitsFromMeta(meta) {
  if (!meta || typeof meta !== "object") return null;
  const raw = meta.rateLimits || meta.rate_limits || meta.rateLimitBuckets || meta.rate_limit_buckets || meta.rateLimit || null;
  if (!raw || (typeof raw !== "object" && !Array.isArray(raw))) return null;
  try {
    return JSON.parse(JSON.stringify(raw));
  } catch {
    return null;
  }
}

function stripTomlComment(value) {
  return String(value || "").split("#")[0].trim();
}

function unquoteConfigValue(value) {
  const text = stripTomlComment(value);
  const match = text.match(/^(['"])([\s\S]*)\1$/);
  return (match ? match[2] : text).trim();
}

function readAccountConfigValues(name) {
  const configPath = accountConfigPath(name);
  const values = {};
  if (!fs.existsSync(configPath)) return values;
  try {
    fs.readFileSync(configPath, "utf8").split(/\r?\n/).forEach((line) => {
      const match = String(line || "").match(/^\s*([A-Za-z0-9_.-]+)\s*=\s*([\s\S]*?)\s*$/);
      if (!match) return;
      values[String(match[1]).trim()] = unquoteConfigValue(match[2]);
    });
  } catch {}
  return values;
}

function readAccountBaseUrl(name) {
  const values = readAccountConfigValues(name);
  return values.base_url || values.api_base_url || values.apiBaseUrl || values.baseURL || null;
}

function readAccountUsageUrl(name) {
  const values = readAccountConfigValues(name);
  return values.usage_url || values.usageUrl || values.quota_url || values.quotaUrl || values.billing_usage_url || values.billingUsageUrl || null;
}

function readAccountsForPayload() {
  try {
    syncCurrentCodexAuth();
  } catch {}
  try {
    syncBackupAccounts();
  } catch {}
  const state = loadAccountsState();
  const root = accountsRoot();

  if (state.accounts.length === 0) {
    return {
      installed: true,
      stateExists: true,
      codexAutoHome: root,
      accounts: [],
      currentIndex: null,
      currentAccount: null,
      preferredAccountName: null,
      lastSuccessfulAccount: null,
      lastSessionId: null,
      retryAvailabilityByAccount: {},
      updatedAt: state.updatedAt || "",
      accountDetails: {},
      activeProfile: null,
      activeProfileName: null,
    };
  }

  const currentAccount = state.currentIndex !== null && state.currentIndex >= 0 && state.currentIndex < state.accounts.length
    ? state.accounts[state.currentIndex]
    : null;

  const accountDetails = {};
  state.accounts.forEach(function (name) {
    const meta = readMeta(name) || {};
    const managedAuthPath = meta.managedAuthPath || accountAuthPath(name);
    const managedProfilePath = meta.managedProfilePath || accountDir(name);
    const sourceAuthPath = meta.sourceAuthPath || accountAuthPath(name);
    const auth = readAccountAuth(name);
    const tokenInfo = auth && auth.tokens && auth.tokens.id_token ? getTokenInfo(auth) : null;
    const tokenHealth = deriveAccountTokenHealth(name, auth, tokenInfo);
    const rateLimits = readAccountRateLimitsFromMeta(meta);
    const normalizedAuthSourcePath = normalizeAuthPath(sourceAuthPath);
    const credentialId = getCredentialIdFromAuth(auth);
    const accountFingerprint = getAccountFingerprint(sourceAuthPath, auth);
    var baseUrl = readAccountBaseUrl(name);
    accountDetails[name] = {
      sourceAuthPath: sourceAuthPath,
      normalizedSourceAuthPath: normalizedAuthSourcePath,
      managedAuthPath: managedAuthPath,
      fingerprint: accountFingerprint,
      credentialId: credentialId,
      managedProfilePath: managedProfilePath,
      hasAuth: fs.existsSync(accountAuthPath(name)),
      hasConfig: fs.existsSync(accountConfigPath(name)),
      hasMeta: fs.existsSync(accountMetaPath(name)),
      type: getAccountType(name),
      tokenInfo: tokenInfo,
      tokenHealth: tokenHealth,
      rateLimits: rateLimits,
      rateLimitUpdatedAt: meta.rateLimitUpdatedAt || meta.rate_limit_updated_at || null,
      rateLimitSource: meta.rateLimitSource || meta.rate_limit_source || null,
      rateLimitStatus: meta.rateLimitStatus || meta.rate_limit_status || null,
      usageAccountInfo: meta.usageAccountInfo || meta.usage_account_info || null,
      usageAccountInfoUpdatedAt: meta.usageAccountInfoUpdatedAt || meta.usage_account_info_updated_at || null,
      lastUsageFetchError: meta.lastUsageFetchError || meta.last_usage_fetch_error || null,
      lastActivationStatus: meta.lastActivationStatus || "not_attempted",
      lastActivationError: meta.lastActivationError || null,
      lastActivationHint: meta.lastActivationHint || null,
      baseUrl: baseUrl,
      origin: meta.origin || null,
      sourceKind: meta.sourceKind || null,
      activationMode: meta.activationMode || null,
      backupCandidate: Boolean(meta.backupCandidate),
      isBackupCandidate: Boolean(meta.backupCandidate) || meta.origin === "codex-backup",
      discoveredFrom: meta.discoveredFrom || null,
      discoveredBackupSourcePath: meta.discoveredBackupSourcePath || null,
    };
  });

  const duplicateWarnings = computeDuplicateAccountWarnings(accountDetails);
  Object.keys(duplicateWarnings).forEach(function (name) {
    if (!accountDetails[name]) return;
    accountDetails[name].duplicateWarnings = duplicateWarnings[name];
  });

  const activeProfile = detectActiveProfile();

  return {
    installed: true,
    stateExists: true,
    codexAutoHome: root,
    accounts: state.accounts,
    currentIndex: state.currentIndex,
    currentAccount: currentAccount,
    preferredAccountName: state.preferredAccountName,
    lastSuccessfulAccount: state.lastSuccessfulAccount,
    lastSessionId: state.lastSessionId || null,
    retryAvailabilityByAccount: state.retryAvailabilityByAccount || {},
    updatedAt: state.updatedAt || "",
    accountDetails: accountDetails,
    activeProfile: activeProfile,
    activeProfileName: activeProfile ? activeProfile.name : null,
  };
}

// ── Active Profile Detection ──────────────────────────────────

function computeFileChecksum(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

function getCredentialIdFromAuth(auth) {
  if (!auth || typeof auth !== "object") return null;

  if (typeof auth.credential_id === "string" && auth.credential_id.trim()) return auth.credential_id.trim();
  if (typeof auth.account_id === "string" && auth.account_id.trim()) return "account:" + auth.account_id.trim();

  if (typeof auth.email === "string" && auth.email.trim()) return "email:" + auth.email.trim();

  const idToken = auth.tokens && auth.tokens.id_token;
  if (typeof idToken === "string" && idToken.trim()) {
    const payload = decodeJwtPayload(idToken);
    if (payload) {
      if (typeof payload.sub === "string" && payload.sub.trim()) return "sub:" + payload.sub;
      if (typeof payload.jti === "string" && payload.jti.trim()) return "jti:" + payload.jti;
    }
    if (typeof payload === "object" && payload !== null && typeof payload.email === "string" && payload.email.trim()) {
      return "email:" + payload.email;
    }
  }

  if (auth.tokens && typeof auth.tokens.refresh_token === "string" && auth.tokens.refresh_token.trim()) {
    return "refresh-token:" + crypto.createHash("sha256").update(auth.tokens.refresh_token).digest("hex");
  }

  if (auth.tokens && typeof auth.tokens.access_token === "string" && auth.tokens.access_token.trim()) {
    return "access-token:" + crypto.createHash("sha256").update(auth.tokens.access_token).digest("hex");
  }

  return null;
}

function getAccountFingerprint(authPath, auth) {
  const normalizedAuthPath = normalizeAuthPath(authPath) || "auth-path-missing";
  const credentialId = getCredentialIdFromAuth(auth) || "credential-missing";
  return crypto.createHash("sha256").update(normalizedAuthPath).update("|").update(credentialId).digest("hex");
}

function computeDuplicateAccountWarnings(accountDetails) {
  const byCredential = {};
  const bySource = {};
  const warningsByName = {};

  Object.keys(accountDetails).forEach(function (name) {
    const details = accountDetails[name];
    if (!details) return;

    const credentialId = details.credentialId;
    if (typeof credentialId === "string" && credentialId) {
      byCredential[credentialId] = byCredential[credentialId] || [];
      byCredential[credentialId].push(name);
    }

    const normalizedSource = details.normalizedSourceAuthPath;
    if (typeof normalizedSource === "string" && normalizedSource) {
      bySource[normalizedSource] = bySource[normalizedSource] || [];
      bySource[normalizedSource].push(name);
    }
  });

  function addWarning(names, kindLabel) {
    if (!Array.isArray(names) || names.length < 2) return;
    names.forEach(function (name) {
      warningsByName[name] = warningsByName[name] || [];
      const message = "Potential duplicate identity: " + kindLabel + " appears on " + names.length + " accounts.";
      if (warningsByName[name].indexOf(message) === -1) {
        warningsByName[name].push(message);
      }
    });
  }

  Object.keys(byCredential).forEach(function (credentialId) {
    var names = byCredential[credentialId];
    if (!Array.isArray(names) || names.length < 2) return;
    var label = "credential identity";
    if (credentialId.startsWith("email:")) label = "email";
    else if (credentialId.startsWith("account:")) label = "account_id";
    else if (credentialId.startsWith("credential_id:")) label = "credential_id";
    else if (credentialId.startsWith("sub:")) label = "token subject";
    else if (credentialId.startsWith("jti:")) label = "token id";
    addWarning(names, "same " + label);
  });

  Object.keys(bySource).forEach(function (sourcePath) {
    addWarning(bySource[sourcePath], "same source auth path");
  });

  return warningsByName;
}

function detectActiveProfile(codexHome) {
  const targetHome = codexHome || process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
  const codexAuthPath = path.join(targetHome, "auth.json");
  const displayCodexAuthPath = path.isAbsolute(codexAuthPath) ? codexAuthPath : path.resolve(codexAuthPath);
  const normalizedCodexAuthPath = normalizeAuthPath(codexAuthPath);
  if (!normalizedCodexAuthPath) return null;
  if (!fs.existsSync(displayCodexAuthPath)) return null;
  const baseInfo = {
    authPath: displayCodexAuthPath,
    authRealPath: null,
    authLinkTarget: null,
    authIsSymlink: false,
  };
  try {
    const stat = fs.lstatSync(displayCodexAuthPath);
    baseInfo.authIsSymlink = stat.isSymbolicLink();
    if (baseInfo.authIsSymlink) baseInfo.authLinkTarget = fs.readlinkSync(displayCodexAuthPath);
    baseInfo.authRealPath = fs.realpathSync(displayCodexAuthPath);
  } catch {}

  const codexAuthStatePath = displayCodexAuthPath;

  // Strategy 1: Check for symlink pointing into accounts dir (codexswitch style)
  try {
    const stat = fs.lstatSync(codexAuthStatePath);
    if (stat.isSymbolicLink()) {
      const resolved = fs.realpathSync(codexAuthStatePath);
      const accRoot = accountsRoot();
      if (resolved.startsWith(accRoot)) {
        const relative = path.relative(accRoot, resolved);
        const segments = relative.split(path.sep);
        if (segments.length >= 2 && segments[1] === "auth.json") {
          return Object.assign({ name: segments[0], method: "symlink" }, baseInfo);
        }
      }
    }
  } catch {}

  // Strategy 2: Compare sha256 checksums
  const codexHash = computeFileChecksum(codexAuthStatePath);
  if (!codexHash) return null;
  const state = loadAccountsState();
  for (const name of state.accounts) {
    const accountHash = computeFileChecksum(accountAuthPath(name));
    if (accountHash === codexHash) {
      return Object.assign({ name, method: "copy" }, baseInfo);
    }
  }

  return Object.assign({ name: null, method: "unmanaged" }, baseInfo);
}

function writeActiveProfileMarker(name) {
  const markerPath = path.join(os.homedir(), ".codex-managed-agent", ".active-profile");
  const tmp = markerPath + "." + process.pid + "." + Date.now() + ".tmp";
  fs.writeFileSync(tmp, String(name || ""), "utf8");
  fs.renameSync(tmp, markerPath);
}

function readActiveProfileMarker() {
  const markerPath = path.join(os.homedir(), ".codex-managed-agent", ".active-profile");
  try {
    if (!fs.existsSync(markerPath)) return null;
    return fs.readFileSync(markerPath, "utf8").trim() || null;
  } catch {
    return null;
  }
}

// ── JWT Token Info Extraction ─────────────────────────────────

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    // Node >= 15.7 supports base64url; fallback for older
    let decoded;
    try {
      decoded = Buffer.from(parts[1], "base64url").toString("utf8");
    } catch {
      decoded = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    }
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getTokenInfo(auth) {
  if (!auth || typeof auth !== "object") return null;
  const idToken = auth.tokens && auth.tokens.id_token;
  if (!idToken) return null;

  const payload = decodeJwtPayload(idToken);
  if (!payload) return null;

  const exp = Number(payload.exp) || 0;
  const iat = Number(payload.iat) || 0;
  const oaiAuth = payload["https://api.openai.com/auth"] || {};
  const now = Math.floor(Date.now() / 1000);
  const secondsUntilExpiry = exp > 0 ? exp - now : 0;
  const daysUntilExpiry = secondsUntilExpiry > 0 ? Math.ceil(secondsUntilExpiry / 86400) : 0;

  let status = "ok";
  if (secondsUntilExpiry <= 0) status = "expired";
  else if (daysUntilExpiry <= 7) status = "expiring_soon";

  const clientId = Array.isArray(payload.aud) ? payload.aud[0] : (typeof payload.aud === "string" ? payload.aud : null);

  return {
    exp,
    expISO: exp > 0 ? new Date(exp * 1000).toISOString() : null,
    iat: iat || 0,
    daysUntilExpiry,
    status,
    planType: oaiAuth.chatgpt_plan_type || null,
    subscriptionActiveUntil: oaiAuth.chatgpt_subscription_active_until || null,
    subscriptionActiveStart: oaiAuth.chatgpt_subscription_active_start || null,
    clientId,
    hasRefreshToken: Boolean(auth.tokens && auth.tokens.refresh_token),
  };
}

function coerceTokenHealthState(rawState) {
  if (typeof rawState === "string" && ACCOUNT_TOKEN_HEALTH_STATES.includes(rawState)) {
    return rawState;
  }
  return null;
}

function deriveAccountTokenHealth(name, auth, tokenInfo) {
  const meta = readMeta(name);
  const metaTokenHealth = coerceTokenHealthState(meta && meta.tokenHealth);
  if (metaTokenHealth && metaTokenHealth !== "unknown") return metaTokenHealth;

  if (!auth || typeof auth !== "object") return "invalid";

  const token = auth.tokens && auth.tokens.access_token;
  const apiKey = auth.OPENAI_API_KEY && String(auth.OPENAI_API_KEY).trim();
  if (!token && !apiKey) {
    return "invalid";
  }

  if (!tokenInfo) {
    return "unknown";
  }

  if (tokenInfo.status === "expired") return "expired";
  if (tokenInfo.status === "expiring_soon") return "expiring_soon";
  if (tokenInfo.status === "ok") return "ok";

  return "unknown";
}

// ── OAuth Token Refresh ──────────────────────────────────────

async function refreshCodexOAuthToken(refreshToken, clientId) {
  const effectiveClientId = clientId || CODEX_OAUTH_CLIENT_ID;
  const payload = {
    grant_type: "refresh_token",
    client_id: effectiveClientId,
    refresh_token: refreshToken,
  };
  try {
    return await httpsPostJson(CODEX_OAUTH_REFRESH_URL, payload, 15000);
  } catch (jsonError) {
    try {
      return await httpsPostForm(CODEX_OAUTH_REFRESH_URL, payload);
    } catch {
      throw jsonError;
    }
  }
}

function shouldRefreshToken(tokenInfo) {
  if (!tokenInfo) return false;
  if (tokenInfo.status === "expired") return true;
  // Refresh if >50% through token lifetime
  var now = Math.floor(Date.now() / 1000);
  var totalLifetime = tokenInfo.exp - tokenInfo.iat;
  var elapsed = now - tokenInfo.iat;
  if (totalLifetime > 0 && elapsed / totalLifetime > 0.5) return true;
  return false;
}

async function refreshAccountToken(name, options = {}) {
  var auth = readAccountAuth(name);
  if (!auth) return { ok: false, error: "No auth for account " + name };

  var tokenInfo = getTokenInfo(auth);
  if (!tokenInfo) return { ok: false, error: "Cannot decode token for " + name };
  if (!tokenInfo.hasRefreshToken) return { ok: false, error: "No refresh_token available" };

  if (!options.force && !shouldRefreshToken(tokenInfo)) {
    return { ok: true, skipped: true, reason: "Token still fresh" };
  }

  try {
    var result = await refreshCodexOAuthToken(auth.tokens.refresh_token, tokenInfo.clientId);
    if (!result || !result.access_token) {
      return { ok: false, error: "Refresh response did not include access_token" };
    }

    var updatedAuth = {
      ...auth,
      tokens: {
        ...(auth.tokens || {}),
        id_token: result.id_token || auth.tokens.id_token,
        access_token: result.access_token || auth.tokens.access_token,
        refresh_token: result.refresh_token || auth.tokens.refresh_token,
      },
      last_refresh: new Date().toISOString(),
    };

    var authPath = accountAuthPath(name);
    var tmp = authPath + "." + process.pid + "." + Date.now() + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(updatedAuth, null, 2), "utf8");
    safeChmodSync(tmp, 0o600);
    fs.renameSync(tmp, authPath);

    const nextTokenInfo = getTokenInfo(updatedAuth);
    try {
      writeMeta(name, {
        tokenHealth: nextTokenInfo && nextTokenInfo.status ? nextTokenInfo.status : "ok",
        lastTokenRefreshStatus: "ok",
        lastTokenRefreshError: null,
        lastTokenRefreshAt: updatedAuth.last_refresh,
      });
    } catch {}

    return { ok: true, skipped: false, tokenInfo: nextTokenInfo || null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      writeMeta(name, {
        tokenHealth: "refresh_failed",
        lastTokenRefreshStatus: "error",
        lastTokenRefreshError: message,
        lastTokenRefreshAt: new Date().toISOString(),
      });
    } catch {}
    return { ok: false, error: message };
  }
}

async function refreshAllOfficialTokens(options = {}) {
  var state = loadAccountsState();
  var results = [];
  var force = Boolean(options.force);
  for (var i = 0; i < state.accounts.length; i++) {
    var name = state.accounts[i];
    var auth = readAccountAuth(name);
    if (!auth || !auth.tokens || !auth.tokens.access_token) continue;
    try {
      var result = await refreshAccountToken(name, { force });
      results.push({
        name: name,
        ok: result.ok,
        skipped: result.skipped,
        reason: result.reason || null,
        error: result.error || null,
        tokenInfo: result.tokenInfo || null,
      });
    } catch (error) {
      results.push({ name: name, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

function codexAccountIdFromAuth(auth) {
  if (!auth || typeof auth !== "object") return null;
  const tokens = auth.tokens && typeof auth.tokens === "object" ? auth.tokens : {};
  const direct = tokens.account_id || tokens.accountId || auth.account_id || auth.accountId;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const idToken = tokens.id_token || tokens.idToken || auth.id_token || auth.idToken;
  const payload = decodeJwtPayload(idToken);
  const authClaim = payload && payload["https://api.openai.com/auth"];
  const fromAuthClaim = authClaim && (authClaim.chatgpt_account_id || authClaim.account_id);
  if (typeof fromAuthClaim === "string" && fromAuthClaim.trim()) return fromAuthClaim.trim();
  return null;
}

const { fetchAccountUsage } = createAccountUsage({
  CODEX_DEFAULT_USAGE_BASE_URL,
  usageLedger,
  httpsGetJson,
  readAccountBaseUrl,
  readAccountUsageUrl,
  getTokenInfo,
  shouldRefreshToken,
  refreshAccountToken,
  readAccountAuth,
  codexAccountIdFromAuth,
  decodeJwtPayload,
  getAccountTypeFromAuth,
  loadAccountsState,
  writeMeta,
});

// ── Account Credential Probe ──────────────────────────────────

async function probeAccountCredentials(name) {
  var auth = readAccountAuth(name);
  if (!auth) return { ok: false, error: "No auth file for account", status: "no_auth" };

  // Get auth token: prefer access_token for official, or OPENAI_API_KEY for relay
  var token = null;
  var authType = "unknown";
  if (auth.tokens && auth.tokens.access_token) {
    token = auth.tokens.access_token;
    authType = "official";
  } else if (auth.OPENAI_API_KEY && typeof auth.OPENAI_API_KEY === "string") {
    token = auth.OPENAI_API_KEY;
    authType = "relay";
  }

  if (!token) return { ok: false, error: "No valid credentials found", status: "no_credentials" };

  // Read base_url from the account's config.toml if it has one
  var baseUrl = "https://api.openai.com";
  var configPath = accountConfigPath(name);
  if (fs.existsSync(configPath)) {
    try {
      var configContent = fs.readFileSync(configPath, "utf8");
      var match = configContent.match(/^\s*base_url\s*=\s*"([^"]+)"/m);
      if (match) baseUrl = match[1].replace(/\/+$/, "");
    } catch {}
  }

  // Lightweight probe: GET /v1/models with a short timeout
  try {
    var result = await httpsGetJson(baseUrl + "/v1/models", 5000, {
      Authorization: "Bearer " + token,
    });
    if (result && result.data && Array.isArray(result.data)) {
      try {
        writeMeta(name, {
          tokenHealth: "ok",
          lastActivationError: null,
          lastActivationHint: null,
        });
      } catch {}
      return { ok: true, status: "valid", data: result.data.slice(0, 3).map(function(m) { return m.id; }) };
    }
    try {
      writeMeta(name, {
        tokenHealth: "ok",
        lastActivationError: null,
        lastActivationHint: null,
      });
    } catch {}
    return { ok: true, status: "valid", data: [] };
  } catch (error) {
    var msg = error instanceof Error ? error.message : String(error);
    if (!msg || !msg.trim()) msg = "Credential probe failed without a detailed error.";
    var rateLimitSignal = detectRateLimitSignal(msg);
    if (rateLimitSignal) {
      setRetryAvailabilityForAccount(name, {
        state: "rate_limited",
        code: rateLimitSignal.code,
        reason: "codex-probe",
        signal: rateLimitSignal.signal,
        message: rateLimitSignal.message,
        detectedAt: new Date().toISOString(),
        availableAt: rateLimitSignal.availableAt || null,
        retryAfterSeconds: rateLimitSignal.retryAfterSeconds || null,
        displayText: rateLimitSignal.displayText || rateLimitSignal.message,
      });
      return { ok: false, error: rateLimitSignal.message, status: "rate_limited", signal: rateLimitSignal };
    }
    var invalidSignal = detectInvalidCredentialSignal(msg);
    if (invalidSignal) {
      clearRetryAvailabilityForAccount(name);
      try {
        writeMeta(name, {
          tokenHealth: "invalid",
          lastActivationStatus: "failed",
          lastActivationError: invalidSignal.message,
          lastActivationHint: "Run Validate and then re-login/re-import this profile if needed.",
        });
      } catch {}
      return { ok: false, error: invalidSignal.message, status: "invalid", signal: invalidSignal };
    }
    if (msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
      clearRetryAvailabilityForAccount(name);
      return { ok: false, error: "Connection timeout", status: "timeout" };
    }
    clearRetryAvailabilityForAccount(name);
    try {
      writeMeta(name, {
        tokenHealth: "unknown",
        lastActivationStatus: "probe_error",
        lastActivationError: msg.slice(0, 240),
        lastActivationHint: "Run Validate again after confirming the relay base_url/config and network are reachable.",
      });
    } catch {}
    return { ok: false, error: msg.slice(0, 120), status: "error" };
  }
}

function detectRateLimitSignal(message) {
  var text = String(message || "").toLowerCase();
  if (!text) return null;
  for (var i = 0; i < RATE_LIMIT_SIGNAL_PATTERNS.length; i += 1) {
    var signal = RATE_LIMIT_SIGNAL_PATTERNS[i];
    if (signal.matcher.test(text)) {
      var retry = detectRetryWindowFromText(text);
      return {
        code: signal.key,
        signal: "rate_limit_or_quota",
        message: signal.message,
        retryAfterSeconds: retry && retry.seconds || null,
        availableAt: retry && retry.availableAt || null,
        displayText: retry && retry.displayText || signal.message,
      };
    }
  }
  return null;
}

function detectInvalidCredentialSignal(message) {
  var text = String(message || "").toLowerCase();
  if (!text) return null;
  for (var i = 0; i < INVALID_CREDENTIAL_SIGNAL_PATTERNS.length; i += 1) {
    var signal = INVALID_CREDENTIAL_SIGNAL_PATTERNS[i];
    if (signal.matcher.test(text)) {
      return {
        code: signal.key,
        signal: "invalid_credentials",
        message: signal.message,
      };
    }
  }
  return null;
}

function detectRetryWindowFromText(message) {
  var text = String(message || "").toLowerCase();
  for (var i = 0; i < RATE_LIMIT_RETRY_PATTERNS.length; i += 1) {
    var match = text.match(RATE_LIMIT_RETRY_PATTERNS[i]);
    if (!match) continue;
    var count = Number(match[1] || 0);
    var unit = String(match[2] || "seconds").toLowerCase();
    var unitSeconds = RETRY_SECOND_PER_UNIT[unit] || null;
    if (!unitSeconds || !Number.isFinite(count) || count <= 0) return null;
    var delaySeconds = Math.max(1, Math.round(count * unitSeconds));
    var availableAt = new Date(Date.now() + (delaySeconds * 1000)).toISOString();
    return {
      seconds: delaySeconds,
      availableAt: availableAt,
      displayText: "Retry in " + delaySeconds + " seconds",
    };
  }
  return null;
}

function setRetryAvailabilityForAccount(accountName, payload) {
  var state = loadAccountsState();
  if (!state.accounts.includes(accountName)) return false;
  var retryByAccount = Object.assign({}, state.retryAvailabilityByAccount || {});
  if (!payload) {
    delete retryByAccount[accountName];
  } else {
    retryByAccount[accountName] = payload;
  }
  saveAccountsState({
    ...state,
    retryAvailabilityByAccount: retryByAccount,
  });
  return true;
}

function clearRetryAvailabilityForAccount(accountName) {
  return setRetryAvailabilityForAccount(accountName, null);
}

module.exports = {
  accountVaultSchema,
  buildProfileMetadataTemplate,
  buildBackupMetadataTemplate,
  resolveAccountsHome,
  resolveAccountsStatePath,
  normalizeAuthPath,
  ensureAccountsLayout,
  loadAccountsState,
  saveAccountsState,
  listAccounts,
  getCurrentAccount,
  addAccount,
  discoverBackupAuthSources,
  syncBackupAccounts,
  removeAccount,
  setCurrentAccount,
  bootstrapDefaultAccount,
  syncCurrentCodexAuth,
  importCurrentAuthAsProfile,
  importAuthFileAsProfile,
  prepareAccountLogin,
  activateAccountForCodex,
  readAccountsForPayload,
  getAccountType,
  getAccountTypeFromAuth,
  readAccountAuth,
  detectActiveProfile,
  writeActiveProfileMarker,
  readActiveProfileMarker,
  decodeJwtPayload,
  getTokenInfo,
  refreshAccountToken,
  refreshAllOfficialTokens,
  fetchAccountUsage,
  probeAccountCredentials,
  detectRateLimitSignal,
  detectInvalidCredentialSignal,
};
