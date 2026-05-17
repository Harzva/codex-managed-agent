const assert = require("node:assert/strict");
const Module = require("node:module");
const net = require("node:net");
const test = require("node:test");

function loadServerWithVscodeStub(overrides = {}) {
  delete require.cache[require.resolve("./server")];
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "vscode") {
      return {
        ConfigurationTarget: {
          Workspace: "Workspace",
        },
        workspace: {
          getConfiguration() {
            return {
              get(key, fallback) {
                if (Object.prototype.hasOwnProperty.call(overrides, key)) {
                  return overrides[key];
                }
                return fallback;
              },
              update() {
                return Promise.resolve();
              },
            };
          },
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("./server");
  } finally {
    Module._load = originalLoad;
  }
}

const { closeNodeBackendServer, getConfig, probeServer, serviceMetadataFromPayload, startNodeBackendServer, startServer, summarizeServiceState } = loadServerWithVscodeStub();

async function getFreePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function withHttpServer(handler, run) {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  const http = require("node:http");
  const app = http.createServer(handler);
  await new Promise((resolve) => app.listen(port, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${port}/`);
  } finally {
    await new Promise((resolve) => app.close(resolve));
  }
}

test("serviceMetadataFromPayload extracts Node health metadata", () => {
  assert.deepEqual(serviceMetadataFromPayload({
    ok: true,
    backendMode: "node",
    backendSource: "local",
    readOnly: true,
    capabilities: {
      threads: true,
      lifecycle: false,
    },
  }), {
    backendMode: "node",
    backendSource: "local",
    readOnly: true,
    capabilities: {
      threads: true,
      lifecycle: false,
    },
  });
});

test("serviceMetadataFromPayload normalizes legacy Node backend metadata", () => {
  assert.deepEqual(serviceMetadataFromPayload({
    backendMode: "node-fallback",
    backendSource: "fallback",
    readOnly: false,
  }), {
    backendMode: "node",
    backendSource: "local",
    readOnly: false,
  });
});

test("getConfig exposes Node-only service settings", () => {
  assert.equal(getConfig().baseUrl, "http://127.0.0.1:8787/");
  assert.deepEqual(Object.keys(getConfig()).sort(), ["baseUrl", "defaultSurface", "smartMode"]);
});

test("startServer launches the Node backend", async (t) => {
  const port = await getFreePort();
  const serverModule = loadServerWithVscodeStub({
    baseUrl: `http://127.0.0.1:${port}/`,
  });
  t.after(() => serverModule.closeNodeBackendServer());

  const state = await serverModule.startServer({ fsPath: __dirname });

  assert.equal(state.ok, true);
  assert.equal(state.backendMode, "node");
  assert.equal(state.backendSource, "local");
  assert.equal(state.readOnly, false);
  assert.equal(state.baseUrl, `http://127.0.0.1:${port}/`);
});

test("startNodeBackendServer returns Node backend capability metadata for a local candidate", async (t) => {
  t.after(() => closeNodeBackendServer());
  const port = await getFreePort();
  const state = await startNodeBackendServer(`http://127.0.0.1:${port}/`, "test-node-start");

  assert.equal(state.ok, true);
  assert.equal(state.started, true);
  assert.equal(state.backendMode, "node");
  assert.equal(state.backendSource, "local");
  assert.equal(state.readOnly, false);
  assert.deepEqual(state.capabilities, {
    threads: true,
    threadDetail: true,
    insights: true,
    scanSessions: true,
    lifecycle: true,
    watch: true,
    rename: false,
    hardDelete: false,
  });
});

test("startNodeBackendServer closes existing Node backend before switching candidates", async (t) => {
  t.after(() => closeNodeBackendServer());
  const firstPort = await getFreePort();
  const secondPort = await getFreePort();
  const firstBaseUrl = `http://127.0.0.1:${firstPort}/`;
  const secondBaseUrl = `http://127.0.0.1:${secondPort}/`;

  const first = await startNodeBackendServer(firstBaseUrl, "first-test-candidate");
  const second = await startNodeBackendServer(secondBaseUrl, "second-test-candidate");
  const firstAgain = await startNodeBackendServer(firstBaseUrl, "first-test-candidate-again");

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(firstAgain.ok, true);
  assert.equal(firstAgain.baseUrl, firstBaseUrl);
});

test("probeServer falls back to threads API for older backends", async () => {
  await withHttpServer((req, res) => {
    if (req.url && req.url.startsWith("/api/threads")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ items: [], meta: { total: 0 } }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ detail: "not found" }));
  }, async (baseUrl) => {
    const probe = await probeServer(baseUrl);
    assert.equal(probe.ok, true);
    assert.equal(probe.payload.probe, "threads");
  });
});

test("probeServer does not treat a root web page as backend health", async () => {
  await withHttpServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body>not codex</body></html>");
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ detail: "not found" }));
  }, async (baseUrl) => {
    const probe = await probeServer(baseUrl);
    assert.equal(probe.ok, false);
  });
});

test("summarizeServiceState returns configured read-write defaults when ok", () => {
  const state = summarizeServiceState(true, {
    baseUrl: "http://127.0.0.1:8787/",
  });

  assert.equal(state.ok, true);
  assert.equal(state.backendMode, "configured");
  assert.equal(state.backendSource, "configured");
  assert.equal(state.readOnly, false);
  assert.equal(state.baseUrl, "http://127.0.0.1:8787/");
  assert.deepEqual(state.capabilities, {
    threads: true,
    threadDetail: true,
    insights: true,
    scanSessions: true,
    lifecycle: true,
    watch: true,
    rename: false,
    hardDelete: true,
  });
});

test("summarizeServiceState returns unavailable read-only defaults when not ok", () => {
  const state = summarizeServiceState(false, {
    message: "Server not reachable",
  });

  assert.equal(state.ok, false);
  assert.equal(state.backendMode, "unavailable");
  assert.equal(state.backendSource, "configured");
  assert.equal(state.readOnly, true);
  assert.equal(state.message, "Server not reachable");
  assert.deepEqual(state.capabilities, {
    threads: false,
    threadDetail: false,
    insights: false,
    scanSessions: false,
    lifecycle: false,
    watch: false,
    rename: false,
    hardDelete: false,
  });
});

test("summarizeServiceState supports read-only backend override", () => {
  const state = summarizeServiceState(true, {
    backendMode: "node",
    backendSource: "local",
    readOnly: true,
  });

  assert.equal(state.ok, true);
  assert.equal(state.backendMode, "node");
  assert.equal(state.backendSource, "local");
  assert.equal(state.readOnly, true);
  assert.deepEqual(state.capabilities, {
    threads: false,
    threadDetail: false,
    insights: false,
    scanSessions: false,
    lifecycle: false,
    watch: false,
    rename: false,
    hardDelete: false,
  });
});

test("summarizeServiceState merges capability overrides", () => {
  const state = summarizeServiceState(true, {
    backendMode: "node",
    readOnly: true,
    capabilities: {
      threads: true,
      threadDetail: true,
      insights: true,
    },
  });

  assert.equal(state.backendMode, "node");
  assert.equal(state.readOnly, true);
  assert.deepEqual(state.capabilities, {
    threads: true,
    threadDetail: true,
    insights: true,
    scanSessions: false,
    lifecycle: false,
    watch: false,
    rename: false,
    hardDelete: false,
  });
});
