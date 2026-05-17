const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createNodeBackendServer } = require("../vendor/cma-node-backend/server");

function writeRolloutFixture(codexHome) {
  const sessionsDir = path.join(codexHome, "sessions", "2026", "05", "17");
  const projectDir = path.join(codexHome, "project");
  const sessionId = "019d24c8-f967-7583-bba7-8b1c750b5aa0";
  const rolloutPath = path.join(sessionsDir, `rollout-2026-05-17T01-00-00-${sessionId}.jsonl`);
  fs.mkdirSync(sessionsDir, { recursive: true });
  fs.mkdirSync(projectDir, { recursive: true });
  const lines = [
    {
      timestamp: "2026-05-17T01:00:00.000Z",
      type: "session_meta",
      payload: {
        id: sessionId,
        timestamp: "2026-05-17T01:00:00.000Z",
        source: "cli",
        cwd: projectDir,
        model_provider: "openai",
        model: "gpt-5.4",
        reasoning_effort: "medium",
        sandbox_policy: { mode: "workspace-write" },
        approval_policy: "never",
        cli_version: "0.1.0",
      },
    },
    {
      timestamp: "2026-05-17T01:01:00.000Z",
      type: "response_item",
      payload: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Build the desktop shell" }],
      },
    },
    {
      timestamp: "2026-05-17T01:02:00.000Z",
      type: "response_item",
      payload: {
        type: "function_call",
        name: "exec_command",
      },
    },
  ];
  fs.writeFileSync(rolloutPath, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf8");
  return sessionId;
}

function getJson(server, pathname) {
  return new Promise((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      http.get(`http://127.0.0.1:${port}${pathname}`, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          server.close(() => {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(error);
            }
          });
        });
      }).on("error", reject);
    });
  });
}

test("desktop backend reads Codex home while writing sidecar state into isolated app data", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cma-desktop-"));
  const codexHome = path.join(root, ".codex");
  const stateHome = path.join(root, "desktop-state");
  const sessionId = writeRolloutFixture(codexHome);
  const threadStatePath = path.join(stateHome, "thread-state.json");
  const indexPath = path.join(stateHome, "session-index.json");
  const server = createNodeBackendServer({
    codexHome,
    homeDir: stateHome,
    sessionIndexPath: indexPath,
    indexPath,
    threadStatePath,
  });

  const list = await getJson(server, "/api/threads?scope=all&limit=20");
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].id, sessionId);
  assert.equal(fs.existsSync(indexPath), true);
  assert.equal(fs.existsSync(path.join(codexHome, "node-backend-session-index.json")), false);
});
