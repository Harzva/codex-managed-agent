const assert = require("node:assert/strict");
const fs = require("fs");
const Module = require("module");
const os = require("os");
const path = require("path");
const test = require("node:test");

const vscodeMock = {
  window: {
    showWarningMessage: async () => undefined,
    showInformationMessage() {},
    setStatusBarMessage() {},
    showInputBox: async () => "",
  },
  workspace: {
    workspaceFolders: [],
    openTextDocument: async () => ({}),
  },
  Uri: {
    file: (filePath) => ({ fsPath: filePath }),
  },
};

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "vscode") {
    return vscodeMock;
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  TASK_STATES,
  createTeamWorkspace: createTeamWorkspaceRecord,
  generateTeamOrchestrationDraft,
  saveTeamOrchestrationDraft,
  createSnakeDemoTeamTask,
  deleteTeamWorkspace,
  deleteTeamTask,
  launchTeamWorkspaceOrchestration,
  pathsForWorkspace,
  prepareTeamWorkspaceRun,
  prepareTeamTaskRetry,
  readTeamCoordination,
  readTeamSpace,
  buildTeamDispatchFailurePatch,
  updateTeamTaskDispatch,
  updateTeamTaskDefinition,
  validateTeamInboxRecord,
  validateTeamSpaceFiles,
  validateTeamTaskRecord,
} = require("./team-coordination");
const accountManager = require("./account-manager");

Module._load = originalLoad;

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function appendJsonl(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizePathForAssert(value) {
  return path.normalize(String(value || ""));
}

function createTeamWorkspace(t) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-team-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const paths = pathsForWorkspace(workspace);
  fs.mkdirSync(paths.workspacesDir, { recursive: true });
  fs.mkdirSync(paths.archivedWorkspacesDir, { recursive: true });
  fs.mkdirSync(paths.tasksDir, { recursive: true });
  fs.mkdirSync(paths.agentsDir, { recursive: true });
  fs.mkdirSync(paths.eventsDir, { recursive: true });
  fs.mkdirSync(paths.inboxDir, { recursive: true });
  fs.writeFileSync(paths.teamBriefPath, "# Team Brief\n", "utf8");
  writeJson(paths.metaPath, {
    team_id: "cma-team",
    workspace,
    protocol_version: 1,
    mode: "mailbox",
  });
  return { workspace, paths };
}

function createPanel(workspace) {
  vscodeMock.workspace.workspaceFolders = [{ uri: { fsPath: workspace } }];
  return {
    selectedThreadId: "",
    lastPayload: {
      dashboard: {
        threads: [],
      },
    },
    lastActionNotice: "",
    async refresh() {},
  };
}

test("validates and summarizes a healthy team mailbox", (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const task = {
    task_id: "task-alpha",
    title: "Alpha",
    owner: "thread-alpha",
    status: TASK_STATES.RUNNING,
    priority: "normal",
    dependencies: [],
    inputs: [],
    goal: "Do alpha work",
    acceptance_criteria: [],
    artifacts: [],
    lease_until: "2099-01-01T00:00:00.000Z",
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:01:00.000Z",
  };
  writeJson(path.join(paths.tasksDir, "task-alpha.json"), task);
  writeJson(path.join(paths.agentsDir, "thread-alpha.json"), {
    agent_id: "thread-alpha",
    state: "running",
    current_task_id: "task-alpha",
    heartbeat_at: "2026-04-18T00:01:00.000Z",
    updated_at: "2026-04-18T00:01:00.000Z",
  });
  appendJsonl(paths.eventsLogPath, {
    event_id: "event-1",
    type: "task.claimed",
    timestamp: "2026-04-18T00:01:00.000Z",
    task_id: "task-alpha",
    agent_id: "thread-alpha",
    payload: { lease_until: task.lease_until },
  });
  appendJsonl(path.join(paths.inboxDir, "thread-alpha.jsonl"), {
    message_id: "msg-1",
    target_agent_id: "thread-alpha",
    created_at: "2026-04-18T00:00:30.000Z",
    type: "task.assigned",
    task_id: "task-alpha",
    payload: { title: "Alpha" },
  });

  const team = readTeamSpace(workspace);
  assert.equal(team.available, true);
  assert.equal(team.summary.taskCount, 1);
  assert.equal(team.summary.runningCount, 1);
  assert.equal(team.summary.agentCount, 1);
  assert.equal(team.validation.ok, true);
  assert.equal(team.validation.taskCount, 1);
  assert.equal(team.validation.eventCount, 1);
  assert.equal(team.validation.inboxMessageCount, 1);
});

test("exposes local built-in role plugin catalog for Team UI role-picker foundations", (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const coordination = readTeamCoordination(panel, { threads: [] }, null);
  const rolePlugins = coordination && coordination.rolePlugins ? coordination.rolePlugins : {};
  const organizationTemplates = coordination && coordination.organizationTemplates ? coordination.organizationTemplates : {};
  const templates = Array.isArray(rolePlugins.templates) ? rolePlugins.templates : [];
  const organizationCatalog = Array.isArray(organizationTemplates.templates) ? organizationTemplates.templates : [];
  const roleIds = templates.map((template) => template.role_id);
  const organizationTemplateIds = organizationCatalog.map((template) => template.template_id);

  assert.equal(rolePlugins.source, "local_builtin");
  assert.equal(rolePlugins.schema_version, 1);
  assert.deepEqual(rolePlugins.built_in_role_ids, roleIds);
  assert.equal(templates.length >= 10, true);
  assert.equal(templates[0].role_template_source, "builtin");
  assert.equal(templates[0].role_template_version, 1);
  assert.equal(Array.isArray(templates[0].default_write_paths), true);
  assert.equal(typeof templates[0].role_prompt, "string");
  assert.deepEqual(
    roleIds,
    [
      "supervisor",
      "planner",
      "implementer",
      "tester",
      "reviewer",
      "reflector",
      "debugger",
      "researcher",
      "documenter",
      "integrator",
    ],
  );
  assert.match(String(templates[0].summary || ""), /planning|DAG|worker/i);
  assert.equal(organizationTemplates.source, "local_builtin");
  assert.equal(organizationTemplates.schema_version, 1);
  assert.equal(organizationCatalog.length, 4);
  assert.deepEqual(
    organizationTemplateIds,
    ["fast-build-team", "careful-build-team", "research-team", "bugfix-team"],
  );
});

test("keeps stable role plugin contract keys in Team coordination payload", (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const coordination = readTeamCoordination(panel, { threads: [] }, null);
  const rolePlugins = coordination && coordination.rolePlugins ? coordination.rolePlugins : {};
  const templates = Array.isArray(rolePlugins.templates) ? rolePlugins.templates : [];
  const stableKeys = [
    "role_id",
    "display_name",
    "description",
    "default_provider",
    "default_model",
    "can_edit_code",
    "writes_blackboard",
    "default_read_paths",
    "default_write_paths",
    "default_expected_outputs",
    "expected_outputs",
    "result_envelope",
    "prompt_contract",
    "role_template_source",
    "role_template_version",
    "role_prompt",
  ];

  assert.equal(templates.length >= 10, true);
  templates.forEach((template) => {
    stableKeys.forEach((key) => {
      assert.ok(Object.prototype.hasOwnProperty.call(template, key), `${template.role_id} is missing ${key}`);
    });
    assert.equal(Array.isArray(template.default_read_paths), true);
    assert.equal(Array.isArray(template.default_write_paths), true);
    assert.equal(Array.isArray(template.default_expected_outputs), true);
    assert.equal(Array.isArray(template.expected_outputs), true);
    assert.deepEqual(template.expected_outputs, template.default_expected_outputs);
    assert.equal(Array.isArray(template.result_envelope), true);
    assert.equal(Array.isArray(template.prompt_contract), true);
    assert.equal(typeof template.default_provider, "string");
    assert.equal(typeof template.can_edit_code, "boolean");
    assert.equal(typeof template.writes_blackboard, "boolean");
    assert.equal(typeof template.role_template_version, "number");
    assert.equal(typeof template.role_prompt, "string");
  });
});

test("loads local custom role plugins into Team coordination payload", (t) => {
  const { workspace } = createTeamWorkspace(t);
  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  writeJson(path.join(rolesDir, "release-guard.json"), {
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Checks release readiness and records residual risk.",
    can_edit_code: false,
    writes_blackboard: true,
    default_write_paths: ["task-plans"],
    expected_outputs: ["release readiness summary"],
    prompt_contract: ["Require green checks before release."],
  });

  const panel = createPanel(workspace);
  const coordination = readTeamCoordination(panel, { threads: [] }, null);
  const rolePlugins = coordination && coordination.rolePlugins ? coordination.rolePlugins : {};
  const templates = Array.isArray(rolePlugins.templates) ? rolePlugins.templates : [];
  const custom = templates.find((template) => template.role_id === "release-guard");
  const implementers = templates.filter((template) => template.role_id === "implementer");

  assert.equal(rolePlugins.source, "local_mixed");
  assert.equal(Array.isArray(rolePlugins.built_in_role_ids), true);
  assert.equal(rolePlugins.built_in_role_ids.includes("supervisor"), true);
  assert.equal(rolePlugins.built_in_role_ids.includes("implementer"), true);
  assert.ok(custom);
  assert.equal(custom.display_name, "Release Guard");
  assert.equal(custom.role_template_source, "custom");
  assert.equal(custom.role_template_version, 1);
  assert.deepEqual(custom.default_write_paths, ["task-plans"]);
  assert.deepEqual(custom.default_expected_outputs, ["release readiness summary"]);
  assert.equal(implementers.length, 1);
});

test("keeps Team coordination role template ordering built-in-first with custom append", (t) => {
  const { workspace } = createTeamWorkspace(t);
  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  writeJson(path.join(rolesDir, "ordering.json"), [
    { role_id: "release_guard" },
    { role_id: "api_designer" },
  ]);

  const panel = createPanel(workspace);
  const coordination = readTeamCoordination(panel, { threads: [] }, null);
  const rolePlugins = coordination && coordination.rolePlugins ? coordination.rolePlugins : {};
  const templates = Array.isArray(rolePlugins.templates) ? rolePlugins.templates : [];
  const roleIds = templates.map((template) => template.role_id);
  const builtInRoleIds = [
    "supervisor",
    "planner",
    "implementer",
    "tester",
    "reviewer",
    "reflector",
    "debugger",
    "researcher",
    "documenter",
    "integrator",
  ];

  assert.equal(rolePlugins.source, "local_mixed");
  assert.deepEqual(roleIds.slice(0, builtInRoleIds.length), builtInRoleIds);
  assert.deepEqual(roleIds.slice(builtInRoleIds.length), ["release-guard", "api-designer"]);
});

