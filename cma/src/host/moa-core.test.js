const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const test = require("node:test");

const {
  DAG_NODE_STATES,
  DEFAULT_GEMINI_CLI_MODEL,
  GEMINI_CLI_MODEL_PRIORITY,
  WORKER_PROVIDER_GEMINI,
  ROLE_PLUGIN_SCHEMA_VERSION,
  ROLE_PLUGIN_CATALOG_SOURCE,
  ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION,
  ROLE_ORGANIZATION_TEMPLATE_CATALOG_SOURCE,
  buildBuiltInRolePluginCatalog,
  buildRolePluginCatalog,
  buildBuiltInRoleOrganizationTemplateCatalog,
  compileSupervisorPrompt,
  compileWorkerPrompt,
  applyWorkerLaunchMetadata,
  applyWorkerLaunchFailureMetadata,
  applyWorkerResultIngestFailureMetadata,
  listBuiltInRoleTemplateIds,
  listBuiltInRoleTemplates,
  listLocalRolePluginTemplates,
  listBuiltInRoleOrganizationTemplates,
  resolveBuiltInRoleOrganizationTemplate,
  resolveBuiltInRoleTemplate,
  resolveRoleTemplate,
  normalizeRoleOrganizationTemplateId,
  normalizeRolePluginTemplate,
  normalizeRoleTemplateId,
  assertUniqueRoleTemplateTokens,
  normalizeWorkerProvider,
  normalizeRoleTemplateBinding,
  applyRoleTemplateToSupervisorDraft,
  applyRoleTemplateToWorkerDraft,
  applyRoleTemplateToOrchestrationWorkerDraft,
  applyBuiltInRoleTemplateToOrchestrationWorkerDraft,
  applyBuiltInRoleOrganizationTemplateToDraft,
  applyBuiltInRoleTemplateToSupervisorDraft,
  applyBuiltInRoleTemplateToWorkerDraft,
  normalizeWorkerResultEnvelope,
  parseWorkerResultEnvelope,
  validateWorkerChangedFiles,
  applyWorkerResultEnvelope,
  launchSchedulableWorkerBatch,
  ingestWorkerResultEnvelope,
  persistWorkerLaunchMetadata,
  dependencyState,
  detectOwnershipConflicts,
  draftToDagRun,
  explainDagSchedule,
  findReadyNodes,
  generateOrchestrationDraft,
  normalizeOrchestrationDraft,
  normalizeDagRun,
  pathsOverlap,
  persistWorkerPromptSnapshot,
  persistWorkerResultEnvelope,
  persistWorkerResultIngestFailureMetadata,
  archiveDagRunEvidence,
  beginDagRunSchedulerTick,
  runLaunchSchedulerTick,
  readDagRun,
  selectSchedulableNodes,
  writeDagRun,
} = require("./moa-core");

test("normalizes a DAG run with ownership fields", () => {
  const run = normalizeDagRun({
    dag_run_id: "dag-1",
    nodes: [{
      id: "ui",
      dependencies: ["contract"],
      write_paths: ["src/webview-template.js"],
      exclusive_paths: ["src/webview"],
    }],
  });

  assert.equal(run.run_id, "dag-1");
  assert.equal(run.nodes[0].node_id, "ui");
  assert.deepEqual(run.nodes[0].depends_on, ["contract"]);
  assert.deepEqual(run.nodes[0].ownership.write_paths, ["src/webview-template.js"]);
  assert.deepEqual(run.nodes[0].ownership.exclusive_paths, ["src/webview"]);
});

test("finds ready nodes only after dependencies complete", () => {
  const dagRun = {
    nodes: [
      { node_id: "contract", status: DAG_NODE_STATES.COMPLETED },
      { node_id: "ui", status: DAG_NODE_STATES.PENDING, depends_on: ["contract"] },
      { node_id: "tests", status: DAG_NODE_STATES.PENDING, depends_on: ["ui"] },
    ],
  };

  const states = dependencyState(normalizeDagRun(dagRun).nodes);
  assert.equal(states.find((item) => item.node_id === "ui").ready, true);
  assert.equal(states.find((item) => item.node_id === "tests").ready, false);
  assert.deepEqual(findReadyNodes(dagRun).map((node) => node.node_id), ["ui"]);
});

test("treats nested write paths as conflicting", () => {
  assert.equal(pathsOverlap("src/webview", "src/webview/actions.js"), true);
  assert.equal(pathsOverlap("src/webview-template.js", "src/host/team-coordination.js"), false);
});

test("detects write and exclusive path conflicts", () => {
  const conflicts = detectOwnershipConflicts([
    {
      node_id: "ui",
      ownership: { write_paths: ["src/webview"] },
    },
    {
      node_id: "actions",
      ownership: { write_paths: ["src/webview/actions.js"] },
    },
    {
      node_id: "docs",
      ownership: { read_paths: ["task-plans"], write_paths: ["docs/team-workspace.md"] },
    },
  ]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].kind, "write_conflict");
  assert.equal(conflicts[0].left_node_id, "ui");
  assert.equal(conflicts[0].right_node_id, "actions");
});

test("selects a non-conflicting ready batch around running nodes", () => {
  const selected = selectSchedulableNodes({
    nodes: [
      {
        node_id: "host-running",
        status: DAG_NODE_STATES.RUNNING,
        ownership: { write_paths: ["src/host"] },
      },
      {
        node_id: "webview-ready",
        status: DAG_NODE_STATES.PENDING,
        ownership: { write_paths: ["src/webview"] },
      },
      {
        node_id: "host-ready",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host/team-coordination.js"] },
      },
    ],
  });

  assert.deepEqual(selected.selected.map((node) => node.node_id), ["webview-ready"]);
  assert.equal(selected.blocked.length, 1);
  assert.equal(selected.blocked[0].reason, "ownership_conflict");
});

test("honors max parallel selection", () => {
  const result = selectSchedulableNodes({
    nodes: [
      { node_id: "a", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["a"] } },
      { node_id: "b", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["b"] } },
    ],
  }, { maxParallel: 1 });

  assert.deepEqual(result.selected.map((node) => node.node_id), ["a"]);
  assert.equal(result.blocked[0].reason, "parallel_limit");
});

test("persists a DAG run under .codex-team/dag-runs with trace placeholders", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const { dagRun, paths } = writeDagRun(workspace, {
    run_id: "dag-demo",
    team_space_id: "task-demo",
    nodes: [{ node_id: "contract", ownership: { write_paths: ["src/host/moa-core.js"] } }],
  });

  assert.equal(dagRun.run_id, "dag-demo");
  assert.ok(fs.existsSync(paths.runJson));
  assert.ok(fs.existsSync(paths.traceJsonl));
  assert.ok(fs.existsSync(paths.blackboardJsonl));
  assert.equal(readDagRun(workspace, "dag-demo").nodes[0].node_id, "contract");
});

test("explains selected, blocked, and waiting nodes for dry-run scheduling", () => {
  const explanation = explainDagSchedule({
    run_id: "dag-explain",
    nodes: [
      { node_id: "contract", status: DAG_NODE_STATES.COMPLETED },
      { node_id: "ui", status: DAG_NODE_STATES.PENDING, depends_on: ["contract"], ownership: { write_paths: ["src/webview"] } },
      { node_id: "ui-test", status: DAG_NODE_STATES.PENDING, depends_on: ["contract"], ownership: { write_paths: ["src/webview/render-detail-regression.test.js"] } },
      { node_id: "docs", status: DAG_NODE_STATES.PENDING, depends_on: ["missing"], ownership: { write_paths: ["docs/team-workspace.md"] } },
    ],
  });

  assert.deepEqual(explanation.selected_node_ids, ["ui"]);
  assert.deepEqual(explanation.blocked_node_ids, ["ui-test"]);
  assert.equal(explanation.node_explanations.find((item) => item.node_id === "ui-test").reason, "ownership_conflict");
  assert.equal(explanation.node_explanations.find((item) => item.node_id === "docs").reason, "missing_dependencies");
});

test("dry-run explanation blocks ready nodes that conflict with running ownership", () => {
  const explanation = explainDagSchedule({
    run_id: "dag-running-conflict",
    nodes: [
      { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
      { node_id: "host-running", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
      {
        node_id: "host-ready",
        status: DAG_NODE_STATES.READY,
        depends_on: ["contract"],
        ownership: { write_paths: ["src/host/moa-core.js"] },
      },
      {
        node_id: "ui-ready",
        status: DAG_NODE_STATES.READY,
        depends_on: ["contract"],
        ownership: { write_paths: ["src/webview"] },
      },
    ],
  }, { maxParallel: 2 });

  assert.deepEqual(explanation.selected_node_ids, ["ui-ready"]);
  assert.deepEqual(explanation.blocked_node_ids, ["host-ready"]);
  assert.equal(explanation.node_explanations.find((item) => item.node_id === "host-ready").reason, "ownership_conflict");
  assert.equal(explanation.node_explanations.find((item) => item.node_id === "ui-ready").decision, "selected");
  assert.equal(explanation.node_explanations.find((item) => item.node_id === "host-running").reason, "status_running");
});

test("compiles a supervisor prompt with task, schedule, ownership, and output envelope", () => {
  const prompt = compileSupervisorPrompt({
    maxParallel: 2,
    task: {
      task_id: "task-moa",
      title: "Build MoA supervisor",
      goal: "Create bounded worker assignments.",
      acceptance_criteria: ["Do not overlap writes"],
    },
    dagRun: {
      run_id: "dag-moa",
      status: "ready",
      nodes: [
        { node_id: "host", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["src/host"] } },
        { node_id: "ui", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["src/webview"] } },
      ],
      blackboard: [{ kind: "decision", summary: "Keep local-first." }],
    },
  });

  assert.match(prompt, /CMA MoA Supervisor Thread/);
  assert.match(prompt, /Build MoA supervisor/);
  assert.match(prompt, /gpt-5\.3-codex/);
  assert.match(prompt, /selected_worker_nodes/);
  assert.match(prompt, /exclusive_paths also block/);
  assert.match(prompt, /"selected_node_ids": \[\n    "host",\n    "ui"\n  \]/);
});

test("compiles a worker prompt with bounded ownership and result envelope", () => {
  const prompt = compileWorkerPrompt({
    workspace: "/repo/demo",
    task: {
      task_id: "task-moa-worker",
      title: "Implement host node",
      goal: "Finish bounded host changes.",
      acceptance_criteria: ["Keep DAG evidence complete"],
    },
    dagRun: {
      run_id: "dag-worker",
      blackboard: [
        { entry_id: "bb-contract", source_node_id: "contract", kind: "decision", visibility: "dag", summary: "Contract frozen." },
        { entry_id: "bb-ui", source_node_id: "ui", kind: "finding", visibility: "dag", summary: "UI detail not needed here." },
      ],
      nodes: [
        {
          node_id: "contract",
          status: DAG_NODE_STATES.COMPLETED,
          ownership: { write_paths: ["task-plans"] },
        },
        {
          node_id: "host",
          status: DAG_NODE_STATES.READY,
          role: "Implement host orchestration logic.",
          depends_on: ["contract"],
          ownership: {
            read_paths: ["src/host"],
            write_paths: ["src/host"],
            exclusive_paths: ["src/host/moa-core.js"],
            expected_outputs: ["src/host/moa-core.test.js"],
          },
        },
        {
          node_id: "ui",
          status: DAG_NODE_STATES.PENDING,
          ownership: { write_paths: ["src/webview"] },
        },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /CMA MoA Worker Node/);
  assert.match(prompt, /gpt-5\.3-codex/);
  assert.match(prompt, /Implement host orchestration logic/);
  assert.match(prompt, /src\/host\/moa-core\.js/);
  assert.match(prompt, /Other workers may be active at the same time/);
  assert.match(prompt, /Role and ownership boundaries/);
  assert.match(prompt, /allowed_write_targets/);
  assert.match(prompt, /Output JSON only\. Do not wrap in markdown fences/);
  assert.match(prompt, /changed_files/);
  assert.match(prompt, /blackboard_updates/);
  assert.match(prompt, /"node_id": "host"/);
  assert.match(prompt, /Contract frozen/);
});

test("worker prompt compacts write and exclusive paths into allowed write targets", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-allowed-write-targets",
      nodes: [{
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        ownership: {
          write_paths: ["src/host", "src/host/moa-core.js"],
          exclusive_paths: ["src/host/moa-core.js", "src/host/moa-core.test.js"],
        },
      }],
    },
    node_id: "host",
  });

  assert.match(prompt, /"allowed_write_targets": \[/);
  assert.match(prompt, /"src\/host"/);
  assert.match(prompt, /"src\/host\/moa-core\.js"/);
  assert.match(prompt, /"src\/host\/moa-core\.test\.js"/);
});

test("worker prompt forbids edits when ownership has no writable targets", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-no-writable-targets",
      nodes: [{
        node_id: "contract",
        status: DAG_NODE_STATES.READY,
        ownership: {
          read_paths: ["task-plans/10-agent-orchestration/moa-dag-parallel-orchestrator-task-plan.md"],
          write_paths: [],
          exclusive_paths: [],
        },
      }],
    },
    node_id: "contract",
  });

  assert.match(prompt, /"allowed_write_targets": \[\s*\]/);
  assert.match(prompt, /has no allowed_write_targets/);
  assert.match(prompt, /Do not edit files; request supervisor handoff/);
});

test("worker prompt includes only upstream blackboard context", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-bb-filter",
      blackboard: [
        { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Global DAG policy." },
        { entry_id: "bb-upstream", source_node_id: "compile", kind: "finding", visibility: "dag", summary: "Compiler output approved." },
        { entry_id: "bb-downstream", source_node_id: "ship", kind: "risk", visibility: "dag", summary: "Release risk." },
      ],
      nodes: [
        { node_id: "compile", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["src/host"] } },
        { node_id: "test", status: DAG_NODE_STATES.READY, depends_on: ["compile"], ownership: { write_paths: ["src/host/moa-core.test.js"] } },
        { node_id: "ship", status: DAG_NODE_STATES.PENDING, depends_on: ["test"], ownership: { write_paths: ["docs"] } },
      ],
    },
    node_id: "test",
  });

  assert.match(prompt, /Global DAG policy/);
  assert.match(prompt, /Compiler output approved/);
  assert.doesNotMatch(prompt, /Release risk/);
});

test("worker prompt includes transitive completed upstream blackboard context", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-bb-transitive",
      blackboard: [
        { entry_id: "bb-contract", source_node_id: "contract", kind: "decision", visibility: "dag", summary: "Contract schema locked." },
        { entry_id: "bb-compile", source_node_id: "compile", kind: "finding", visibility: "dag", summary: "Compiler output normalized." },
        { entry_id: "bb-review", kind: "risk", visibility: "review", summary: "Reviewer requests strict envelope parsing." },
        { entry_id: "bb-unrelated", source_node_id: "docs", kind: "artifact", visibility: "dag", summary: "Docs draft." },
      ],
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        { node_id: "compile", status: DAG_NODE_STATES.COMPLETED, depends_on: ["contract"], ownership: { write_paths: ["src/host"] } },
        { node_id: "test", status: DAG_NODE_STATES.READY, depends_on: ["compile"], ownership: { write_paths: ["src/host/moa-core.test.js"] } },
        { node_id: "docs", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["docs"] } },
      ],
    },
    node_id: "test",
  });

  assert.match(prompt, /Contract schema locked/);
  assert.match(prompt, /Compiler output normalized/);
  assert.match(prompt, /Reviewer requests strict envelope parsing/);
  assert.doesNotMatch(prompt, /Docs draft/);
});

