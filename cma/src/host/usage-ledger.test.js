const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const usageLedger = require("./usage-ledger");

function withTempHome(t) {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "cma-usage-ledger-"));
  const originalHomedir = os.homedir;
  os.homedir = () => tempHome;
  t.after(() => {
    os.homedir = originalHomedir;
    fs.rmSync(tempHome, { recursive: true, force: true });
  });
  return tempHome;
}

function writeCodexLog(home, name, events) {
  const logsDir = path.join(home, ".codex-managed-agent", "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const logPath = path.join(logsDir, name);
  fs.writeFileSync(logPath, events.map((event) => JSON.stringify(event)).join("\n") + "\n", "utf8");
  return logPath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test("ingestKnownCliUsageLogs preserves cached input and reasoning tokens when present", (t) => {
  const home = withTempHome(t);
  writeCodexLog(home, "cached.log", [
    { type: "thread.started", thread_id: "thread-cache-1" },
    {
      type: "turn.completed",
      model: "gpt-test-cache",
      usage: {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 80 },
        output_tokens: 20,
        output_tokens_details: { reasoning_tokens: 5 },
      },
    },
  ]);

  assert.equal(usageLedger.ingestKnownCliUsageLogs(), 1);

  const events = readJsonl(usageLedger.ledgerPath());
  assert.equal(events.length, 1);
  assert.equal(events[0].input_tokens, 100);
  assert.equal(events[0].cached_input_tokens, 80);
  assert.equal(events[0].uncached_input_tokens, 20);
  assert.equal(events[0].cache_known, true);
  assert.equal(events[0].cache_hit_rate, 0.8);
  assert.equal(events[0].reasoning_output_tokens, 5);
  assert.equal(events[0].model, "gpt-test-cache");

  const report = readJson(usageLedger.reportPath());
  assert.equal(report.summary.total_input_tokens, 100);
  assert.equal(report.summary.total_cached_input_tokens, 80);
  assert.equal(report.summary.total_uncached_input_tokens, 20);
  assert.equal(report.summary.cache_known_input_tokens, 100);
  assert.equal(report.summary.cache_unknown_events, 0);
  assert.equal(report.summary.cache_hit_rate, 0.8);
  assert.equal(report.summary.total_reasoning_output_tokens, 5);
});

test("missing cached token detail remains unknown instead of zero cache hit", (t) => {
  const home = withTempHome(t);
  writeCodexLog(home, "cached.log", [
    { type: "thread.started", thread_id: "thread-cache-known" },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 80 },
        output_tokens: 20,
      },
    },
  ]);
  writeCodexLog(home, "unknown.log", [
    { type: "thread.started", thread_id: "thread-cache-unknown" },
    {
      type: "turn.completed",
      usage: {
        input_tokens: 50,
        output_tokens: 10,
      },
    },
  ]);

  assert.equal(usageLedger.ingestKnownCliUsageLogs(), 2);

  const events = readJsonl(usageLedger.ledgerPath()).sort((a, b) => String(a.log_path).localeCompare(String(b.log_path)));
  assert.equal(events.length, 2);
  assert.equal(events[1].cache_known, false);
  assert.equal(events[1].cached_input_tokens, null);
  assert.equal(events[1].cache_hit_rate, null);

  const report = readJson(usageLedger.reportPath());
  assert.equal(report.summary.total_input_tokens, 150);
  assert.equal(report.summary.total_cached_input_tokens, 80);
  assert.equal(report.summary.cache_known_input_tokens, 100);
  assert.equal(report.summary.cache_known_events, 1);
  assert.equal(report.summary.cache_unknown_events, 1);
  assert.equal(report.summary.cache_hit_rate, 0.8);
});