test("keeps built-in implementer canonical when local role plugins collide on id, name, or alias", (t) => {
  const { workspace } = createTeamWorkspace(t);
  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  writeJson(path.join(rolesDir, "collisions.json"), [
    {
      role_id: "implementer",
      display_name: "Implementer Override",
      description: "Attempt to replace built-in implementer.",
      aliases: ["developer"],
    },
    {
      role_id: "shipper",
      role_name: "Implementer",
      display_name: "Implementer",
      description: "Custom role with built-in name/alias collisions but distinct id.",
      aliases: ["developer", "coder"],
      default_write_paths: ["docs"],
    },
  ]);

  const panel = createPanel(workspace);
  const coordination = readTeamCoordination(panel, { threads: [] }, null);
  const rolePlugins = coordination && coordination.rolePlugins ? coordination.rolePlugins : {};
  const templates = Array.isArray(rolePlugins.templates) ? rolePlugins.templates : [];
  const implementers = templates.filter((template) => template.role_id === "implementer");
  const shipper = templates.find((template) => template.role_id === "shipper");

  assert.equal(rolePlugins.source, "local_mixed");
  assert.equal(implementers.length, 1);
  assert.equal(implementers[0].display_name, "Implementer");
  assert.equal(implementers[0].role_template_source, "builtin");
  assert.equal(implementers[0].default_model, "gpt-5.3-codex");
  assert.ok(shipper);
  assert.equal(shipper.role_template_source, "custom");
  assert.deepEqual(shipper.aliases, ["developer", "coder"]);
  assert.deepEqual(shipper.default_write_paths, ["docs"]);
});

test("migrates legacy tasks into one-to-one Team workspaces", (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const task = {
    task_id: "task-legacy",
    title: "Legacy",
    owner: "thread-legacy",
    status: TASK_STATES.RUNNING,
    priority: "normal",
    dependencies: [],
    inputs: [{ type: "prompt", value: "Do legacy work" }],
    goal: "Do legacy work",
    acceptance_criteria: [],
    artifacts: [],
    runtime: { state: "running", pid: 1234, pid_running: false },
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:01:00.000Z",
  };
  writeJson(path.join(paths.tasksDir, "task-legacy.json"), task);
  appendJsonl(paths.eventsLogPath, {
    event_id: "event-legacy",
    type: "task.created",
    timestamp: "2026-04-18T00:00:00.000Z",
    task_id: "task-legacy",
    agent_id: "supervisor",
    payload: { title: "Legacy" },
  });

  const team = readTeamSpace(workspace);
  assert.equal(team.workspaces.length, 1);
  assert.equal(team.workspaces[0].workspace_id, "task-legacy");
  assert.equal(team.workspaces[0].task.task_id, "task-legacy");
  assert.equal(team.workspaces[0].runtime.pid, 1234);
  assert.ok(fs.existsSync(path.join(paths.workspacesDir, "task-legacy", "workspace.json")));
  assert.ok(fs.existsSync(path.join(paths.workspacesDir, "task-legacy", "task.json")));
  assert.ok(fs.existsSync(path.join(paths.workspacesDir, "task-legacy", "events.jsonl")));
});

test("creates a manual Team workspace and prepares it for a dedicated worker run", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createTeamWorkspaceRecord(panel, {
    title: "Manual workspace",
    prompt: "Build the manual workspace task",
  });
  assert.ok(created);
  assert.equal(created.task.status, TASK_STATES.QUEUED);
  assert.ok(fs.existsSync(path.join(paths.workspacesDir, created.workspace_id, "workspace.json")));

  const prepared = prepareTeamWorkspaceRun(panel, created.workspace_id);
  assert.ok(prepared);
  assert.equal(prepared.dispatchKind, "codex.exec.new");
  assert.equal(prepared.task.status, TASK_STATES.RUNNING);
  assert.match(prepared.thread.id, /^pending-team-worker-/);
});

test("saves an orchestration draft as a Team workspace and DAG run", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Build a planned Team UI run",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.workers.length, 2);
  assert.equal(saved.task.orchestration.workers[0].role_id, "planner");
  assert.equal(saved.task.orchestration.workers[0].role_template_source, "builtin");
  assert.equal(saved.task.runtime.state, "draft");
  assert.ok(saved.task.orchestration.dag_run_id);
  assert.equal(saved.task.orchestration.worker_prompt_previews.length, 2);
  assert.equal(saved.task.orchestration.worker_prompt_previews[0].model, "gpt-5.3-codex");
  assert.match(saved.task.orchestration.worker_prompt_previews[0].prompt, /CMA MoA Worker Node/);
  assert.match(saved.task.orchestration.worker_prompt_previews[0].prompt, /Other workers may be active at the same time/);
  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  assert.ok(fs.existsSync(path.join(dagRunDir, "dag-run.json")));
  assert.ok(fs.existsSync(path.join(dagRunDir, "trace.jsonl")));
  assert.ok(fs.existsSync(path.join(dagRunDir, "trace.index.json")));
  const traceLines = fs.readFileSync(path.join(dagRunDir, "trace.jsonl"), "utf8").trim().split("\n").filter(Boolean);
  const traceEvents = traceLines.map((line) => JSON.parse(line));
  const promptEvents = traceEvents.filter((entry) => entry && entry.event_type === "worker_prompt_compiled");
  assert.equal(promptEvents.length, saved.task.orchestration.worker_prompt_previews.length);
  assert.equal(promptEvents.every((entry) => entry.model === "gpt-5.3-codex"), true);
  assert.equal(promptEvents.every((entry) => /^[a-f0-9]{64}$/.test(String(entry.prompt_sha256 || ""))), true);
  const traceIndex = readJson(path.join(dagRunDir, "trace.index.json"), {});
  assert.equal(traceIndex.run_id, saved.task.orchestration.dag_run_id);
  assert.equal(traceIndex.events_by_type.worker_prompt_compiled, saved.task.orchestration.worker_prompt_previews.length);

  const team = readTeamSpace(workspace);
  const task = team.tasks.find((item) => item && item.task_id === saved.task.task_id);
  assert.ok(task);
  assert.equal(task.orchestration.supervisor.role_id, "supervisor");
  assert.equal(task.orchestration.supervisor.role_template_source, "builtin");
  assert.equal(task.orchestration.supervisor.role_template_version, 1);
  assert.equal(task.orchestration.supervisor.model, "gpt-5.4");
  assert.equal(task.orchestration.worker_model, "gpt-5.3-codex");
  assert.equal(task.orchestration.worker_prompt_previews.length, 2);
  assert.equal(saved.task.orchestration.supervisor.role_id, "supervisor");
  assert.equal(saved.task.orchestration.supervisor.role_template_source, "builtin");
  assert.equal(saved.task.orchestration.supervisor.role_template_version, 1);
  assert.ok(fs.existsSync(path.join(paths.workspacesDir, saved.workspace_id, "workspace.json")));
});

test("preserves custom role template metadata across orchestration save/load round-trip", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Plan one bounded custom release gate lane",
    workers: [{
      title: "Release gate lane",
      role_id: "release_guard",
      role_name: "Release Guard",
      role: "Gate release on validation evidence and summarize residual risk.",
      write_paths: ["task-plans"],
      expected_outputs: ["release gate summary"],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.workers.length, 1);
  assert.equal(saved.task.orchestration.workers[0].role_id, "release-guard");
  assert.equal(saved.task.orchestration.workers[0].role_name, "Release Guard");
  assert.equal(saved.task.orchestration.workers[0].role_template_source, "custom");
  assert.equal(saved.task.orchestration.workers[0].role_template_version, 0);

  const team = readTeamSpace(workspace);
  const task = team.tasks.find((item) => item && item.task_id === saved.task.task_id);
  assert.ok(task);
  assert.equal(task.orchestration.workers[0].role_id, "release-guard");
  assert.equal(task.orchestration.workers[0].role_name, "Release Guard");
  assert.equal(task.orchestration.workers[0].role_template_source, "custom");
  assert.equal(task.orchestration.workers[0].role_template_version, 0);

  const dagRunPath = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id, "dag-run.json");
  const dagRun = readJson(dagRunPath, {});
  assert.equal(Array.isArray(dagRun.nodes), true);
  assert.equal(dagRun.nodes[0].role_id, "release-guard");
  assert.equal(dagRun.nodes[0].role_name, "Release Guard");
  assert.equal(dagRun.nodes[0].role_template_source, "custom");
  assert.equal(dagRun.nodes[0].role_template_version, 0);
});

test("applies workspace-local custom role expected_outputs alias across orchestration save/load round-trip", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  writeJson(path.join(rolesDir, "release-guard.json"), {
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Gate release on local evidence.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    default_read_paths: ["task-plans"],
    default_write_paths: ["task-plans"],
    expected_outputs: ["release gate alias summary"],
    prompt_contract: ["Require local green checks before release."],
  });

  const draft = generateTeamOrchestrationDraft(panel, {
    workspacePath: workspace,
    goal: "Plan one bounded custom release gate lane from local role template alias defaults",
    workers: [{
      title: "Release gate lane",
      role_id: "release_guard",
      write_paths: ["task-plans"],
      expected_outputs: [],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.workers.length, 1);
  assert.equal(saved.task.orchestration.workers[0].role_id, "release-guard");
  assert.equal(saved.task.orchestration.workers[0].role_template_source, "custom");
  assert.equal(saved.task.orchestration.workers[0].role_template_version, 1);
  assert.deepEqual(saved.task.orchestration.workers[0].expected_outputs, ["release gate alias summary"]);

  const team = readTeamSpace(workspace);
  const task = team.tasks.find((item) => item && item.task_id === saved.task.task_id);
  assert.ok(task);
  assert.deepEqual(task.orchestration.workers[0].expected_outputs, ["release gate alias summary"]);

  const dagRunPath = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id, "dag-run.json");
  const dagRun = readJson(dagRunPath, {});
  assert.equal(Array.isArray(dagRun.nodes), true);
  assert.deepEqual(dagRun.nodes[0].ownership.expected_outputs, ["release gate alias summary"]);
});

test("preserves built-in supervisor role template metadata across orchestration save/load round-trip", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Plan one bounded supervisor-guided orchestration role metadata pass",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.supervisor.role_id, "supervisor");
  assert.equal(saved.task.orchestration.supervisor.role_template_source, "builtin");
  assert.equal(saved.task.orchestration.supervisor.role_template_version, 1);
  assert.equal(saved.task.orchestration.supervisor.model, "gpt-5.4");

  const team = readTeamSpace(workspace);
  const task = team.tasks.find((item) => item && item.task_id === saved.task.task_id);
  assert.ok(task);
  assert.equal(task.orchestration.supervisor.role_id, "supervisor");
  assert.equal(task.orchestration.supervisor.role_template_source, "builtin");
  assert.equal(task.orchestration.supervisor.role_template_version, 1);
  assert.equal(task.orchestration.supervisor.model, "gpt-5.4");
});