test("worker prompt caps upstream blackboard context to most recent entries", () => {
  const blackboard = Array.from({ length: 8 }, (_, index) => ({
    entry_id: `bb-${index + 1}`,
    kind: "decision",
    visibility: "dag",
    summary: `Global policy ${index + 1}`,
  }));
  const prompt = compileWorkerPrompt({
    maxBlackboardEntries: 3,
    dagRun: {
      run_id: "dag-bb-cap",
      blackboard,
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        { node_id: "host", status: DAG_NODE_STATES.READY, depends_on: ["contract"], ownership: { write_paths: ["src/host"] } },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /Global policy 6/);
  assert.match(prompt, /Global policy 7/);
  assert.match(prompt, /Global policy 8/);
  assert.doesNotMatch(prompt, /Global policy 1/);
  assert.doesNotMatch(prompt, /Global policy 2/);
  assert.doesNotMatch(prompt, /Global policy 3/);
  assert.doesNotMatch(prompt, /Global policy 4/);
  assert.doesNotMatch(prompt, /Global policy 5/);
});

test("worker prompt caps completed upstream dependency context to most recent entries", () => {
  const nodes = Array.from({ length: 8 }, (_, index) => ({
    node_id: `dep-${index + 1}`,
    status: DAG_NODE_STATES.COMPLETED,
    depends_on: index === 0 ? [] : [`dep-${index}`],
    ownership: { write_paths: [`src/host/dep-${index + 1}.js`] },
  }));
  nodes.push({
    node_id: "host",
    status: DAG_NODE_STATES.READY,
    depends_on: ["dep-8"],
    ownership: { write_paths: ["src/host/moa-core.js"] },
  });

  const prompt = compileWorkerPrompt({
    maxUpstreamNodes: 3,
    dagRun: {
      run_id: "dag-upstream-cap",
      nodes,
    },
    node_id: "host",
  });

  assert.match(prompt, /"node_id": "dep-6"/);
  assert.match(prompt, /"node_id": "dep-7"/);
  assert.match(prompt, /"node_id": "dep-8"/);
  assert.doesNotMatch(prompt, /"node_id": "dep-1"/);
  assert.doesNotMatch(prompt, /"node_id": "dep-2"/);
  assert.doesNotMatch(prompt, /"node_id": "dep-3"/);
  assert.doesNotMatch(prompt, /"node_id": "dep-4"/);
  assert.doesNotMatch(prompt, /"node_id": "dep-5"/);
});

test("worker prompt caps unresolved dependency context to most recent entries", () => {
  const prompt = compileWorkerPrompt({
    maxUnresolvedDependencies: 3,
    dagRun: {
      run_id: "dag-unresolved-cap",
      nodes: [
        { node_id: "prep-1", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host/prep-1.js"] } },
        { node_id: "prep-2", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host/prep-2.js"] } },
        { node_id: "prep-3", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host/prep-3.js"] } },
        { node_id: "prep-4", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host/prep-4.js"] } },
        { node_id: "prep-5", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host/prep-5.js"] } },
        {
          node_id: "host",
          status: DAG_NODE_STATES.READY,
          depends_on: ["prep-1", "prep-2", "prep-3", "prep-4", "prep-5", "missing-a", "missing-b"],
          ownership: { write_paths: ["src/host/moa-core.js"] },
        },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /"node_id": "prep-5"/);
  assert.match(prompt, /"node_id": "missing-a"/);
  assert.match(prompt, /"node_id": "missing-b"/);
  assert.doesNotMatch(prompt, /"node_id": "prep-1"/);
  assert.doesNotMatch(prompt, /"node_id": "prep-2"/);
  assert.doesNotMatch(prompt, /"node_id": "prep-3"/);
  assert.doesNotMatch(prompt, /"node_id": "prep-4"/);
});

test("worker prompt prefers explicit blackboard override over dagRun blackboard", () => {
  const prompt = compileWorkerPrompt({
    blackboard: [
      { entry_id: "bb-override-global", kind: "decision", visibility: "dag", summary: "Override global policy." },
      { entry_id: "bb-override-upstream", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Override contract context." },
    ],
    dagRun: {
      run_id: "dag-bb-override",
      blackboard: [
        { entry_id: "bb-dag-global", kind: "decision", visibility: "dag", summary: "DAG global policy." },
        { entry_id: "bb-dag-upstream", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "DAG contract context." },
      ],
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        { node_id: "host", status: DAG_NODE_STATES.READY, depends_on: ["contract"], ownership: { write_paths: ["src/host"] } },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /Override global policy/);
  assert.match(prompt, /Override contract context/);
  assert.doesNotMatch(prompt, /DAG global policy/);
  assert.doesNotMatch(prompt, /DAG contract context/);
});

test("worker prompt excludes incomplete upstream dependency context", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-bb-completed-only",
      blackboard: [
        { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Global policy." },
        { entry_id: "bb-complete", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract finalized." },
        { entry_id: "bb-incomplete", source_node_id: "prep", kind: "finding", visibility: "dag", summary: "Prep partial draft." },
      ],
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        { node_id: "prep", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["src/host"] } },
        { node_id: "host", status: DAG_NODE_STATES.RUNNING, depends_on: ["contract", "prep"], ownership: { write_paths: ["src/host/moa-core.js"] } },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /Global policy/);
  assert.match(prompt, /Contract finalized/);
  assert.doesNotMatch(prompt, /Prep partial draft/);
});

test("worker prompt excludes current-node and downstream blackboard entries", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-bb-upstream-only",
      blackboard: [
        { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Global policy." },
        { entry_id: "bb-contract", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract finalized." },
        { entry_id: "bb-host-self", source_node_id: "host", kind: "finding", visibility: "dag", summary: "Host in-progress note." },
        { entry_id: "bb-ui", source_node_id: "ui", kind: "risk", visibility: "dag", summary: "Downstream UI risk." },
      ],
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        { node_id: "host", status: DAG_NODE_STATES.RUNNING, depends_on: ["contract"], ownership: { write_paths: ["src/host"] } },
        { node_id: "ui", status: DAG_NODE_STATES.COMPLETED, depends_on: ["host"], ownership: { write_paths: ["src/webview"] } },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /Global policy/);
  assert.match(prompt, /Contract finalized/);
  assert.doesNotMatch(prompt, /Host in-progress note/);
  assert.doesNotMatch(prompt, /Downstream UI risk/);
});

test("worker prompt enumerates unresolved and missing dependencies", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-unresolved-deps",
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        { node_id: "prep", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
        { node_id: "host", status: DAG_NODE_STATES.READY, depends_on: ["contract", "prep", "docs-missing"], ownership: { write_paths: ["src/host/moa-core.js"] } },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /Unresolved upstream dependencies/);
  assert.match(prompt, /"node_id": "prep"/);
  assert.match(prompt, /"status": "running"/);
  assert.match(prompt, /"node_id": "docs-missing"/);
  assert.match(prompt, /"status": "missing"/);
  assert.match(prompt, /Treat unresolved upstream dependencies as unsettled/);
});

test("worker prompt includes missing transitive dependencies in unresolved context", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-transitive-missing-deps",
      nodes: [
        { node_id: "compile", status: DAG_NODE_STATES.COMPLETED, depends_on: ["contract-missing"], ownership: { write_paths: ["src/host"] } },
        { node_id: "test", status: DAG_NODE_STATES.READY, depends_on: ["compile"], ownership: { write_paths: ["src/host/moa-core.test.js"] } },
      ],
    },
    node_id: "test",
  });

  assert.match(prompt, /Unresolved upstream dependencies/);
  assert.match(prompt, /"node_id": "contract-missing"/);
  assert.match(prompt, /"status": "missing"/);
});

test("worker prompt preserves dependency and blackboard context when node is provided explicitly", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-explicit-node-context",
      blackboard: [
        { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Global policy." },
        { entry_id: "bb-contract", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract finalized." },
      ],
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
      ],
    },
    node: {
      node_id: "host",
      status: DAG_NODE_STATES.READY,
      depends_on: ["contract", "missing-spec"],
      ownership: { write_paths: ["src/host/moa-core.js"] },
    },
  });

  assert.match(prompt, /"node_id": "contract"/);
  assert.match(prompt, /Contract finalized\./);
  assert.match(prompt, /"node_id": "missing-spec"/);
  assert.match(prompt, /"status": "missing"/);
});

test("worker prompt merges partial explicit node input with DAG role and ownership defaults", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-explicit-node-merge",
      blackboard: [
        { entry_id: "bb-contract", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract finalized." },
      ],
      nodes: [
        { node_id: "contract", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["task-plans"] } },
        {
          node_id: "host",
          status: DAG_NODE_STATES.READY,
          role: "Host Runtime Worker",
          depends_on: ["contract"],
          ownership: { write_paths: ["src/host/moa-core.js"] },
        },
      ],
    },
    node: {
      node_id: "host",
      status: DAG_NODE_STATES.RUNNING,
      depends_on: ["contract", "missing-spec"],
    },
  });

  assert.match(prompt, /"role": "Host Runtime Worker"/);
  assert.match(prompt, /"write_paths": \[\n    "src\/host\/moa-core\.js"\n  \]/);
  assert.match(prompt, /Contract finalized\./);
  assert.match(prompt, /"node_id": "missing-spec"/);
  assert.match(prompt, /"status": "missing"/);
});

test("worker prompt enforces gpt-5.3-codex model policy for this phase", () => {
  const prompt = compileWorkerPrompt({
    worker_model: "gpt-5.5",
    dagRun: {
      run_id: "dag-worker-model-policy",
      nodes: [{
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        model: "gpt-5.4",
        ownership: { write_paths: ["src/host"] },
      }],
    },
    node_id: "host",
  });

  assert.match(prompt, /Execution model:\ngpt-5\.3-codex/);
  assert.match(prompt, /Requested model "gpt-5\.5" was overridden by this phase policy\./);
  assert.doesNotMatch(prompt, /Execution model:\ngpt-5\.4/);
});

test("worker prompt preserves explicit gemini-cli auxiliary provider model", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-gemini-provider",
      nodes: [{
        node_id: "review",
        status: DAG_NODE_STATES.READY,
        provider: "gemini-cli",
        model: "gemini-3.1-pro-preview",
        role: "Review the current plan and propose low-risk patches.",
        ownership: { read_paths: ["src/host"], write_paths: [] },
      }],
    },
    node_id: "review",
  });

  assert.match(prompt, /Execution provider:\ngemini-cli/);
  assert.match(prompt, /Execution model:\ngemini-3\.1-pro-preview/);
  assert.match(prompt, /auxiliary Gemini CLI worker/);
  assert.doesNotMatch(prompt, /Requested model "gemini-3\.1-pro-preview" was overridden/);
});

test("normalizes gemini model names to gemini-cli provider", () => {
  assert.equal(normalizeWorkerProvider("", "gemini-3.1-pro-preview"), WORKER_PROVIDER_GEMINI);
  assert.equal(normalizeWorkerProvider("google_gemini", ""), WORKER_PROVIDER_GEMINI);
  assert.equal(normalizeWorkerProvider("", "gpt-5.3-codex"), "codex-cli");
});

test("keeps Gemini CLI model priority on 3.1 before 3 and 2.5 fallbacks", () => {
  assert.equal(DEFAULT_GEMINI_CLI_MODEL, "gemini-3.1-pro-preview");
  assert.deepEqual(GEMINI_CLI_MODEL_PRIORITY, [
    "gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-pro-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
  ]);
});

test("worker prompt uses role_name when explicit role is absent", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-role-name",
      nodes: [{
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        role_name: "Host Runtime Worker",
        ownership: { write_paths: ["src/host"] },
      }],
    },
    node_id: "host",
  });

  assert.match(prompt, /"role": "Host Runtime Worker"/);
  assert.match(prompt, /Role and ownership boundaries/);
});

test("worker prompt falls back to a bounded default role label when no role metadata exists", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-role-default",
      nodes: [{
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host"] },
      }],
    },
    node_id: "host",
  });

  const dagAssignmentBlock = prompt.split("Role and ownership boundaries:")[0];
  assert.match(dagAssignmentBlock, /"role": "No explicit role provided\."/);
  assert.match(prompt, /"role": "No explicit role provided\."/);
  assert.match(prompt, /Role and ownership boundaries/);
});

test("worker prompt falls back to role_id when role text is absent", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-role-id",
      nodes: [{
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        role_id: "runtime.host",
        ownership: { write_paths: ["src/host"] },
      }],
    },
    node_id: "host",
  });

  assert.match(prompt, /"role": "Role ID: runtime\.host"/);
  assert.doesNotMatch(prompt, /No explicit role provided/);
});

test("worker prompt contract includes role, ownership paths, upstream context, concurrency rule, and result envelope fields", () => {
  const prompt = compileWorkerPrompt({
    task: {
      task_id: "task-worker-contract",
      title: "Implement host worker compiler",
      goal: "Compile one bounded worker node prompt.",
      acceptance_criteria: ["Use strict result envelope"],
    },
    dagRun: {
      run_id: "dag-worker-contract",
      blackboard: [
        { entry_id: "bb-global", kind: "decision", visibility: "dag", summary: "Keep work local-first." },
        { entry_id: "bb-upstream", source_node_id: "contract", kind: "finding", visibility: "dag", summary: "Contract fields approved." },
        { entry_id: "bb-downstream", source_node_id: "ui", kind: "risk", visibility: "dag", summary: "Downstream UI risk." },
      ],
      nodes: [
        {
          node_id: "contract",
          status: DAG_NODE_STATES.COMPLETED,
          ownership: { write_paths: ["task-plans"] },
        },
        {
          node_id: "host",
          status: DAG_NODE_STATES.READY,
          role: "Host worker prompt compiler",
          depends_on: ["contract"],
          ownership: {
            read_paths: ["src/host/moa-core.js", "src/host/moa-core.test.js"],
            write_paths: ["src/host/moa-core.js"],
            exclusive_paths: ["src/host/moa-core.test.js"],
            expected_outputs: ["worker prompt compiler + tests"],
          },
        },
        {
          node_id: "ui",
          status: DAG_NODE_STATES.PENDING,
          ownership: { write_paths: ["src/webview"] },
        },
      ],
    },
    node_id: "host",
  });

  assert.match(prompt, /"role": "Host worker prompt compiler"/);
  assert.match(prompt, /"read_paths": \[/);
  assert.match(prompt, /"write_paths": \[/);
  assert.match(prompt, /"exclusive_paths": \[/);
  assert.match(prompt, /Contract fields approved\./);
  assert.doesNotMatch(prompt, /Downstream UI risk\./);
  assert.match(prompt, /Other workers may be active at the same time/);
  assert.match(prompt, /You are not alone in this codebase; do not revert edits made by other workers/);
  assert.match(prompt, /"summary": ""/);
  assert.match(prompt, /"changed_files": \[\]/);
  assert.match(prompt, /"checks_run": \[\]/);
  assert.match(prompt, /"open_risks": \[\]/);
  assert.match(prompt, /"blackboard_updates": \[/);
  assert.match(prompt, /"next_request": ""/);
});

test("worker prompt result envelope includes the required bounded fields", () => {
  const prompt = compileWorkerPrompt({
    dagRun: {
      run_id: "dag-envelope-fields",
      nodes: [{
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host"] },
      }],
    },
    node_id: "host",
  });

  assert.match(prompt, /"run_id": "dag-envelope-fields"/);
  assert.match(prompt, /"node_id": "host"/);
  assert.match(prompt, /"summary": ""/);
  assert.match(prompt, /"changed_files": \[\]/);
  assert.match(prompt, /"checks_run": \[\]/);
  assert.match(prompt, /"open_risks": \[\]/);
  assert.match(prompt, /"blackboard_updates": \[/);
  assert.match(prompt, /"kind": "decision\|finding\|artifact\|risk\|handoff"/);
  assert.match(prompt, /"visibility": "dag\|node\|review"/);
  assert.match(prompt, /"next_request": ""/);
});

test("persists worker prompt compilation snapshot into dag trace files", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "moa-worker-prompt-trace-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-worker-prompt-trace",
    nodes: [{
      node_id: "host",
      status: DAG_NODE_STATES.READY,
      role: "Implement host orchestration logic.",
      ownership: { write_paths: ["src/host"] },
    }],
  });

  const persisted = persistWorkerPromptSnapshot(workspace, {
    worker_model: "gpt-5.5",
    dagRun: initial.dagRun,
    node_id: "host",
  });

  assert.ok(fs.existsSync(persisted.paths.traceJsonl));
  assert.ok(fs.existsSync(persisted.paths.traceIndexJson));
  const traceLines = fs.readFileSync(persisted.paths.traceJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(traceLines.length, 1);
  const traceEvent = JSON.parse(traceLines[0]);
  assert.equal(traceEvent.event_type, "worker_prompt_compiled");
  assert.equal(traceEvent.node_id, "host");
  assert.equal(traceEvent.model, "gpt-5.3-codex");
  assert.equal(traceEvent.prompt_bytes > 0, true);
  assert.match(traceEvent.prompt_sha256, /^[a-f0-9]{64}$/);

  const traceIndex = JSON.parse(fs.readFileSync(persisted.paths.traceIndexJson, "utf8"));
  assert.equal(traceIndex.run_id, "dag-worker-prompt-trace");
  assert.equal(traceIndex.event_count, 1);
  assert.equal(traceIndex.events_by_type.worker_prompt_compiled, 1);
});

test("applies worker launch metadata to mark node running with runtime fields", () => {
  const startedAt = "2026-04-26T08:00:00.000Z";
  const applied = applyWorkerLaunchMetadata({
    run_id: "dag-launch-apply",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["src/webview"] } },
    ],
  }, {
    node_id: "host",
    worker_thread_id: "thread-host-1",
    pid: "4242",
    log_path: "logs/host-worker.log",
    model: "gpt-5.3-codex",
    started_at: startedAt,
    trace_path: ".codex-team/dag-runs/dag-launch-apply/trace.jsonl",
  });

  assert.equal(applied.node.status, DAG_NODE_STATES.RUNNING);
  assert.equal(applied.node.worker_thread_id, "thread-host-1");
  assert.equal(applied.worker_runtime.thread_id, "thread-host-1");
  assert.equal(applied.worker_runtime.pid, "4242");
  assert.equal(applied.worker_runtime.log_path, "logs/host-worker.log");
  assert.equal(applied.worker_runtime.model, "gpt-5.3-codex");
  assert.equal(applied.worker_runtime.started_at, startedAt);
  assert.equal(applied.worker_runtime.trace_path, ".codex-team/dag-runs/dag-launch-apply/trace.jsonl");
  assert.equal(applied.worker_runtime.launch_attempts, 1);
  assert.equal(applied.worker_runtime.last_launch_status, "started");
  assert.equal(applied.worker_runtime.last_launch_started_at, startedAt);
  assert.equal(applied.worker_runtime.last_launch_error, "");
  assert.equal(applied.worker_runtime.result_ingest_status, "");
});

