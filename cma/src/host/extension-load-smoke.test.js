const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("module");

function createFunctionProxy() {
  const proxy = new Proxy(function () {}, {
    get: () => proxy,
    apply: () => undefined,
  });
  return proxy;
}

function createVscodeMock() {
  const functionProxy = createFunctionProxy();
  return new Proxy({}, {
    get(target, prop) {
      if (prop === "Uri") {
        return {
          joinPath: (...parts) => ({
            fsPath: parts.map((part) => part && part.fsPath ? part.fsPath : String(part)).join("/"),
          }),
        };
      }
      if (prop === "ViewColumn") return { One: 1, Two: 2, Active: -1, Beside: -2 };
      if (prop === "ExtensionMode") return { Test: 3, Development: 2, Production: 1 };
      if (prop === "ProgressLocation") return { Notification: 15, Window: 10 };
      if (prop === "window") return new Proxy({}, { get: () => () => ({ dispose() {} }) });
      if (prop === "workspace") {
        return {
          workspaceFolders: [],
          getConfiguration: () => ({ get: () => undefined, update: async () => {} }),
          onDidChangeConfiguration: () => ({ dispose() {} }),
        };
      }
      if (prop === "commands") {
        return {
          registerCommand: () => ({ dispose() {} }),
          executeCommand: async () => undefined,
        };
      }
      if (prop === "env") return { openExternal: async () => true };
      return target[prop] || functionProxy;
    },
  });
}

test("extension entrypoint loads with VS Code API mocked", () => {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "vscode") return createVscodeMock();
    return originalLoad.apply(this, arguments);
  };
  try {
    delete require.cache[require.resolve("../../extension")];
    const extension = require("../../extension");
    assert.equal(typeof extension.activate, "function");
    assert.equal(typeof extension.deactivate, "function");
  } finally {
    Module._load = originalLoad;
  }
});