test("normalizes role_id-only custom worker labels across orchestration save/load round-trip", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Plan one bounded custom release gate lane",
    workers: [{
      title: "Release gate lane",
      role_id: "release_guard",
      write_paths: ["task-plans"],
      expected_outputs: ["release gate summary"],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.workers.length, 1);
  assert.equal(saved.task.orchestration.workers[0].role_id, "release-guard");
  assert.equal(saved.task.orchestration.workers[0].role_name, "Release Guard");
  assert.equal(saved.task.orchestration.workers[0].role_template_source, "custom");
  assert.equal(saved.task.orchestration.workers[0].role_template_version, 0);

  const team = readTeamSpace(workspace);
  const task = team.tasks.find((item) => item && item.task_id === saved.task.task_id);
  assert.ok(task);
  assert.equal(task.orchestration.workers[0].role_id, "release-guard");
  assert.equal(task.orchestration.workers[0].role_name, "Release Guard");
  assert.equal(task.orchestration.workers[0].role_template_source, "custom");
  assert.equal(task.orchestration.workers[0].role_template_version, 0);

  const dagRunPath = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id, "dag-run.json");
  const dagRun = readJson(dagRunPath, {});
  assert.equal(Array.isArray(dagRun.nodes), true);
  assert.equal(dagRun.nodes[0].role_id, "release-guard");
  assert.equal(dagRun.nodes[0].role_name, "Release Guard");
  assert.equal(dagRun.nodes[0].role_template_source, "custom");
  assert.equal(dagRun.nodes[0].role_template_version, 0);
});

test("preserves snake_case boolean role metadata precedence across orchestration save/load round-trip", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Plan one bounded boolean precedence role metadata pass",
    workers: [{
      title: "Implementer lane",
      role_id: "implementer",
      can_edit_code: false,
      canEditCode: true,
      writes_blackboard: false,
      writesBlackboard: true,
      write_paths: ["src/host"],
      expected_outputs: ["bounded host patch"],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.workers.length, 1);
  assert.equal(saved.task.orchestration.workers[0].role_id, "implementer");
  assert.equal(saved.task.orchestration.workers[0].can_edit_code, false);
  assert.equal(saved.task.orchestration.workers[0].writes_blackboard, false);

  const team = readTeamSpace(workspace);
  const task = team.tasks.find((item) => item && item.task_id === saved.task.task_id);
  assert.ok(task);
  assert.equal(task.orchestration.workers[0].can_edit_code, false);
  assert.equal(task.orchestration.workers[0].writes_blackboard, false);

  const dagRunPath = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id, "dag-run.json");
  const dagRun = readJson(dagRunPath, {});
  assert.equal(Array.isArray(dagRun.nodes), true);
  assert.equal(dagRun.nodes[0].can_edit_code, false);
  assert.equal(dagRun.nodes[0].writes_blackboard, false);
});

test("saves organization template metadata and workers in orchestration drafts", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Plan a bounded bugfix team run",
    organizationTemplateId: "bugfix-team",
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });

  assert.ok(saved);
  assert.equal(saved.task.orchestration.organization_template_id, "bugfix-team");
  assert.equal(saved.task.orchestration.organization_template_name, "Bugfix Team");
  assert.equal(saved.task.orchestration.organization_template_source, "builtin");
  assert.equal(saved.task.orchestration.organization_template_version, 1);
  assert.equal(saved.task.orchestration.workers.length, 4);
  assert.equal(saved.task.orchestration.workers[0].role_id, "debugger");
  assert.equal(saved.task.orchestration.workers[1].role_id, "implementer");
  assert.equal(saved.task.orchestration.workers[2].role_id, "tester");
  assert.equal(saved.task.orchestration.workers[3].role_id, "reviewer");
});

test("saves worker prompt previews with enforced gpt-5.3-codex model even when draft overrides", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Build a planned Team host run with override",
    workerCount: 1,
    worker_model: "gpt-5.5",
  });
  draft.worker_model = "gpt-5.5";
  if (Array.isArray(draft.workers) && draft.workers[0]) {
    draft.workers[0].model = "gpt-5.5";
  }

  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);
  assert.equal(saved.task.orchestration.worker_model, "gpt-5.5");
  assert.equal(saved.task.orchestration.worker_prompt_previews.length, 1);
  assert.equal(saved.task.orchestration.worker_prompt_previews[0].model, "gpt-5.3-codex");
  assert.match(saved.task.orchestration.worker_prompt_previews[0].prompt, /Execution model:\ngpt-5\.3-codex/);
  assert.doesNotMatch(saved.task.orchestration.worker_prompt_previews[0].prompt, /Execution model:\ngpt-5\.5/);

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const traceLines = fs.readFileSync(path.join(dagRunDir, "trace.jsonl"), "utf8").trim().split("\n").filter(Boolean);
  const traceEvents = traceLines.map((line) => JSON.parse(line));
  const promptEvents = traceEvents.filter((entry) => entry && entry.event_type === "worker_prompt_compiled");
  assert.equal(promptEvents.length, 1);
  assert.equal(promptEvents[0].model, "gpt-5.3-codex");
});

test("saves gemini-cli worker prompt previews without codex model override", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Ask Gemini for an auxiliary implementation review",
    workerCount: 1,
    workers: [{
      node_id: "gemini-review",
      title: "Gemini review lane",
      provider: "gemini-cli",
      model: "gemini-3.1-pro-preview",
      role: "Review the planned implementation and propose low-risk patches.",
      read_paths: ["src/host"],
      write_paths: [],
    }],
  });

  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);
  assert.equal(saved.task.orchestration.worker_prompt_previews.length, 1);
  assert.equal(saved.task.orchestration.worker_prompt_previews[0].provider, "gemini-cli");
  assert.equal(saved.task.orchestration.worker_prompt_previews[0].model, "gemini-3.1-pro-preview");
  assert.match(saved.task.orchestration.worker_prompt_previews[0].prompt, /Execution provider:\ngemini-cli/);
  assert.match(saved.task.orchestration.worker_prompt_previews[0].prompt, /Execution model:\ngemini-3\.1-pro-preview/);

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const traceLines = fs.readFileSync(path.join(dagRunDir, "trace.jsonl"), "utf8").trim().split("\n").filter(Boolean);
  const promptEvents = traceLines.map((line) => JSON.parse(line)).filter((entry) => entry.event_type === "worker_prompt_compiled");
  assert.equal(promptEvents.length, 1);
  assert.equal(promptEvents[0].provider, "gemini-cli");
  assert.equal(promptEvents[0].model, "gemini-3.1-pro-preview");
});

test("launches two schedulable orchestration workers with persisted DAG runtime metadata", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Launch at least two non-conflicting workers from the Team orchestration run path",
    workerCount: 3,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: String(9000 + launchCalls.length),
        log_path: `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.log`,
        model: payload.model,
      };
    },
  });

  assert.ok(launched);
  assert.equal(launchCalls.length, 2);
  assert.equal(launchCalls.every((entry) => entry.model === "gpt-5.3-codex"), true);
  assert.equal(Array.isArray(launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);
  assert.equal(launched.launched.selected_node_ids.length, 2);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(task.runtime.command_kind, "codex.exec.new.batch");
  assert.equal(task.runtime.dag_run_id, saved.task.orchestration.dag_run_id);
  assert.equal(Array.isArray(task.runtime.launched_workers), true);
  assert.equal(task.runtime.launched_workers.length, 2);
  assert.equal(
    task.runtime.launched_workers.every(
      (worker) => String(worker && worker.trace_path || "") === `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`,
    ),
    true,
  );

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const dagRun = readJson(path.join(dagRunDir, "dag-run.json"), {});
  const runningCount = Array.isArray(dagRun.nodes)
    ? dagRun.nodes.filter((node) => node && node.status === "running").length
    : 0;
  assert.equal(runningCount, 2);
  const traceIndex = readJson(path.join(dagRunDir, "trace.index.json"), {});
  assert.equal(traceIndex.events_by_type.worker_launch_metadata, 2);
});

test("persists account profile id on launched Team workers for draft-bound workers", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const accountProfileId = "acct-team-a";
  const sourceAuthPath = path.join(workspace, ".codex-managed-agent", "accounts", accountProfileId, "auth.json");
  const previousReadAccountsForPayload = accountManager.readAccountsForPayload;
  accountManager.readAccountsForPayload = () => ({
    accountsByName: {
      [accountProfileId]: {
        name: accountProfileId,
        sourceAuthPath,
        tokenHealth: "ok",
      },
    },
  });
  t.after(() => {
    accountManager.readAccountsForPayload = previousReadAccountsForPayload;
  });
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Launch a single worker bound to an account profile",
    workers: [{
      title: "Profile-bound implementer",
      role: "Implement a small, profile-aware step.",
      account_profile_id: accountProfileId,
      read_paths: ["src/host"],
      write_paths: ["src/host"],
      writes_blackboard: false,
      expected_outputs: ["bound runtime proof"],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);
  assert.equal(saved.task.orchestration.workers[0].account_profile_id, accountProfileId);

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9201",
        log_path: `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.log`,
        account_profile_id: payload.account_profile_id || "",
        model: payload.model,
      };
    },
  });

  assert.ok(launched);
  assert.equal(launchCalls.length, 1);
  assert.equal(launchCalls[0].account_profile_id, accountProfileId);

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const task = readJson(path.join(paths.tasksDir, `${saved.task.task_id}.json`), {});
  assert.equal(Array.isArray(task.runtime && task.runtime.launched_workers), true);
  assert.equal(task.runtime.launched_workers.length, 1);
  assert.equal(task.runtime.launched_workers[0].account_profile_id, accountProfileId);
  assert.equal(normalizePathForAssert(task.runtime.launched_workers[0].account_auth_source_path), normalizePathForAssert(sourceAuthPath));
  assert.equal(task.runtime.launched_workers[0].account_token_health, "ok");
  assert.equal(task.runtime.launched_workers[0].session_binding.account_profile_id, accountProfileId);
  assert.equal(task.runtime.launched_workers[0].session_binding.run_id, saved.task.orchestration.dag_run_id);

  const dagRun = readJson(path.join(dagRunDir, "dag-run.json"), {});
  assert.equal(String(dagRun.nodes[0].worker_runtime && dagRun.nodes[0].worker_runtime.account_profile_id || ""), accountProfileId);
  assert.equal(normalizePathForAssert(dagRun.nodes[0].worker_runtime && dagRun.nodes[0].worker_runtime.account_auth_source_path), normalizePathForAssert(sourceAuthPath));
  assert.equal(String(dagRun.nodes[0].worker_runtime && dagRun.nodes[0].worker_runtime.account_token_health || ""), "ok");
  assert.equal(String(dagRun.nodes[0].worker_runtime && dagRun.nodes[0].worker_runtime.session_binding && dagRun.nodes[0].worker_runtime.session_binding.account_profile_id || ""), accountProfileId);
  assert.equal(String(dagRun.nodes[0].worker_runtime && dagRun.nodes[0].worker_runtime.session_binding && dagRun.nodes[0].worker_runtime.session_binding.run_id || ""), saved.task.orchestration.dag_run_id);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  const profileTrace = taskTrace.find((entry) => entry && entry.kind === "orchestration.account_profile_bound");
  assert.ok(profileTrace);
  assert.equal(String(profileTrace.payload && profileTrace.payload.account_profile_id || ""), accountProfileId);
  assert.equal(normalizePathForAssert(profileTrace.payload && profileTrace.payload.account_auth_source_path), normalizePathForAssert(sourceAuthPath));
  assert.equal(String(profileTrace.payload && profileTrace.payload.account_token_health || ""), "ok");
});