test("preserves absolute runtime paths in worker launch metadata", () => {
  const dagRun = normalizeDagRun({
    run_id: "dag-launch-absolute-paths",
    nodes: [{
      node_id: "host",
      status: DAG_NODE_STATES.READY,
      ownership: { write_paths: ["src/host"] },
    }],
  });

  const applied = applyWorkerLaunchMetadata(dagRun, {
    node_id: "host",
    worker_thread_id: "thread-host-absolute",
    log_path: "/tmp/cma/worker-host.runtime.log",
    trace_path: "/tmp/cma/worker-host.trace.jsonl",
  });

  assert.equal(applied.node.status, DAG_NODE_STATES.RUNNING);
  assert.equal(applied.worker_runtime.log_path, "/tmp/cma/worker-host.runtime.log");
  assert.equal(applied.worker_runtime.trace_path, "/tmp/cma/worker-host.trace.jsonl");
});

test("rejects worker launch metadata when active worker thread id is already owned by another running node", () => {
  assert.throws(() => applyWorkerLaunchMetadata({
    run_id: "dag-launch-duplicate-thread",
    nodes: [
      {
        node_id: "host",
        status: DAG_NODE_STATES.RUNNING,
        worker_thread_id: "thread-shared",
        ownership: { write_paths: ["src/host"] },
      },
      {
        node_id: "ui",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/webview"] },
      },
    ],
  }, {
    node_id: "ui",
    worker_thread_id: "thread-shared",
    pid: "5520",
    log_path: "logs/ui-worker.log",
    model: "gpt-5.3-codex",
  }), /rejected duplicate active worker_thread_id/);
});

test("records worker launch failure metadata while keeping node retryable", () => {
  const applied = applyWorkerLaunchFailureMetadata({
    run_id: "dag-launch-failure-apply",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
    ],
  }, {
    node_id: "host",
    model: "gpt-5.3-codex",
    error: "intentional launch failure",
    failed_at: "2026-04-26T09:00:00.000Z",
  });

  assert.equal(applied.node.status, DAG_NODE_STATES.READY);
  assert.equal(applied.worker_runtime.model, "gpt-5.3-codex");
  assert.equal(applied.worker_runtime.last_launch_status, "failed");
  assert.equal(applied.worker_runtime.last_launch_error, "intentional launch failure");
  assert.equal(applied.worker_runtime.last_launch_failed_at, "2026-04-26T09:00:00.000Z");
  assert.equal(applied.worker_runtime.launch_attempts, 1);
});

test("successful relaunch increments launch attempts and clears prior launch/ingest errors", () => {
  const applied = applyWorkerLaunchMetadata({
    run_id: "dag-launch-retry-success",
    nodes: [
      {
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host"] },
        worker_runtime: {
          launch_attempts: 1,
          last_launch_status: "failed",
          last_launch_error: "old launch failure",
          last_launch_failed_at: "2026-04-26T08:59:00.000Z",
          result_ingest_status: "failed",
          result_ingest_error: "old ingest failure",
          result_ingest_failed_at: "2026-04-26T08:59:10.000Z",
        },
      },
    ],
  }, {
    node_id: "host",
    worker_thread_id: "thread-host-retry",
    pid: "5252",
    log_path: "logs/host-retry.log",
    model: "gpt-5.3-codex",
    started_at: "2026-04-26T09:05:00.000Z",
    trace_path: ".codex-team/dag-runs/dag-launch-retry-success/trace.jsonl",
  });

  assert.equal(applied.node.status, DAG_NODE_STATES.RUNNING);
  assert.equal(applied.worker_runtime.launch_attempts, 2);
  assert.equal(applied.worker_runtime.last_launch_status, "started");
  assert.equal(applied.worker_runtime.last_launch_started_at, "2026-04-26T09:05:00.000Z");
  assert.equal(applied.worker_runtime.last_launch_error, "");
  assert.equal(applied.worker_runtime.last_launch_failed_at, "");
  assert.equal(applied.worker_runtime.result_ingest_status, "");
  assert.equal(applied.worker_runtime.result_ingest_error, "");
  assert.equal(applied.worker_runtime.result_ingest_failed_at, "");
});

test("records worker result ingest failure metadata and marks node failed", () => {
  const applied = applyWorkerResultIngestFailureMetadata({
    run_id: "dag-ingest-failure-apply",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
    ],
  }, {
    node_id: "host",
    error: "parseWorkerResultEnvelope could not parse JSON: Unexpected token",
    failed_at: "2026-04-26T09:30:00.000Z",
  });

  assert.equal(applied.node.status, DAG_NODE_STATES.FAILED);
  assert.equal(applied.worker_runtime.result_ingest_status, "failed");
  assert.equal(applied.worker_runtime.result_ingest_failed_at, "2026-04-26T09:30:00.000Z");
  assert.match(String(applied.worker_runtime.result_ingest_error || ""), /could not parse JSON/);
  assert.equal(Array.isArray(applied.node.result.open_risks), true);
  assert.equal(
    applied.node.result.open_risks.some((risk) => /Worker result envelope ingest failed/.test(String(risk || ""))),
    true,
  );
});

test("persists worker launch metadata into dag trace index without starting live workers", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-launch-meta-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-launch-persist",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
    ],
  });

  const persisted = persistWorkerLaunchMetadata(workspace, initial.dagRun, {
    node_id: "host",
    worker_thread_id: "thread-host-2",
    pid: "9912",
    log_path: "logs/host-worker-2.log",
    model: "gpt-5.3-codex",
    started_at: "2026-04-26T08:10:00.000Z",
    trace_path: ".codex-team/dag-runs/dag-launch-persist/trace.jsonl",
  });

  assert.equal(persisted.node.status, DAG_NODE_STATES.RUNNING);
  assert.equal(persisted.node.worker_thread_id, "thread-host-2");
  assert.ok(fs.existsSync(persisted.paths.traceJsonl));
  assert.ok(fs.existsSync(persisted.paths.traceIndexJson));

  const traceLines = fs.readFileSync(persisted.paths.traceJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(traceLines.length, 1);
  const traceEvent = JSON.parse(traceLines[0]);
  assert.equal(traceEvent.event_type, "worker_launch_metadata");
  assert.equal(traceEvent.node_id, "host");
  assert.equal(traceEvent.worker_thread_id, "thread-host-2");
  assert.equal(traceEvent.worker_runtime.pid, "9912");
  assert.equal(traceEvent.worker_runtime.model, "gpt-5.3-codex");
  assert.equal(traceEvent.worker_runtime.launch_attempts, 1);
  assert.equal(traceEvent.worker_runtime.last_launch_status, "started");

  const traceIndex = JSON.parse(fs.readFileSync(persisted.paths.traceIndexJson, "utf8"));
  assert.equal(traceIndex.run_id, "dag-launch-persist");
  assert.equal(traceIndex.event_count, 1);
  assert.equal(traceIndex.events_by_type.worker_launch_metadata, 1);
});

test("launches at least two non-conflicting schedulable workers and persists metadata", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-launch-batch-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-launch-batch",
    nodes: [
      {
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host"] },
      },
      {
        node_id: "ui",
        status: DAG_NODE_STATES.PENDING,
        ownership: { write_paths: ["src/webview"] },
      },
      {
        node_id: "host-tests",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host/moa-core.test.js"] },
      },
    ],
  });

  const launchedCalls = [];
  const launched = launchSchedulableWorkerBatch(workspace, initial.dagRun, {
    maxParallel: 3,
    worker_model: "gpt-5.5",
    launchWorker(payload) {
      launchedCalls.push(payload);
      return {
        worker_thread_id: `thread-${payload.node.node_id}`,
        pid: String(5000 + launchedCalls.length),
        log_path: `.codex-team/dag-runs/dag-launch-batch/${payload.node.node_id}.log`,
      };
    },
  });

  assert.deepEqual(launched.selected_node_ids, ["host", "ui"]);
  assert.deepEqual(launched.blocked_node_ids, ["host-tests"]);
  assert.equal(launched.blocked[0].reason, "ownership_conflict");
  assert.equal(launched.launched.length, 2);
  assert.equal(launchedCalls.length, 2);
  assert.equal(launchedCalls[0].model, "gpt-5.3-codex");
  assert.equal(launchedCalls[1].model, "gpt-5.3-codex");
  assert.equal(launched.launched.every((worker) => worker.trace_path === ".codex-team/dag-runs/dag-launch-batch/trace.jsonl"), true);

  const persisted = readDagRun(workspace, "dag-launch-batch");
  const hostNode = persisted.nodes.find((node) => node.node_id === "host");
  const uiNode = persisted.nodes.find((node) => node.node_id === "ui");
  const hostTestsNode = persisted.nodes.find((node) => node.node_id === "host-tests");
  assert.equal(hostNode.status, DAG_NODE_STATES.RUNNING);
  assert.equal(uiNode.status, DAG_NODE_STATES.RUNNING);
  assert.equal(hostTestsNode.status, DAG_NODE_STATES.READY);
  assert.equal(hostNode.worker_thread_id, "thread-host");
  assert.equal(uiNode.worker_thread_id, "thread-ui");
  assert.equal(hostNode.worker_runtime.trace_path, ".codex-team/dag-runs/dag-launch-batch/trace.jsonl");
  assert.equal(uiNode.worker_runtime.trace_path, ".codex-team/dag-runs/dag-launch-batch/trace.jsonl");

  const runDir = path.join(workspace, ".codex-team", "dag-runs", "dag-launch-batch");
  const traceEvents = fs.readFileSync(path.join(runDir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_prompt_compiled").length, 2);
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_launch_metadata").length, 2);
  const traceIndex = JSON.parse(fs.readFileSync(path.join(runDir, "trace.index.json"), "utf8"));
  assert.equal(traceIndex.events_by_type.worker_prompt_compiled, 2);
  assert.equal(traceIndex.events_by_type.worker_launch_metadata, 2);
});

test("launch scheduler passes gemini-cli provider through auxiliary worker launch", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "moa-gemini-launch-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const initial = writeDagRun(workspace, {
    run_id: "dag-gemini-launch",
    nodes: [{
      node_id: "gemini-review",
      status: DAG_NODE_STATES.READY,
      provider: "gemini-cli",
      model: "gemini-3.1-pro-preview",
      role: "Review the proposed implementation and report findings.",
      ownership: { read_paths: ["src"], write_paths: [] },
    }],
  });

  const launchCalls = [];
  const launched = launchSchedulableWorkerBatch(workspace, initial.dagRun, {
    maxParallel: 1,
    launchWorker(payload) {
      launchCalls.push(payload);
      return {
        worker_thread_id: "gemini-thread",
        provider: payload.provider,
        model: payload.model,
        pid: "7001",
        log_path: `.codex-team/dag-runs/${payload.run_id}/gemini-review.log`,
      };
    },
  });

  assert.equal(launchCalls.length, 1);
  assert.equal(launchCalls[0].provider, "gemini-cli");
  assert.equal(launchCalls[0].model, "gemini-3.1-pro-preview");
  assert.match(launchCalls[0].prompt, /Execution provider:\ngemini-cli/);
  assert.equal(launched.launched[0].provider, "gemini-cli");

  const persisted = readDagRun(workspace, "dag-gemini-launch");
  assert.equal(persisted.nodes[0].worker_runtime.provider, "gemini-cli");
  assert.equal(persisted.nodes[0].worker_runtime.model, "gemini-3.1-pro-preview");
});

test("continues schedulable launch after one node fails and records launch failure trace evidence", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-launch-fail-continue-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-launch-fail-continue",
    nodes: [
      {
        node_id: "host",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/host"] },
      },
      {
        node_id: "ui",
        status: DAG_NODE_STATES.READY,
        ownership: { write_paths: ["src/webview"] },
      },
    ],
  });

  const launched = launchSchedulableWorkerBatch(workspace, initial.dagRun, {
    maxParallel: 2,
    launchWorker(payload) {
      if (payload.node.node_id === "host") {
        throw new Error("intentional launch failure for host node");
      }
      return {
        worker_thread_id: `thread-${payload.node.node_id}`,
        pid: "8401",
        log_path: `.codex-team/dag-runs/dag-launch-fail-continue/${payload.node.node_id}.log`,
      };
    },
  });

  assert.deepEqual(launched.selected_node_ids, ["ui"]);
  assert.equal(launched.launched.length, 1);
  assert.equal(launched.launched[0].node_id, "ui");
  assert.equal(launched.blocked.some((entry) => entry.reason === "launch_failed" && entry.node_id === "host"), true);

  const persisted = readDagRun(workspace, "dag-launch-fail-continue");
  const hostNode = persisted.nodes.find((node) => node.node_id === "host");
  const uiNode = persisted.nodes.find((node) => node.node_id === "ui");
  assert.equal(hostNode.status, DAG_NODE_STATES.READY);
  assert.equal(hostNode.worker_runtime.last_launch_status, "failed");
  assert.equal(hostNode.worker_runtime.launch_attempts, 1);
  assert.match(String(hostNode.worker_runtime.last_launch_error || ""), /intentional launch failure/);
  assert.equal(uiNode.status, DAG_NODE_STATES.RUNNING);

  const runDir = path.join(workspace, ".codex-team", "dag-runs", "dag-launch-fail-continue");
  const traceEvents = fs.readFileSync(path.join(runDir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_prompt_compiled").length, 2);
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_launch_failed").length, 1);
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_launch_metadata").length, 1);
  const traceIndex = JSON.parse(fs.readFileSync(path.join(runDir, "trace.index.json"), "utf8"));
  assert.equal(traceIndex.events_by_type.worker_prompt_compiled, 2);
  assert.equal(traceIndex.events_by_type.worker_launch_failed, 1);
  assert.equal(traceIndex.events_by_type.worker_launch_metadata, 1);
});

test("batch launch rejects duplicate worker thread ids across active running nodes and keeps second node ready", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-launch-duplicate-thread-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-launch-duplicate-thread",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const launched = launchSchedulableWorkerBatch(workspace, initial.dagRun, {
    maxParallel: 2,
    launchWorker(payload) {
      return {
        worker_thread_id: "thread-shared",
        pid: payload.node.node_id === "host" ? "7101" : "7102",
        log_path: `.codex-team/dag-runs/dag-launch-duplicate-thread/${payload.node.node_id}.log`,
      };
    },
  });

  assert.deepEqual(launched.selected_node_ids, ["host"]);
  assert.equal(launched.launched.length, 1);
  assert.equal(launched.blocked.some((entry) => entry.reason === "launch_failed" && entry.node_id === "ui"), true);

  const persisted = readDagRun(workspace, "dag-launch-duplicate-thread");
  const hostNode = persisted.nodes.find((node) => node.node_id === "host");
  const uiNode = persisted.nodes.find((node) => node.node_id === "ui");
  assert.equal(hostNode.status, DAG_NODE_STATES.RUNNING);
  assert.equal(uiNode.status, DAG_NODE_STATES.READY);
  assert.equal(hostNode.worker_thread_id, "thread-shared");
  assert.equal(uiNode.worker_thread_id, "");
  assert.equal(uiNode.worker_runtime.last_launch_status, "failed");
  assert.equal(uiNode.worker_runtime.launch_attempts, 1);
  assert.match(String(uiNode.worker_runtime.last_launch_error || ""), /duplicate active worker_thread_id/);

  const runDir = path.join(workspace, ".codex-team", "dag-runs", "dag-launch-duplicate-thread");
  const traceEvents = fs.readFileSync(path.join(runDir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_prompt_compiled").length, 2);
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_launch_metadata").length, 1);
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_launch_failed").length, 1);
  assert.match(String(traceEvents.find((event) => event.event_type === "worker_launch_failed")?.error || ""), /duplicate active worker_thread_id/);
});

