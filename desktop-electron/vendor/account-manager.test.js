const assert = require("node:assert/strict");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");
const test = require("node:test");
const { EventEmitter } = require("events");

const accountManager = require("./account-manager");

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function fakeJwt(payload) {
  return [base64UrlJson({ alg: "none" }), base64UrlJson(payload), "sig"].join(".");
}

function withTempHome(t) {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-account-manager-"));
  const originalHomedir = os.homedir;
  os.homedir = () => tempHome;
  t.after(() => {
    os.homedir = originalHomedir;
    fs.rmSync(tempHome, { recursive: true, force: true });
  });
  return tempHome;
}

function writeManagedAccount(name, auth, configText = "") {
  accountManager.ensureAccountsLayout();
  accountManager.saveAccountsState({
    version: 1,
    accounts: [name],
    currentIndex: 0,
    preferredAccountName: name,
    lastSuccessfulAccount: name,
    retryAvailabilityByAccount: {},
  });
  const accountDir = path.join(os.homedir(), ".codex-managed-agent", "accounts", name);
  fs.mkdirSync(accountDir, { recursive: true });
  fs.writeFileSync(path.join(accountDir, "auth.json"), `${JSON.stringify(auth, null, 2)}\n`, "utf8");
  if (configText) fs.writeFileSync(path.join(accountDir, "config.toml"), configText, "utf8");
}

function readAccountMeta(name) {
  return JSON.parse(fs.readFileSync(path.join(os.homedir(), ".codex-managed-agent", "accounts", name, "meta.json"), "utf8"));
}

function mockHttps(t, handler) {
  const originalRequest = https.request;
  const originalNoProxy = process.env.NO_PROXY;
  const originalNoProxyLower = process.env.no_proxy;
  const calls = [];
  process.env.NO_PROXY = "*";
  delete process.env.no_proxy;
  https.request = function mockedRequest(options, callback) {
    const req = new EventEmitter();
    let body = "";
    req.write = (chunk) => { body += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk || ""); };
    req.destroy = (error) => {
      if (error) req.emit("error", error);
    };
    req.end = () => {
      const call = { options, body };
      calls.push(call);
      let response;
      try {
        response = handler(call);
      } catch (error) {
        process.nextTick(() => req.emit("error", error));
        return;
      }
      const res = new EventEmitter();
      res.statusCode = response.statusCode || 200;
      process.nextTick(() => {
        callback(res);
        const payload = typeof response.body === "string" ? response.body : JSON.stringify(response.body || {});
        if (payload) res.emit("data", Buffer.from(payload, "utf8"));
        res.emit("end");
      });
    };
    return req;
  };
  t.after(() => {
    https.request = originalRequest;
    if (originalNoProxy === undefined) delete process.env.NO_PROXY;
    else process.env.NO_PROXY = originalNoProxy;
    if (originalNoProxyLower === undefined) delete process.env.no_proxy;
    else process.env.no_proxy = originalNoProxyLower;
  });
  return calls;
}

test("fetchAccountUsage collects Codex wham quota windows into account meta", async (t) => {
  withTempHome(t);
  const now = Math.floor(Date.now() / 1000);
  writeManagedAccount("default", {
    email: "codex@example.com",
    tokens: {
      access_token: "access-token-1",
      refresh_token: "refresh-token-1",
      id_token: fakeJwt({
        exp: now + 3600,
        iat: now - 60,
        aud: "codex-client-from-token",
        email: "codex@example.com",
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct-team-1",
          chatgpt_plan_type: "team",
        },
      }),
    },
  });

  const resetPrimary = now + 5 * 3600;
  const resetWeekly = now + 7 * 86400;
  const calls = mockHttps(t, ({ options }) => {
    assert.equal(options.method, "GET");
    assert.equal(options.hostname, "chatgpt.com");
    assert.equal(options.path, "/backend-api/wham/usage");
    assert.equal(options.headers.Authorization, "Bearer access-token-1");
    assert.equal(options.headers["ChatGPT-Account-Id"], "acct-team-1");
    return {
      body: {
        email: "codex@example.com",
        account_id: "acct-team-1",
        plan_type: "team",
        rate_limit: {
          primary_window: { used_percent: 17, reset_at: resetPrimary },
          secondary_window: { used_percent: 19, reset_at: resetWeekly },
        },
        code_review_rate_limit: {
          primary_window: { used_percent: 50, reset_at: resetPrimary },
        },
      },
    };
  });

  const result = await accountManager.fetchAccountUsage("default");
  assert.equal(result.ok, true);
  assert.equal(result.source, "codex-wham");
  assert.equal(calls.length, 1);
  assert.deepEqual(result.rateLimits.map((item) => [item.label, item.remainingPercent]), [
    ["5h", 83],
    ["Weekly", 81],
    ["Code Review", 50],
  ]);

  const meta = readAccountMeta("default");
  assert.equal(meta.rateLimitSource, "codex-wham");
  assert.equal(meta.rateLimitStatus, "ok");
  assert.equal(meta.lastUsageFetchError, null);
  assert.deepEqual(meta.usageAccountInfo, {
    email: "codex@example.com",
    accountId: "acct-team-1",
    planType: "team",
  });
  assert.deepEqual(meta.rateLimits.map((item) => [item.label, item.remainingPercent]), [
    ["5h", 83],
    ["Weekly", 81],
    ["Code Review", 50],
  ]);

  const payload = accountManager.readAccountsForPayload();
  assert.equal(payload.accountDetails.default.rateLimits[0].label, "5h");
  assert.equal(payload.accountDetails.default.rateLimits[0].remainingPercent, 83);
  assert.equal(payload.accountDetails.default.usageAccountInfo.email, "codex@example.com");
  assert.equal(payload.accountDetails.default.usageAccountInfo.accountId, "acct-team-1");
});