test("blocks Team launch when selected account profile is not found", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const previousReadAccountsForPayload = accountManager.readAccountsForPayload;
  t.after(() => {
    accountManager.readAccountsForPayload = previousReadAccountsForPayload;
  });
  accountManager.readAccountsForPayload = () => ({
    accountDetails: {},
  });
  const accountProfileId = "acct-team-missing";
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Validate account-profile preflight for missing profile",
    workers: [{
      title: "Missing profile implementer",
      provider: "codex-cli",
      model: "gpt-5.3-codex",
      role: "Verify that launch is blocked when no such account profile exists.",
      account_profile_id: accountProfileId,
      read_paths: ["src/host"],
      write_paths: ["src/host"],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  let launchAttempts = 0;
  const failed = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker() {
      launchAttempts += 1;
      assert.fail("launchWorker should not run when preflight blocks the worker");
    },
  });
  assert.ok(failed);
  assert.equal(launchAttempts, 0);
  assert.equal(Array.isArray(failed.launched && failed.launched.blocked), true);
  assert.equal(failed.launched.blocked.length, 1);
  assert.equal(failed.launched.blocked[0].reason, "team_account_profile_not_found");

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const failedTask = readJson(taskPath, {});
  assert.equal(String(failedTask.runtime && failedTask.runtime.state || ""), "blocked");
  assert.equal(failedTask.runtime.command_kind, "codex.exec.new.batch");
  assert.equal(Array.isArray(failedTask.runtime && failedTask.runtime.dag_blocked), true);
  assert.equal(failedTask.runtime.dag_blocked.some((entry) => entry && entry.reason === "team_account_profile_not_found"), true);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  assert.ok(taskTrace.some((entry) => entry.kind === "orchestration.launch_blocked"));
  assert.ok(taskTrace.some((entry) =>
    entry
    && entry.kind === "orchestration.account_profile_launch_blocked"
    && String(entry.payload && entry.payload.account_profile_id || "") === accountProfileId
    && String(entry.payload && entry.payload.reason || "") === "team_account_profile_not_found"
  ));
  const events = readJsonl(paths.eventsLogPath);
  assert.ok(events.some((entry) =>
    entry.type === "orchestration.launch_blocked"
    && entry.task_id === saved.task.task_id
    && Array.isArray(entry.payload && entry.payload.blocked_node_ids)
    && entry.payload.blocked_node_ids.length >= 1
  ));
});

test("blocks Team launch when selected account token health is blocked", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const accountProfileId = "acct-team-blocked";
  const previousReadAccountsForPayload = accountManager.readAccountsForPayload;
  t.after(() => {
    accountManager.readAccountsForPayload = previousReadAccountsForPayload;
  });
  accountManager.readAccountsForPayload = () => ({
    accountDetails: {
      [accountProfileId]: {
        tokenHealth: "invalid",
      },
    },
  });

  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Validate account token health preflight for blocked launch",
    workers: [{
      title: "Blocked account implementer",
      provider: "codex-cli",
      model: "gpt-5.3-codex",
      role: "Verify that blocked token health blocks launch.",
      account_profile_id: accountProfileId,
      read_paths: ["src/host"],
      write_paths: ["src/host"],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  let launchAttempts = 0;
  const failed = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker() {
      launchAttempts += 1;
      assert.fail("launchWorker should not run when preflight blocks the worker");
    },
  });
  assert.ok(failed);
  assert.equal(launchAttempts, 0);
  assert.equal(Array.isArray(failed.launched && failed.launched.blocked), true);
  assert.equal(failed.launched.blocked.length, 1);
  assert.equal(failed.launched.blocked[0].reason, "team_account_token_blocked");

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const failedTask = readJson(taskPath, {});
  assert.equal(String(failedTask.runtime && failedTask.runtime.state || ""), "blocked");
  assert.equal(failedTask.runtime.command_kind, "codex.exec.new.batch");
  assert.equal(Array.isArray(failedTask.runtime && failedTask.runtime.dag_blocked), true);
  assert.equal(failedTask.runtime.dag_blocked.some((entry) => entry && entry.reason === "team_account_token_blocked"), true);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  assert.ok(taskTrace.some((entry) =>
    entry
    && entry.kind === "orchestration.account_profile_launch_blocked"
    && String(entry.payload && entry.payload.account_profile_id || "") === accountProfileId
    && String(entry.payload && entry.payload.reason || "") === "team_account_token_blocked"
  ));
});

test("launches gemini-cli orchestration workers through provider-aware payloads", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Launch one Gemini auxiliary reviewer",
    workerCount: 1,
    workers: [{
      node_id: "gemini-review",
      title: "Gemini review lane",
      provider: "gemini-cli",
      model: "gemini-3.1-pro-preview",
      role: "Review the planned change and report findings only.",
      read_paths: ["src"],
      write_paths: [],
    }],
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        provider: payload.provider,
        model: payload.model,
        pid: "9101",
        log_path: `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.log`,
      };
    },
  });

  assert.ok(launched);
  assert.equal(launchCalls.length, 1);
  assert.equal(launchCalls[0].provider, "gemini-cli");
  assert.equal(launchCalls[0].model, "gemini-3.1-pro-preview");
  assert.equal(launched.launched.launched[0].provider, "gemini-cli");
});

test("preserves absolute launched worker log paths and ingests envelopes from those paths", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Keep absolute worker log paths intact for runtime ingestion",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const externalLogsDir = fs.mkdtempSync(path.join(os.tmpdir(), "cma-abs-launch-log-"));
  t.after(() => fs.rmSync(externalLogsDir, { recursive: true, force: true }));
  const absoluteLogPath = path.join(externalLogsDir, "worker.runtime.log");

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9601",
        log_path: absoluteLogPath,
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 1);
  const worker = launched.launched.launched[0];
  assert.equal(worker.log_path, absoluteLogPath);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const launchedTask = readJson(taskPath, {});
  assert.equal(Array.isArray(launchedTask.runtime && launchedTask.runtime.launched_workers), true);
  assert.equal(launchedTask.runtime.launched_workers[0].log_path, absoluteLogPath);

  fs.writeFileSync(absoluteLogPath, [
    JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
      summary: "Absolute-path worker log envelope ingested.",
      changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
      checks_run: ["node --test src/host/team-coordination.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Absolute worker log path preserved." }],
      next_request: "Supervisor review.",
    }) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const ingestedTask = readJson(taskPath, {});
  assert.equal(String(ingestedTask.runtime && ingestedTask.runtime.dag_last_ingested_node_id || ""), worker.node_id);
  assert.equal(String(ingestedTask.runtime && ingestedTask.runtime.dag_last_ingest_error || ""), "");
});

test("records missing launched worker log_path as trace-backed ingest diagnostics", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Preserve diagnostics when launched worker logs are missing",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9501",
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);
  assert.equal(
    launched.launched.launched.every((worker) => String(worker.trace_path || "").endsWith(`/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`)),
    true,
  );

  readTeamSpace(workspace);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(String(task.runtime && task.runtime.state || ""), "running");
  assert.match(String(task.runtime && task.runtime.dag_last_ingest_error || ""), /Worker log path missing for node/);
  assert.equal(
    String(task.runtime && task.runtime.dag_last_ingest_error_trace_path || ""),
    `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`,
  );
  assert.equal(Array.isArray(task.runtime && task.runtime.trace && task.runtime.trace.missing_worker_log_node_ids), true);
  assert.equal(task.runtime.trace.missing_worker_log_node_ids.length >= 1, true);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  const missingLogEvents = taskTrace.filter((entry) => entry && entry.kind === "orchestration.worker_log_missing");
  assert.equal(missingLogEvents.length >= 1, true);
  assert.equal(
    missingLogEvents.every((entry) => String(entry && entry.evidence && entry.evidence.trace_path || "") === `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`),
    true,
  );
});

test("records ingest error trace path when launched worker envelope parsing fails", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Persist trace path for worker envelope parse failures",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9510",
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 1);
  const worker = launched.launched.launched[0];

  fs.mkdirSync(path.dirname(worker.log_path), { recursive: true });
  fs.writeFileSync(worker.log_path, [
    JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: "not-json-envelope" } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.match(
    String(task.runtime && task.runtime.dag_last_ingest_error || ""),
    /parseWorkerResultEnvelope could not parse JSON/,
  );
  assert.equal(String(task.runtime && task.runtime.state || ""), "completed");
  assert.equal(Array.isArray(task.runtime && task.runtime.launched_workers), true);
  assert.equal(String(task.runtime.launched_workers[0].node_status || ""), "failed");
  assert.equal(Array.isArray(task.runtime && task.runtime.trace && task.runtime.trace.failed_worker_node_ids), true);
  assert.ok(task.runtime.trace.failed_worker_node_ids.includes(worker.node_id));
  assert.equal(
    String(task.runtime && task.runtime.dag_last_ingest_error_trace_path || ""),
    `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`,
  );
  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const dagRun = readJson(path.join(dagRunDir, "dag-run.json"), {});
  const failedNode = Array.isArray(dagRun.nodes)
    ? dagRun.nodes.find((node) => node && node.node_id === worker.node_id)
    : null;
  assert.ok(failedNode);
  assert.equal(String(failedNode.status || ""), "failed");
  assert.match(String(failedNode.worker_runtime && failedNode.worker_runtime.result_ingest_error || ""), /could not parse JSON/);
  const dagTrace = readJsonl(path.join(dagRunDir, "trace.jsonl"));
  assert.equal(dagTrace.some((entry) => entry && entry.event_type === "worker_result_ingest_failed" && entry.node_id === worker.node_id), true);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  const ingestFailed = taskTrace.find((entry) => entry && entry.kind === "orchestration.worker_result_ingest_failed");
  assert.ok(ingestFailed);
  assert.equal(
    String(ingestFailed && ingestFailed.evidence && ingestFailed.evidence.trace_path || ""),
    `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`,
  );

  const failedCountBefore = taskTrace.filter((entry) => entry && entry.kind === "orchestration.worker_result_ingest_failed").length;
  readTeamSpace(workspace);
  const taskTraceAfter = readJsonl(taskTracePath);
  const failedCountAfter = taskTraceAfter.filter((entry) => entry && entry.kind === "orchestration.worker_result_ingest_failed").length;
  assert.equal(failedCountAfter, failedCountBefore);
});