test("repeated launch failures increment per-node launch attempts while preserving retryability", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-launch-repeat-fail-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  let dag = writeDagRun(workspace, {
    run_id: "dag-launch-repeat-fail",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
    ],
  }).dagRun;

  const first = launchSchedulableWorkerBatch(workspace, dag, {
    launchWorker() {
      throw new Error("first launch failure");
    },
  });
  assert.equal(first.launched.length, 0);
  assert.equal(first.blocked.some((entry) => entry.node_id === "host" && entry.reason === "launch_failed"), true);

  dag = readDagRun(workspace, "dag-launch-repeat-fail");
  const afterFirst = dag.nodes.find((node) => node.node_id === "host");
  assert.equal(afterFirst.status, DAG_NODE_STATES.READY);
  assert.equal(afterFirst.worker_runtime.last_launch_status, "failed");
  assert.equal(afterFirst.worker_runtime.launch_attempts, 1);
  assert.match(String(afterFirst.worker_runtime.last_launch_error || ""), /first launch failure/);

  const second = launchSchedulableWorkerBatch(workspace, dag, {
    launchWorker() {
      throw new Error("second launch failure");
    },
  });
  assert.equal(second.launched.length, 0);
  assert.equal(second.blocked.some((entry) => entry.node_id === "host" && entry.reason === "launch_failed"), true);

  const afterSecond = readDagRun(workspace, "dag-launch-repeat-fail").nodes.find((node) => node.node_id === "host");
  assert.equal(afterSecond.status, DAG_NODE_STATES.READY);
  assert.equal(afterSecond.worker_runtime.last_launch_status, "failed");
  assert.equal(afterSecond.worker_runtime.launch_attempts, 2);
  assert.match(String(afterSecond.worker_runtime.last_launch_error || ""), /second launch failure/);

  const runDir = path.join(workspace, ".codex-team", "dag-runs", "dag-launch-repeat-fail");
  const traceEvents = fs.readFileSync(path.join(runDir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_prompt_compiled").length, 2);
  assert.equal(traceEvents.filter((event) => event.event_type === "worker_launch_failed").length, 2);
});

test("prevents overlapping scheduler ticks for the same DAG run until lock release", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-tick-lock-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-tick-lock",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
    ],
  });

  const tick = beginDagRunSchedulerTick(workspace, initial.dagRun, { staleAfterMs: 60 * 1000 });
  assert.ok(fs.existsSync(tick.lock_path));
  assert.throws(
    () => beginDagRunSchedulerTick(workspace, initial.dagRun, { staleAfterMs: 60 * 1000 }),
    /scheduler tick already active/,
  );
  tick.release();
  assert.equal(fs.existsSync(tick.lock_path), false);
  const secondTick = beginDagRunSchedulerTick(workspace, initial.dagRun, { staleAfterMs: 60 * 1000 });
  secondTick.release();
});

test("run launch scheduler tick cleans lock after launch completion", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-run-tick-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-run-launch-tick",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const launched = runLaunchSchedulerTick(workspace, initial.dagRun, {
    maxParallel: 2,
    launchWorker(payload) {
      return {
        worker_thread_id: `thread-${payload.node.node_id}`,
        pid: "8123",
        log_path: `.codex-team/dag-runs/dag-run-launch-tick/${payload.node.node_id}.log`,
      };
    },
  });

  assert.equal(launched.launched.length, 2);
  assert.equal(fs.existsSync(launched.lock_path), false);
  assert.equal(String(launched.tick_id || "").includes("dag-run-launch-tick-tick-"), true);
});

test("run launch scheduler tick uses latest persisted dag state instead of stale caller snapshot", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-run-tick-latest-state-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  writeDagRun(workspace, {
    run_id: "dag-run-launch-tick-latest-state",
    nodes: [
      { node_id: "host-running", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
      { node_id: "host-tests", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host/moa-core.test.js"] } },
      { node_id: "ui", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const staleSnapshot = normalizeDagRun({
    run_id: "dag-run-launch-tick-latest-state",
    nodes: [
      { node_id: "host-running", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["src/host"] } },
      { node_id: "host-tests", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host/moa-core.test.js"] } },
      { node_id: "ui", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const launched = runLaunchSchedulerTick(workspace, staleSnapshot, {
    maxParallel: 2,
    launchWorker(payload) {
      return {
        worker_thread_id: `thread-${payload.node.node_id}`,
        pid: "8223",
        log_path: `.codex-team/dag-runs/dag-run-launch-tick-latest-state/${payload.node.node_id}.log`,
      };
    },
  });

  assert.deepEqual(launched.selected_node_ids, ["ui"]);
  assert.equal(launched.blocked.some((entry) => entry.node_id === "host-tests" && entry.reason === "ownership_conflict"), true);

  const persisted = readDagRun(workspace, "dag-run-launch-tick-latest-state");
  const hostTests = persisted.nodes.find((node) => node.node_id === "host-tests");
  const uiNode = persisted.nodes.find((node) => node.node_id === "ui");
  assert.equal(hostTests.status, DAG_NODE_STATES.READY);
  assert.equal(uiNode.status, DAG_NODE_STATES.RUNNING);
});

test("run launch scheduler tick does not relaunch nodes already persisted as completed", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-run-tick-completed-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  writeDagRun(workspace, {
    run_id: "dag-run-launch-tick-completed",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.COMPLETED, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const staleSnapshot = normalizeDagRun({
    run_id: "dag-run-launch-tick-completed",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const launched = runLaunchSchedulerTick(workspace, staleSnapshot, {
    maxParallel: 2,
    launchWorker(payload) {
      return {
        worker_thread_id: `thread-${payload.node.node_id}`,
        pid: "8323",
        log_path: `.codex-team/dag-runs/dag-run-launch-tick-completed/${payload.node.node_id}.log`,
      };
    },
  });

  assert.deepEqual(launched.selected_node_ids, ["ui"]);
  assert.deepEqual(launched.launched.map((worker) => worker.node_id), ["ui"]);
  const persisted = readDagRun(workspace, "dag-run-launch-tick-completed");
  const hostNode = persisted.nodes.find((node) => node.node_id === "host");
  const uiNode = persisted.nodes.find((node) => node.node_id === "ui");
  assert.equal(hostNode.status, DAG_NODE_STATES.COMPLETED);
  assert.equal(hostNode.worker_thread_id, "");
  assert.equal(uiNode.status, DAG_NODE_STATES.RUNNING);
});

test("run launch scheduler tick releases lock when launch setup throws", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-run-tick-throw-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-run-launch-tick-throw",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.READY, ownership: { write_paths: ["src/host"] } },
    ],
  });
  const lockPath = path.join(
    workspace,
    ".codex-team",
    "dag-runs",
    "dag-run-launch-tick-throw",
    "scheduler.tick.lock",
  );

  assert.throws(
    () => runLaunchSchedulerTick(workspace, initial.dagRun, {}),
    /launchSchedulableWorkerBatch requires options.launchWorker/,
  );
  assert.equal(fs.existsSync(lockPath), false);
});

test("ingests worker result envelope with completion default and trace evidence", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-ingest-envelope-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-ingest-envelope",
    nodes: [{
      node_id: "host",
      status: DAG_NODE_STATES.RUNNING,
      ownership: { write_paths: ["src/host"] },
    }],
  });

  const ingested = ingestWorkerResultEnvelope(workspace, initial.dagRun, {
    node_id: "host",
    result: JSON.stringify({
      summary: "Host worker completed runtime wiring.",
      changed_files: ["src/host/moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Launch and result persistence verified." }],
      next_request: "Prepare scheduler tick lock behavior.",
    }),
  });

  assert.equal(ingested.node.status, DAG_NODE_STATES.COMPLETED);
  assert.equal(ingested.node.result.summary, "Host worker completed runtime wiring.");
  assert.deepEqual(ingested.node.result.changed_files, ["src/host/moa-core.js"]);
  assert.equal(ingested.appendedBlackboardEntries.length, 1);

  const runDir = path.join(workspace, ".codex-team", "dag-runs", "dag-ingest-envelope");
  const blackboardLines = fs.readFileSync(path.join(runDir, "blackboard.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.equal(blackboardLines.length, 1);
  const traceIndex = JSON.parse(fs.readFileSync(path.join(runDir, "trace.index.json"), "utf8"));
  assert.equal(traceIndex.events_by_type.worker_result_envelope, 1);
});

test("normalizes worker result envelope fields and drops empty blackboard updates", () => {
  const envelope = normalizeWorkerResultEnvelope({
    summary: "Completed host slice.",
    changed_files: ["src\\host\\moa-core.js", "", " src/host/moa-core.test.js "],
    checks_run: ["node --test src/host/moa-core.test.js"],
    open_risks: ["Needs scheduler integration."],
    blackboard_updates: [
      { kind: "decision", visibility: "dag", summary: "Keep local-first.", payload: { tick: 1 } },
      { kind: "risk", visibility: "review", summary: " " },
    ],
    next_request: "Review envelope ingestion.",
  });

  assert.equal(envelope.summary, "Completed host slice.");
  assert.deepEqual(envelope.changed_files, ["src/host/moa-core.js", "src/host/moa-core.test.js"]);
  assert.equal(envelope.blackboard_updates.length, 1);
  assert.equal(envelope.blackboard_updates[0].kind, "decision");
});

test("parses raw worker result envelope JSON and normalizes fields", () => {
  const envelope = parseWorkerResultEnvelope(JSON.stringify({
    summary: "Completed host slice.",
    changed_files: ["src\\host\\moa-core.js"],
    checks_run: ["node --test src/host/moa-core.test.js"],
    open_risks: [],
    blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Prompt contract stable." }],
    next_request: "Start scheduler launch gate tests.",
  }));
  assert.equal(envelope.summary, "Completed host slice.");
  assert.deepEqual(envelope.changed_files, ["src/host/moa-core.js"]);
  assert.equal(envelope.blackboard_updates.length, 1);
  assert.equal(envelope.blackboard_updates[0].summary, "Prompt contract stable.");
});

test("rejects markdown-fenced worker result envelope content", () => {
  assert.throws(() => parseWorkerResultEnvelope("```json\n{\"summary\":\"x\"}\n```"), /expected raw JSON only/);
});

test("rejects invalid worker result envelope JSON strings", () => {
  assert.throws(() => parseWorkerResultEnvelope("{\"summary\":"), /could not parse JSON/);
});

test("validates changed files against write and exclusive ownership targets", () => {
  const validation = validateWorkerChangedFiles({
    ownership: {
      write_paths: ["src/host"],
      exclusive_paths: ["src/webview-template.js"],
    },
  }, [
    "src/host/moa-core.js",
    "src/webview-template.js",
  ]);

  assert.equal(validation.is_valid, true);
  assert.deepEqual(validation.invalid_changed_files, []);
  assert.deepEqual(validation.changed_files, ["src/host/moa-core.js", "src/webview-template.js"]);
});

test("applies worker result envelope to node result and blackboard", () => {
  const result = applyWorkerResultEnvelope({
    run_id: "dag-apply-envelope",
    blackboard: [{ entry_id: "bb-existing", summary: "Prior context." }],
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.PENDING, ownership: { write_paths: ["src/webview"] } },
    ],
  }, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "Host work complete.",
      changed_files: ["src/host/moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: ["No live worker launch yet."],
      blackboard_updates: [
        { kind: "finding", visibility: "dag", summary: "Worker compiler and envelope ingestion are stable." },
      ],
      next_request: "Prepare scheduler handoff.",
    },
  });

  assert.equal(result.node.status, DAG_NODE_STATES.COMPLETED);
  assert.equal(result.node.result.summary, "Host work complete.");
  assert.deepEqual(result.node.result.changed_files, ["src/host/moa-core.js"]);
  assert.equal(result.dagRun.blackboard.length, 2);
  assert.equal(result.appendedBlackboardEntries.length, 1);
  assert.equal(result.appendedBlackboardEntries[0].source_node_id, "host");
  assert.equal(result.appendedBlackboardEntries[0].kind, "finding");
});

test("rejects worker result envelope changed files outside ownership", () => {
  assert.throws(() => applyWorkerResultEnvelope({
    run_id: "dag-reject-envelope",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
    ],
  }, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "Attempted out-of-scope change.",
      changed_files: ["src/webview-template.js"],
    },
  }), /rejected changed_files outside ownership/);
});

test("persists worker result envelope into dag run, trace, and blackboard files", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-envelope-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-envelope-persist",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
    ],
  });

  const persisted = persistWorkerResultEnvelope(workspace, initial.dagRun, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "Persisted host node result.",
      changed_files: ["src/host/moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: ["No live worker launch in this phase."],
      blackboard_updates: [
        { kind: "finding", visibility: "dag", summary: "Worker envelope persisted to MoA evidence files." },
      ],
      next_request: "Prepare scheduler launch gating checks.",
    },
  });

  assert.equal(persisted.node.status, DAG_NODE_STATES.COMPLETED);
  assert.ok(fs.existsSync(persisted.paths.traceJsonl));
  assert.ok(fs.existsSync(persisted.paths.blackboardJsonl));
  assert.ok(fs.existsSync(persisted.paths.traceIndexJson));

  const traceLines = fs.readFileSync(persisted.paths.traceJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(traceLines.length, 1);
  const traceEvent = JSON.parse(traceLines[0]);
  assert.equal(traceEvent.event_type, "worker_result_envelope");
  assert.equal(traceEvent.node_id, "host");
  assert.equal(traceEvent.summary, "Persisted host node result.");

  const blackboardLines = fs.readFileSync(persisted.paths.blackboardJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(blackboardLines.length, 1);
  const blackboardEntry = JSON.parse(blackboardLines[0]);
  assert.equal(blackboardEntry.source_node_id, "host");
  assert.equal(blackboardEntry.summary, "Worker envelope persisted to MoA evidence files.");

  const traceIndex = JSON.parse(fs.readFileSync(persisted.paths.traceIndexJson, "utf8"));
  assert.equal(traceIndex.run_id, "dag-envelope-persist");
  assert.equal(traceIndex.event_count, 1);
  assert.equal(traceIndex.events_by_type.worker_result_envelope, 1);
});

test("persists worker result ingest failure metadata into dag run and trace index", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-ingest-failure-persist-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-ingest-failure-persist",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
    ],
  });

  const persisted = persistWorkerResultIngestFailureMetadata(workspace, initial.dagRun, {
    node_id: "host",
    error: "parseWorkerResultEnvelope could not parse JSON: Unexpected token",
    failed_at: "2026-04-26T09:32:00.000Z",
  });

  assert.equal(persisted.node.status, DAG_NODE_STATES.FAILED);
  assert.equal(persisted.worker_runtime.result_ingest_status, "failed");
  assert.ok(fs.existsSync(persisted.paths.traceJsonl));
  assert.ok(fs.existsSync(persisted.paths.traceIndexJson));

  const traceLines = fs.readFileSync(persisted.paths.traceJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(traceLines.length, 1);
  const traceEvent = JSON.parse(traceLines[0]);
  assert.equal(traceEvent.event_type, "worker_result_ingest_failed");
  assert.equal(traceEvent.node_id, "host");
  assert.match(String(traceEvent.error || ""), /could not parse JSON/);

  const traceIndex = JSON.parse(fs.readFileSync(persisted.paths.traceIndexJson, "utf8"));
  assert.equal(traceIndex.run_id, "dag-ingest-failure-persist");
  assert.equal(traceIndex.event_count, 1);
  assert.equal(traceIndex.events_by_type.worker_result_ingest_failed, 1);
});

test("persists sequential result envelopes for two non-conflicting workers with stable trace and blackboard ordering", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-envelope-sequential-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-envelope-sequential",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
      { node_id: "ui", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/webview"] } },
    ],
  });

  const hostResult = persistWorkerResultEnvelope(workspace, initial.dagRun, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "Host worker completed.",
      changed_files: ["src/host/moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Host runtime update persisted." }],
      next_request: "Wait for UI worker envelope.",
    },
  });

  const uiResult = persistWorkerResultEnvelope(workspace, hostResult.dagRun, {
    node_id: "ui",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "UI worker completed.",
      changed_files: ["src/webview/board.js"],
      checks_run: ["node --test src/webview/render-detail-regression.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "artifact", visibility: "dag", summary: "UI status artifact persisted." }],
      next_request: "Ready for supervisor review.",
    },
  });

  const persisted = readDagRun(workspace, "dag-envelope-sequential");
  const hostNode = persisted.nodes.find((node) => node.node_id === "host");
  const uiNode = persisted.nodes.find((node) => node.node_id === "ui");
  assert.equal(hostNode.status, DAG_NODE_STATES.COMPLETED);
  assert.equal(uiNode.status, DAG_NODE_STATES.COMPLETED);
  assert.equal(hostNode.result.summary, "Host worker completed.");
  assert.equal(uiNode.result.summary, "UI worker completed.");

  const traceEvents = fs.readFileSync(uiResult.paths.traceJsonl, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(traceEvents.length, 2);
  assert.equal(traceEvents[0].event_type, "worker_result_envelope");
  assert.equal(traceEvents[0].node_id, "host");
  assert.equal(traceEvents[1].event_type, "worker_result_envelope");
  assert.equal(traceEvents[1].node_id, "ui");

  const blackboardEntries = fs.readFileSync(uiResult.paths.blackboardJsonl, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(blackboardEntries.length, 2);
  assert.equal(blackboardEntries[0].source_node_id, "host");
  assert.equal(blackboardEntries[0].summary, "Host runtime update persisted.");
  assert.equal(blackboardEntries[1].source_node_id, "ui");
  assert.equal(blackboardEntries[1].summary, "UI status artifact persisted.");

  const traceIndex = JSON.parse(fs.readFileSync(uiResult.paths.traceIndexJson, "utf8"));
  assert.equal(traceIndex.run_id, "dag-envelope-sequential");
  assert.equal(traceIndex.event_count, 2);
  assert.equal(traceIndex.events_by_type.worker_result_envelope, 2);
  assert.equal(traceIndex.last_event_id, traceEvents[1].event_id);
});

