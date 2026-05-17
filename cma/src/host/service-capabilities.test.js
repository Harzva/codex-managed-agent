const assert = require("node:assert/strict");
const test = require("node:test");

const { getServiceCapabilityBlockReason } = require("./service-capabilities");

test("allows missing and unavailable service metadata", () => {
  const unavailable = {
    ok: false,
    readOnly: true,
    capabilities: {
      lifecycle: false,
      rename: false,
      scanSessions: false,
      hardDelete: false,
    },
  };

  assert.equal(getServiceCapabilityBlockReason(undefined, "lifecycle", "lifecycle actions"), "");
  assert.equal(getServiceCapabilityBlockReason(null, "rename", "rename"), "");
  assert.equal(getServiceCapabilityBlockReason("bad", "scanSessions", "scan Codex sessions"), "");
  assert.equal(getServiceCapabilityBlockReason(unavailable, "lifecycle", "lifecycle actions"), "");
  assert.equal(getServiceCapabilityBlockReason(unavailable, "rename", "rename"), "");
  assert.equal(getServiceCapabilityBlockReason(unavailable, "scanSessions", "scan Codex sessions"), "");
});

test("allows configured read-write capability metadata", () => {
  const configuredReadWrite = {
    ok: true,
    backendMode: "configured",
    readOnly: false,
    capabilities: {
      lifecycle: true,
      scanSessions: true,
      hardDelete: true,
    },
  };

  assert.equal(getServiceCapabilityBlockReason(configuredReadWrite, "lifecycle", "lifecycle actions"), "");
  assert.equal(getServiceCapabilityBlockReason(configuredReadWrite, "scanSessions", "scan Codex sessions"), "");
});

test("blocks read-only Node metadata", () => {
  const reason = getServiceCapabilityBlockReason(
    {
      ok: true,
      backendMode: "node",
      readOnly: true,
      capabilities: {
        lifecycle: false,
        rename: false,
        scanSessions: false,
        hardDelete: false,
      },
    },
    "scanSessions",
    "scan Codex sessions",
  );

  assert.match(reason, /Node backend is read-only/);
  assert.match(reason, /scan Codex sessions/);
});

test("blocks explicit capability-false metadata", () => {
  const nodeReadWrite = {
    ok: true,
    backendMode: "node",
    readOnly: false,
    capabilities: {
      lifecycle: false,
      rename: false,
      scanSessions: false,
      hardDelete: false,
    },
  };

  assert.match(
    getServiceCapabilityBlockReason(nodeReadWrite, "lifecycle", "lifecycle actions"),
    /does not allow lifecycle actions/,
  );
  assert.match(
    getServiceCapabilityBlockReason(nodeReadWrite, "rename", "rename"),
    /does not allow rename/,
  );
  assert.match(
    getServiceCapabilityBlockReason(nodeReadWrite, "scanSessions", "scan Codex sessions"),
    /does not allow scan Codex sessions/,
  );
  assert.match(
    getServiceCapabilityBlockReason(nodeReadWrite, "hardDelete", "hard delete"),
    /does not allow hard delete/,
  );
});
