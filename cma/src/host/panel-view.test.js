const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");

function loadPanelViewWithVscodeStub() {
  delete require.cache[require.resolve("./panel-view")];
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "vscode") {
      return {
        Uri: {
          joinPath: (...parts) => ({
            fsPath: parts.map((part) => (part && part.fsPath ? part.fsPath : String(part))).join("/"),
          }),
        },
        workspace: {
          getConfiguration() {
            return {
              get(_key, fallback) {
                return fallback;
              },
            };
          },
        },
        commands: {
          executeCommand() {
            return Promise.resolve();
          },
        },
        window: {
          createWebviewPanel() {
            return { webview: createMockWebview(), reveal() {}, onDidDispose() {}, dispose() {} };
          },
          registerWebviewViewProvider() {
            return { dispose() {} };
          },
          showErrorMessage() {},
        },
        ViewColumn: { One: 1, Two: 2, Active: -1, Beside: -2 },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return require("./panel-view");
  } finally {
    Module._load = originalLoad;
  }
}

function createMockWebview() {
  const webview = {
    options: undefined,
    handler: undefined,
    html: "",
    onDidReceiveMessage(handler) {
      webview.handler = handler;
      return { dispose() {} };
    },
    asWebviewUri(uri) {
      return `vscode-resource:${uri && uri.fsPath ? uri.fsPath : String(uri)}`;
    },
    postMessage() {
      return Promise.resolve(true);
    },
  };
  return webview;
}

test("ready with running filter refreshes all thread scopes", async () => {
  const { attachWebview } = loadPanelViewWithVscodeStub();
  const webview = createMockWebview();
  const refreshCalls = [];
  const panel = {
    extensionUri: { fsPath: "/tmp/cma-extension" },
    threadListScope: "live",
    authMaintenanceEnabled: false,
    storage: {
      get(_key, fallback) {
        return fallback;
      },
      update() {
        return Promise.resolve();
      },
    },
    refresh(options) {
      refreshCalls.push(options);
      return Promise.resolve();
    },
  };

  attachWebview(panel, webview);
  await webview.handler({ type: "ready", filter: "running" });

  assert.equal(panel.threadListScope, "all");
  assert.deepEqual(refreshCalls, [{ silent: true, mode: "full", scope: "all" }]);
});

test("openSessionToolDiff message delegates to panel diff opener", async () => {
  const { attachWebview } = loadPanelViewWithVscodeStub();
  const webview = createMockWebview();
  const calls = [];
  const panel = {
    extensionUri: { fsPath: "/tmp/cma-extension" },
    authMaintenanceEnabled: false,
    storage: {
      get(_key, fallback) {
        return fallback;
      },
      update() {
        return Promise.resolve();
      },
    },
    openSessionToolDiff(payload) {
      calls.push(payload);
      return Promise.resolve();
    },
  };

  attachWebview(panel, webview);
  await webview.handler({
    type: "openSessionToolDiff",
    threadId: "thread-1",
    diff: { preview: "@@\n-old\n+new" },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].threadId, "thread-1");
  assert.equal(calls[0].diff.preview, "@@\n-old\n+new");
});

test("generateThreadEvidenceReview message delegates to panel evidence review", async () => {
  const { attachWebview } = loadPanelViewWithVscodeStub();
  const webview = createMockWebview();
  const calls = [];
  const panel = {
    extensionUri: { fsPath: "/tmp/cma-extension" },
    authMaintenanceEnabled: false,
    storage: {
      get(_key, fallback) {
        return fallback;
      },
      update() {
        return Promise.resolve();
      },
    },
    generateThreadEvidenceReview(threadId, force) {
      calls.push({ threadId, force });
      return Promise.resolve();
    },
  };

  attachWebview(panel, webview);
  await webview.handler({
    type: "generateThreadEvidenceReview",
    threadId: "thread-1",
    force: true,
  });

  assert.deepEqual(calls, [{ threadId: "thread-1", force: true }]);
});