test("trace index aggregates prompt and result events for the same DAG run", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-trace-aggregate-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-trace-aggregate",
    nodes: [{
      node_id: "host",
      status: DAG_NODE_STATES.RUNNING,
      ownership: { write_paths: ["src/host"] },
    }],
  });

  const promptPersisted = persistWorkerPromptSnapshot(workspace, {
    dagRun: initial.dagRun,
    node_id: "host",
  });
  const resultPersisted = persistWorkerResultEnvelope(workspace, promptPersisted.dagRun, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "Host result persisted.",
      changed_files: ["src/host/moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Trace aggregation verified." }],
      next_request: "none",
    },
  });

  const traceLines = fs.readFileSync(resultPersisted.paths.traceJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(traceLines.length, 2);
  const traceEvents = traceLines.map((line) => JSON.parse(line));
  assert.equal(traceEvents[0].event_type, "worker_prompt_compiled");
  assert.equal(traceEvents[1].event_type, "worker_result_envelope");

  const traceIndex = JSON.parse(fs.readFileSync(resultPersisted.paths.traceIndexJson, "utf8"));
  assert.equal(traceIndex.run_id, "dag-trace-aggregate");
  assert.equal(traceIndex.event_count, 2);
  assert.equal(traceIndex.events_by_type.worker_prompt_compiled, 1);
  assert.equal(traceIndex.events_by_type.worker_result_envelope, 1);
  assert.equal(traceIndex.last_event_id, traceEvents[1].event_id);
});

test("archives DAG run evidence and appends archive trace event", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-archive-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-archive-evidence",
    nodes: [{
      node_id: "host",
      status: DAG_NODE_STATES.RUNNING,
      ownership: { write_paths: ["src/host"] },
    }],
  });
  const withResult = persistWorkerResultEnvelope(workspace, initial.dagRun, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: {
      summary: "Host worker completed and produced evidence.",
      changed_files: ["src/host/moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: [],
      blackboard_updates: [{ kind: "finding", visibility: "dag", summary: "Archive-ready evidence prepared." }],
      next_request: "Archive DAG evidence.",
    },
  });

  const archived = archiveDagRunEvidence(workspace, {
    run_id: "dag-archive-evidence",
    reason: "phase checkpoint",
  });

  assert.equal(archived.run_id, "dag-archive-evidence");
  assert.ok(fs.existsSync(path.join(archived.archive_dir, "dag-run.json")));
  assert.ok(fs.existsSync(path.join(archived.archive_dir, "trace.jsonl")));
  assert.ok(fs.existsSync(path.join(archived.archive_dir, "trace.index.json")));
  assert.ok(fs.existsSync(path.join(archived.archive_dir, "blackboard.jsonl")));
  assert.ok(fs.existsSync(archived.manifest_path));

  const manifest = JSON.parse(fs.readFileSync(archived.manifest_path, "utf8"));
  assert.equal(manifest.run_id, "dag-archive-evidence");
  assert.equal(manifest.reason, "phase checkpoint");
  assert.equal(manifest.trace_event_id, archived.traceEvent.event_id);

  const runDir = path.join(workspace, ".codex-team", "dag-runs", "dag-archive-evidence");
  const liveTraceEvents = fs.readFileSync(path.join(runDir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(liveTraceEvents[liveTraceEvents.length - 1].event_type, "dag_run_archived");
  assert.equal(liveTraceEvents[liveTraceEvents.length - 1].archive_path, archived.archive_path);

  const liveTraceIndex = JSON.parse(fs.readFileSync(path.join(runDir, "trace.index.json"), "utf8"));
  assert.equal(liveTraceIndex.events_by_type.worker_result_envelope, 1);
  assert.equal(liveTraceIndex.events_by_type.dag_run_archived, 1);
  assert.equal(liveTraceIndex.event_count, 2);

  const archivedTraceEvents = fs.readFileSync(path.join(archived.archive_dir, "trace.jsonl"), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  assert.equal(archivedTraceEvents.length, 1);
  assert.equal(archivedTraceEvents[0].event_type, "worker_result_envelope");

  const archivedIndex = JSON.parse(fs.readFileSync(path.join(archived.archive_dir, "trace.index.json"), "utf8"));
  assert.equal(archivedIndex.events_by_type.worker_result_envelope, 1);
  assert.equal(archivedIndex.events_by_type.dag_run_archived, undefined);

  const persistedAfterArchive = readDagRun(workspace, "dag-archive-evidence");
  assert.equal(persistedAfterArchive.nodes[0].status, DAG_NODE_STATES.COMPLETED);
  assert.equal(withResult.node.status, DAG_NODE_STATES.COMPLETED);
});

test("persists raw JSON worker result envelope text into dag evidence files", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-moa-envelope-raw-json-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const initial = writeDagRun(workspace, {
    run_id: "dag-envelope-raw-json",
    nodes: [
      { node_id: "host", status: DAG_NODE_STATES.RUNNING, ownership: { write_paths: ["src/host"] } },
    ],
  });

  const persisted = persistWorkerResultEnvelope(workspace, initial.dagRun, {
    node_id: "host",
    node_status: DAG_NODE_STATES.COMPLETED,
    result: JSON.stringify({
      summary: "Persisted host node result from raw JSON.",
      changed_files: ["src\\host\\moa-core.js"],
      checks_run: ["node --test src/host/moa-core.test.js"],
      open_risks: ["No live worker launch in this phase."],
      blackboard_updates: [
        { kind: "finding", visibility: "dag", summary: "Raw JSON envelope persisted to MoA evidence files." },
      ],
      next_request: "Prepare scheduler launch gating checks.",
    }),
  });

  assert.equal(persisted.node.status, DAG_NODE_STATES.COMPLETED);
  assert.deepEqual(persisted.node.result.changed_files, ["src/host/moa-core.js"]);
  assert.equal(persisted.node.result.summary, "Persisted host node result from raw JSON.");
  assert.equal(persisted.appendedBlackboardEntries.length, 1);
  assert.equal(persisted.appendedBlackboardEntries[0].summary, "Raw JSON envelope persisted to MoA evidence files.");

  const traceLines = fs.readFileSync(persisted.paths.traceJsonl, "utf8").trim().split("\n").filter(Boolean);
  assert.equal(traceLines.length, 1);
  const traceEvent = JSON.parse(traceLines[0]);
  assert.equal(traceEvent.event_type, "worker_result_envelope");
  assert.equal(traceEvent.summary, "Persisted host node result from raw JSON.");
  assert.deepEqual(traceEvent.changed_files, ["src/host/moa-core.js"]);
});

test("lists built-in role plugin templates for Stage 2.5 foundations", () => {
  const templates = listBuiltInRoleTemplates();
  const roleIds = templates.map((template) => template.role_id);
  assert.equal(Array.isArray(templates), true);
  assert.equal(templates.length >= 10, true);
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
});