test("records missing DAG run ingest diagnostics with trace-path evidence", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Preserve trace evidence when launched worker ingest cannot find dag-run.json",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9515",
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 1);
  const worker = launched.launched.launched[0];

  const dagRunPath = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id, "dag-run.json");
  fs.rmSync(dagRunPath, { force: true });

  fs.mkdirSync(path.dirname(worker.log_path), { recursive: true });
  fs.writeFileSync(worker.log_path, [
    JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
      summary: "Envelope that cannot be ingested without dag-run.json.",
      changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
      checks_run: ["node --test src/host/team-coordination.test.js"],
      open_risks: ["Missing DAG run evidence."],
      blackboard_updates: [{ kind: "risk", visibility: "dag", summary: "dag-run.json is missing." }],
      next_request: "Restore DAG run and retry ingestion.",
    }) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.match(String(task.runtime && task.runtime.dag_last_ingest_error || ""), /DAG run not found/);
  assert.equal(
    String(task.runtime && task.runtime.dag_last_ingest_error_trace_path || ""),
    `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`,
  );

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  const missingDagRun = taskTrace.find((entry) => entry && entry.kind === "orchestration.worker_result_ingest_missing_dag_run");
  assert.ok(missingDagRun);
  assert.equal(String(missingDagRun && missingDagRun.evidence && missingDagRun.evidence.dag_run_id || ""), saved.task.orchestration.dag_run_id);
  assert.equal(String(missingDagRun && missingDagRun.evidence && missingDagRun.evidence.node_id || ""), worker.node_id);
  assert.equal(
    String(missingDagRun && missingDagRun.evidence && missingDagRun.evidence.trace_path || ""),
    `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/trace.jsonl`,
  );
});

test("clears stale ingest error trace path after successful launched worker envelope ingestion", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Clear stale ingest diagnostics after successful worker envelope ingestion",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9511",
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 1);
  const worker = launched.launched.launched[0];

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const beforeIngest = readJson(taskPath, {});
  beforeIngest.runtime = {
    ...(beforeIngest.runtime || {}),
    dag_last_ingest_error: "stale ingest error from prior tick",
    dag_last_ingest_error_trace_path: ".codex-team/dag-runs/stale-run/trace.jsonl",
  };
  writeJson(taskPath, beforeIngest);

  fs.mkdirSync(path.dirname(worker.log_path), { recursive: true });
  fs.writeFileSync(worker.log_path, [
    JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
      summary: "Worker completed with bounded result envelope.",
      changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Stale ingest diagnostics cleared." }],
      next_request: "Supervisor review.",
    }) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const afterIngest = readJson(taskPath, {});
  assert.equal(String(afterIngest.runtime && afterIngest.runtime.dag_last_ingested_node_id || ""), worker.node_id);
  assert.equal(String(afterIngest.runtime && afterIngest.runtime.dag_last_ingest_error || ""), "");
  assert.equal(String(afterIngest.runtime && afterIngest.runtime.dag_last_ingest_error_trace_path || ""), "");
});

test("clears missing_worker_log_node_ids after log path recovery and successful envelope ingest", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Clear missing-worker-log markers when runtime log evidence later appears",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9521",
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 1);
  const worker = launched.launched.launched[0];

  readTeamSpace(workspace);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const afterMissing = readJson(taskPath, {});
  assert.equal(Array.isArray(afterMissing.runtime && afterMissing.runtime.trace && afterMissing.runtime.trace.missing_worker_log_node_ids), true);
  assert.ok(afterMissing.runtime.trace.missing_worker_log_node_ids.includes(worker.node_id));

  const recoveredLogPath = path.join(workspace, `.codex-team/dag-runs/${saved.task.orchestration.dag_run_id}/${worker.node_id}.recovered.runtime.log`);
  fs.mkdirSync(path.dirname(recoveredLogPath), { recursive: true });
  fs.writeFileSync(recoveredLogPath, [
    JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
      summary: "Recovered worker log produced a valid envelope.",
      changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Recovered worker log ingested." }],
      next_request: "Supervisor review.",
    }) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  const patchedTask = readJson(taskPath, {});
  patchedTask.runtime = {
    ...(patchedTask.runtime || {}),
    launched_workers: Array.isArray(patchedTask.runtime && patchedTask.runtime.launched_workers)
      ? patchedTask.runtime.launched_workers.map((item) => (
        item && item.node_id === worker.node_id
          ? { ...item, log_path: recoveredLogPath }
          : item
      ))
      : [],
  };
  writeJson(taskPath, patchedTask);

  readTeamSpace(workspace);

  const afterRecovery = readJson(taskPath, {});
  assert.equal(String(afterRecovery.runtime && afterRecovery.runtime.dag_last_ingested_node_id || ""), worker.node_id);
  assert.equal(String(afterRecovery.runtime && afterRecovery.runtime.dag_last_ingest_error || ""), "");
  assert.equal(Array.isArray(afterRecovery.runtime && afterRecovery.runtime.trace && afterRecovery.runtime.trace.missing_worker_log_node_ids), true);
  assert.equal(afterRecovery.runtime.trace.missing_worker_log_node_ids.includes(worker.node_id), false);
});

test("records launch_failed scheduler blocking evidence and allows next scheduler tick launch", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Handle launch failure without losing orchestration evidence",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const failed = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker() {
      throw new Error("intentional launch failure for scheduler-tick recovery");
    },
  });
  assert.ok(failed);
  assert.equal(failed.error, undefined);
  assert.equal(Array.isArray(failed.launched && failed.launched.blocked), true);
  assert.equal(failed.launched.blocked.some((entry) => entry && entry.reason === "launch_failed"), true);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const failedTask = readJson(taskPath, {});
  assert.equal(String(failedTask.runtime && failedTask.runtime.state || ""), "blocked");
  assert.equal(String(failedTask.runtime && failedTask.runtime.command_kind || ""), "codex.exec.new.batch");
  assert.equal(String(failedTask.runtime && failedTask.runtime.dag_run_id || ""), saved.task.orchestration.dag_run_id);
  assert.equal(Array.isArray(failedTask.runtime && failedTask.runtime.dag_blocked), true);
  assert.equal(failedTask.runtime.dag_blocked.some((entry) => entry && entry.reason === "launch_failed"), true);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  assert.ok(taskTrace.some((entry) => entry.kind === "orchestration.launch_blocked"));
  const events = readJsonl(paths.eventsLogPath);
  assert.ok(events.some((entry) => entry.type === "orchestration.launch_blocked" && entry.task_id === saved.task.task_id));

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9301",
        log_path: `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.log`,
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const dagRun = readJson(path.join(dagRunDir, "dag-run.json"), {});
  const launchedNodeIds = new Set((launched.launched.launched || []).map((entry) => String(entry && entry.node_id || "")));
  const launchedNodes = Array.isArray(dagRun.nodes)
    ? dagRun.nodes.filter((node) => node && launchedNodeIds.has(String(node.node_id || "")))
    : [];
  assert.equal(launchedNodes.length, 2);
  assert.equal(launchedNodes.every((node) => String(node.status || "") === "running"), true);
  assert.equal(
    launchedNodes.every((node) => Number(node.worker_runtime && node.worker_runtime.launch_attempts || 0) === 2),
    true,
  );
  assert.equal(
    launchedNodes.every((node) => String(node.worker_runtime && node.worker_runtime.last_launch_status || "") === "started"),
    true,
  );

  const traceIndex = readJson(path.join(dagRunDir, "trace.index.json"), {});
  assert.equal(Number(traceIndex.events_by_type && traceIndex.events_by_type.worker_launch_failed || 0) >= 2, true);
  assert.equal(Number(traceIndex.events_by_type && traceIndex.events_by_type.worker_launch_metadata || 0) >= 2, true);
});

test("records launch_failed evidence when a scheduler tick lock is already active", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Fail launch cleanly when DAG scheduler tick lock is active",
    workerCount: 1,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const dagRunId = saved.task.orchestration.dag_run_id;
  const lockPath = path.join(workspace, ".codex-team", "dag-runs", dagRunId, "scheduler.tick.lock");
  writeJson(lockPath, {
    tick_id: `${dagRunId}-active-lock`,
    run_id: dagRunId,
    started_at: new Date().toISOString(),
    pid: process.pid,
  });

  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker() {
      throw new Error("launchWorker should not be called when scheduler lock is active");
    },
  });
  assert.ok(launched);
  assert.equal(launched.launched, null);
  assert.match(String(launched.error || ""), /scheduler tick already active/);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const failedTask = readJson(taskPath, {});
  assert.equal(String(failedTask.runtime && failedTask.runtime.state || ""), "failed");
  assert.equal(String(failedTask.runtime && failedTask.runtime.command_kind || ""), "codex.exec.new.batch");
  assert.equal(String(failedTask.runtime && failedTask.runtime.dag_run_id || ""), dagRunId);
  assert.match(String(failedTask.runtime && failedTask.runtime.error || ""), /scheduler tick already active/);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  assert.ok(taskTrace.some((entry) => entry && entry.kind === "orchestration.launch_failed"));
  assert.ok(taskTrace.some((entry) => (
    entry
    && entry.kind === "orchestration.launch_failed"
    && /scheduler tick already active/.test(String(entry.payload && entry.payload.error || ""))
  )));
  const events = readJsonl(paths.eventsLogPath);
  assert.ok(events.some((entry) => (
    entry
    && entry.type === "orchestration.launch_failed"
    && entry.task_id === saved.task.task_id
  )));
});

test("recovers stale scheduler tick lock and launches workers with persisted metadata", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Recover stale DAG scheduler lock and continue launch path",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const dagRunId = saved.task.orchestration.dag_run_id;
  const lockPath = path.join(workspace, ".codex-team", "dag-runs", dagRunId, "scheduler.tick.lock");
  writeJson(lockPath, {
    tick_id: `${dagRunId}-stale-lock`,
    run_id: dagRunId,
    started_at: "2000-01-01T00:00:00.000Z",
    pid: 99999,
  });

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: String(9700 + launchCalls.length),
        log_path: `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.log`,
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);
  assert.equal(launchCalls.length, 2);
  assert.equal(fs.existsSync(lockPath), false);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(String(task.runtime && task.runtime.state || ""), "dispatched");
  assert.equal(String(task.runtime && task.runtime.command_kind || ""), "codex.exec.new.batch");
  assert.equal(String(task.runtime && task.runtime.dag_run_id || ""), dagRunId);
  assert.equal(Array.isArray(task.runtime && task.runtime.launched_workers), true);
  assert.equal(task.runtime.launched_workers.length, 2);
});