test("refreshAccountToken uses Codex OAuth JSON refresh with AIUsage client id fallback", async (t) => {
  withTempHome(t);
  const now = Math.floor(Date.now() / 1000);
  writeManagedAccount("default", {
    email: "codex@example.com",
    tokens: {
      access_token: "old-access-token",
      refresh_token: "old-refresh-token",
      id_token: fakeJwt({
        exp: now - 60,
        iat: now - 7200,
        email: "codex@example.com",
        "https://api.openai.com/auth": {
          chatgpt_account_id: "acct-team-1",
          chatgpt_plan_type: "team",
        },
      }),
    },
  });

  const calls = mockHttps(t, ({ options, body }) => {
    assert.equal(options.method, "POST");
    assert.equal(options.hostname, "auth.openai.com");
    assert.equal(options.path, "/oauth/token");
    assert.equal(options.headers["Content-Type"], "application/json");
    const parsed = JSON.parse(body);
    assert.equal(parsed.grant_type, "refresh_token");
    assert.equal(parsed.client_id, "app_EMoamEEZ73f0CkXaXp7hrann");
    assert.equal(parsed.refresh_token, "old-refresh-token");
    return {
      body: {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        id_token: "new-id-token",
      },
    };
  });

  const result = await accountManager.refreshAccountToken("default", { force: true });
  assert.equal(result.ok, true);
  assert.equal(result.skipped, false);
  assert.equal(calls.length, 1);

  const updated = accountManager.readAccountAuth("default");
  assert.equal(updated.tokens.access_token, "new-access-token");
  assert.equal(updated.tokens.refresh_token, "new-refresh-token");
  assert.equal(updated.tokens.id_token, "new-id-token");
  assert.match(updated.last_refresh, /^\d{4}-\d{2}-\d{2}T/);
});

test("prepareAccountLogin targets the account managed profile directory", (t) => {
  const home = withTempHome(t);
  writeManagedAccount("backup-account1", {
    tokens: {
      access_token: "expired-access-token",
      refresh_token: "used-refresh-token",
    },
  });

  const result = accountManager.prepareAccountLogin("backup-account1");
  const expectedDir = path.join(home, ".codex-managed-agent", "accounts", "backup-account1");
  assert.equal(result.ok, true);
  assert.equal(result.codexHome, expectedDir);
  assert.equal(result.authPath, path.join(expectedDir, "auth.json"));
  assert.equal(fs.existsSync(path.join(expectedDir, "config.toml")), true);

  const meta = readAccountMeta("backup-account1");
  assert.equal(meta.sourceAuthPath, path.join(expectedDir, "auth.json"));
  assert.equal(meta.managedProfilePath, expectedDir);
  assert.equal(meta.lastLoginStatus, "started");
});

test("addAccount can create an empty login-ready managed slot", (t) => {
  const home = withTempHome(t);

  const addResult = accountManager.addAccount("fresh-login");
  assert.equal(addResult.ok, true);

  const expectedDir = path.join(home, ".codex-managed-agent", "accounts", "fresh-login");
  assert.equal(fs.existsSync(path.join(expectedDir, "auth.json")), false);
  assert.equal(fs.existsSync(path.join(expectedDir, "config.toml")), true);
  assert.equal(accountManager.getCurrentAccount(), "fresh-login");

  const loginResult = accountManager.prepareAccountLogin("fresh-login");
  assert.equal(loginResult.ok, true);
  assert.equal(loginResult.codexHome, expectedDir);
  assert.equal(loginResult.authPath, path.join(expectedDir, "auth.json"));
});

test("removeAccount ignores removed backup candidates during backup sync", (t) => {
  const home = withTempHome(t);
  const backupDir = path.join(home, ".codex", "backup", "account1");
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, "auth.json"), JSON.stringify({
    tokens: {
      access_token: "backup-access-token",
      id_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    },
  }), "utf8");

  const syncResult = accountManager.syncBackupAccounts();
  assert.equal(syncResult.ok, true);
  assert.equal(accountManager.loadAccountsState().accounts.includes("backup-account1"), true);

  const removeResult = accountManager.removeAccount("backup-account1");
  assert.equal(removeResult.ok, true);
  assert.equal(accountManager.loadAccountsState().accounts.includes("backup-account1"), false);

  accountManager.readAccountsForPayload();
  assert.equal(accountManager.loadAccountsState().accounts.includes("backup-account1"), false);
});