test("keeps the Stage 2.5 built-in role template set exact and duplicate-free", () => {
  const roleIds = listBuiltInRoleTemplates().map((template) => template.role_id);
  const expectedRoleIds = [
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

  assert.equal(roleIds.length, expectedRoleIds.length);
  assert.deepEqual(roleIds, expectedRoleIds);
  assert.equal(new Set(roleIds).size, roleIds.length);
});

test("keeps built-in role alias/name tokens unique and resolvable to their owning role", () => {
  const templates = listBuiltInRoleTemplates();
  const normalizeToken = (value) => String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const ownersByToken = new Map();

  templates.forEach((template) => {
    const tokens = [
      template.role_id,
      template.role_name,
      template.display_name,
      ...(Array.isArray(template.aliases) ? template.aliases : []),
    ]
      .map(normalizeToken)
      .filter(Boolean);

    tokens.forEach((token) => {
      if (!ownersByToken.has(token)) ownersByToken.set(token, new Set());
      ownersByToken.get(token).add(template.role_id);
      const resolved = resolveBuiltInRoleTemplate(token);
      assert.equal(resolved && resolved.role_id, template.role_id);
    });
  });

  ownersByToken.forEach((owners, token) => {
    assert.equal(owners.size, 1, `role token collision for "${token}"`);
  });
});

test("rejects ambiguous role-token ownership in role template catalogs", () => {
  assert.throws(
    () => assertUniqueRoleTemplateTokens([
      {
        role_id: "planner",
        role_name: "Planner",
        display_name: "Planner",
        aliases: ["plan"],
      },
      {
        role_id: "shipper",
        role_name: "Shipper",
        display_name: "Shipper",
        aliases: ["plan"],
      },
    ], { label: "test_role_catalog" }),
    /test_role_catalog has conflicting role tokens: plan => planner, shipper/i,
  );
});

test("keeps codex-first default model policy across built-in role templates", () => {
  const templates = listBuiltInRoleTemplates();
  const byRoleId = new Map(templates.map((template) => [template.role_id, template]));

  assert.equal(byRoleId.get("supervisor").default_model, "gpt-5.4");
  [
    "planner",
    "implementer",
    "tester",
    "reviewer",
    "reflector",
    "debugger",
    "researcher",
    "documenter",
    "integrator",
  ].forEach((roleId) => {
    assert.equal(byRoleId.get(roleId).default_model, "gpt-5.3-codex", `${roleId} drifted from codex-first default`);
  });
});

test("keeps codex-first default provider policy across built-in role templates", () => {
  const templates = listBuiltInRoleTemplates();
  templates.forEach((template) => {
    assert.equal(template.default_provider, "codex-cli", `${template.role_id} drifted from codex-cli default provider`);
  });
});

test("returns cloned built-in role templates so callers cannot mutate catalog state", () => {
  const templates = listBuiltInRoleTemplates();
  assert.equal(templates.length > 0, true);

  templates[0].display_name = "Mutated Name";
  templates[0].default_write_paths.push("tmp/mutated");

  const freshTemplates = listBuiltInRoleTemplates();
  assert.notEqual(freshTemplates[0].display_name, "Mutated Name");
  assert.equal(freshTemplates[0].default_write_paths.includes("tmp/mutated"), false);
});

test("lists canonical built-in role template ids for role-picker contracts", () => {
  assert.deepEqual(
    listBuiltInRoleTemplateIds(),
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
});

test("builds built-in role plugin catalog with stable local contract fields", () => {
  const catalog = buildBuiltInRolePluginCatalog();
  assert.equal(catalog.schema_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(catalog.source, ROLE_PLUGIN_CATALOG_SOURCE);
  assert.deepEqual(catalog.built_in_role_ids, listBuiltInRoleTemplateIds());
  assert.equal(Array.isArray(catalog.templates), true);
  assert.equal(catalog.templates.length >= 10, true);
  assert.equal(catalog.templates[0].role_id, "supervisor");
  assert.equal(catalog.templates[0].role_template_source, "builtin");
  assert.equal(catalog.templates[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(catalog.templates[0].display_name, "Supervisor");
  assert.equal(catalog.templates[0].default_provider, "codex-cli");
  assert.equal(catalog.templates[0].default_model, "gpt-5.4");
  assert.equal(catalog.templates[0].can_edit_code, false);
  assert.equal(catalog.templates[0].writes_blackboard, true);
  assert.equal(Array.isArray(catalog.templates[0].prompt_contract), true);
  assert.equal(catalog.templates[0].prompt_contract.length > 0, true);
  assert.equal(Array.isArray(catalog.templates[0].result_envelope), true);
  assert.equal(Array.isArray(catalog.templates[0].expected_outputs), true);
  assert.deepEqual(catalog.templates[0].result_envelope, [
    "summary",
    "changed_files",
    "checks_run",
    "open_risks",
    "blackboard_updates",
    "next_request",
  ]);
  assert.match(String(catalog.templates[0].summary || ""), /planning|DAG|worker/i);
  assert.deepEqual(catalog.templates[0].summary, catalog.templates[0].role_prompt);
  assert.deepEqual(catalog.templates[0].expected_outputs, catalog.templates[0].default_expected_outputs);
});

test("normalizes custom role plugin templates to stable catalog fields", () => {
  const normalized = normalizeRolePluginTemplate({
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Blocks risky releases without validation evidence.",
    can_edit_code: false,
    writes_blackboard: true,
    default_write_paths: ["task-plans"],
    expected_outputs: ["release risk summary"],
    prompt_contract: "Require green checks\nBlock unsafe release",
  });

  assert.ok(normalized);
  assert.equal(normalized.role_id, "release-guard");
  assert.equal(normalized.role_name, "Release Guard");
  assert.equal(normalized.display_name, "Release Guard");
  assert.equal(normalized.role_template_source, "custom");
  assert.equal(normalized.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(normalized.default_model, "gpt-5.3-codex");
  assert.deepEqual(normalized.default_write_paths, ["task-plans"]);
  assert.deepEqual(normalized.default_expected_outputs, ["release risk summary"]);
  assert.deepEqual(normalized.expected_outputs, ["release risk summary"]);
  assert.deepEqual(normalized.prompt_contract, ["Require green checks", "Block unsafe release"]);
});

test("normalizes role_id-only custom role templates with readable role/display names", () => {
  const normalized = normalizeRolePluginTemplate({
    role_id: "release_guard_lane",
  });

  assert.ok(normalized);
  assert.equal(normalized.role_id, "release-guard-lane");
  assert.equal(normalized.role_name, "Release Guard Lane");
  assert.equal(normalized.display_name, "Release Guard Lane");
});

test("normalizes role plugin booleans with snake_case precedence over camelCase", () => {
  const normalized = normalizeRolePluginTemplate({
    role_id: "release_guard",
    display_name: "Release Guard",
    can_edit_code: false,
    canEditCode: true,
    writes_blackboard: false,
    writesBlackboard: true,
  });

  assert.ok(normalized);
  assert.equal(normalized.can_edit_code, false);
  assert.equal(normalized.writes_blackboard, false);
});

test("normalizes custom role templates with blank default_model to codex-first fallback", () => {
  const normalized = normalizeRolePluginTemplate({
    role_id: "release_guard",
    default_model: "   ",
  });

  assert.ok(normalized);
  assert.equal(normalized.default_model, "gpt-5.3-codex");
  assert.equal(normalized.default_provider, "codex-cli");

  const resolved = resolveRoleTemplate("release_guard", {
    customTemplates: [{
      role_id: "release_guard",
      default_model: "   ",
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.default_model, "gpt-5.3-codex");
  assert.equal(resolved.default_provider, "codex-cli");
});

test("normalizes custom role templates with blank role_prompt to description fallback", () => {
  const normalized = normalizeRolePluginTemplate({
    role_id: "release_guard",
    description: "Hold release until validation evidence is complete.",
    role_prompt: "   ",
  });

  assert.ok(normalized);
  assert.equal(normalized.role_prompt, "Hold release until validation evidence is complete.");
  assert.equal(normalized.summary, "Hold release until validation evidence is complete.");

  const resolved = resolveRoleTemplate("release_guard", {
    customTemplates: [{
      role_id: "release_guard",
      description: "Hold release until validation evidence is complete.",
      role_prompt: "   ",
    }],
  });

  assert.ok(resolved);
  assert.equal(resolved.role_prompt, "Hold release until validation evidence is complete.");
});

test("loads local custom role templates from .codex-team/roles and merges with built-ins", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-role-plugins-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  fs.writeFileSync(path.join(rolesDir, "release-guard.json"), `${JSON.stringify({
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Stops release when checks or evidence are missing.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    default_read_paths: ["src", "task-plans"],
    default_write_paths: ["task-plans"],
    default_expected_outputs: ["release risk summary"],
    prompt_contract: ["Verify checks before release.", "Write concise release risk handoff."],
  }, null, 2)}\n`, "utf8");
  fs.writeFileSync(path.join(rolesDir, "duplicate.json"), `${JSON.stringify({
    role_id: "implementer",
    display_name: "Shadow Implementer",
  }, null, 2)}\n`, "utf8");

  const localTemplates = listLocalRolePluginTemplates(workspace);
  assert.equal(localTemplates.length, 1);
  assert.equal(localTemplates[0].role_id, "release-guard");
  assert.equal(localTemplates[0].role_template_source, "custom");
  assert.equal(localTemplates[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);

  const catalog = buildRolePluginCatalog({ workspacePath: workspace });
  const releaseGuard = catalog.templates.find((template) => template.role_id === "release-guard");
  const implementers = catalog.templates.filter((template) => template.role_id === "implementer");
  assert.equal(catalog.source, "local_mixed");
  assert.ok(releaseGuard);
  assert.equal(releaseGuard.role_template_source, "custom");
  assert.equal(releaseGuard.default_model, "gpt-5.3-codex");
  assert.deepEqual(releaseGuard.default_write_paths, ["task-plans"]);
  assert.equal(implementers.length, 1);
});

test("loads role_id-only local custom role templates with readable labels", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-role-plugins-role-id-only-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  fs.writeFileSync(path.join(rolesDir, "release-lane.json"), `${JSON.stringify({
    role_id: "release_guard_lane",
  }, null, 2)}\n`, "utf8");

  const localTemplates = listLocalRolePluginTemplates(workspace);
  assert.equal(localTemplates.length, 1);
  assert.equal(localTemplates[0].role_id, "release-guard-lane");
  assert.equal(localTemplates[0].role_name, "Release Guard Lane");
  assert.equal(localTemplates[0].display_name, "Release Guard Lane");
  assert.equal(localTemplates[0].role_template_source, "custom");
  assert.equal(localTemplates[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
});

test("resolves custom role templates from pure customTemplates options", () => {
  const resolved = resolveRoleTemplate("release_guard", {
    customTemplates: [{
      role_id: "release_guard",
      display_name: "Release Guard",
      description: "Verifies release safety gates.",
      default_model: "gpt-5.3-codex",
      can_edit_code: false,
      writes_blackboard: true,
      default_write_paths: ["task-plans"],
      expected_outputs: ["release safety summary"],
      prompt_contract: ["Require green checks before release."],
    }],
  });
  assert.ok(resolved);
  assert.equal(resolved.role_id, "release-guard");
  assert.equal(resolved.role_name, "Release Guard");
  assert.equal(resolved.role_template_source, "custom");
  assert.equal(resolved.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(resolved.default_model, "gpt-5.3-codex");
  assert.equal(resolved.role_prompt, "Verifies release safety gates.");
});

test("keeps built-in role templates canonical when pure customTemplates collide on id, name, or alias", () => {
  const catalog = buildRolePluginCatalog({
    customTemplates: [
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
        description: "Custom role that collides on built-in name and alias.",
        aliases: ["developer", "coder"],
        default_write_paths: ["docs"],
      },
    ],
  });
  const implementers = catalog.templates.filter((template) => template.role_id === "implementer");
  const shipper = catalog.templates.find((template) => template.role_id === "shipper");

  assert.equal(implementers.length, 1);
  assert.equal(implementers[0].display_name, "Implementer");
  assert.equal(implementers[0].role_template_source, "builtin");
  assert.ok(shipper);
  assert.equal(shipper.role_template_source, "custom");
  assert.deepEqual(shipper.aliases, ["developer", "coder"]);

  const resolvedByAlias = resolveRoleTemplate("developer", {
    customTemplates: catalog.templates,
  });
  assert.ok(resolvedByAlias);
  assert.equal(resolvedByAlias.role_id, "implementer");
  assert.equal(resolvedByAlias.role_template_source, "builtin");

  const resolvedCustom = resolveRoleTemplate("shipper", {
    customTemplates: catalog.templates,
  });
  assert.ok(resolvedCustom);
  assert.equal(resolvedCustom.role_id, "shipper");
  assert.equal(resolvedCustom.role_template_source, "custom");
});

test("keeps built-in-first ordering when mixed role catalogs append custom templates", () => {
  const builtInRoleIds = listBuiltInRoleTemplates().map((template) => template.role_id);
  const catalog = buildRolePluginCatalog({
    customTemplates: [
      { role_id: "release_guard" },
      { role_id: "api_designer" },
    ],
  });

  assert.deepEqual(
    catalog.templates.slice(0, builtInRoleIds.length).map((template) => template.role_id),
    builtInRoleIds,
  );
  assert.deepEqual(
    catalog.templates.slice(builtInRoleIds.length).map((template) => template.role_id),
    ["release-guard", "api-designer"],
  );
});

test("normalizes and resolves built-in role template ids", () => {
  assert.equal(normalizeRoleTemplateId(" Implementer Worker "), "implementer-worker");
  const resolvedById = resolveBuiltInRoleTemplate("implementer");
  assert.ok(resolvedById);
  assert.equal(resolvedById.role_name, "Implementer");
  const resolvedByName = resolveBuiltInRoleTemplate("Reviewer");
  assert.ok(resolvedByName);
  assert.equal(resolvedByName.role_id, "reviewer");
  const resolvedByAlias = resolveBuiltInRoleTemplate("qa");
  assert.ok(resolvedByAlias);
  assert.equal(resolvedByAlias.role_id, "tester");
});

test("normalizes built-in role template binding metadata", () => {
  const binding = normalizeRoleTemplateBinding({ role_id: "Documenter" });
  assert.equal(binding.role_id, "documenter");
  assert.equal(binding.role_name, "Documenter");
  assert.equal(binding.display_name, "Documenter");
  assert.equal(binding.role_template_source, "builtin");
  assert.equal(binding.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.ok(binding.template);

  const customBinding = normalizeRoleTemplateBinding({ role_id: "custom_release_guard" });
  assert.equal(customBinding.role_id, "custom-release-guard");
  assert.equal(customBinding.role_name, "Custom Release Guard");
  assert.equal(customBinding.display_name, "Custom Release Guard");
  assert.equal(customBinding.role_template_source, "custom");
  assert.equal(customBinding.role_template_version, 0);
  assert.equal(customBinding.template, null);

  const customNameOnlyBinding = normalizeRoleTemplateBinding({ role_name: "Release Guard" });
  assert.equal(customNameOnlyBinding.role_id, "release-guard");
  assert.equal(customNameOnlyBinding.role_name, "Release Guard");
  assert.equal(customNameOnlyBinding.display_name, "Release Guard");
  assert.equal(customNameOnlyBinding.role_template_source, "custom");
  assert.equal(customNameOnlyBinding.role_template_version, 0);
  assert.equal(customNameOnlyBinding.template, null);
});

test("applies built-in role template defaults to worker draft when fields are missing", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-1",
    title: "Planner worker",
    role_id: "planner",
  });

  assert.equal(worker.role_id, "planner");
  assert.equal(worker.role_name, "Planner");
  assert.equal(worker.display_name, "Planner");
  assert.equal(worker.role_template_source, "builtin");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(worker.model, "gpt-5.3-codex");
  assert.match(worker.role, /Refine one bounded implementation plan/);
  assert.deepEqual(worker.write_paths, ["task-plans"]);
  assert.deepEqual(worker.expected_outputs, ["updated task plan checklist and acceptance criteria"]);
  assert.equal(worker.can_edit_code, true);
  assert.equal(worker.writes_blackboard, true);
  assert.equal(Array.isArray(worker.prompt_contract), true);
  assert.equal(worker.prompt_contract.length > 0, true);
  assert.deepEqual(worker.result_envelope, [
    "summary",
    "changed_files",
    "checks_run",
    "open_risks",
    "blackboard_updates",
    "next_request",
  ]);
});

test("role template alias helpers keep worker/supervisor draft behavior stable", () => {
  const aliasedWorker = applyRoleTemplateToWorkerDraft({
    node_id: "node-role-alias-helper",
    title: "Alias helper worker",
    role_id: "planner",
  });
  const legacyWorker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-role-alias-helper",
    title: "Alias helper worker",
    role_id: "planner",
  });
  assert.deepEqual(aliasedWorker, legacyWorker);

  const aliasedSupervisor = applyRoleTemplateToSupervisorDraft({
    instructions: "Coordinate one bounded role template slice.",
  });
  const legacySupervisor = applyBuiltInRoleTemplateToSupervisorDraft({
    instructions: "Coordinate one bounded role template slice.",
  });
  assert.deepEqual(aliasedSupervisor, legacySupervisor);
});

test("role template alias helper keeps orchestration worker draft behavior stable", () => {
  const aliasedWorker = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-role-orchestration-alias-helper",
    title: "Alias orchestration helper worker",
    role_id: "planner",
  }, {
    defaultWorkerModel: "gpt-5.3-codex",
  });
  const legacyWorker = applyBuiltInRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-role-orchestration-alias-helper",
    title: "Alias orchestration helper worker",
    role_id: "planner",
  }, {
    defaultWorkerModel: "gpt-5.3-codex",
  });

  assert.deepEqual(aliasedWorker, legacyWorker);
});

test("built-in orchestration role template alias helper keeps custom-template application non-mutating and idempotent", () => {
  const workerInput = {
    node_id: "node-role-orchestration-builtin-alias-custom",
    title: "Alias helper custom worker",
    role_id: "release_guard",
  };
  const options = {
    defaultWorkerModel: "gpt-5.3-codex",
    customTemplates: [{
      role_id: "release_guard",
      display_name: "Release Guard",
      description: "Validate release risk evidence before handoff.",
      default_model: "gpt-5.3-codex",
      default_read_paths: ["task-plans", "docs"],
      default_write_paths: ["task-plans"],
      expected_outputs: ["release risk summary"],
      prompt_contract: ["Require passing checks before release."],
      result_envelope: ["summary", "next_request"],
      can_edit_code: false,
      writes_blackboard: true,
    }],
  };
  const workerInputSnapshot = JSON.parse(JSON.stringify(workerInput));
  const optionsSnapshot = JSON.parse(JSON.stringify(options));
  const firstPass = applyBuiltInRoleTemplateToOrchestrationWorkerDraft(workerInput, options);
  const secondPass = applyBuiltInRoleTemplateToOrchestrationWorkerDraft(firstPass, options);

  assert.deepEqual(workerInput, workerInputSnapshot);
  assert.deepEqual(options, optionsSnapshot);
  assert.notEqual(firstPass, workerInput);
  assert.deepEqual(secondPass, firstPass);
  assert.notEqual(secondPass, firstPass);
  assert.equal(firstPass.role_id, "release-guard");
  assert.equal(firstPass.role_template_source, "custom");
  assert.equal(firstPass.can_edit_code, false);
  assert.equal(firstPass.writes_blackboard, true);
});

test("applies role template defaults to orchestration worker drafts with default worker-model fallback", () => {
  const withFallback = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-orchestration-model-fallback",
    title: "Fallback worker",
    role_id: "release_guard",
  }, {
    defaultWorkerModel: "gpt-5.3-codex",
  });
  assert.equal(withFallback.role_id, "release-guard");
  assert.equal(withFallback.model, "gpt-5.3-codex");

  const withTemplateModel = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-orchestration-template-model",
    title: "Template model worker",
    role_id: "planner",
  }, {
    defaultWorkerModel: "gpt-5.4-mini",
  });
  assert.equal(withTemplateModel.role_id, "planner");
  assert.equal(withTemplateModel.model, "gpt-5.3-codex");

  const withExplicitModel = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-orchestration-explicit-model",
    title: "Explicit model worker",
    role_id: "planner",
    model: "gpt-5.5",
  }, {
    defaultWorkerModel: "gpt-5.3-codex",
  });
  assert.equal(withExplicitModel.model, "gpt-5.5");
});

test("keeps explicit orchestration worker provider while applying role template defaults", () => {
  const worker = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-orchestration-provider-explicit",
    title: "Auxiliary review worker",
    role_id: "reviewer",
    provider: "gemini-cli",
  }, {
    defaultWorkerModel: "gpt-5.3-codex",
  });

  assert.equal(worker.role_id, "reviewer");
  assert.equal(worker.role_template_source, "builtin");
  assert.equal(worker.provider, "gemini-cli");
  assert.equal(worker.model, "gpt-5.3-codex");
});

test("keeps explicit orchestration worker provider and model together while applying role template defaults", () => {
  const worker = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-orchestration-provider-model-explicit",
    title: "Explicit provider/model worker",
    role_id: "reviewer",
    provider: "gemini-cli",
    model: "gemini-3.1-pro-preview",
  }, {
    defaultWorkerModel: "gpt-5.3-codex",
  });

  assert.equal(worker.role_id, "reviewer");
  assert.equal(worker.role_template_source, "builtin");
  assert.equal(worker.provider, "gemini-cli");
  assert.equal(worker.model, "gemini-3.1-pro-preview");
});

test("applies built-in role template metadata across all Stage 2.5 orchestration role ids", () => {
  const roleIds = [
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

  roleIds.forEach((roleId, index) => {
    const worker = applyRoleTemplateToOrchestrationWorkerDraft({
      node_id: `node-role-metadata-${index + 1}`,
      title: `${roleId} lane`,
      role_id: roleId,
    });

    assert.equal(worker.role_id, roleId);
    assert.equal(worker.role_template_source, "builtin");
    assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
    assert.equal(typeof worker.role, "string");
    assert.equal(worker.role.length > 0, true);
    assert.equal(Array.isArray(worker.prompt_contract), true);
    assert.equal(worker.prompt_contract.length > 0, true);
    assert.equal(Array.isArray(worker.result_envelope), true);
    assert.equal(worker.result_envelope.length > 0, true);
    assert.equal(Array.isArray(worker.read_paths), true);
    assert.equal(worker.read_paths.length > 0, true);
    assert.equal(Array.isArray(worker.write_paths), true);
    assert.equal(worker.write_paths.length > 0, true);
    assert.equal(Array.isArray(worker.expected_outputs), true);
    assert.equal(worker.expected_outputs.length > 0, true);
    assert.equal(worker.provider, "codex-cli");
    assert.equal(typeof worker.model, "string");
    assert.equal(worker.model.length > 0, true);
  });
});

test("keeps explicit orchestration worker ownership/output fields while inheriting missing role-template metadata", () => {
  const worker = applyRoleTemplateToOrchestrationWorkerDraft({
    node_id: "node-orchestration-explicit-precedence",
    title: "Explicit precedence lane",
    role_id: "planner",
    role: "Use explicit worker contract text.",
    model: "gpt-5.4-mini",
    read_paths: ["docs"],
    write_paths: ["src/host"],
    expected_outputs: ["host role-template precedence check"],
  });

  assert.equal(worker.role_id, "planner");
  assert.equal(worker.role_template_source, "builtin");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(worker.role, "Use explicit worker contract text.");
  assert.equal(worker.model, "gpt-5.4-mini");
  assert.deepEqual(worker.read_paths, ["docs"]);
  assert.deepEqual(worker.write_paths, ["src/host"]);
  assert.deepEqual(worker.expected_outputs, ["host role-template precedence check"]);
  assert.equal(Array.isArray(worker.prompt_contract), true);
  assert.equal(worker.prompt_contract.length > 0, true);
  assert.equal(Array.isArray(worker.result_envelope), true);
  assert.equal(worker.result_envelope.length > 0, true);
  assert.equal(worker.can_edit_code, true);
  assert.equal(worker.writes_blackboard, true);
});

test("applies role templates without mutating worker or supervisor draft inputs", () => {
  const workerInput = {
    node_id: "node-no-mutation-worker",
    title: "No mutation worker",
    role_id: "planner",
  };
  const workerInputSnapshot = JSON.parse(JSON.stringify(workerInput));
  const worker = applyRoleTemplateToWorkerDraft(workerInput);
  assert.deepEqual(workerInput, workerInputSnapshot);
  assert.equal(worker.role_id, "planner");
  assert.notEqual(worker, workerInput);

  const supervisorInput = {
    role_id: "supervisor",
    instructions: "Coordinate one bounded lane.",
  };
  const supervisorInputSnapshot = JSON.parse(JSON.stringify(supervisorInput));
  const supervisor = applyRoleTemplateToSupervisorDraft(supervisorInput);
  assert.deepEqual(supervisorInput, supervisorInputSnapshot);
  assert.equal(supervisor.role_id, "supervisor");
  assert.notEqual(supervisor, supervisorInput);
});

test("applies orchestration worker role templates without mutating inputs and remains idempotent", () => {
  const workerInput = {
    node_id: "node-no-mutation-orchestration-worker",
    title: "No mutation orchestration worker",
    role_id: "tester",
  };
  const workerInputSnapshot = JSON.parse(JSON.stringify(workerInput));
  const firstPass = applyRoleTemplateToOrchestrationWorkerDraft(workerInput, {
    defaultWorkerModel: "gpt-5.3-codex",
  });
  const secondPass = applyRoleTemplateToOrchestrationWorkerDraft(firstPass, {
    defaultWorkerModel: "gpt-5.3-codex",
  });

  assert.deepEqual(workerInput, workerInputSnapshot);
  assert.notEqual(firstPass, workerInput);
  assert.deepEqual(secondPass, firstPass);
  assert.notEqual(secondPass, firstPass);
  assert.equal(firstPass.role_id, "tester");
  assert.equal(firstPass.role_template_source, "builtin");
  assert.equal(firstPass.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
});

test("applies built-in worker role templates idempotently for normalized drafts", () => {
  const firstPass = applyRoleTemplateToWorkerDraft({
    node_id: "node-idempotent-worker",
    title: "Idempotent worker",
    role_id: "planner",
  });
  const secondPass = applyRoleTemplateToWorkerDraft(firstPass);

  assert.deepEqual(secondPass, firstPass);
  assert.notEqual(secondPass, firstPass);
  assert.equal(secondPass.role_id, "planner");
  assert.equal(secondPass.role_template_source, "builtin");
  assert.equal(secondPass.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
});

test("applies built-in role template defaults when worker draft uses role alias", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-role-alias",
    title: "Alias role worker",
    role_name: "qa",
  });

  assert.equal(worker.role_id, "tester");
  assert.equal(worker.role_name, "Tester");
  assert.equal(worker.display_name, "Tester");
  assert.equal(worker.role_template_source, "builtin");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(worker.model, "gpt-5.3-codex");
  assert.match(worker.role, /targeted tests/i);
  assert.deepEqual(worker.write_paths, ["src/host", "src/webview"]);
  assert.deepEqual(worker.expected_outputs, ["test updates and verification evidence"]);
  assert.equal(worker.can_edit_code, true);
  assert.equal(worker.writes_blackboard, true);
});

