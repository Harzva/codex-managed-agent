const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const {
  createAgentsMdFromTemplate,
  readHistoryJsonl,
  scanAllMemory,
  saveMemoryFile,
} = require("./memory-manager");

test("scanAllMemory reports project files and missing memory entries", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-memory-scan-"));
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-memory-home-"));
  const previousCodexHome = process.env.CODEX_HOME;
  t.after(() => {
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(codexHome, { recursive: true, force: true });
  });
  process.env.CODEX_HOME = codexHome;

  fs.mkdirSync(path.join(workspace, ".codex"), { recursive: true });
  fs.mkdirSync(path.join(workspace, ".codex-team"), { recursive: true });
  fs.writeFileSync(path.join(workspace, ".codex", "AGENTS.md"), "# Project\n", "utf8");
  fs.writeFileSync(path.join(codexHome, "config.toml"), 'model = "gpt-5.5"\n', "utf8");

  const memory = scanAllMemory(workspace);
  const projectNames = memory.project.files.map((file) => file.name);
  const globalConfig = memory.global.files.find((file) => file.name === "config.toml");

  assert.deepEqual(projectNames, ["AGENTS.md", "config.toml", "history.jsonl", ".codex-team/"]);
  assert.equal(memory.project.files.find((file) => file.name === "AGENTS.md").exists, true);
  assert.equal(memory.project.files.find((file) => file.name === "config.toml").exists, false);
  assert.equal(memory.project.files.find((file) => file.name === "history.jsonl").editable, false);
  assert.equal(memory.project.files.find((file) => file.name === ".codex-team/").isDirectory, true);
  assert.equal(globalConfig.exists, true);
  assert.equal(globalConfig.kind, "config-toml");
});

test("createAgentsMdFromTemplate supports fallback and saveMemoryFile updates content", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-memory-create-"));
  const codexHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-memory-create-home-"));
  const previousCodexHome = process.env.CODEX_HOME;
  t.after(() => {
    if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = previousCodexHome;
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.rmSync(codexHome, { recursive: true, force: true });
  });
  process.env.CODEX_HOME = codexHome;

  const targetPath = path.join(workspace, ".codex", "AGENTS.md");
  const created = createAgentsMdFromTemplate("from-global", targetPath);
  assert.equal(created.ok, true);
  assert.match(created.content, /# Project Instructions/);
  assert.equal(fs.existsSync(targetPath), true);

  const saved = saveMemoryFile(targetPath, "# Updated\n");
  assert.equal(saved.ok, true);
  assert.equal(fs.readFileSync(targetPath, "utf8"), "# Updated\n");
});

test("readHistoryJsonl skips malformed lines and caps to the requested tail", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-memory-history-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const historyPath = path.join(workspace, "history.jsonl");
  fs.writeFileSync(historyPath, [
    JSON.stringify({ role: "user", content: "first", timestamp: "2026-05-07T00:00:00Z" }),
    "not-json",
    JSON.stringify({ role: "assistant", content: "second", timestamp: "2026-05-07T00:00:01Z" }),
    JSON.stringify({ role: "tool", name: "shell", input: "npm test", output: "ok", timestamp: "2026-05-07T00:00:02Z" }),
  ].join("\n"), "utf8");

  const history = readHistoryJsonl(historyPath, { maxLines: 3 });
  assert.equal(history.totalLines, 4);
  assert.equal(history.truncated, true);
  assert.deepEqual(history.entries.map((entry) => entry.role), ["assistant", "tool"]);
  assert.equal(history.entries[1].toolName, "shell");
  assert.equal(history.entries[1].content, "ok");
});