test("syncCurrentCodexAuth imports current auth only when not already managed", (t) => {
  const home = withTempHome(t);
  const codexHome = path.join(home, ".codex");
  fs.mkdirSync(codexHome, { recursive: true });
  const auth = {
    tokens: {
      access_token: "current-access-token",
      id_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    },
  };
  fs.writeFileSync(path.join(codexHome, "auth.json"), JSON.stringify(auth), "utf8");

  const first = accountManager.syncCurrentCodexAuth({ codexHome });
  assert.equal(first.ok, true);
  assert.deepEqual(first.imported, ["codex-current"]);
  assert.equal(accountManager.loadAccountsState().accounts.includes("codex-current"), true);

  const second = accountManager.syncCurrentCodexAuth({ codexHome });
  assert.equal(second.ok, true);
  assert.equal(second.skipped, true);
  assert.equal(accountManager.loadAccountsState().accounts.filter((name) => name.startsWith("codex-current")).length, 1);
});

test("activateAccountForCodex activates global auth with symlink or copy fallback", async (t) => {
  const home = withTempHome(t);
  const codexHome = path.join(home, ".codex");
  fs.mkdirSync(codexHome, { recursive: true });
  fs.writeFileSync(path.join(codexHome, "auth.json"), JSON.stringify({ old: true }), "utf8");

  writeManagedAccount("work-a", {
    tokens: {
      access_token: "work-a-access-token",
      id_token: fakeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 }),
    },
  });

  const result = await accountManager.activateAccountForCodex("work-a", codexHome);
  assert.equal(result.ok, true);

  const globalAuth = path.join(codexHome, "auth.json");
  if (result.method === "symlink") {
    assert.equal(fs.lstatSync(globalAuth).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(globalAuth), path.join(home, ".codex-managed-agent", "accounts", "work-a", "auth.json"));
  } else {
    assert.equal(result.method, "copy");
    assert.equal(fs.lstatSync(globalAuth).isSymbolicLink(), false);
    const copiedAuth = JSON.parse(fs.readFileSync(globalAuth, "utf8"));
    assert.equal(copiedAuth.tokens.access_token, "work-a-access-token");
  }

  const backupsDir = path.join(home, ".codex-managed-agent", "accounts", "work-a", "backups");
  const backupFiles = fs.readdirSync(backupsDir).filter((name) => name.endsWith(".json"));
  assert.equal(backupFiles.length, 1);
  const movedAuth = JSON.parse(fs.readFileSync(path.join(backupsDir, backupFiles[0]), "utf8"));
  assert.deepEqual(movedAuth, { old: true });
});

test("activateAccountForCodex retargets an existing managed symlink without copying profile auth", async (t) => {
  const home = withTempHome(t);
  const codexHome = path.join(home, ".codex");
  const accountRoot = path.join(home, ".codex-managed-agent", "accounts");
  const now = Math.floor(Date.now() / 1000);

  accountManager.ensureAccountsLayout();
  accountManager.saveAccountsState({
    version: 1,
    accounts: ["work-a", "work-b"],
    currentIndex: 1,
    preferredAccountName: "work-b",
    lastSuccessfulAccount: "work-b",
    retryAvailabilityByAccount: {},
  });
  for (const name of ["work-a", "work-b"]) {
    const dir = path.join(accountRoot, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "auth.json"), `${JSON.stringify({
      tokens: {
        access_token: `${name}-access-token`,
        id_token: fakeJwt({ exp: now + 3600, sub: name }),
      },
    }, null, 2)}\n`, "utf8");
  }

  fs.mkdirSync(codexHome, { recursive: true });
  const existingAuthPath = path.join(codexHome, "auth.json");
  const workBAuthPath = path.join(accountRoot, "work-b", "auth.json");
  let seededSymlink = false;
  try {
    fs.symlinkSync(workBAuthPath, existingAuthPath);
    seededSymlink = true;
  } catch (error) {
    if (process.platform !== "win32") throw error;
    fs.copyFileSync(workBAuthPath, existingAuthPath);
  }

  const result = await accountManager.activateAccountForCodex("work-a", codexHome);
  assert.equal(result.ok, true);

  const globalAuth = path.join(codexHome, "auth.json");
  if (result.method === "symlink") {
    assert.equal(fs.lstatSync(globalAuth).isSymbolicLink(), true);
    assert.equal(fs.realpathSync(globalAuth), path.join(accountRoot, "work-a", "auth.json"));
    assert.equal(fs.existsSync(path.join(accountRoot, "work-a", "backups")), false);
  } else {
    assert.equal(result.method, "copy");
    assert.equal(fs.lstatSync(globalAuth).isSymbolicLink(), false);
    const copiedAuth = JSON.parse(fs.readFileSync(globalAuth, "utf8"));
    assert.equal(copiedAuth.tokens.access_token, "work-a-access-token");
    assert.equal(seededSymlink, false);
  }

  const workBAuth = JSON.parse(fs.readFileSync(path.join(accountRoot, "work-b", "auth.json"), "utf8"));
  assert.equal(workBAuth.tokens.access_token, "work-b-access-token");
});