test("applies built-in supervisor role template defaults when fields are missing", () => {
  const supervisor = applyBuiltInRoleTemplateToSupervisorDraft({});
  assert.equal(supervisor.role_id, "supervisor");
  assert.equal(supervisor.role_name, "Supervisor");
  assert.equal(supervisor.display_name, "Supervisor");
  assert.equal(supervisor.role_template_source, "builtin");
  assert.equal(supervisor.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(supervisor.model, "gpt-5.4");
  assert.match(supervisor.instructions, /Own planning, DAG decisions, worker scheduling/i);
  assert.equal(supervisor.writes_blackboard, true);
  assert.equal(supervisor.can_edit_code, false);
  assert.equal(Array.isArray(supervisor.prompt_contract), true);
  assert.equal(Array.isArray(supervisor.expected_outputs), true);
});

test("keeps explicit supervisor draft fields when applying built-in template", () => {
  const supervisor = applyBuiltInRoleTemplateToSupervisorDraft({
    model: "gpt-5.5",
    instructions: "Coordinate one bounded worker tick.",
    prompt_contract: ["Keep ownership safe."],
    expected_outputs: ["supervisor review summary"],
  });
  assert.equal(supervisor.role_id, "supervisor");
  assert.equal(supervisor.model, "gpt-5.5");
  assert.equal(supervisor.instructions, "Coordinate one bounded worker tick.");
  assert.deepEqual(supervisor.prompt_contract, ["Keep ownership safe."]);
  assert.deepEqual(supervisor.expected_outputs, ["supervisor review summary"]);
});

test("applies custom role template defaults to supervisor draft via pure options", () => {
  const supervisor = applyBuiltInRoleTemplateToSupervisorDraft({
    role_id: "release_guard",
  }, {
    customTemplates: [{
      role_id: "release_guard",
      display_name: "Release Guard",
      description: "Block release when evidence is missing.",
      default_model: "gpt-5.3-codex",
      can_edit_code: false,
      writes_blackboard: true,
      default_expected_outputs: ["release gate decision"],
      prompt_contract: ["Require green checks before release."],
    }],
  });

  assert.equal(supervisor.role_id, "release-guard");
  assert.equal(supervisor.role_name, "Release Guard");
  assert.equal(supervisor.display_name, "Release Guard");
  assert.equal(supervisor.role_template_source, "custom");
  assert.equal(supervisor.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(supervisor.model, "gpt-5.3-codex");
  assert.equal(supervisor.instructions, "Block release when evidence is missing.");
  assert.deepEqual(supervisor.prompt_contract, ["Require green checks before release."]);
  assert.deepEqual(supervisor.expected_outputs, ["release gate decision"]);
  assert.equal(supervisor.writes_blackboard, true);
  assert.equal(supervisor.can_edit_code, false);
});

test("normalizes custom role_name-only worker drafts when applying role template defaults", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-custom-role",
    title: "Custom role worker",
    role_name: "Release Guard",
  });

  assert.equal(worker.role_id, "release-guard");
  assert.equal(worker.role_name, "Release Guard");
  assert.equal(worker.display_name, "Release Guard");
  assert.equal(worker.role_template_source, "custom");
  assert.equal(worker.role_template_version, 0);
  assert.equal(worker.role, "");
  assert.equal(worker.model, "");
  assert.deepEqual(worker.read_paths, []);
  assert.deepEqual(worker.write_paths, []);
  assert.deepEqual(worker.expected_outputs, []);
});

test("normalizes custom role_id-only worker drafts when applying role template defaults", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-custom-role-id",
    title: "Custom role worker",
    role_id: "release_guard",
  });

  assert.equal(worker.role_id, "release-guard");
  assert.equal(worker.role_name, "Release Guard");
  assert.equal(worker.display_name, "Release Guard");
  assert.equal(worker.role_template_source, "custom");
  assert.equal(worker.role_template_version, 0);
  assert.equal(worker.role, "");
  assert.equal(worker.model, "");
  assert.deepEqual(worker.read_paths, []);
  assert.deepEqual(worker.write_paths, []);
  assert.deepEqual(worker.expected_outputs, []);
});

test("keeps explicit worker draft fields when applying built-in role template", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-2",
    title: "Implementer worker",
    role_id: "implementer",
    role: "Implement host launch metadata persistence only.",
    model: "gpt-5.5",
    write_paths: ["src/host"],
    expected_outputs: ["host patch and tests"],
  });

  assert.equal(worker.role_id, "implementer");
  assert.equal(worker.role_name, "Implementer");
  assert.equal(worker.display_name, "Implementer");
  assert.equal(worker.model, "gpt-5.5");
  assert.equal(worker.role, "Implement host launch metadata persistence only.");
  assert.deepEqual(worker.write_paths, ["src/host"]);
  assert.deepEqual(worker.expected_outputs, ["host patch and tests"]);
});

test("applies worker/supervisor boolean overrides with snake_case precedence over camelCase", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    role_id: "implementer",
    can_edit_code: false,
    canEditCode: true,
    writes_blackboard: false,
    writesBlackboard: true,
  });
  assert.equal(worker.can_edit_code, false);
  assert.equal(worker.writes_blackboard, false);

  const supervisor = applyBuiltInRoleTemplateToSupervisorDraft({
    can_edit_code: true,
    canEditCode: false,
    writes_blackboard: false,
    writesBlackboard: true,
  });
  assert.equal(supervisor.can_edit_code, true);
  assert.equal(supervisor.writes_blackboard, false);
});

test("uses options.role as fallback binding and keeps explicit worker role overrides", () => {
  const workerWithFallbackRole = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-fallback-role",
    title: "Fallback role worker",
  }, {
    role: {
      role_id: "tester",
    },
  });

  assert.equal(workerWithFallbackRole.role_id, "tester");
  assert.equal(workerWithFallbackRole.role_name, "Tester");
  assert.equal(workerWithFallbackRole.role_template_source, "builtin");
  assert.equal(workerWithFallbackRole.model, "gpt-5.3-codex");
  assert.match(workerWithFallbackRole.role, /targeted tests/i);

  const workerWithExplicitOverride = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-explicit-override",
    title: "Explicit override worker",
    role_id: "implementer",
  }, {
    role: {
      role_id: "tester",
    },
  });

  assert.equal(workerWithExplicitOverride.role_id, "implementer");
  assert.equal(workerWithExplicitOverride.role_name, "Implementer");
  assert.equal(workerWithExplicitOverride.role_template_source, "builtin");
  assert.match(workerWithExplicitOverride.role, /bounded code slice/i);
});

test("applies custom role template defaults to worker draft via pure options", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-release",
    title: "Release lane",
    role_id: "release_guard",
  }, {
    customTemplates: [{
      role_id: "release_guard",
      display_name: "Release Guard",
      description: "Hold release when evidence is incomplete.",
      default_model: "gpt-5.3-codex",
      can_edit_code: false,
      writes_blackboard: true,
      default_read_paths: ["src", "task-plans"],
      default_write_paths: ["task-plans"],
      expected_outputs: ["release gate decision"],
      prompt_contract: ["Require green checks before release."],
    }],
  });

  assert.equal(worker.role_id, "release-guard");
  assert.equal(worker.role_name, "Release Guard");
  assert.equal(worker.display_name, "Release Guard");
  assert.equal(worker.role_template_source, "custom");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(worker.model, "gpt-5.3-codex");
  assert.equal(worker.role, "Hold release when evidence is incomplete.");
  assert.deepEqual(worker.read_paths, ["src", "task-plans"]);
  assert.deepEqual(worker.write_paths, ["task-plans"]);
  assert.deepEqual(worker.expected_outputs, ["release gate decision"]);
  assert.equal(worker.can_edit_code, false);
  assert.equal(worker.writes_blackboard, true);
  assert.deepEqual(worker.prompt_contract, ["Require green checks before release."]);
  assert.deepEqual(worker.result_envelope, [
    "summary",
    "changed_files",
    "checks_run",
    "open_risks",
    "blackboard_updates",
    "next_request",
  ]);
});

test("keeps explicit worker overrides while inheriting missing fields from custom role template defaults", () => {
  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-release-override",
    title: "Release lane with overrides",
    role_id: "release_guard",
    role: "Block release if smoke checks are red.",
    model: "gpt-5.5",
    write_paths: ["docs"],
    expected_outputs: ["manual release hold note"],
    result_envelope: ["summary", "open_risks"],
    writes_blackboard: false,
    can_edit_code: true,
  }, {
    customTemplates: [{
      role_id: "release_guard",
      display_name: "Release Guard",
      description: "Hold release when evidence is incomplete.",
      default_model: "gpt-5.3-codex",
      can_edit_code: false,
      writes_blackboard: true,
      default_read_paths: ["src", "task-plans"],
      default_write_paths: ["task-plans"],
      expected_outputs: ["release gate decision"],
      prompt_contract: ["Require green checks before release."],
    }],
  });

  assert.equal(worker.role_id, "release-guard");
  assert.equal(worker.role_name, "Release Guard");
  assert.equal(worker.role_template_source, "custom");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(worker.role, "Block release if smoke checks are red.");
  assert.equal(worker.model, "gpt-5.5");
  assert.deepEqual(worker.read_paths, ["src", "task-plans"]);
  assert.deepEqual(worker.write_paths, ["docs"]);
  assert.deepEqual(worker.expected_outputs, ["manual release hold note"]);
  assert.deepEqual(worker.prompt_contract, ["Require green checks before release."]);
  assert.deepEqual(worker.result_envelope, ["summary", "open_risks"]);
  assert.equal(worker.writes_blackboard, false);
  assert.equal(worker.can_edit_code, true);
});

test("applies custom role template defaults to worker draft via workspace local role plugins", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-role-template-binding-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  fs.writeFileSync(path.join(rolesDir, "release-guard.json"), `${JSON.stringify({
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Block release when evidence is missing.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    default_read_paths: ["src", "task-plans"],
    default_write_paths: ["task-plans"],
    default_expected_outputs: ["release gate decision"],
    prompt_contract: ["Require green checks before release."],
  }, null, 2)}\n`, "utf8");

  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-release-local",
    title: "Release gate lane",
    role_id: "release_guard",
  }, {
    workspacePath: workspace,
  });

  assert.equal(worker.role_id, "release-guard");
  assert.equal(worker.role_name, "Release Guard");
  assert.equal(worker.display_name, "Release Guard");
  assert.equal(worker.role_template_source, "custom");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(worker.model, "gpt-5.3-codex");
  assert.equal(worker.role, "Block release when evidence is missing.");
  assert.deepEqual(worker.read_paths, ["src", "task-plans"]);
  assert.deepEqual(worker.write_paths, ["task-plans"]);
  assert.deepEqual(worker.expected_outputs, ["release gate decision"]);
});

test("keeps built-in alias resolution canonical when workspace-local roles collide on alias", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-role-template-alias-collision-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  fs.writeFileSync(path.join(rolesDir, "shipper.json"), `${JSON.stringify({
    role_id: "shipper",
    display_name: "Shipper",
    description: "Custom ship lane role.",
    aliases: ["developer", "coder"],
    can_edit_code: true,
    writes_blackboard: true,
    default_model: "gpt-5.3-codex",
    default_write_paths: ["docs"],
  }, null, 2)}\n`, "utf8");

  const worker = applyBuiltInRoleTemplateToWorkerDraft({
    node_id: "node-alias-collision",
    title: "Alias collision worker",
    role_name: "developer",
  }, {
    workspacePath: workspace,
  });

  assert.equal(worker.role_id, "implementer");
  assert.equal(worker.role_name, "Implementer");
  assert.equal(worker.role_template_source, "builtin");
  assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.deepEqual(worker.write_paths, ["src"]);
  assert.match(worker.role, /bounded code slice/i);
});