test("preserves selected and blocked DAG launch metadata for mixed success and failure in one tick", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Preserve mixed launch metadata in one scheduler tick",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  let callCount = 0;
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      callCount += 1;
      if (callCount === 1) {
        throw new Error(`intentional mixed launch failure for ${payload.node.node_id}`);
      }
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: "9401",
        log_path: `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.log`,
        model: payload.model,
      };
    },
  });

  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 1);
  assert.equal(Array.isArray(launched.launched && launched.launched.blocked), true);
  assert.equal(launched.launched.blocked.some((entry) => entry && entry.reason === "launch_failed"), true);
  assert.equal(Array.isArray(launched.launched && launched.launched.selected_node_ids), true);
  assert.equal(launched.launched.selected_node_ids.length, 1);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(String(task.runtime && task.runtime.state || ""), "dispatched");
  assert.equal(Array.isArray(task.runtime && task.runtime.dag_selected_node_ids), true);
  assert.equal(Array.isArray(task.runtime && task.runtime.dag_blocked_node_ids), true);
  assert.equal(task.runtime.dag_selected_node_ids.length, 1);
  assert.equal(task.runtime.dag_blocked_node_ids.length, 1);
  assert.equal(Array.isArray(task.runtime && task.runtime.dag_blocked), true);
  assert.equal(task.runtime.dag_blocked.some((entry) => entry && entry.reason === "launch_failed"), true);

  const selectedSet = new Set(task.runtime.dag_selected_node_ids);
  const blockedSet = new Set(task.runtime.dag_blocked_node_ids);
  assert.equal([...selectedSet].every((nodeId) => !blockedSet.has(nodeId)), true);

  const taskTracePath = path.join(paths.taskTracesDir, `${saved.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  const launchTrace = taskTrace.find((entry) => entry && entry.kind === "orchestration.workers_launched");
  assert.ok(launchTrace);
  assert.equal(Array.isArray(launchTrace.payload && launchTrace.payload.selected_node_ids), true);
  assert.equal(Array.isArray(launchTrace.payload && launchTrace.payload.blocked_node_ids), true);
  assert.equal(launchTrace.payload.selected_node_ids.length, 1);
  assert.equal(launchTrace.payload.blocked_node_ids.length, 1);
});

test("ingests launched DAG worker result envelope into node result and blackboard evidence", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Ingest one completed worker envelope from runtime reconciliation",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      const threadId = `pending-team-worker-${payload.node.node_id}`;
      return {
        worker_thread_id: threadId,
        pid: String(9100 + launchCalls.length),
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(launchCalls.length, 2);

  const primary = launched.launched.launched[0];
  const resultEnvelope = {
    summary: "Completed bounded planning slice.",
    changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
    checks_run: ["node --test src/host/moa-core.test.js"],
    open_risks: ["Pending ingestion for the second worker node."],
    blackboard_updates: [
      {
        kind: "finding",
        visibility: "dag",
        summary: "Primary worker envelope ingestion verified.",
      },
    ],
    next_request: "Wait for remaining worker results.",
  };
  fs.mkdirSync(path.dirname(primary.log_path), { recursive: true });
  fs.writeFileSync(primary.log_path, [
    JSON.stringify({ type: "session_meta", payload: { id: primary.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "command_execution", text: "node --test src/host/moa-core.test.js" } }),
    JSON.stringify({ type: "item.completed", item: { type: "file_change", text: "task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md" } }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify(resultEnvelope) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const dagRun = readJson(path.join(dagRunDir, "dag-run.json"), {});
  const ingestedNode = Array.isArray(dagRun.nodes)
    ? dagRun.nodes.find((node) => node && node.node_id === primary.node_id)
    : null;
  assert.ok(ingestedNode);
  assert.equal(ingestedNode.status, "completed");
  assert.equal(ingestedNode.result.summary, "Completed bounded planning slice.");
  assert.deepEqual(ingestedNode.result.changed_files, ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"]);
  assert.equal(Array.isArray(dagRun.blackboard), true);
  assert.ok(dagRun.blackboard.some((entry) => entry && entry.summary === "Primary worker envelope ingestion verified."));

  const traceIndex = readJson(path.join(dagRunDir, "trace.index.json"), {});
  assert.equal(Number(traceIndex.events_by_type.worker_result_envelope || 0) >= 1, true);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(task.runtime.dag_last_ingested_node_id, primary.node_id);
  assert.equal(Array.isArray(task.runtime.trace.ingested_worker_node_ids), true);
  assert.ok(task.runtime.trace.ingested_worker_node_ids.includes(primary.node_id));
});

test("ingests result envelopes from all completed launched worker logs in one reconciliation tick", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Ingest all completed launched worker envelopes for one DAG run",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      const threadId = `pending-team-worker-${payload.node.node_id}`;
      return {
        worker_thread_id: threadId,
        pid: String(9200 + launchCalls.length),
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(launchCalls.length, 2);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);
  const launchByNodeId = new Map(launchCalls
    .map((entry) => (entry && entry.node && entry.node.node_id ? [entry.node.node_id, entry] : null))
    .filter(Boolean));

  launched.launched.launched.forEach((worker, index) => {
    const launch = launchByNodeId.get(worker.node_id);
    const writeTargets = Array.isArray(launch && launch.node && launch.node.ownership && launch.node.ownership.write_paths)
      ? launch.node.ownership.write_paths
      : [];
    const changedFile = writeTargets.includes("task-plans")
      ? "task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"
      : "src/host/team-coordination.js";
    const resultEnvelope = {
      summary: `Completed worker envelope ${index + 1}.`,
      changed_files: [changedFile],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [
        {
          kind: "finding",
          visibility: "dag",
          summary: `Worker ${index + 1} envelope ingestion verified.`,
        },
      ],
      next_request: "Wait for supervisor review.",
    };
    fs.mkdirSync(path.dirname(worker.log_path), { recursive: true });
    fs.writeFileSync(worker.log_path, [
      JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { type: "command_execution", text: "node --test src/host/moa-core.test.js" } }),
      JSON.stringify({ type: "item.completed", item: { type: "file_change", text: "task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md" } }),
      JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify(resultEnvelope) } }),
      JSON.stringify({ type: "turn.completed" }),
      "",
    ].join("\n"), "utf8");
  });

  readTeamSpace(workspace);

  const dagRunDir = path.join(workspace, ".codex-team", "dag-runs", saved.task.orchestration.dag_run_id);
  const dagRun = readJson(path.join(dagRunDir, "dag-run.json"), {});
  const completedNodeIds = Array.isArray(dagRun.nodes)
    ? dagRun.nodes.filter((node) => node && node.status === "completed").map((node) => node.node_id)
    : [];
  const launchedNodeIds = launched.launched.launched.map((worker) => worker.node_id);
  assert.equal(launchedNodeIds.every((nodeId) => completedNodeIds.includes(nodeId)), true);
  launchedNodeIds.forEach((nodeId, index) => {
    const node = dagRun.nodes.find((item) => item && item.node_id === nodeId);
    assert.ok(node);
    assert.equal(node.result.summary, `Completed worker envelope ${index + 1}.`);
  });
  assert.ok(Array.isArray(dagRun.blackboard));
  assert.ok(dagRun.blackboard.some((entry) => entry && entry.summary === "Worker 1 envelope ingestion verified."));
  assert.ok(dagRun.blackboard.some((entry) => entry && entry.summary === "Worker 2 envelope ingestion verified."));

  const traceIndex = readJson(path.join(dagRunDir, "trace.index.json"), {});
  assert.equal(Number(traceIndex.events_by_type.worker_result_envelope || 0) >= 2, true);

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(Array.isArray(task.runtime.trace.ingested_worker_node_ids), true);
  assert.equal(launchedNodeIds.every((nodeId) => task.runtime.trace.ingested_worker_node_ids.includes(nodeId)), true);
});

test("keeps task running until all launched worker envelopes are ingested, then promotes to review", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Gate task completion on launched worker batch ingestion",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: String(9300 + launchCalls.length),
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  const launchedWorkers = launched.launched.launched;
  assert.equal(launchedWorkers.length, 2);
  const launchByNodeId = new Map(launchCalls
    .map((entry) => (entry && entry.node && entry.node.node_id ? [entry.node.node_id, entry] : null))
    .filter(Boolean));

  const firstWorker = launchedWorkers[0];
  const secondWorker = launchedWorkers[1];
  const firstLaunch = launchByNodeId.get(firstWorker.node_id);
  const firstChangedFile = Array.isArray(firstLaunch && firstLaunch.node && firstLaunch.node.ownership && firstLaunch.node.ownership.write_paths)
    && firstLaunch.node.ownership.write_paths.includes("task-plans")
    ? "task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"
    : "src/host/team-coordination.js";
  fs.mkdirSync(path.dirname(firstWorker.log_path), { recursive: true });
  fs.writeFileSync(firstWorker.log_path, [
    JSON.stringify({ type: "session_meta", payload: { id: firstWorker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
      summary: "First worker completed.",
      changed_files: [firstChangedFile],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: ["Second worker still running."],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "First worker done." }],
      next_request: "Wait for second worker.",
    }) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const firstPassTaskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const firstPassTask = readJson(firstPassTaskPath, {});
  assert.equal(String(firstPassTask.runtime && firstPassTask.runtime.state || ""), "running");
  assert.equal(String(firstPassTask.status || ""), TASK_STATES.RUNNING);
  assert.equal(Array.isArray(firstPassTask.runtime && firstPassTask.runtime.awaiting_worker_node_ids), true);
  assert.ok(firstPassTask.runtime.awaiting_worker_node_ids.includes(secondWorker.node_id));

  const secondLaunch = launchByNodeId.get(secondWorker.node_id);
  const secondChangedFile = Array.isArray(secondLaunch && secondLaunch.node && secondLaunch.node.ownership && secondLaunch.node.ownership.write_paths)
    && secondLaunch.node.ownership.write_paths.includes("task-plans")
    ? "task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"
    : "src/host/team-coordination.js";
  fs.mkdirSync(path.dirname(secondWorker.log_path), { recursive: true });
  fs.writeFileSync(secondWorker.log_path, [
    JSON.stringify({ type: "session_meta", payload: { id: secondWorker.worker_thread_id } }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
      summary: "Second worker completed.",
      changed_files: [secondChangedFile],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Second worker done." }],
      next_request: "Supervisor review.",
    }) } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");

  readTeamSpace(workspace);

  const finalTask = readJson(firstPassTaskPath, {});
  assert.equal(String(finalTask.runtime && finalTask.runtime.state || ""), "completed");
  assert.equal(String(finalTask.status || ""), TASK_STATES.REVIEW);
  assert.deepEqual(finalTask.runtime.awaiting_worker_node_ids, []);
});

test("checks roadmap index entry after launched worker envelope ingestion completes a marked task plan", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Check roadmap task-plan index when launched worker batch is fully ingested",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const completedTaskPlanPath = path.join(workspace, "task-plans", "10-agent-orchestration", "moa-dag-parallel-orchestrator-task-plan.md");
  fs.mkdirSync(path.dirname(completedTaskPlanPath), { recursive: true });
  fs.writeFileSync(completedTaskPlanPath, [
    "# MoA DAG Parallel Orchestrator Task Plan",
    "",
    "## Status",
    "",
    "- [x] Complete",
    "",
  ].join("\n"), "utf8");

  const roadmapPath = path.join(workspace, "task-plans", "00-roadmap", "remote-workflow-reference-roadmap.md");
  fs.mkdirSync(path.dirname(roadmapPath), { recursive: true });
  fs.writeFileSync(roadmapPath, [
    "# CMA MoA Orchestrator Roadmap",
    "",
    "## Task Plan Index",
    "",
    "- [ ] [MoA Core Inside CMA: narrow local Team Space foundation](../10-agent-orchestration/moa-core-inside-cma-task-plan.md)",
    "- [ ] [MoA DAG Parallel Orchestrator: supervisor, blackboard, and ownership-safe workers](../10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md)",
    "",
  ].join("\n"), "utf8");

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: String(9700 + launchCalls.length),
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);

  launched.launched.launched.forEach((worker, index) => {
    fs.mkdirSync(path.dirname(worker.log_path), { recursive: true });
    fs.writeFileSync(worker.log_path, [
      JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
        summary: `Roadmap check worker ${index + 1} completed.`,
        changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
        checks_run: ["node --test src/host/moa-core.test.js"],
        open_risks: [],
        blackboard_updates: [{ kind: "finding", visibility: "dag", summary: `Roadmap check worker ${index + 1} ingested.` }],
        next_request: "Supervisor review.",
      }) } }),
      JSON.stringify({ type: "turn.completed" }),
      "",
    ].join("\n"), "utf8");
  });

  readTeamSpace(workspace);

  const roadmapContent = fs.readFileSync(roadmapPath, "utf8");
  assert.match(
    roadmapContent,
    /- \[x\] \[MoA DAG Parallel Orchestrator: supervisor, blackboard, and ownership-safe workers\]\(\.\.\/10-agent-orchestration\/moa-dag-parallel-orchestrator-task-plan\.md\)/,
  );

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(String(task.status || ""), TASK_STATES.REVIEW);
  assert.equal(String(task.runtime && task.runtime.state || ""), "completed");
  assert.equal(Array.isArray(task.runtime && task.runtime.roadmap_index_checked_plan_paths), true);
  assert.ok(task.runtime.roadmap_index_checked_plan_paths.includes("task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"));

  const events = readJsonl(paths.eventsLogPath);
  assert.ok(events.some((entry) => entry && entry.type === "orchestration.roadmap_index_checked"));
});

test("does not check roadmap index entry when task plan status is not complete", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = generateTeamOrchestrationDraft(panel, {
    goal: "Do not check roadmap index when task-plan status remains incomplete",
    workerCount: 2,
  });
  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);

  const incompleteTaskPlanPath = path.join(workspace, "task-plans", "10-agent-orchestration", "moa-dag-parallel-orchestrator-task-plan.md");
  fs.mkdirSync(path.dirname(incompleteTaskPlanPath), { recursive: true });
  fs.writeFileSync(incompleteTaskPlanPath, [
    "# MoA DAG Parallel Orchestrator Task Plan",
    "",
    "## Status",
    "",
    "- [ ] Complete",
    "",
  ].join("\n"), "utf8");

  const roadmapPath = path.join(workspace, "task-plans", "00-roadmap", "remote-workflow-reference-roadmap.md");
  fs.mkdirSync(path.dirname(roadmapPath), { recursive: true });
  fs.writeFileSync(roadmapPath, [
    "# CMA MoA Orchestrator Roadmap",
    "",
    "## Task Plan Index",
    "",
    "- [ ] [MoA Core Inside CMA: narrow local Team Space foundation](../10-agent-orchestration/moa-core-inside-cma-task-plan.md)",
    "- [ ] [MoA DAG Parallel Orchestrator: supervisor, blackboard, and ownership-safe workers](../10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md)",
    "",
  ].join("\n"), "utf8");

  const launchCalls = [];
  const launched = launchTeamWorkspaceOrchestration(panel, saved.workspace_id, {
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: `pending-team-worker-${payload.node.node_id}`,
        pid: String(9800 + launchCalls.length),
        log_path: path.join(workspace, `.codex-team/dag-runs/${payload.run_id}/${payload.node.node_id}.runtime.log`),
        model: payload.model,
      };
    },
  });
  assert.ok(launched);
  assert.equal(Array.isArray(launched.launched && launched.launched.launched), true);
  assert.equal(launched.launched.launched.length, 2);

  launched.launched.launched.forEach((worker, index) => {
    fs.mkdirSync(path.dirname(worker.log_path), { recursive: true });
    fs.writeFileSync(worker.log_path, [
      JSON.stringify({ type: "session_meta", payload: { id: worker.worker_thread_id } }),
      JSON.stringify({ type: "turn.started" }),
      JSON.stringify({ type: "item.completed", item: { type: "message", text: JSON.stringify({
        summary: `Incomplete-plan worker ${index + 1} completed.`,
        changed_files: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
        checks_run: ["node --test src/host/moa-core.test.js"],
        open_risks: [],
        blackboard_updates: [{ kind: "finding", visibility: "dag", summary: `Incomplete-plan worker ${index + 1} ingested.` }],
        next_request: "Supervisor review.",
      }) } }),
      JSON.stringify({ type: "turn.completed" }),
      "",
    ].join("\n"), "utf8");
  });

  readTeamSpace(workspace);

  const roadmapContent = fs.readFileSync(roadmapPath, "utf8");
  assert.match(
    roadmapContent,
    /- \[ \] \[MoA DAG Parallel Orchestrator: supervisor, blackboard, and ownership-safe workers\]\(\.\.\/10-agent-orchestration\/moa-dag-parallel-orchestrator-task-plan\.md\)/,
  );

  const taskPath = path.join(paths.tasksDir, `${saved.task.task_id}.json`);
  const task = readJson(taskPath, {});
  assert.equal(String(task.status || ""), TASK_STATES.REVIEW);
  assert.equal(String(task.runtime && task.runtime.state || ""), "completed");
  assert.equal(Array.isArray(task.runtime && task.runtime.roadmap_index_checked_plan_paths), false);
  assert.equal(String(task.runtime && task.runtime.roadmap_index_checked_at || ""), "");

  const events = readJsonl(paths.eventsLogPath);
  assert.equal(events.some((entry) => entry && entry.type === "orchestration.roadmap_index_checked"), false);
});

test("saves worker prompt preview with upstream blackboard context only for selected node", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const draft = {
    goal: "Compile host worker prompt from dependency-safe DAG context",
    workerCount: 2,
    worker_model: "gpt-5.5",
    blackboard: [
      { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Keep all worker prompts bounded." },
      { entry_id: "bb-upstream", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract fields approved." },
      { entry_id: "bb-downstream", source_node_id: "ui", kind: "risk", visibility: "dag", summary: "Downstream UI risk." },
    ],
    dagRun: {
      run_id: "dag-preview-blackboard-filter",
      status: "ready",
      blackboard: [
        { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Keep all worker prompts bounded." },
        { entry_id: "bb-upstream", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract fields approved." },
        { entry_id: "bb-downstream", source_node_id: "ui", kind: "risk", visibility: "dag", summary: "Downstream UI risk." },
      ],
      nodes: [
        {
          node_id: "contract",
          title: "Contract node",
          status: "completed",
          role: "Contract worker",
          ownership: { write_paths: ["task-plans"] },
        },
        {
          node_id: "host",
          title: "Host prompt compiler",
          status: "ready",
          role: "Host worker prompt compiler",
          depends_on: ["contract"],
          ownership: {
            read_paths: ["src/host/moa-core.js"],
            write_paths: ["src/host/moa-core.js"],
            exclusive_paths: ["src/host/moa-core.test.js"],
            expected_outputs: ["worker prompt compiler + tests"],
          },
        },
        {
          node_id: "ui",
          title: "UI downstream",
          status: "pending",
          depends_on: ["host"],
          role: "UI worker",
          ownership: { write_paths: ["src/webview-template.js"] },
        },
      ],
    },
  };

  const saved = await saveTeamOrchestrationDraft(panel, { draft });
  assert.ok(saved);
  assert.equal(saved.task.orchestration.worker_prompt_previews.length, 1);
  assert.equal(saved.task.orchestration.worker_prompt_previews[0].node_id, "host");
  assert.equal(saved.task.orchestration.worker_prompt_previews[0].model, "gpt-5.3-codex");
  const prompt = saved.task.orchestration.worker_prompt_previews[0].prompt;
  assert.match(prompt, /Keep all worker prompts bounded\./);
  assert.match(prompt, /Contract fields approved\./);
  assert.doesNotMatch(prompt, /Downstream UI risk\./);
});

test("same-thread retry preflight writes a failed task when owner thread is unresolved", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createTeamWorkspaceRecord(panel, {
    title: "Missing owner retry",
    prompt: "Retry the missing owner thread",
  });
  const taskPath = path.join(paths.tasksDir, `${created.task.task_id}.json`);
  const task = readJson(taskPath, {});
  task.owner = "thread-missing";
  task.status = TASK_STATES.FAILED;
  task.runtime = {
    state: "failed",
    thread_id: "thread-missing",
    run_id: "run-missing",
    error: "Prior run failed.",
  };
  writeJson(taskPath, task);

  const prepared = prepareTeamTaskRetry(panel, created.task.task_id, "same");
  assert.equal(prepared, null);

  const team = readTeamSpace(workspace);
  const failedTask = team.tasks.find((item) => item && item.task_id === created.task.task_id);
  assert.equal(failedTask.status, TASK_STATES.FAILED);
  assert.equal(failedTask.runtime.state, "failed");
  assert.equal(failedTask.runtime.command_kind, "codex.exec.resume");
  assert.equal(failedTask.runtime.retry_mode, "same");
  assert.match(failedTask.runtime.error, /owner thread is not available/);

  const taskTracePath = path.join(paths.taskTracesDir, `${created.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  assert.ok(taskTrace.some((entry) =>
    entry.kind === "task.failed"
    && entry.payload
    && entry.payload.command_kind === "codex.exec.resume"
    && /owner thread is not available/.test(String(entry.payload.error || ""))
  ));
});

