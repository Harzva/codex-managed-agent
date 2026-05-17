const childProcess = require("child_process");
const http = require("http");
const https = require("https");
const vscode = require("vscode");

const NETWORK_PROBES = {
  google: {
    label: "Google",
    args: ["-I", "-L", "https://www.google.com"],
    url: "https://www.google.com",
    method: "HEAD",
  },
  baidu: {
    label: "Baidu",
    args: ["-I", "-L", "https://www.baidu.com"],
    url: "https://www.baidu.com",
    method: "HEAD",
  },
  ipinfo: {
    label: "IP Info",
    args: ["-s", "https://ipinfo.io/json"],
    url: "https://ipinfo.io/json",
    method: "GET",
  },
};

function compactOutput(value, maxChars = 1200) {
  const text = String(value || "").trim();
  if (!text || text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[truncated ${text.length - maxChars} chars]`;
}

function commandText(args) {
  return ["curl", ...args].map((part) => {
    const text = String(part || "");
    return /^[A-Za-z0-9_./:=?&%#-]+$/.test(text) ? text : JSON.stringify(text);
  }).join(" ");
}

function nodeRequestText(spec, timeoutMs) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let target;
    try {
      target = new URL(spec.url);
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      });
      return;
    }
    const client = target.protocol === "http:" ? http : https;
    const req = client.request(target, { method: spec.method || "GET" }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve({
          ok: Number(res.statusCode || 0) >= 200 && Number(res.statusCode || 0) < 400,
          statusCode: res.statusCode || 0,
          headers: res.headers || {},
          stdout: body,
          stderr: "",
          durationMs: Date.now() - startedAt,
          via: "node",
        });
      });
    });
    req.on("error", (error) => {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        stdout: "",
        stderr: "",
        durationMs: Date.now() - startedAt,
        via: "node",
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
    });
    req.end();
  });
}

function execCurlProbe(spec, timeoutMs) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    childProcess.execFile("curl", spec.args, {
      encoding: "utf8",
      timeout: timeoutMs,
      maxBuffer: 512 * 1024,
    }, async (error, stdout, stderr) => {
      const curlMissing = error && (error.code === "ENOENT" || String(error.message || "").includes("ENOENT"));
      if (curlMissing) {
        const fallback = await nodeRequestText(spec, timeoutMs);
        resolve({
          ...fallback,
          label: spec.label,
          command: `${spec.method || "GET"} ${spec.url}`,
        });
        return;
      }
      resolve({
        ok: !error,
        label: spec.label,
        command: commandText(spec.args),
        stdout: compactOutput(stdout),
        stderr: compactOutput(stderr),
        error: error ? (error.message || String(error)) : "",
        code: error && error.code !== undefined ? error.code : 0,
        signal: error && error.signal ? error.signal : "",
        durationMs: Date.now() - startedAt,
        via: "curl",
      });
    });
  });
}

function getNetworkProbeResults(panel) {
  return Object.assign({}, panel.networkProbeResults || {});
}

async function runNetworkProbe(panel, probeId) {
  const id = String(probeId || "").trim();
  const spec = NETWORK_PROBES[id];
  if (!spec) {
    vscode.window.showWarningMessage(`Codex-Managed-Agent: unknown network probe "${id}"`);
    return { ok: false, error: "unknown_probe" };
  }
  const timeoutMs = Number(vscode.workspace.getConfiguration("codexAgent").get("networkProbeTimeoutMs") || 12000);
  const started = {
    id,
    label: spec.label,
    status: "running",
    ok: null,
    command: commandText(spec.args),
    startedAt: new Date().toISOString(),
  };
  panel.networkProbeResults = Object.assign({}, panel.networkProbeResults || {}, { [id]: started });
  panel.postMessage({ type: "networkProbePatched", probeId: id, result: started });
  const result = await execCurlProbe(spec, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 12000);
  const completed = {
    ...started,
    ...result,
    status: result.ok ? "ok" : "failed",
    completedAt: new Date().toISOString(),
  };
  panel.networkProbeResults = Object.assign({}, panel.networkProbeResults || {}, { [id]: completed });
  panel.lastActionNotice = result.ok
    ? `${spec.label} network test passed`
    : `${spec.label} network test failed`;
  vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3000);
  panel.postMessage({ type: "networkProbePatched", probeId: id, result: completed });
  return completed;
}

function readClashConfig() {
  const config = vscode.workspace.getConfiguration("codexAgent");
  const controllerUrl = String(config.get("clashControllerUrl") || "http://127.0.0.1:9090").trim();
  const secret = String(config.get("clashSecret") || "").trim();
  const timeoutMs = Number(config.get("clashRequestTimeoutMs") || 8000);
  return {
    controllerUrl,
    secret,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000,
  };
}

function clashConfigSummary() {
  const config = readClashConfig();
  return {
    ok: null,
    controllerUrl: config.controllerUrl,
    hasSecret: Boolean(config.secret),
    groups: [],
    updatedAt: "",
    message: "Click Refresh Proxies to read Clash/Mihomo selector groups.",
  };
}

function requestClashJson(config, method, route, body) {
  return new Promise((resolve, reject) => {
    if (!config.controllerUrl) {
      reject(new Error("codexAgent.clashControllerUrl is empty"));
      return;
    }
    let target;
    try {
      target = new URL(route, config.controllerUrl.replace(/\/?$/, "/"));
    } catch (error) {
      reject(error);
      return;
    }
    const payload = body === undefined ? "" : JSON.stringify(body);
    const headers = {
      Accept: "application/json",
    };
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (config.secret) headers.Authorization = `Bearer ${config.secret}`;
    const client = target.protocol === "http:" ? http : https;
    const req = client.request(target, { method, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data = null;
        if (text.trim()) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }
        if (Number(res.statusCode || 0) >= 200 && Number(res.statusCode || 0) < 300) {
          resolve({ statusCode: res.statusCode || 0, data });
          return;
        }
        reject(new Error(`Clash/Mihomo controller HTTP ${res.statusCode || 0}: ${typeof data === "string" ? data : JSON.stringify(data)}`));
      });
    });
    req.on("error", reject);
    req.setTimeout(config.timeoutMs, () => {
      req.destroy(new Error(`Clash/Mihomo controller timed out after ${config.timeoutMs}ms`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function latestDelay(proxy) {
  const direct = Number(proxy && proxy.delay);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const history = Array.isArray(proxy && proxy.history) ? proxy.history : [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const delay = Number(history[index] && history[index].delay);
    if (Number.isFinite(delay) && delay >= 0) return delay;
  }
  return null;
}

function normalizeProxy(proxy, name) {
  return {
    name: String((proxy && proxy.name) || name || "").trim(),
    type: String((proxy && proxy.type) || "").trim(),
    udp: Boolean(proxy && proxy.udp),
    delay: latestDelay(proxy),
  };
}

function normalizeClashProxyState(data, config) {
  const proxies = data && typeof data === "object" && data.proxies && typeof data.proxies === "object"
    ? data.proxies
    : {};
  const groups = Object.keys(proxies)
    .map((name) => proxies[name])
    .filter((proxy) => proxy && Array.isArray(proxy.all) && proxy.all.length)
    .map((group) => {
      const all = group.all
        .map((name) => normalizeProxy(proxies[name] || { name }, name))
        .filter((item) => item.name);
      return {
        name: String(group.name || "").trim(),
        type: String(group.type || "").trim(),
        now: String(group.now || "").trim(),
        udp: Boolean(group.udp),
        delay: latestDelay(group),
        all,
      };
    })
    .filter((group) => group.name)
    .sort((a, b) => {
      const aActive = a.name === "GLOBAL" ? -1 : 0;
      const bActive = b.name === "GLOBAL" ? -1 : 0;
      if (aActive !== bActive) return aActive - bActive;
      return a.name.localeCompare(b.name);
    });
  return {
    ok: true,
    controllerUrl: config.controllerUrl,
    hasSecret: Boolean(config.secret),
    groupCount: groups.length,
    groups,
    updatedAt: new Date().toISOString(),
    message: groups.length ? "Proxy groups loaded from Clash/Mihomo." : "No selector groups returned by the controller.",
  };
}

function postClashState(panel) {
  panel.postMessage({
    type: "clashProxyStatePatched",
    state: panel.clashProxyState || clashConfigSummary(),
  });
}

async function closeClashConnections(config) {
  try {
    await requestClashJson(config, "DELETE", "/connections");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function refreshClashProxyState(panel) {
  const config = readClashConfig();
  panel.clashProxyState = Object.assign({}, panel.clashProxyState || clashConfigSummary(), {
    ok: null,
    controllerUrl: config.controllerUrl,
    hasSecret: Boolean(config.secret),
    loading: true,
    message: "Reading Clash/Mihomo proxy groups...",
  });
  postClashState(panel);
  try {
    const response = await requestClashJson(config, "GET", "/proxies");
    panel.clashProxyState = normalizeClashProxyState(response.data, config);
    panel.lastActionNotice = `Loaded ${panel.clashProxyState.groupCount || 0} proxy group(s)`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2600);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    panel.clashProxyState = {
      ok: false,
      controllerUrl: config.controllerUrl,
      hasSecret: Boolean(config.secret),
      groups: [],
      updatedAt: new Date().toISOString(),
      error: message,
      message,
    };
    vscode.window.showWarningMessage(`Codex-Managed-Agent: Clash/Mihomo proxy refresh failed: ${message}`);
  }
  postClashState(panel);
  return panel.clashProxyState;
}

async function switchClashProxy(panel, groupName, proxyName) {
  const group = String(groupName || "").trim();
  const proxy = String(proxyName || "").trim();
  if (!group || !proxy) return { ok: false, error: "missing_group_or_proxy" };
  const config = readClashConfig();
  panel.clashProxyState = Object.assign({}, panel.clashProxyState || clashConfigSummary(), {
    switching: { group, proxy },
    message: `Switching ${group} to ${proxy} without restarting Mihomo...`,
  });
  postClashState(panel);
  try {
    await requestClashJson(config, "PUT", `/proxies/${encodeURIComponent(group)}`, { name: proxy });
    panel.clashProxyState = Object.assign({}, panel.clashProxyState || clashConfigSummary(), {
      switching: { group, proxy },
      message: `Switch accepted. Closing existing connections so new traffic uses ${proxy}...`,
    });
    postClashState(panel);
    const connectionReset = await closeClashConnections(config);
    panel.lastActionNotice = `Switched ${group} to ${proxy}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 3000);
    const refreshed = await refreshClashProxyState(panel);
    panel.clashProxyState = Object.assign({}, refreshed || clashConfigSummary(), {
      switching: null,
      selectedGroup: group,
      selectedProxy: proxy,
      connectionReset,
      message: connectionReset.ok
        ? `Switched ${group} to ${proxy}. Existing connections were closed; verifying public IP...`
        : `Switched ${group} to ${proxy}. Could not close old connections: ${connectionReset.error || "unknown error"}. Verifying public IP...`,
    });
    postClashState(panel);
    const ipInfo = await runNetworkProbe(panel, "ipinfo");
    panel.clashProxyState = Object.assign({}, panel.clashProxyState || clashConfigSummary(), {
      switching: null,
      selectedGroup: group,
      selectedProxy: proxy,
      connectionReset,
      ipVerifiedAt: new Date().toISOString(),
      ipVerificationOk: Boolean(ipInfo && ipInfo.ok),
      message: connectionReset.ok
        ? `Switched ${group} to ${proxy} without restart. Existing connections were closed and Public IP Info was refreshed.`
        : `Switched ${group} to ${proxy} without restart. Public IP Info was refreshed; old connections may linger because ${connectionReset.error || "the controller rejected connection close"}.`,
    });
    postClashState(panel);
    return panel.clashProxyState;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    panel.clashProxyState = Object.assign({}, panel.clashProxyState || clashConfigSummary(), {
      switching: null,
      ok: false,
      error: message,
      message,
      updatedAt: new Date().toISOString(),
    });
    vscode.window.showWarningMessage(`Codex-Managed-Agent: Clash/Mihomo proxy switch failed: ${message}`);
    postClashState(panel);
    return { ok: false, error: message };
  }
}

module.exports = {
  clashConfigSummary,
  getNetworkProbeResults,
  refreshClashProxyState,
  runNetworkProbe,
  switchClashProxy,
};