test("applies workspace local custom role templates during orchestration draft generation", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-role-template-orchestration-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  fs.writeFileSync(path.join(rolesDir, "release-guard.json"), `${JSON.stringify({
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Block release when evidence is missing.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    default_read_paths: ["src", "task-plans"],
    default_write_paths: ["task-plans"],
    default_expected_outputs: ["release gate decision"],
    prompt_contract: ["Require green checks before release."],
  }, null, 2)}\n`, "utf8");

  const draft = generateOrchestrationDraft({
    workspacePath: workspace,
    workerCount: 1,
    workers: [{
      node_id: "release-lane",
      title: "Release lane",
      role_id: "release_guard",
    }],
  });

  assert.equal(draft.workers[0].role_id, "release-guard");
  assert.equal(draft.workers[0].role_name, "Release Guard");
  assert.equal(draft.workers[0].role_template_source, "custom");
  assert.equal(draft.workers[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(draft.workers[0].role, "Block release when evidence is missing.");
  assert.deepEqual(draft.workers[0].read_paths, ["src", "task-plans"]);
  assert.deepEqual(draft.workers[0].write_paths, ["task-plans"]);
  assert.equal(draft.dagRun.nodes[0].role_id, "release-guard");
  assert.equal(draft.dagRun.nodes[0].role_name, "Release Guard");
  assert.equal(draft.dagRun.nodes[0].role_template_source, "custom");
});

test("lists built-in role templates with minimal plugin contract metadata", () => {
  const templates = listBuiltInRoleTemplates();
  const implementer = templates.find((template) => template.role_id === "implementer");
  assert.ok(implementer);
  assert.equal(implementer.display_name, "Implementer");
  assert.match(String(implementer.description || ""), /bounded code slice/i);
  assert.equal(implementer.default_model, "gpt-5.3-codex");
  assert.equal(implementer.can_edit_code, true);
  assert.equal(implementer.writes_blackboard, true);
  assert.equal(Array.isArray(implementer.prompt_contract), true);
  assert.equal(implementer.prompt_contract.length > 0, true);
  assert.equal(Array.isArray(implementer.result_envelope), true);
  assert.equal(implementer.result_envelope.length > 0, true);
});

test("keeps stable role template data contract fields across the built-in catalog", () => {
  const catalog = buildBuiltInRolePluginCatalog();
  const stableKeys = [
    "role_id",
    "display_name",
    "description",
    "default_model",
    "can_edit_code",
    "writes_blackboard",
    "default_read_paths",
    "default_write_paths",
    "default_expected_outputs",
    "expected_outputs",
    "result_envelope",
    "prompt_contract",
  ];

  catalog.templates.forEach((template) => {
    stableKeys.forEach((key) => {
      assert.ok(Object.prototype.hasOwnProperty.call(template, key), `${template.role_id} is missing ${key}`);
    });
    assert.equal(Array.isArray(template.default_read_paths), true);
    assert.equal(Array.isArray(template.default_write_paths), true);
    assert.equal(Array.isArray(template.default_expected_outputs), true);
    assert.equal(Array.isArray(template.expected_outputs), true);
    assert.deepEqual(template.expected_outputs, template.default_expected_outputs);
    assert.equal(Array.isArray(template.prompt_contract), true);
    assert.equal(Array.isArray(template.result_envelope), true);
  });
});

test("keeps built-in role plugin catalog metadata/source fields stable across all templates", () => {
  const catalog = buildBuiltInRolePluginCatalog();
  catalog.templates.forEach((template) => {
    assert.equal(template.role_template_source, "builtin");
    assert.equal(template.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
    assert.equal(String(template.role_name || "").trim().length > 0, true);
    assert.equal(String(template.display_name || "").trim().length > 0, true);
    assert.deepEqual(template.summary, template.role_prompt);
  });
});

test("normalizes orchestration workers with built-in role template metadata", () => {
  const draft = normalizeOrchestrationDraft({
    goal: "Plan and implement one bounded host update",
    workers: [
      {
        title: "Planning lane",
        role_id: "planner",
      },
      {
        title: "Host lane",
        role_id: "implementer",
        write_paths: ["src/host"],
      },
    ],
  });

  assert.equal(draft.workers.length, 2);
  assert.equal(draft.workers[0].role_id, "planner");
  assert.equal(draft.workers[0].role_name, "Planner");
  assert.equal(draft.workers[0].role_template_source, "builtin");
  assert.equal(draft.workers[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.match(draft.workers[0].role, /Refine one bounded implementation plan/);
  assert.deepEqual(draft.workers[0].write_paths, ["task-plans"]);
  assert.equal(draft.workers[0].can_edit_code, true);
  assert.equal(draft.workers[0].writes_blackboard, true);
  assert.equal(Array.isArray(draft.workers[0].prompt_contract), true);
  assert.equal(Array.isArray(draft.workers[0].result_envelope), true);
  assert.equal(draft.dagRun.nodes[0].role_id, "planner");
  assert.equal(draft.dagRun.nodes[0].role_name, "Planner");
  assert.equal(draft.dagRun.nodes[0].role_template_source, "builtin");
  assert.equal(draft.dagRun.nodes[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(draft.dagRun.nodes[0].can_edit_code, true);
  assert.equal(draft.dagRun.nodes[0].writes_blackboard, true);
  assert.equal(Array.isArray(draft.dagRun.nodes[0].prompt_contract), true);
  assert.equal(Array.isArray(draft.dagRun.nodes[0].result_envelope), true);
  assert.equal(draft.dagRun.nodes[1].role_id, "implementer");
  assert.deepEqual(draft.dagRun.nodes[1].ownership.write_paths, ["src/host"]);
});

test("propagates built-in role template metadata from orchestration workers into DAG nodes for all built-in roles", () => {
  const roleIds = listBuiltInRoleTemplateIds();
  const roleChunks = [roleIds.slice(0, 8), roleIds.slice(8)];
  roleChunks.forEach((chunkRoleIds, chunkIndex) => {
    const draft = normalizeOrchestrationDraft({
      goal: "Run one metadata propagation lane per built-in role",
      worker_count: chunkRoleIds.length,
      workers: chunkRoleIds.map((roleId, index) => ({
        title: `Role lane ${chunkIndex + 1}-${index + 1}`,
        role_id: roleId,
      })),
    });

    assert.equal(draft.workers.length, chunkRoleIds.length);
    assert.equal(draft.dagRun.nodes.length, chunkRoleIds.length);
    chunkRoleIds.forEach((roleId) => {
      const worker = draft.workers.find((item) => item.role_id === roleId);
      const node = draft.dagRun.nodes.find((item) => item.role_id === roleId);
      assert.ok(worker, `missing worker for ${roleId}`);
      assert.ok(node, `missing node for ${roleId}`);
      assert.equal(worker.role_template_source, "builtin");
      assert.equal(worker.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
      assert.equal(node.role_template_source, "builtin");
      assert.equal(node.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
      assert.equal(String(worker.role_name || "").trim().length > 0, true);
      assert.equal(String(node.role_name || "").trim().length > 0, true);
    });
  });
});

test("lists built-in organization templates for role plugin foundations", () => {
  const templates = listBuiltInRoleOrganizationTemplates();
  assert.equal(Array.isArray(templates), true);
  assert.deepEqual(
    templates.map((template) => template.template_id),
    ["fast-build-team", "careful-build-team", "research-team", "bugfix-team"],
  );
});

test("keeps codex-first model policy across built-in organization templates", () => {
  const templates = listBuiltInRoleOrganizationTemplates();
  templates.forEach((template) => {
    assert.equal(template.supervisor_model, "gpt-5.4", `${template.template_id} supervisor_model drifted`);
    assert.equal(template.worker_model, "gpt-5.3-codex", `${template.template_id} worker_model drifted`);
  });
});

test("keeps built-in organization template worker role ids aligned with the built-in role catalog", () => {
  const roleCatalog = buildBuiltInRolePluginCatalog();
  const builtInRoleIds = new Set(roleCatalog.templates.map((template) => template.role_id));
  const organizationTemplates = listBuiltInRoleOrganizationTemplates();

  organizationTemplates.forEach((template) => {
    assert.equal(Array.isArray(template.workers), true, `${template.template_id} workers must be an array`);
    assert.equal(template.workers.length > 0, true, `${template.template_id} workers must not be empty`);
    template.workers.forEach((worker) => {
      assert.equal(
        builtInRoleIds.has(worker.role_id),
        true,
        `${template.template_id}:${worker.title || worker.role_id} references unknown role_id ${worker.role_id}`,
      );
    });
  });
});

test("returns cloned built-in organization templates so callers cannot mutate catalog state", () => {
  const templates = listBuiltInRoleOrganizationTemplates();
  assert.equal(templates.length > 0, true);
  assert.equal(Array.isArray(templates[0].workers), true);
  assert.equal(templates[0].workers.length > 0, true);

  templates[0].display_name = "Mutated Organization";
  templates[0].workers[0].title = "Mutated Worker Lane";

  const freshTemplates = listBuiltInRoleOrganizationTemplates();
  assert.notEqual(freshTemplates[0].display_name, "Mutated Organization");
  assert.notEqual(freshTemplates[0].workers[0].title, "Mutated Worker Lane");
});

test("builds built-in organization template catalog with stable local contract fields", () => {
  const catalog = buildBuiltInRoleOrganizationTemplateCatalog();
  assert.equal(catalog.schema_version, ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION);
  assert.equal(catalog.source, ROLE_ORGANIZATION_TEMPLATE_CATALOG_SOURCE);
  assert.equal(Array.isArray(catalog.templates), true);
  assert.equal(catalog.templates.length, 4);
  assert.equal(catalog.templates[0].template_id, "fast-build-team");
  assert.equal(catalog.templates[0].organization_template_source, "builtin");
  assert.equal(catalog.templates[0].organization_template_version, ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION);
  assert.equal(Array.isArray(catalog.templates[0].workers), true);
  assert.equal(catalog.templates[0].workers.length >= 3, true);
});

test("normalizes and resolves built-in organization template ids", () => {
  assert.equal(normalizeRoleOrganizationTemplateId(" Fast Build Team "), "fast-build-team");
  const resolvedById = resolveBuiltInRoleOrganizationTemplate("careful-build-team");
  assert.ok(resolvedById);
  assert.equal(resolvedById.display_name, "Careful Build Team");
  const resolvedByAlias = resolveBuiltInRoleOrganizationTemplate("debug");
  assert.ok(resolvedByAlias);
  assert.equal(resolvedByAlias.template_id, "bugfix-team");
});

test("applies built-in organization template workers to orchestration drafts", () => {
  const draft = applyBuiltInRoleOrganizationTemplateToDraft({
    goal: "Ship a bounded bugfix",
    organization_template_id: "bugfix-team",
  });

  assert.equal(draft.organization_template_id, "bugfix-team");
  assert.equal(draft.organization_template_name, "Bugfix Team");
  assert.equal(draft.organization_template_source, "builtin");
  assert.equal(draft.organization_template_version, ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION);
  assert.equal(draft.worker_model, "gpt-5.3-codex");
  assert.equal(draft.workers.length, 4);
  assert.equal(draft.workers[0].role_id, "debugger");
  assert.equal(draft.workers[1].role_id, "implementer");
  assert.equal(draft.workers[2].role_id, "tester");
  assert.equal(draft.workers[3].role_id, "reviewer");
  assert.equal(draft.dagRun.nodes.length, 4);
});

test("keeps explicit orchestration workers when applying organization template", () => {
  const draft = applyBuiltInRoleOrganizationTemplateToDraft({
    goal: "Do one bounded implementation slice",
    organization_template_id: "fast-build-team",
    workers: [{
      title: "Custom lane",
      role_id: "implementer",
      role: "Implement host-only patch.",
      model: "gpt-5.5",
      write_paths: ["src/host"],
      expected_outputs: ["host patch"],
    }],
  });

  assert.equal(draft.organization_template_id, "fast-build-team");
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.workers[0].title, "Custom lane");
  assert.equal(draft.workers[0].role, "Implement host-only patch.");
  assert.equal(draft.workers[0].model, "gpt-5.5");
  assert.deepEqual(draft.workers[0].write_paths, ["src/host"]);
  assert.equal(draft.dagRun.nodes.length, 1);
});

test("does not mutate orchestration draft inputs when applying organization templates", () => {
  const sourceDraft = {
    goal: "Keep one explicit bounded worker lane",
    organization_template_id: "bugfix-team",
    workers: [{
      title: "Explicit lane",
      role_id: "implementer",
      model: "gpt-5.5",
      write_paths: ["src/host"],
      expected_outputs: ["host patch"],
    }],
  };
  const sourceSnapshot = JSON.parse(JSON.stringify(sourceDraft));
  const applied = applyBuiltInRoleOrganizationTemplateToDraft(sourceDraft);

  assert.equal(applied.organization_template_id, "bugfix-team");
  assert.equal(applied.workers.length, 1);
  assert.equal(applied.workers[0].role_id, "implementer");
  assert.deepEqual(sourceDraft, sourceSnapshot);
});

test("applies built-in organization templates idempotently for normalized drafts", () => {
  const firstPass = applyBuiltInRoleOrganizationTemplateToDraft({
    goal: "Ship one bounded bugfix run",
    organization_template_id: "bugfix-team",
  });
  const secondPass = applyBuiltInRoleOrganizationTemplateToDraft(firstPass);

  assert.equal(secondPass.organization_template_id, firstPass.organization_template_id);
  assert.equal(secondPass.organization_template_name, firstPass.organization_template_name);
  assert.equal(secondPass.organization_template_source, firstPass.organization_template_source);
  assert.equal(secondPass.organization_template_version, firstPass.organization_template_version);
  assert.deepEqual(secondPass.workers, firstPass.workers);
  assert.deepEqual(secondPass.dagRun.nodes, firstPass.dagRun.nodes);
});

test("resolves workspace-local custom role templates for explicit workers in organization template drafts", (t) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "cma-org-template-custom-role-"));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));

  const rolesDir = path.join(workspace, ".codex-team", "roles");
  fs.mkdirSync(rolesDir, { recursive: true });
  fs.writeFileSync(path.join(rolesDir, "release-guard.json"), `${JSON.stringify({
    role_id: "release_guard",
    display_name: "Release Guard",
    description: "Block release when evidence is missing.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    default_read_paths: ["src", "task-plans"],
    default_write_paths: ["task-plans"],
    default_expected_outputs: ["release gate decision"],
    prompt_contract: ["Require green checks before release."],
  }, null, 2)}\n`, "utf8");

  const draft = applyBuiltInRoleOrganizationTemplateToDraft({
    goal: "Run release gate checks before merge",
    organization_template_id: "fast-build-team",
    workers: [{
      title: "Release gate lane",
      role_id: "release_guard",
    }],
  }, {
    workspacePath: workspace,
  });

  assert.equal(draft.organization_template_id, "fast-build-team");
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.workers[0].role_id, "release-guard");
  assert.equal(draft.workers[0].role_name, "Release Guard");
  assert.equal(draft.workers[0].role_template_source, "custom");
  assert.equal(draft.workers[0].role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
  assert.equal(draft.workers[0].role, "Block release when evidence is missing.");
  assert.deepEqual(draft.workers[0].read_paths, ["src", "task-plans"]);
  assert.deepEqual(draft.workers[0].write_paths, ["task-plans"]);
  assert.equal(draft.dagRun.nodes.length, 1);
  assert.equal(draft.dagRun.nodes[0].role_id, "release-guard");
  assert.equal(draft.dagRun.nodes[0].role_template_source, "custom");
});

test("resolves organization template aliases and keeps codex-first worker model precedence", () => {
  const aliasTemplateDraft = applyBuiltInRoleOrganizationTemplateToDraft({
    goal: "Run a bounded bugfix lane set",
    organization_template_name: "debug",
    worker_model: "gpt-5.5",
  });

  assert.equal(aliasTemplateDraft.organization_template_id, "bugfix-team");
  assert.equal(aliasTemplateDraft.organization_template_name, "Bugfix Team");
  assert.deepEqual(
    aliasTemplateDraft.workers.map((worker) => worker.model),
    ["gpt-5.3-codex", "gpt-5.3-codex", "gpt-5.3-codex", "gpt-5.3-codex"],
  );

  const explicitWorkerDraft = applyBuiltInRoleOrganizationTemplateToDraft({
    goal: "Run one explicit bugfix override",
    organization_template_name: "debug",
    workers: [
      {
        title: "Debug lane",
        role_id: "debugger",
      },
      {
        title: "Fix lane",
        role_id: "implementer",
        model: "gpt-5.5",
      },
    ],
  });

  assert.equal(explicitWorkerDraft.organization_template_id, "bugfix-team");
  assert.deepEqual(
    explicitWorkerDraft.workers.map((worker) => worker.model),
    ["gpt-5.3-codex", "gpt-5.5"],
  );
});

test("generates an editable orchestration draft from a natural language goal", () => {
  const draft = generateOrchestrationDraft({
    goal: "Build the Team UI orchestration panel",
    workerCount: 3,
  });

  assert.equal(draft.supervisor.model, "gpt-5.4");
  assert.equal(draft.worker_model, "gpt-5.3-codex");
  assert.equal(draft.workers.length, 3);
  assert.equal(draft.dagRun.nodes.length, 3);
  assert.deepEqual(draft.scheduleExplanation.selected_node_ids, draft.workers.map((worker) => worker.node_id));
});

test("generates orchestration draft supervisor from nested supervisor input", () => {
  const draft = generateOrchestrationDraft({
    goal: "Coordinate one bounded role template update",
    workerCount: 1,
    supervisor: {
      model: "gpt-5.5",
      instructions: "Own planning and review only.",
    },
  });

  assert.equal(draft.supervisor.model, "gpt-5.5");
  assert.equal(draft.supervisor.instructions, "Own planning and review only.");
  assert.equal(draft.supervisor.role_id, "supervisor");
  assert.equal(draft.supervisor.role_template_source, "builtin");
  assert.equal(draft.supervisor.role_template_version, ROLE_PLUGIN_SCHEMA_VERSION);
});

test("converts edited orchestration workers into DAG node ownership", () => {
  const dagRun = draftToDagRun({
    goal: "Split host and UI work",
    workers: [
      {
        node_id: "host-worker",
        role: "Host implementation",
        model: "gpt-5.3-codex",
        write_paths: "src/host/team-coordination.js",
        expected_outputs: "host tests",
      },
      {
        node_id: "ui-worker",
        role: "UI implementation",
        model: "gpt-5.3-codex",
        write_paths: ["src/webview-template.js"],
        expected_outputs: ["render tests"],
      },
    ],
  });

  assert.equal(dagRun.nodes[0].node_id, "host-worker");
  assert.deepEqual(dagRun.nodes[0].ownership.write_paths, ["src/host/team-coordination.js"]);
  assert.deepEqual(dagRun.nodes[1].ownership.expected_outputs, ["render tests"]);
});

test("preserves provided DAG nodes when normalizing orchestration draft", () => {
  const draft = normalizeOrchestrationDraft({
    goal: "Compile bounded worker prompts from DAG nodes",
    workerCount: 3,
    dagRun: {
      run_id: "dag-preserve",
      status: "ready",
      blackboard: [
        { entry_id: "bb-global", visibility: "dag", kind: "decision", summary: "Keep worker prompts bounded." },
      ],
      nodes: [
        {
          node_id: "contract",
          title: "Contract",
          status: DAG_NODE_STATES.COMPLETED,
          model: "gpt-5.3-codex",
          role: "Contract worker",
          ownership: {
            write_paths: ["task-plans"],
          },
        },
        {
          node_id: "host",
          title: "Host compiler",
          status: DAG_NODE_STATES.READY,
          model: "gpt-5.3-codex",
          role: "Worker prompt compiler",
          depends_on: ["contract"],
          ownership: {
            read_paths: ["src/host/moa-core.js"],
            write_paths: ["src/host/moa-core.js"],
            exclusive_paths: ["src/host/moa-core.test.js"],
            expected_outputs: ["worker prompt compiler + tests"],
          },
        },
      ],
    },
  });

  assert.equal(draft.dagRun.run_id, "dag-preserve");
  assert.equal(draft.dagRun.status, "ready");
  assert.equal(draft.dagRun.nodes.length, 2);
  assert.equal(draft.dagRun.nodes[1].node_id, "host");
  assert.deepEqual(draft.dagRun.nodes[1].depends_on, ["contract"]);
  assert.deepEqual(draft.dagRun.nodes[1].ownership.exclusive_paths, ["src/host/moa-core.test.js"]);
  assert.equal(draft.workers.length, 2);
  assert.equal(draft.workers[1].node_id, "host");
  assert.equal(draft.workers[1].role, "Worker prompt compiler");
  assert.deepEqual(draft.workers[1].write_paths, ["src/host/moa-core.js"]);
  assert.deepEqual(draft.scheduleExplanation.selected_node_ids, ["host"]);
});