test("same-thread retry refuses owner-thread fallback when a bound worker session is unavailable", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  panel.lastPayload = {
    dashboard: {
      threads: [
        { id: "thread-owner-current", cwd: workspace, title: "Owner thread" },
      ],
    },
  };
  const created = await createTeamWorkspaceRecord(panel, {
    title: "Bound session retry",
    prompt: "Retry only the bound worker session",
  });
  const taskPath = path.join(paths.tasksDir, `${created.task.task_id}.json`);
  const task = readJson(taskPath, {});
  task.owner = "thread-owner-current";
  task.status = TASK_STATES.FAILED;
  task.runtime = {
    state: "failed",
    thread_id: "thread-owner-current",
    run_id: "run-bound",
    launched_workers: [
      {
        node_id: "worker-a",
        worker_thread_id: "thread-bound-session",
        session_binding: {
          run_id: "run-bound",
          node_id: "worker-a",
          worker_thread_id: "thread-bound-session",
        },
      },
    ],
    error: "Prior run failed.",
  };
  writeJson(taskPath, task);

  const prepared = prepareTeamTaskRetry(panel, created.task.task_id, "same");
  assert.equal(prepared, null);

  const team = readTeamSpace(workspace);
  const failedTask = team.tasks.find((item) => item && item.task_id === created.task.task_id);
  assert.equal(failedTask.status, TASK_STATES.FAILED);
  assert.equal(failedTask.runtime.state, "failed");
  assert.equal(failedTask.runtime.command_kind, "codex.exec.resume");
  assert.equal(failedTask.runtime.retry_mode, "same");
  assert.match(String(failedTask.runtime.error || ""), /Bound worker session is not available/);
  assert.doesNotMatch(String(failedTask.runtime.error || ""), /owner thread is not available/);
});

test("buildTeamDispatchFailurePatch classifies Codex CLI and model preflight failures", () => {
  const missingCli = new Error("spawn codex ENOENT");
  missingCli.code = "ENOENT";
  const cliPatch = buildTeamDispatchFailurePatch(missingCli, {
    commandKind: "codex.exec.new",
    retryMode: "new",
  });
  assert.equal(cliPatch.command_kind, "codex.exec.new");
  assert.equal(cliPatch.retry_mode, "new");
  assert.equal(cliPatch.preflight_kind, "codex_cli_missing");
  assert.match(cliPatch.preflight_action, /Install or authenticate Codex CLI/);
  assert.equal(cliPatch.preflight.kind, "codex_cli_missing");

  const modelPatch = buildTeamDispatchFailurePatch(
    new Error("codexAgent.defaultCodexModel must be a single model name without spaces"),
    { commandKind: "codex.exec.new" }
  );
  assert.equal(modelPatch.preflight_kind, "model_misconfigured");
  assert.match(modelPatch.preflight_action, /defaultCodexModel/);
  assert.match(modelPatch.preflight_detail, /single model name/);

  const workspacePatch = buildTeamDispatchFailurePatch(
    new Error("Codex-Managed-Agent: no workspace available for team workspace"),
    { commandKind: "codex.exec.new" }
  );
  assert.equal(workspacePatch.preflight_kind, "workspace_missing");
  assert.match(workspacePatch.preflight_action, /Open a folder/);
});

test("updates a Team task definition without touching runtime fields", async (t) => {
  const { workspace } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createTeamWorkspaceRecord(panel, {
    title: "Definition before",
    prompt: "Original prompt",
  });
  const updated = updateTeamTaskDefinition(panel, {
    taskId: created.task.task_id,
    title: "Definition after",
    prompt: "Updated prompt",
    acceptanceCriteria: "First criterion\n- Second criterion",
  });
  assert.ok(updated);
  assert.equal(updated.title, "Definition after");
  assert.deepEqual(updated.acceptance_criteria, ["First criterion", "Second criterion"]);
  assert.equal(updated.runtime, undefined);

  const team = readTeamSpace(workspace);
  const workspaceRecord = team.workspaces.find((item) => item.workspace_id === created.workspace_id);
  assert.ok(workspaceRecord);
  assert.equal(workspaceRecord.title, "Definition after");
  assert.equal(workspaceRecord.task.inputs.find((item) => item.type === "prompt").value, "Updated prompt");
  assert.deepEqual(workspaceRecord.task.acceptance_criteria, ["First criterion", "Second criterion"]);
});

test("archives a Team workspace from active view while preserving workspace files", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createTeamWorkspaceRecord(panel, {
    title: "Archive me",
    prompt: "Archive workspace task",
  });
  const originalWarning = vscodeMock.window.showWarningMessage;
  vscodeMock.window.showWarningMessage = async () => "Archive Workspace";
  try {
    const archived = await deleteTeamWorkspace(panel, created.workspace_id);
    assert.equal(archived, true);
  } finally {
    vscodeMock.window.showWarningMessage = originalWarning;
  }
  const team = readTeamSpace(workspace);
  assert.equal(team.workspaces.some((item) => item.workspace_id === created.workspace_id), false);
  assert.equal(fs.existsSync(path.join(paths.tasksDir, `${created.task.task_id}.json`)), false);
  assert.ok(fs.readdirSync(paths.archivedWorkspacesDir).some((name) => name.startsWith(created.workspace_id)));
});

test("reports invalid task, event, and inbox records without throwing", (t) => {
  const { paths } = createTeamWorkspace(t);
  writeJson(path.join(paths.tasksDir, "bad-task.json"), {
    task_id: "different-id",
    title: "",
    owner: "",
    status: "mystery",
    dependencies: "not-array",
    inputs: [],
    acceptance_criteria: [],
    artifacts: [],
  });
  fs.writeFileSync(paths.eventsLogPath, "{not json}\n", "utf8");
  appendJsonl(path.join(paths.inboxDir, "supervisor.jsonl"), {
    message_id: "msg-bad",
    target_agent_id: "supervisor",
    created_at: "2026-04-18T00:00:00.000Z",
    type: "handoff.requested",
    payload: "not-object",
  });

  const validation = validateTeamSpaceFiles(paths);
  assert.equal(validation.ok, false);
  assert.equal(validation.invalidTaskCount, 1);
  assert.equal(validation.invalidEventCount, 1);
  assert.equal(validation.invalidInboxMessageCount, 1);
  assert.match(validation.errors.join("\n"), /task_id must match filename/);
  assert.match(validation.errors.join("\n"), /invalid json/);
  assert.match(validation.errors.join("\n"), /payload must be an object/);
});

test("task and inbox validators enforce the minimal mailbox contract", () => {
  const taskValidation = validateTeamTaskRecord({
    task_id: "task-beta",
    title: "Beta",
    owner: "thread-beta",
    status: TASK_STATES.ASSIGNED,
    dependencies: [],
    inputs: [],
    goal: "Do beta work",
    acceptance_criteria: [],
    artifacts: [],
    created_at: "2026-04-18T00:00:00.000Z",
    updated_at: "2026-04-18T00:00:00.000Z",
  }, { fileTaskId: "task-beta" });
  assert.equal(taskValidation.ok, true);

  const inboxValidation = validateTeamInboxRecord({
    message_id: "msg-beta",
    target_agent_id: "thread-beta",
    created_at: "2026-04-18T00:00:00.000Z",
    type: "task.assigned",
    payload: { task_id: "task-beta" },
  });
  assert.equal(inboxValidation.ok, true);
});

test("writes minimal Team Core traces for dispatch, thread resolution, log activity, and result capture", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createSnakeDemoTeamTask(panel);
  assert.ok(created);
  const logPath = path.join(workspace, "team-worker.log");
  fs.writeFileSync(logPath, [
    JSON.stringify({ type: "session_meta", payload: { id: "thread_real_123" } }),
    JSON.stringify({ type: "thread.started" }),
    JSON.stringify({ type: "turn.started" }),
    JSON.stringify({ type: "item.completed", item: { type: "command_execution", text: "npm test" } }),
    JSON.stringify({ type: "item.completed", item: { type: "file_change", text: "src/snake.js" } }),
    JSON.stringify({ type: "turn.completed" }),
    "",
  ].join("\n"), "utf8");
  updateTeamTaskDispatch(panel, created.task.task_id, created.thread.id, {
    state: "dispatched",
    command_kind: "codex.exec.new",
    pid: 4321,
    log_path: logPath,
  });

  const team = readTeamSpace(workspace);

  const taskTracePath = path.join(paths.taskTracesDir, `${created.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  const runId = String(readJson(path.join(paths.tasksDir, `${created.task.task_id}.json`), {}).runtime.run_id || "");
  assert.ok(runId);
  const runTracePath = path.join(paths.runsDir, runId, "trace.jsonl");
  const runTrace = readJsonl(runTracePath);
  const threadTracePath = path.join(paths.threadTracesDir, "thread_real_123.jsonl");
  const threadTrace = readJsonl(threadTracePath);

  assert.ok(taskTrace.some((entry) => entry.kind === "task.created"));
  assert.ok(taskTrace.some((entry) => entry.kind === "run.dispatch_started"));
  assert.ok(taskTrace.some((entry) => entry.kind === "run.pid_recorded"));
  assert.ok(taskTrace.some((entry) => entry.kind === "thread.resolved"));
  assert.ok(taskTrace.some((entry) => entry.kind === "run.log_activity"));
  assert.ok(taskTrace.some((entry) => entry.kind === "run.result_captured"));
  assert.ok(runTrace.some((entry) => entry.kind === "run.process_state_changed" && entry.payload && entry.payload.to === "completed"));
  assert.ok(threadTrace.some((entry) => entry.kind === "thread.resolved"));
  const tracedTask = (team.tasks || []).find((task) => task && task.task_id === created.task.task_id);
  assert.equal(tracedTask.trace_preview.lane, "task");
  assert.ok(Array.isArray(tracedTask.trace_preview.events));
  assert.ok(tracedTask.trace_preview.events.some((entry) => entry.kind === "run.result_captured"));

  const taskTraceCount = taskTrace.length;
  const runTraceCount = runTrace.length;
  const threadTraceCount = threadTrace.length;
  readTeamSpace(workspace);
  assert.equal(readJsonl(taskTracePath).length, taskTraceCount);
  assert.equal(readJsonl(runTracePath).length, runTraceCount);
  assert.equal(readJsonl(threadTracePath).length, threadTraceCount);
});

test("writes failure and retry trace events without requiring a live Codex thread", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createSnakeDemoTeamTask(panel);
  assert.ok(created);

  updateTeamTaskDispatch(panel, created.task.task_id, created.thread.id, {
    state: "failed",
    command_kind: "codex.exec.new",
    error: "spawn error: codex missing",
  });

  const prepared = prepareTeamTaskRetry(panel, created.task.task_id, "new");
  assert.ok(prepared);
  updateTeamTaskDispatch(panel, created.task.task_id, prepared.thread.id, {
    state: "dispatched",
    command_kind: "codex.exec.new",
    retry_mode: "new",
    pid: 5678,
    log_path: path.join(workspace, "retry.log"),
  });

  const taskTracePath = path.join(paths.taskTracesDir, `${created.task.task_id}.jsonl`);
  const taskTrace = readJsonl(taskTracePath);
  assert.ok(taskTrace.some((entry) => entry.kind === "task.failed"));
  assert.ok(taskTrace.some((entry) => entry.kind === "task.retry_requested"));
  assert.ok(taskTrace.some((entry) => entry.kind === "task.retry_started"));
  assert.ok(taskTrace.some((entry) => entry.kind === "run.dispatch_started" && entry.payload && entry.payload.retry_mode === "new"));
  assert.ok(taskTrace.some((entry) => entry.kind === "run.pid_recorded" && entry.evidence && entry.evidence.pid === 5678));
});

test("deletes a team task record while keeping delete event and trace evidence", async (t) => {
  const { workspace, paths } = createTeamWorkspace(t);
  const panel = createPanel(workspace);
  const created = await createSnakeDemoTeamTask(panel);
  assert.ok(created);
  const originalWarning = vscodeMock.window.showWarningMessage;
  vscodeMock.window.showWarningMessage = async () => "Delete Task";
  t.after(() => {
    vscodeMock.window.showWarningMessage = originalWarning;
  });

  const deleted = await deleteTeamTask(panel, created.task.task_id);
  assert.equal(deleted, true);
  assert.equal(fs.existsSync(path.join(paths.tasksDir, `${created.task.task_id}.json`)), false);
  const events = readJsonl(paths.eventsLogPath);
  assert.ok(events.some((entry) => entry.type === "task.deleted" && entry.task_id === created.task.task_id));
  const taskTrace = readJsonl(path.join(paths.taskTracesDir, `${created.task.task_id}.jsonl`));
  assert.ok(taskTrace.some((entry) => entry.kind === "task.deleted"));
});
