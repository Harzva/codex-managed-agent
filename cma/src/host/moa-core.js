const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  WORKER_PROVIDER_CODEX,
  WORKER_PROVIDER_GEMINI,
  GEMINI_CLI_MODEL_PRIORITY,
  DEFAULT_GEMINI_CLI_MODEL,
  ROLE_PLUGIN_SCHEMA_VERSION,
  ROLE_PLUGIN_CATALOG_SOURCE,
  ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION,
  ROLE_ORGANIZATION_TEMPLATE_CATALOG_SOURCE,
  DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
  listBuiltInRoleTemplateIds,
  listBuiltInRoleTemplates,
  buildBuiltInRolePluginCatalog,
  normalizeRolePluginTemplate,
  listLocalRolePluginTemplates,
  buildRolePluginCatalog,
  listBuiltInRoleOrganizationTemplates,
  buildBuiltInRoleOrganizationTemplateCatalog,
  resolveBuiltInRoleOrganizationTemplate,
  resolveBuiltInRoleTemplate,
  resolveRoleTemplate,
  normalizeRoleTemplateId,
  assertUniqueRoleTemplateTokens,
  normalizeWorkerProvider,
  normalizeRoleOrganizationTemplateId,
  normalizeRoleTemplateBinding,
  applyRoleTemplateToSupervisorDraft,
  applyRoleTemplateToWorkerDraft,
  applyRoleTemplateToOrchestrationWorkerDraft,
  applyBuiltInRoleTemplateToSupervisorDraft,
  applyBuiltInRoleTemplateToWorkerDraft,
  applyBuiltInRoleTemplateToOrchestrationWorkerDraft,
  splitLines,
  readOptionalBooleanField,
  resolveRoleTemplateOptions,
} = require("./moa-role-templates");
const { defaultWorkerForIndex } = require("./moa-default-workers");

const DAG_NODE_STATES = Object.freeze({
  PENDING: "pending",
  READY: "ready",
  RUNNING: "running",
  BLOCKED: "blocked",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
});

const TERMINAL_DAG_NODE_STATES = new Set([
  DAG_NODE_STATES.COMPLETED,
  DAG_NODE_STATES.FAILED,
  DAG_NODE_STATES.SKIPPED,
]);

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function normalizeWorkspacePath(value) {
  return String(value || "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
}

function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

function safeName(value, fallback = "dag-run") {
  const text = String(value || "").trim();
  const next = text.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  return next || fallback;
}

function makeDagRunId(seed = "") {
  const label = safeName(seed, "dag").slice(0, 32);
  const digest = crypto.randomBytes(4).toString("hex");
  return `dag-${label}-${Date.now()}-${digest}`;
}

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function appendJsonLine(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

function copyFileIfExists(sourcePath, targetPath) {
  if (!sourcePath || !targetPath) return false;
  if (!fs.existsSync(sourcePath)) return false;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function normalizeOwnedPath(value) {
  const text = normalizeWorkspacePath(value);
  if (!text) return "";
  const normalized = path.posix.normalize(text);
  if (normalized === ".") return "";
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

function normalizeRuntimePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (path.win32.isAbsolute(raw) || path.isAbsolute(raw)) {
    return path.normalize(raw).replace(/[\\/]$/, "");
  }
  const text = normalizeWorkspacePath(raw);
  if (!text) return "";
  const normalized = path.posix.normalize(text);
  if (normalized === ".") return "";
  return normalized.replace(/\/+$/, "");
}

function normalizeOwnership(ownership = {}) {
  return {
    read_paths: normalizeList(ownership.read_paths).map(normalizeOwnedPath).filter(Boolean),
    write_paths: normalizeList(ownership.write_paths).map(normalizeOwnedPath).filter(Boolean),
    exclusive_paths: normalizeList(ownership.exclusive_paths).map(normalizeOwnedPath).filter(Boolean),
    expected_outputs: normalizeList(ownership.expected_outputs).map(normalizeOwnedPath).filter(Boolean),
  };
}

function normalizeDagNode(node = {}, index = 0) {
  const nodeId = String(node.node_id || node.id || `node-${index + 1}`).trim();
  const dependsOn = normalizeList(node.depends_on || node.dependencies);
  const status = String(node.status || DAG_NODE_STATES.PENDING).trim() || DAG_NODE_STATES.PENDING;
  const model = String(node.model || node.worker_model || node.workerModel || "").trim();
  return {
    ...node,
    node_id: nodeId,
    title: String(node.title || nodeId).trim(),
    status,
    depends_on: dependsOn,
    owner: String(node.owner || node.worker || "").trim(),
    worker_thread_id: String(node.worker_thread_id || node.thread_id || "").trim(),
    provider: normalizeWorkerProvider(node.provider || node.worker_provider || node.workerProvider, model),
    model,
    role_id: String(node.role_id || node.roleId || "").trim(),
    role_name: String(node.role_name || node.roleName || "").trim(),
    role_template_source: String(node.role_template_source || node.roleTemplateSource || "").trim(),
    role_template_version: Number.parseInt(node.role_template_version || node.roleTemplateVersion || 0, 10) || 0,
    ownership: normalizeOwnership(node.ownership || node),
  };
}

function normalizeDagRun(dagRun = {}) {
  const nodes = Array.isArray(dagRun.nodes) ? dagRun.nodes.map(normalizeDagNode) : [];
  return {
    ...dagRun,
    run_id: String(dagRun.run_id || dagRun.dag_run_id || "").trim(),
    status: String(dagRun.status || "draft").trim(),
    blackboard: Array.isArray(dagRun.blackboard) ? dagRun.blackboard : [],
    nodes,
  };
}

function applyBuiltInRoleOrganizationTemplateToDraft(draft = {}, options = {}) {
  const source = draft && typeof draft === "object" ? draft : {};
  const templateValue = String(
    options.template_id
    || options.templateId
    || source.organization_template_id
    || source.organizationTemplateId
    || source.organization_template_name
    || source.organizationTemplateName
    || "",
  ).trim();
  const template = resolveBuiltInRoleOrganizationTemplate(templateValue);
  if (!template) return normalizeOrchestrationDraft(source, options);

  const roleTemplateOptions = resolveRoleTemplateOptions(options, source);

  const hasExplicitWorkers = Array.isArray(source.workers) && source.workers.length > 0;
  const workers = hasExplicitWorkers
    ? source.workers.slice()
    : template.workers.map((worker, index) => applyRoleTemplateToWorkerDraft({
      node_id: worker.node_id || `node-${index + 1}`,
      title: worker.title || `Worker ${index + 1}`,
      ...worker,
      role_id: worker.role_id,
      model: worker.model || template.worker_model || "",
    }, roleTemplateOptions));

  const normalized = normalizeOrchestrationDraft({
    ...source,
    workerCount: source.workerCount || source.worker_count || workers.length,
    worker_model: source.worker_model || source.workerModel || template.worker_model || "",
    supervisor_model: source.supervisor_model || source.supervisorModel || template.supervisor_model || "",
    workers,
  }, options);

  return {
    ...normalized,
    organization_template_id: template.template_id,
    organization_template_name: template.display_name,
    organization_template_source: "builtin",
    organization_template_version: ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION,
  };
}

function dagNodeToDraftWorker(node = {}, index = 0, defaults = {}) {
  const normalizedNode = normalizeDagNode(node, index);
  const ownership = normalizeOwnership(normalizedNode.ownership || normalizedNode);
  const resolvedRole = resolveNodeRole(normalizedNode);
  return {
    node_id: normalizedNode.node_id,
    title: normalizedNode.title,
    account_profile_id: String(normalizedNode.account_profile_id || "").trim(),
    role_id: String(normalizedNode.role_id || "").trim(),
    role_name: String(normalizedNode.role_name || "").trim(),
    role_template_source: String(normalizedNode.role_template_source || "").trim(),
    role_template_version: Number.parseInt(normalizedNode.role_template_version, 10) || 0,
    role: resolvedRole || defaultWorkerForIndex(index, defaults.goal || "").role,
    provider: normalizeWorkerProvider(normalizedNode.provider, normalizedNode.model || defaults.workerModel || "gpt-5.3-codex"),
    model: String(normalizedNode.model || defaults.workerModel || "gpt-5.3-codex").trim(),
    read_paths: ownership.read_paths.slice(),
    write_paths: ownership.write_paths.slice(),
    exclusive_paths: ownership.exclusive_paths.slice(),
    expected_outputs: ownership.expected_outputs.slice(),
    prompt_contract: splitLines(normalizedNode.prompt_contract || normalizedNode.promptContract),
    result_envelope: splitLines(normalizedNode.result_envelope || normalizedNode.resultEnvelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
    writes_blackboard: readOptionalBooleanField(normalizedNode, "writes_blackboard", "writesBlackboard") ?? true,
    can_edit_code: readOptionalBooleanField(normalizedNode, "can_edit_code", "canEditCode") ?? false,
  };
}

function normalizeDraftWorker(worker = {}, index = 0, defaults = {}, options = {}) {
  const preset = defaultWorkerForIndex(index, defaults.goal || "");
  const explicitRole = String(worker.role || worker.instructions || "").trim();
  const roleTemplateOptions = resolveRoleTemplateOptions(options, defaults, worker);
  const templated = applyRoleTemplateToOrchestrationWorkerDraft({
    ...preset,
    ...worker,
    role: explicitRole,
  }, {
    ...roleTemplateOptions,
    defaultWorkerModel: defaults.workerModel || "gpt-5.3-codex",
  });
  const title = String(templated.title || templated.name || preset.title || `Worker ${index + 1}`).trim();
  const nodeId = safeName(templated.node_id || templated.id || title.toLowerCase(), `node-${index + 1}`);
  const accountProfileId = String(worker.account_profile_id || worker.accountProfileId || "").trim();
  return {
    node_id: nodeId,
    title,
    account_profile_id: accountProfileId,
    role_id: String(templated.role_id || "").trim(),
    role_name: String(templated.role_name || "").trim(),
    role_template_source: String(templated.role_template_source || "").trim(),
    role_template_version: Number.parseInt(templated.role_template_version, 10) || 0,
    role: String(templated.role || preset.role || "").trim(),
    provider: normalizeWorkerProvider(templated.provider || templated.worker_provider || templated.workerProvider, templated.model || defaults.workerModel || "gpt-5.3-codex"),
    model: String(templated.model || defaults.workerModel || "gpt-5.3-codex").trim(),
    read_paths: splitLines(templated.read_paths || templated.readPaths),
    write_paths: splitLines(templated.write_paths || templated.writePaths || preset.write_paths),
    exclusive_paths: splitLines(templated.exclusive_paths || templated.exclusivePaths),
    expected_outputs: splitLines(templated.expected_outputs || templated.expectedOutputs || preset.expected_outputs),
    prompt_contract: splitLines(templated.prompt_contract || templated.promptContract),
    result_envelope: splitLines(templated.result_envelope || templated.resultEnvelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
    writes_blackboard: readOptionalBooleanField(templated, "writes_blackboard", "writesBlackboard") ?? true,
    can_edit_code: readOptionalBooleanField(templated, "can_edit_code", "canEditCode") ?? false,
  };
}

function draftToDagRun(draft = {}, options = {}) {
  const goal = String(draft.goal || draft.prompt || "").trim();
  const workers = Array.isArray(draft.workers) ? draft.workers : [];
  return normalizeDagRun({
    run_id: draft.run_id || draft.dag_run_id || "",
    team_space_id: draft.team_space_id || "",
    supervisor_thread_id: draft.supervisor_thread_id || "",
    status: draft.status || "draft",
    blackboard: Array.isArray(draft.blackboard) ? draft.blackboard : [],
    nodes: workers.map((worker, index) => {
      const normalized = normalizeDraftWorker(worker, index, {
        goal,
        workerModel: draft.worker_model || draft.workerModel || "gpt-5.3-codex",
      }, options);
      return {
        node_id: normalized.node_id,
        title: normalized.title,
        account_profile_id: String(normalized.account_profile_id || "").trim(),
        status: DAG_NODE_STATES.PENDING,
        depends_on: [],
        owner: normalized.node_id,
        provider: normalized.provider,
        model: normalized.model,
        role_id: normalized.role_id || "",
        role_name: normalized.role_name || "",
        role_template_source: normalized.role_template_source || "",
        role_template_version: Number.parseInt(normalized.role_template_version, 10) || 0,
        role: normalized.role,
        prompt_contract: splitLines(normalized.prompt_contract || normalized.promptContract),
        result_envelope: splitLines(normalized.result_envelope || normalized.resultEnvelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
        writes_blackboard: readOptionalBooleanField(normalized, "writes_blackboard", "writesBlackboard") ?? true,
        can_edit_code: readOptionalBooleanField(normalized, "can_edit_code", "canEditCode") ?? false,
        ownership: {
          read_paths: normalized.read_paths,
          write_paths: normalized.write_paths,
          exclusive_paths: normalized.exclusive_paths,
          expected_outputs: normalized.expected_outputs,
        },
      };
    }),
  });
}

function generateOrchestrationDraft(input = {}, options = {}) {
  const goal = String(input.goal || input.prompt || "").trim();
  const workerCount = Math.max(1, Math.min(8, Number.parseInt(input.workerCount || input.worker_count || 3, 10) || 3));
  const defaultSupervisorInstructions = [
    "Analyze the user goal, maintain the DAG plan, assign bounded worker nodes, review results, and update the blackboard.",
    "Do not implement worker code directly unless the plan explicitly collapses to one node.",
  ].join("\n");
  const explicitSupervisorModel = String(input.supervisorModel || input.supervisor_model || "").trim();
  const explicitSupervisorInstructions = String(input.supervisorInstructions || input.supervisor_instructions || "").trim();
  const supervisorOverrides = {};
  if (explicitSupervisorModel) supervisorOverrides.model = explicitSupervisorModel;
  if (explicitSupervisorInstructions) supervisorOverrides.instructions = explicitSupervisorInstructions;
  const supervisor = applyRoleTemplateToSupervisorDraft({
    ...(input.supervisor && typeof input.supervisor === "object" ? input.supervisor : {}),
    ...supervisorOverrides,
  }, {
    defaultInstructions: defaultSupervisorInstructions,
    workspacePath: input.workspacePath || input.workspace_path || "",
  });
  const workerModel = String(input.workerModel || input.worker_model || "gpt-5.3-codex").trim();
  const roleTemplateOptions = resolveRoleTemplateOptions(options, input);
  const workers = Array.isArray(input.workers) && input.workers.length
    ? input.workers.slice(0, workerCount)
    : Array.from({ length: workerCount }, (_, index) => defaultWorkerForIndex(index, goal));
  const draft = {
    goal,
    title: String(input.title || (goal ? goal.split(/\r?\n/)[0].slice(0, 72) : "Planned Team Run")).trim(),
    supervisor,
    worker_model: workerModel,
    workers: workers.map((worker, index) => normalizeDraftWorker(worker, index, {
      goal,
      workerModel,
      ...roleTemplateOptions,
    }, roleTemplateOptions)),
    blackboard: Array.isArray(input.blackboard) ? input.blackboard : [],
  };
  const dagRun = draftToDagRun(draft, roleTemplateOptions);
  const scheduleExplanation = explainDagSchedule(dagRun, { maxParallel: workerCount });
  return {
    ...draft,
    dagRun,
    scheduleExplanation,
  };
}

function normalizeOrchestrationDraft(input = {}, options = {}) {
  const roleTemplateOptions = resolveRoleTemplateOptions(options, input);
  const generated = generateOrchestrationDraft(input, roleTemplateOptions);
  const priorDagRun = input.dagRun || input.dag_run || {};
  const hasPriorNodes = Array.isArray(priorDagRun.nodes) && priorDagRun.nodes.length > 0;
  const dagRun = hasPriorNodes
    ? normalizeDagRun({
      ...priorDagRun,
      run_id: priorDagRun.run_id || priorDagRun.dag_run_id || generated.dagRun.run_id || "",
      team_space_id: priorDagRun.team_space_id || generated.dagRun.team_space_id || "",
      supervisor_thread_id: priorDagRun.supervisor_thread_id || generated.dagRun.supervisor_thread_id || "",
      status: priorDagRun.status || generated.dagRun.status || "draft",
      blackboard: Array.isArray(priorDagRun.blackboard) ? priorDagRun.blackboard : generated.blackboard || [],
    })
    : normalizeDagRun({
      ...draftToDagRun({
        ...generated,
        run_id: priorDagRun.run_id || priorDagRun.dag_run_id || generated.dagRun.run_id || "",
        team_space_id: priorDagRun.team_space_id || generated.dagRun.team_space_id || "",
        supervisor_thread_id: priorDagRun.supervisor_thread_id || generated.dagRun.supervisor_thread_id || "",
      }, roleTemplateOptions),
      status: priorDagRun.status || generated.dagRun.status || "draft",
      blackboard: priorDagRun.blackboard || generated.blackboard || [],
    });
  const workers = hasPriorNodes
    ? dagRun.nodes.map((node, index) => dagNodeToDraftWorker(node, index, {
      goal: generated.goal,
      workerModel: generated.worker_model,
    }))
    : generated.workers;
  const scheduleExplanation = input.scheduleExplanation || input.schedule_explanation || explainDagSchedule(dagRun, {
    maxParallel: workers.length || 1,
  });
  return {
    ...generated,
    workers,
    dagRun,
    scheduleExplanation,
  };
}

function dependencyState(nodes) {
  const byId = new Map(nodes.map((node) => [node.node_id, node]));
  return nodes.map((node) => {
    const missing = [];
    const incomplete = [];
    node.depends_on.forEach((depId) => {
      const dep = byId.get(depId);
      if (!dep) {
        missing.push(depId);
      } else if (dep.status !== DAG_NODE_STATES.COMPLETED) {
        incomplete.push(depId);
      }
    });
    return {
      node_id: node.node_id,
      missing,
      incomplete,
      ready: missing.length === 0 && incomplete.length === 0,
    };
  });
}

function findReadyNodes(dagRun = {}) {
  const normalized = normalizeDagRun(dagRun);
  const states = new Map(dependencyState(normalized.nodes).map((item) => [item.node_id, item]));
  return normalized.nodes.filter((node) => {
    if (node.status !== DAG_NODE_STATES.PENDING && node.status !== DAG_NODE_STATES.READY) return false;
    return states.get(node.node_id)?.ready === true;
  });
}

function pathsOverlap(left, right) {
  const a = normalizeOwnedPath(left);
  const b = normalizeOwnedPath(right);
  if (!a || !b) return false;
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function nodeWriteSet(node) {
  const ownership = normalizeOwnership(node.ownership || node);
  return [...ownership.write_paths, ...ownership.exclusive_paths];
}

function nodeExclusiveSet(node) {
  const ownership = normalizeOwnership(node.ownership || node);
  return ownership.exclusive_paths;
}

function conflictBetweenNodes(left, right) {
  const leftWrites = nodeWriteSet(left);
  const rightWrites = nodeWriteSet(right);
  const leftExclusive = nodeExclusiveSet(left);
  const rightExclusive = nodeExclusiveSet(right);

  for (const leftPath of leftWrites) {
    for (const rightPath of rightWrites) {
      if (pathsOverlap(leftPath, rightPath)) {
        return {
          left_node_id: left.node_id,
          right_node_id: right.node_id,
          path: leftPath,
          other_path: rightPath,
          kind: "write_conflict",
        };
      }
    }
  }
  for (const leftPath of leftExclusive) {
    for (const rightPath of normalizeOwnership(right.ownership || right).read_paths) {
      if (pathsOverlap(leftPath, rightPath)) {
        return {
          left_node_id: left.node_id,
          right_node_id: right.node_id,
          path: leftPath,
          other_path: rightPath,
          kind: "exclusive_read_conflict",
        };
      }
    }
  }
  for (const rightPath of rightExclusive) {
    for (const leftPath of normalizeOwnership(left.ownership || left).read_paths) {
      if (pathsOverlap(rightPath, leftPath)) {
        return {
          left_node_id: left.node_id,
          right_node_id: right.node_id,
          path: leftPath,
          other_path: rightPath,
          kind: "exclusive_read_conflict",
        };
      }
    }
  }
  return null;
}

function detectOwnershipConflicts(nodes = []) {
  const normalized = nodes.map(normalizeDagNode);
  const conflicts = [];
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const conflict = conflictBetweenNodes(normalized[i], normalized[j]);
      if (conflict) conflicts.push(conflict);
    }
  }
  return conflicts;
}

function selectSchedulableNodes(dagRun = {}, options = {}) {
  const maxParallel = Number.isInteger(options.maxParallel) && options.maxParallel > 0
    ? options.maxParallel
    : Number.POSITIVE_INFINITY;
  const runningNodes = normalizeDagRun(dagRun).nodes.filter((node) => node.status === DAG_NODE_STATES.RUNNING);
  const selected = [];
  const blocked = [];

  for (const node of findReadyNodes(dagRun)) {
    if (selected.length >= maxParallel) {
      blocked.push({ node, reason: "parallel_limit" });
      continue;
    }
    const conflicts = detectOwnershipConflicts([...runningNodes, ...selected, node]);
    const newConflict = conflicts.find((conflict) => (
      conflict.left_node_id === node.node_id || conflict.right_node_id === node.node_id
    ));
    if (newConflict) {
      blocked.push({ node, reason: "ownership_conflict", conflict: newConflict });
      continue;
    }
    selected.push(node);
  }

  return { selected, blocked };
}

function dagRunPathsForWorkspace(workspacePath, runId) {
  const workspace = path.resolve(String(workspacePath || "."));
  const safeRunId = safeName(runId || "", "");
  const dagRunsDir = path.join(workspace, ".codex-team", "dag-runs");
  const runDir = safeRunId ? path.join(dagRunsDir, safeRunId) : "";
  return {
    workspace,
    dagRunsDir,
    runDir,
    runJson: runDir ? path.join(runDir, "dag-run.json") : "",
    traceJsonl: runDir ? path.join(runDir, "trace.jsonl") : "",
    traceIndexJson: runDir ? path.join(runDir, "trace.index.json") : "",
    blackboardJsonl: runDir ? path.join(runDir, "blackboard.jsonl") : "",
  };
}

function createDagRunRecord(input = {}) {
  const now = toIso();
  const runId = String(input.run_id || makeDagRunId(input.team_space_id || input.title || "team")).trim();
  const normalized = normalizeDagRun({
    ...input,
    run_id: runId,
    status: input.status || "draft",
    created_at: input.created_at || now,
    updated_at: input.updated_at || now,
  });
  return {
    ...normalized,
    created_at: normalized.created_at || now,
    updated_at: now,
    schema_version: normalized.schema_version || 1,
  };
}

function writeDagRun(workspacePath, dagRun = {}) {
  const record = createDagRunRecord(dagRun);
  const paths = dagRunPathsForWorkspace(workspacePath, record.run_id);
  const withTrace = {
    ...record,
    trace: {
      ...(record.trace || {}),
      trace_path: normalizeWorkspacePath(path.relative(paths.workspace, paths.traceJsonl)),
      index_path: normalizeWorkspacePath(path.relative(paths.workspace, paths.traceIndexJson)),
    },
  };
  writeJson(paths.runJson, withTrace);
  if (!fs.existsSync(paths.traceJsonl)) {
    fs.mkdirSync(path.dirname(paths.traceJsonl), { recursive: true });
    fs.writeFileSync(paths.traceJsonl, "", "utf8");
  }
  if (!fs.existsSync(paths.blackboardJsonl)) {
    fs.mkdirSync(path.dirname(paths.blackboardJsonl), { recursive: true });
    fs.writeFileSync(paths.blackboardJsonl, "", "utf8");
  }
  return { dagRun: withTrace, paths };
}

function readDagRun(workspacePath, runId) {
  const paths = dagRunPathsForWorkspace(workspacePath, runId);
  return normalizeDagRun(readJson(paths.runJson, {}));
}

function explainDagSchedule(dagRun = {}, options = {}) {
  const normalized = normalizeDagRun(dagRun);
  const dependency = dependencyState(normalized.nodes);
  const selection = selectSchedulableNodes(normalized, options);
  const selectedIds = new Set(selection.selected.map((node) => node.node_id));
  const blockedBySelection = new Map(selection.blocked.map((item) => [item.node.node_id, item]));
  const dependencyByNode = new Map(dependency.map((item) => [item.node_id, item]));
  const node_explanations = normalized.nodes.map((node) => {
    if (selectedIds.has(node.node_id)) {
      return {
        node_id: node.node_id,
        decision: "selected",
        reason: "dependencies_complete_and_ownership_available",
      };
    }
    const blocked = blockedBySelection.get(node.node_id);
    if (blocked) {
      return {
        node_id: node.node_id,
        decision: "blocked",
        reason: blocked.reason,
        conflict: blocked.conflict || null,
      };
    }
    const dep = dependencyByNode.get(node.node_id);
    if (dep && (!dep.ready || dep.missing.length || dep.incomplete.length)) {
      return {
        node_id: node.node_id,
        decision: "waiting",
        reason: dep.missing.length ? "missing_dependencies" : "incomplete_dependencies",
        missing: dep.missing,
        incomplete: dep.incomplete,
      };
    }
    return {
      node_id: node.node_id,
      decision: TERMINAL_DAG_NODE_STATES.has(node.status) ? "done" : "not_selected",
      reason: `status_${node.status || DAG_NODE_STATES.PENDING}`,
    };
  });
  return {
    run_id: normalized.run_id,
    selected_node_ids: selection.selected.map((node) => node.node_id),
    blocked_node_ids: selection.blocked.map((item) => item.node.node_id),
    node_explanations,
  };
}

function compactJson(value) {
  return JSON.stringify(value, null, 2);
}

function resolveWorkerPromptModel(input = {}, node = {}) {
  const requested = String(input.workerModel || input.worker_model || node.model || "").trim();
  const provider = normalizeWorkerProvider(input.provider || input.worker_provider || input.workerProvider || node.provider, requested);
  if (provider === WORKER_PROVIDER_GEMINI) {
    const nodeModel = String(node.model || "").trim();
    const nodeGeminiModel = nodeModel.toLowerCase().startsWith("gemini") ? nodeModel : "";
    const requestedGeminiModel = requested.toLowerCase().startsWith("gemini") ? requested : "";
    return {
      provider,
      requested,
      resolved: nodeGeminiModel || requestedGeminiModel || DEFAULT_GEMINI_CLI_MODEL,
      wasOverridden: false,
    };
  }
  const bounded = "gpt-5.3-codex";
  return {
    provider,
    requested,
    resolved: bounded,
    wasOverridden: Boolean(requested) && requested !== bounded,
  };
}

function summarizeNodeForPrompt(node) {
  const normalized = normalizeDagNode(node);
  return {
    node_id: normalized.node_id,
    title: normalized.title,
    status: normalized.status,
    depends_on: normalized.depends_on,
    owner: normalized.owner,
    worker_thread_id: normalized.worker_thread_id,
    ownership: normalized.ownership,
    result: normalized.result || null,
  };
}

function collectDependencyClosure(nodes, nodeId) {
  const byId = new Map(nodes.map((node) => [node.node_id, normalizeDagNode(node)]));
  const visited = new Set();
  const ordered = [];
  function visit(id) {
    if (!id || visited.has(id)) return;
    visited.add(id);
    const node = byId.get(id);
    if (!node) return;
    node.depends_on.forEach((depId) => visit(depId));
    ordered.push(id);
  }
  visit(nodeId);
  return ordered;
}

function collectMissingDependencyIds(nodes, node) {
  if (!node || !Array.isArray(node.depends_on) || node.depends_on.length === 0) return [];
  const byId = new Map(nodes.map((item) => [item.node_id, normalizeDagNode(item)]));
  const visited = new Set();
  const queue = [...node.depends_on];
  const missing = [];
  while (queue.length > 0) {
    const currentId = String(queue.shift() || "").trim();
    if (!currentId || visited.has(currentId)) continue;
    visited.add(currentId);
    const currentNode = byId.get(currentId);
    if (!currentNode) {
      missing.push(currentId);
      continue;
    }
    currentNode.depends_on.forEach((depId) => queue.push(depId));
  }
  return missing;
}

function summarizeBlackboardForPrompt(entry = {}, index = 0) {
  return {
    entry_id: String(entry.entry_id || `bb-${index + 1}`).trim(),
    source_node_id: String(entry.source_node_id || "").trim(),
    kind: String(entry.kind || "").trim(),
    visibility: String(entry.visibility || "").trim(),
    summary: String(entry.summary || "").trim(),
    payload: entry.payload && typeof entry.payload === "object" ? entry.payload : {},
    created_at: String(entry.created_at || "").trim(),
  };
}

function resolveNodeRole(node = {}) {
  const role = String(node.role || "").trim();
  if (role) return role;
  const roleName = String(node.role_name || "").trim();
  if (roleName) return roleName;
  const roleId = String(node.role_id || "").trim();
  if (roleId) return `Role ID: ${roleId}`;
  return "";
}

function selectUpstreamBlackboardContext(node, dagRun, options = {}) {
  const maxEntries = Number.isInteger(options.maxBlackboardEntries) && options.maxBlackboardEntries > 0
    ? options.maxBlackboardEntries
    : 12;
  const allEntries = Array.isArray(options.blackboard)
    ? options.blackboard
    : Array.isArray(dagRun.blackboard)
      ? dagRun.blackboard
      : [];
  const nodes = Array.isArray(options.nodes)
    ? options.nodes.map(normalizeDagNode)
    : Array.isArray(dagRun.nodes)
      ? dagRun.nodes.map(normalizeDagNode)
      : [];
  const nodesById = new Map(nodes.map((item) => [item.node_id, item]));
  const upstreamNodeIds = collectDependencyClosure(nodes, node.node_id);
  const upstreamSet = new Set(
    upstreamNodeIds.filter((id) => (
      id !== node.node_id && nodesById.get(id)?.status === DAG_NODE_STATES.COMPLETED
    )),
  );
  const filtered = allEntries
    .map((entry, index) => summarizeBlackboardForPrompt(entry, index))
    .filter((entry) => {
      if (entry.source_node_id && upstreamSet.has(entry.source_node_id)) return true;
      if (!entry.source_node_id && (entry.visibility === "dag" || entry.visibility === "review")) return true;
      return false;
    });
  if (filtered.length <= maxEntries) return filtered;
  return filtered.slice(filtered.length - maxEntries);
}

function resolvePromptListLimit(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0) return parsed;
  return fallback;
}

function compileWorkerPrompt(input = {}) {
  const dagRun = normalizeDagRun(input.dagRun || input.dag_run || {});
  const task = input.task && typeof input.task === "object" ? input.task : {};
  const requestedNodeId = String(input.node_id || (input.node && input.node.node_id) || "").trim();
  const explicitNodeInput = input.node && typeof input.node === "object" ? input.node : null;
  const explicitNode = explicitNodeInput ? normalizeDagNode(explicitNodeInput) : null;
  const dagNodeById = new Map((dagRun.nodes || []).map((item) => [String(item.node_id || "").trim(), normalizeDagNode(item)]));
  const dagNodeForRequestedId = dagNodeById.get(requestedNodeId) || null;
  let node = null;
  if (explicitNode) {
    const dagNodeForExplicit = dagNodeById.get(explicitNode.node_id) || null;
    if (dagNodeForExplicit) {
      const explicitHasDependsOn = Array.isArray(explicitNodeInput.depends_on) || Array.isArray(explicitNodeInput.dependencies);
      const explicitHasOwnership = Boolean(explicitNodeInput.ownership && typeof explicitNodeInput.ownership === "object");
      node = normalizeDagNode({
        ...dagNodeForExplicit,
        ...explicitNodeInput,
        node_id: explicitNode.node_id,
        depends_on: explicitHasDependsOn
          ? (explicitNodeInput.depends_on || explicitNodeInput.dependencies || [])
          : dagNodeForExplicit.depends_on,
        ownership: explicitHasOwnership
          ? explicitNodeInput.ownership
          : dagNodeForExplicit.ownership || dagNodeForExplicit,
      });
    } else {
      node = explicitNode;
    }
  } else {
    node = dagNodeForRequestedId;
  }
  if (!node) {
    throw new Error("compileWorkerPrompt requires a DAG node via input.node or input.node_id");
  }
  const nodes = (dagRun.nodes || []).map(normalizeDagNode);
  const nodesByIdFromDag = new Map(nodes.map((item) => [item.node_id, item]));
  const nodesForContext = nodesByIdFromDag.has(node.node_id) ? nodes : [...nodes, node];
  const dependencyClosure = collectDependencyClosure(nodesForContext, node.node_id);
  const nodesById = new Map(nodesForContext.map((item) => [item.node_id, item]));
  const upstreamNodeIds = dependencyClosure.filter((id) => (
    id !== node.node_id && nodesById.get(id)?.status === DAG_NODE_STATES.COMPLETED
  ));
  const upstreamNodes = upstreamNodeIds
    .map((id) => nodesById.get(id))
    .filter(Boolean)
    .map(summarizeNodeForPrompt);
  const unresolvedUpstreamNodes = dependencyClosure
    .filter((id) => id !== node.node_id)
    .map((id) => nodesById.get(id))
    .filter((item) => item && item.status !== DAG_NODE_STATES.COMPLETED)
    .map((item) => ({
      node_id: item.node_id,
      status: item.status,
      title: item.title,
      owner: item.owner,
    }));
  const missingDependencyIds = collectMissingDependencyIds(nodesForContext, node);
  const unresolvedDependencies = unresolvedUpstreamNodes.concat(
    missingDependencyIds.map((id) => ({
      node_id: id,
      status: "missing",
      title: "",
      owner: "",
    })),
  );
  const maxUpstreamNodes = resolvePromptListLimit(input.maxUpstreamNodes || input.max_upstream_nodes, 12);
  const maxUnresolvedDependencies = resolvePromptListLimit(
    input.maxUnresolvedDependencies || input.max_unresolved_dependencies,
    12,
  );
  const boundedUpstreamNodes = upstreamNodes.slice(-maxUpstreamNodes);
  const boundedUnresolvedDependencies = unresolvedDependencies.slice(-maxUnresolvedDependencies);
  const blackboardContext = selectUpstreamBlackboardContext(node, dagRun, {
    ...input,
    nodes: nodesForContext,
  });
  const workerModel = resolveWorkerPromptModel(input, node);
  const workspace = String(input.workspace || task.workspace || "").trim();
  const role = resolveNodeRole(node);
  const resolvedRole = role || "No explicit role provided.";
  const ownership = normalizeOwnership(node.ownership || {});
  const allowedWrites = [...ownership.write_paths, ...ownership.exclusive_paths]
    .filter((value, index, list) => list.indexOf(value) === index);
  const noWritableTargets = allowedWrites.length === 0;

  return [
    "You are a CMA MoA Worker Node.",
    "",
    "Execution provider:",
    workerModel.provider,
    "",
    "Execution model:",
    workerModel.resolved,
    ...(workerModel.wasOverridden
      ? [`(Requested model "${workerModel.requested}" was overridden by this phase policy.)`, ""]
      : [""]),
    "",
    "Mission:",
    "- Implement only this DAG node as a bounded local iteration.",
    "- Respect ownership boundaries and dependency context.",
    "- Report evidence with a strict result envelope.",
    ...(workerModel.provider === WORKER_PROVIDER_GEMINI
      ? [
        "- You are running as an auxiliary Gemini CLI worker. Prefer review, reflection, and patch proposals that reduce Codex token load.",
        "- Do not directly modify workspace files in this first provider-adapter phase; report proposed edits and findings in the result envelope.",
      ]
      : []),
    "",
    "Team Space task context:",
    compactJson({
      task_id: task.task_id || task.id || "",
      title: task.title || "",
      goal: task.goal || task.prompt || "",
      acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || [],
      workspace,
    }),
    "",
    "DAG node assignment:",
    compactJson({
      run_id: dagRun.run_id || "",
      node_id: node.node_id,
      title: node.title,
      role: resolvedRole,
      status: node.status,
      owner: node.owner,
      depends_on: node.depends_on,
      ownership,
      expected_outputs: ownership.expected_outputs || [],
    }),
    "",
    "Role and ownership boundaries:",
    compactJson({
      role: resolvedRole,
      read_paths: ownership.read_paths,
      write_paths: ownership.write_paths,
      exclusive_paths: ownership.exclusive_paths,
      expected_outputs: ownership.expected_outputs,
      allowed_write_targets: allowedWrites,
    }),
    "",
    "Upstream dependency context (only completed dependencies should be treated as settled):",
    compactJson(boundedUpstreamNodes),
    "",
    "Unresolved upstream dependencies (do not assume these are settled):",
    compactJson(boundedUnresolvedDependencies),
    "",
    "Relevant upstream blackboard context:",
    compactJson(blackboardContext),
    "",
    "Concurrent worker rules:",
    "- Other workers may be active at the same time.",
    "- You are not alone in this codebase; do not revert edits made by other workers.",
    "- Treat unresolved upstream dependencies as unsettled; do not rely on partial outputs.",
    "- Edit only files under allowed_write_targets (write_paths + exclusive_paths).",
    ...(noWritableTargets
      ? ["- This node currently has no allowed_write_targets. Do not edit files; request supervisor handoff for ownership assignment."]
      : []),
    "- You may read from read_paths plus included upstream context only.",
    "- Do not revert unrelated changes in the workspace.",
    "- If required changes exceed ownership boundaries, stop and request supervisor handoff.",
    "",
    "Required worker result envelope (respond with parseable JSON):",
    "- Output JSON only. Do not wrap in markdown fences.",
    compactJson({
      run_id: dagRun.run_id || "",
      node_id: node.node_id,
      summary: "",
      changed_files: [],
      checks_run: [],
      open_risks: [],
      blackboard_updates: [{
        kind: "decision|finding|artifact|risk|handoff",
        visibility: "dag|node|review",
        summary: "",
        payload: {},
      }],
      next_request: "",
    }),
  ].join("\n");
}

function normalizeWorkerResultEnvelope(result = {}) {
  const source = result && typeof result === "object" ? result : {};
  return {
    summary: String(source.summary || "").trim(),
    changed_files: normalizeList(source.changed_files).map(normalizeOwnedPath).filter(Boolean),
    checks_run: normalizeList(source.checks_run),
    open_risks: normalizeList(source.open_risks),
    blackboard_updates: Array.isArray(source.blackboard_updates)
      ? source.blackboard_updates
        .map((item) => (item && typeof item === "object" ? item : null))
        .filter(Boolean)
        .map((item) => ({
          kind: String(item.kind || "finding").trim() || "finding",
          visibility: String(item.visibility || "dag").trim() || "dag",
          summary: String(item.summary || "").trim(),
          payload: item.payload && typeof item.payload === "object" ? item.payload : {},
          source_node_id: String(item.source_node_id || "").trim(),
        }))
        .filter((item) => item.summary)
      : [],
    next_request: String(source.next_request || "").trim(),
  };
}

function parseWorkerResultEnvelope(input = {}) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    return normalizeWorkerResultEnvelope(input);
  }
  const raw = String(input || "").trim();
  if (!raw) {
    throw new Error("parseWorkerResultEnvelope requires a non-empty JSON object string or object input");
  }
  if (raw.startsWith("```")) {
    throw new Error("parseWorkerResultEnvelope rejected markdown-fenced content; expected raw JSON only");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`parseWorkerResultEnvelope could not parse JSON: ${error.message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("parseWorkerResultEnvelope expected a JSON object envelope");
  }
  return normalizeWorkerResultEnvelope(parsed);
}

function isPathWithinTarget(candidatePath, targetPath) {
  const candidate = normalizeOwnedPath(candidatePath);
  const target = normalizeOwnedPath(targetPath);
  if (!candidate || !target) return false;
  return candidate === target || candidate.startsWith(`${target}/`);
}

function validateWorkerChangedFiles(node = {}, changedFiles = []) {
  const ownership = normalizeOwnership(node.ownership || node);
  const allowedWriteTargets = [...ownership.write_paths, ...ownership.exclusive_paths]
    .map(normalizeOwnedPath)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  const normalizedChangedFiles = normalizeList(changedFiles)
    .map(normalizeOwnedPath)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  const invalidChangedFiles = normalizedChangedFiles.filter((candidate) => (
    !allowedWriteTargets.some((target) => isPathWithinTarget(candidate, target))
  ));
  return {
    allowed_write_targets: allowedWriteTargets,
    changed_files: normalizedChangedFiles,
    invalid_changed_files: invalidChangedFiles,
    is_valid: invalidChangedFiles.length === 0,
  };
}

function applyWorkerResultEnvelope(dagRun = {}, input = {}) {
  const normalizedDag = normalizeDagRun(dagRun);
  const nodeId = String(input.node_id || "").trim();
  if (!nodeId) {
    throw new Error("applyWorkerResultEnvelope requires input.node_id");
  }
  const nodeIndex = normalizedDag.nodes.findIndex((node) => node.node_id === nodeId);
  if (nodeIndex < 0) {
    throw new Error(`applyWorkerResultEnvelope could not find node: ${nodeId}`);
  }
  const envelopeInput = Object.prototype.hasOwnProperty.call(input, "result")
    ? input.result
    : Object.prototype.hasOwnProperty.call(input, "envelope")
      ? input.envelope
      : {};
  const envelope = parseWorkerResultEnvelope(envelopeInput);
  const nodeStatus = String(input.node_status || "").trim();
  const now = toIso();
  const updatedNodes = normalizedDag.nodes.slice();
  const priorNode = normalizeDagNode(updatedNodes[nodeIndex], nodeIndex);
  const changedFilesValidation = validateWorkerChangedFiles(priorNode, envelope.changed_files);
  if (!changedFilesValidation.is_valid) {
    throw new Error([
      `applyWorkerResultEnvelope rejected changed_files outside ownership for node: ${nodeId}`,
      `invalid_changed_files=${JSON.stringify(changedFilesValidation.invalid_changed_files)}`,
      `allowed_write_targets=${JSON.stringify(changedFilesValidation.allowed_write_targets)}`,
    ].join(" "));
  }
  updatedNodes[nodeIndex] = {
    ...priorNode,
    status: nodeStatus || priorNode.status,
    result: {
      summary: envelope.summary,
      changed_files: changedFilesValidation.changed_files,
      checks_run: envelope.checks_run,
      open_risks: envelope.open_risks,
      next_request: envelope.next_request,
    },
  };

  const appendedBlackboardEntries = envelope.blackboard_updates.map((update, index) => ({
    entry_id: `bb-${safeName(nodeId, "node")}-${Date.now()}-${index + 1}-${crypto.randomBytes(2).toString("hex")}`,
    source_node_id: update.source_node_id || nodeId,
    kind: update.kind,
    visibility: update.visibility,
    summary: update.summary,
    payload: update.payload,
    created_at: now,
  }));

  const nextDagRun = normalizeDagRun({
    ...normalizedDag,
    updated_at: now,
    nodes: updatedNodes,
    blackboard: [...(Array.isArray(normalizedDag.blackboard) ? normalizedDag.blackboard : []), ...appendedBlackboardEntries],
  });

  return {
    dagRun: nextDagRun,
    node: nextDagRun.nodes[nodeIndex],
    envelope,
    appendedBlackboardEntries,
  };
}

function applyWorkerLaunchMetadata(dagRun = {}, input = {}) {
  const normalizedDag = normalizeDagRun(dagRun);
  const nodeId = String(input.node_id || "").trim();
  if (!nodeId) {
    throw new Error("applyWorkerLaunchMetadata requires input.node_id");
  }
  const nodeIndex = normalizedDag.nodes.findIndex((node) => node.node_id === nodeId);
  if (nodeIndex < 0) {
    throw new Error(`applyWorkerLaunchMetadata could not find node: ${nodeId}`);
  }

  const now = toIso();
  const priorNode = normalizeDagNode(normalizedDag.nodes[nodeIndex], nodeIndex);
  const priorRuntime = priorNode.worker_runtime && typeof priorNode.worker_runtime === "object"
    ? priorNode.worker_runtime
    : {};
  const startedAt = String(input.started_at || "").trim() || now;
  const threadId = String(
    input.worker_thread_id
    || input.thread_id
    || input.workerThreadId
    || "",
  ).trim();
  const launchAttempts = Number.isFinite(Number(priorRuntime.launch_attempts))
    ? Number(priorRuntime.launch_attempts) + 1
    : 1;
  const runtime = {
    ...priorRuntime,
    provider: normalizeWorkerProvider(input.provider || input.worker_provider || input.workerProvider || priorRuntime.provider, input.model || input.worker_model || input.workerModel || priorRuntime.model),
    thread_id: threadId,
    pid: String(input.pid || input.process_id || "").trim(),
    log_path: normalizeRuntimePath(input.log_path || input.logPath || ""),
    model: String(input.model || input.worker_model || input.workerModel || "").trim(),
    account_profile_id: String(
      input.account_profile_id
      || input.accountProfileId
      || priorRuntime.account_profile_id
      || "",
    ).trim(),
    account_auth_source_path: normalizeRuntimePath(
      input.account_auth_source_path
      || input.accountAuthSourcePath
      || priorRuntime.account_auth_source_path
      || "",
    ),
    account_token_health: String(
      input.account_token_health
      || input.accountTokenHealth
      || priorRuntime.account_token_health
      || "unknown",
    ).trim() || "unknown",
    started_at: startedAt,
    trace_path: normalizeRuntimePath(input.trace_path || input.tracePath || ""),
    session_binding: {
      ...(priorRuntime.session_binding && typeof priorRuntime.session_binding === "object"
        ? priorRuntime.session_binding
        : {}),
      run_id: String(input.run_id || input.runId || normalizedDag.run_id || "").trim(),
      node_id: nodeId,
      worker_thread_id: threadId,
      account_profile_id: String(
        input.account_profile_id
        || input.accountProfileId
        || priorRuntime.account_profile_id
        || "",
      ).trim(),
      provider: normalizeWorkerProvider(input.provider || input.worker_provider || input.workerProvider || priorRuntime.provider, input.model || input.worker_model || input.workerModel || priorRuntime.model),
      started_at: startedAt,
    },
    launch_attempts: launchAttempts,
    last_launch_status: "started",
    last_launch_started_at: startedAt,
    last_launch_error: "",
    last_launch_failed_at: "",
    result_ingest_status: "",
    result_ingest_failed_at: "",
    result_ingest_error: "",
  };
  if (threadId) {
    const conflictingNode = normalizedDag.nodes
      .map((node, index) => normalizeDagNode(node, index))
      .find((node) => (
        node.node_id !== nodeId
        && node.status === DAG_NODE_STATES.RUNNING
        && String(node.worker_thread_id || node.worker_runtime?.thread_id || "").trim() === threadId
      ));
    if (conflictingNode) {
      throw new Error(
        `applyWorkerLaunchMetadata rejected duplicate active worker_thread_id: ${threadId} already assigned to node ${conflictingNode.node_id}`,
      );
    }
  }

  const updatedNodes = normalizedDag.nodes.slice();
  updatedNodes[nodeIndex] = {
    ...priorNode,
    status: DAG_NODE_STATES.RUNNING,
    worker_thread_id: threadId || priorNode.worker_thread_id || "",
    worker_runtime: runtime,
  };

  const nextDagRun = normalizeDagRun({
    ...normalizedDag,
    updated_at: now,
    nodes: updatedNodes,
  });

  return {
    dagRun: nextDagRun,
    node: nextDagRun.nodes[nodeIndex],
    worker_runtime: runtime,
  };
}

function applyWorkerLaunchFailureMetadata(dagRun = {}, input = {}) {
  const normalizedDag = normalizeDagRun(dagRun);
  const nodeId = String(input.node_id || "").trim();
  if (!nodeId) {
    throw new Error("applyWorkerLaunchFailureMetadata requires input.node_id");
  }
  const nodeIndex = normalizedDag.nodes.findIndex((node) => node.node_id === nodeId);
  if (nodeIndex < 0) {
    throw new Error(`applyWorkerLaunchFailureMetadata could not find node: ${nodeId}`);
  }

  const now = String(input.failed_at || "").trim() || toIso();
  const priorNode = normalizeDagNode(normalizedDag.nodes[nodeIndex], nodeIndex);
  const priorRuntime = priorNode.worker_runtime && typeof priorNode.worker_runtime === "object"
    ? priorNode.worker_runtime
    : {};
  const launchAttempts = Number.isFinite(Number(priorRuntime.launch_attempts))
    ? Number(priorRuntime.launch_attempts) + 1
    : 1;
  const runtime = {
    ...priorRuntime,
    model: String(input.model || input.worker_model || input.workerModel || priorRuntime.model || "").trim(),
    last_launch_status: "failed",
    last_launch_failed_at: now,
    last_launch_error: String(input.error || "worker launch failed").trim(),
    launch_attempts: launchAttempts,
  };
  const updatedNodes = normalizedDag.nodes.slice();
  updatedNodes[nodeIndex] = {
    ...priorNode,
    status: DAG_NODE_STATES.READY,
    worker_runtime: runtime,
  };

  const nextDagRun = normalizeDagRun({
    ...normalizedDag,
    updated_at: toIso(),
    nodes: updatedNodes,
  });
  return {
    dagRun: nextDagRun,
    node: nextDagRun.nodes[nodeIndex],
    worker_runtime: runtime,
  };
}

function applyWorkerResultIngestFailureMetadata(dagRun = {}, input = {}) {
  const normalizedDag = normalizeDagRun(dagRun);
  const nodeId = String(input.node_id || "").trim();
  if (!nodeId) {
    throw new Error("applyWorkerResultIngestFailureMetadata requires input.node_id");
  }
  const nodeIndex = normalizedDag.nodes.findIndex((node) => node.node_id === nodeId);
  if (nodeIndex < 0) {
    throw new Error(`applyWorkerResultIngestFailureMetadata could not find node: ${nodeId}`);
  }

  const now = String(input.failed_at || "").trim() || toIso();
  const errorDetail = String(input.error || "worker result envelope ingest failed").trim();
  const priorNode = normalizeDagNode(normalizedDag.nodes[nodeIndex], nodeIndex);
  const priorRuntime = priorNode.worker_runtime && typeof priorNode.worker_runtime === "object"
    ? priorNode.worker_runtime
    : {};
  const runtime = {
    ...priorRuntime,
    result_ingest_status: "failed",
    result_ingest_failed_at: now,
    result_ingest_error: errorDetail,
  };
  const updatedNodes = normalizedDag.nodes.slice();
  updatedNodes[nodeIndex] = {
    ...priorNode,
    status: DAG_NODE_STATES.FAILED,
    worker_runtime: runtime,
    result: {
      summary: String(priorNode.result && priorNode.result.summary || "").trim()
        || "Worker result envelope ingest failed.",
      changed_files: Array.isArray(priorNode.result && priorNode.result.changed_files)
        ? priorNode.result.changed_files
        : [],
      checks_run: Array.isArray(priorNode.result && priorNode.result.checks_run)
        ? priorNode.result.checks_run
        : [],
      open_risks: Array.from(new Set(
        [
          ...(Array.isArray(priorNode.result && priorNode.result.open_risks) ? priorNode.result.open_risks : []),
          `Worker result envelope ingest failed: ${errorDetail}`,
        ].filter(Boolean),
      )),
      next_request: String(priorNode.result && priorNode.result.next_request || "").trim(),
    },
  };

  const nextDagRun = normalizeDagRun({
    ...normalizedDag,
    updated_at: toIso(),
    nodes: updatedNodes,
  });

  return {
    dagRun: nextDagRun,
    node: nextDagRun.nodes[nodeIndex],
    worker_runtime: runtime,
  };
}

function persistWorkerPromptSnapshot(workspacePath, input = {}) {
  const dagRun = normalizeDagRun(input.dagRun || input.dag_run || {});
  const requestedNodeId = String(input.node_id || (input.node && input.node.node_id) || "").trim();
  const explicitNode = input.node && typeof input.node === "object" ? normalizeDagNode(input.node) : null;
  const node = explicitNode || dagRun.nodes.find((item) => item.node_id === requestedNodeId) || null;
  if (!node) {
    throw new Error("persistWorkerPromptSnapshot requires a DAG node via input.node or input.node_id");
  }
  const prompt = String(input.prompt || "").trim() || compileWorkerPrompt({
    ...input,
    dagRun,
    node_id: node.node_id,
    node,
  });
  const persisted = writeDagRun(workspacePath, dagRun);
  const now = toIso();
  const runId = persisted.dagRun.run_id;
  const workerModel = resolveWorkerPromptModel(input, node);
  const traceEvent = {
    event_id: `trace-${safeName(node.node_id || "node", "node")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    event_type: "worker_prompt_compiled",
    run_id: runId,
    node_id: node.node_id,
    node_status: node.status || DAG_NODE_STATES.PENDING,
    provider: workerModel.provider,
    model: workerModel.resolved,
    prompt_sha256: crypto.createHash("sha256").update(prompt).digest("hex"),
    prompt_bytes: Buffer.byteLength(prompt, "utf8"),
    created_at: now,
  };

  appendJsonLine(persisted.paths.traceJsonl, traceEvent);
  const priorIndex = readJson(persisted.paths.traceIndexJson, {});
  const eventCount = Number.isInteger(priorIndex.event_count) ? priorIndex.event_count + 1 : 1;
  const byType = priorIndex.events_by_type && typeof priorIndex.events_by_type === "object"
    ? { ...priorIndex.events_by_type }
    : {};
  byType[traceEvent.event_type] = Number(byType[traceEvent.event_type] || 0) + 1;
  writeJson(persisted.paths.traceIndexJson, {
    run_id: runId,
    event_count: eventCount,
    events_by_type: byType,
    updated_at: now,
    last_event_at: traceEvent.created_at,
    last_event_id: traceEvent.event_id,
  });

  return {
    dagRun: persisted.dagRun,
    paths: persisted.paths,
    prompt,
    traceEvent,
  };
}

function persistWorkerLaunchMetadata(workspacePath, dagRun = {}, input = {}) {
  const applied = applyWorkerLaunchMetadata(dagRun, input);
  const persisted = writeDagRun(workspacePath, applied.dagRun);
  const now = toIso();
  const runId = persisted.dagRun.run_id;
  const nodeId = String(input.node_id || "").trim();
  const traceEvent = {
    event_id: `trace-${safeName(nodeId || "node", "node")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    event_type: "worker_launch_metadata",
    run_id: runId,
    node_id: nodeId,
    node_status: applied.node.status,
    worker_thread_id: applied.node.worker_thread_id || "",
    worker_runtime: applied.worker_runtime,
    created_at: now,
  };

  appendJsonLine(persisted.paths.traceJsonl, traceEvent);
  const priorIndex = readJson(persisted.paths.traceIndexJson, {});
  const eventCount = Number.isInteger(priorIndex.event_count) ? priorIndex.event_count + 1 : 1;
  const byType = priorIndex.events_by_type && typeof priorIndex.events_by_type === "object"
    ? { ...priorIndex.events_by_type }
    : {};
  byType[traceEvent.event_type] = Number(byType[traceEvent.event_type] || 0) + 1;
  writeJson(persisted.paths.traceIndexJson, {
    run_id: runId,
    event_count: eventCount,
    events_by_type: byType,
    updated_at: now,
    last_event_at: traceEvent.created_at,
    last_event_id: traceEvent.event_id,
  });

  return {
    ...applied,
    dagRun: persisted.dagRun,
    paths: persisted.paths,
    traceEvent,
  };
}

function persistWorkerResultEnvelope(workspacePath, dagRun = {}, input = {}) {
  const applied = applyWorkerResultEnvelope(dagRun, input);
  const persisted = writeDagRun(workspacePath, applied.dagRun);
  const now = toIso();
  const runId = persisted.dagRun.run_id;
  const nodeId = String(input.node_id || "").trim();
  const traceEvent = {
    event_id: `trace-${safeName(nodeId || "node", "node")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    event_type: "worker_result_envelope",
    run_id: runId,
    node_id: nodeId,
    node_status: applied.node.status,
    summary: applied.envelope.summary,
    changed_files: applied.envelope.changed_files,
    checks_run: applied.envelope.checks_run,
    open_risks: applied.envelope.open_risks,
    next_request: applied.envelope.next_request,
    blackboard_entry_ids: applied.appendedBlackboardEntries.map((entry) => entry.entry_id),
    created_at: now,
  };

  appendJsonLine(persisted.paths.traceJsonl, traceEvent);
  applied.appendedBlackboardEntries.forEach((entry) => {
    appendJsonLine(persisted.paths.blackboardJsonl, {
      ...entry,
      run_id: runId,
    });
  });

  const priorIndex = readJson(persisted.paths.traceIndexJson, {});
  const eventCount = Number.isInteger(priorIndex.event_count) ? priorIndex.event_count + 1 : 1;
  const byType = priorIndex.events_by_type && typeof priorIndex.events_by_type === "object"
    ? { ...priorIndex.events_by_type }
    : {};
  byType[traceEvent.event_type] = Number(byType[traceEvent.event_type] || 0) + 1;
  writeJson(persisted.paths.traceIndexJson, {
    run_id: runId,
    event_count: eventCount,
    events_by_type: byType,
    updated_at: now,
    last_event_at: traceEvent.created_at,
    last_event_id: traceEvent.event_id,
  });

  return {
    ...applied,
    dagRun: persisted.dagRun,
    paths: persisted.paths,
    traceEvent,
  };
}

function persistWorkerResultIngestFailureMetadata(workspacePath, dagRun = {}, input = {}) {
  const applied = applyWorkerResultIngestFailureMetadata(dagRun, input);
  const persisted = writeDagRun(workspacePath, applied.dagRun);
  const now = toIso();
  const runId = persisted.dagRun.run_id;
  const nodeId = String(input.node_id || "").trim();
  const errorDetail = String(input.error || "worker result envelope ingest failed").trim();
  const traceEvent = {
    event_id: `trace-${safeName(nodeId || "node", "node")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    event_type: "worker_result_ingest_failed",
    run_id: runId,
    node_id: nodeId,
    node_status: applied.node.status,
    error: errorDetail,
    created_at: now,
  };

  appendJsonLine(persisted.paths.traceJsonl, traceEvent);
  const priorIndex = readJson(persisted.paths.traceIndexJson, {});
  const eventCount = Number.isInteger(priorIndex.event_count) ? priorIndex.event_count + 1 : 1;
  const byType = priorIndex.events_by_type && typeof priorIndex.events_by_type === "object"
    ? { ...priorIndex.events_by_type }
    : {};
  byType[traceEvent.event_type] = Number(byType[traceEvent.event_type] || 0) + 1;
  writeJson(persisted.paths.traceIndexJson, {
    run_id: runId,
    event_count: eventCount,
    events_by_type: byType,
    updated_at: now,
    last_event_at: traceEvent.created_at,
    last_event_id: traceEvent.event_id,
  });

  return {
    ...applied,
    dagRun: persisted.dagRun,
    paths: persisted.paths,
    traceEvent,
  };
}

function archiveDagRunEvidence(workspacePath, input = {}) {
  const requestedRunId = String(
    input.run_id
    || input.runId
    || (input.dagRun && input.dagRun.run_id)
    || "",
  ).trim();
  const loadedDagRun = input.dagRun && typeof input.dagRun === "object"
    ? normalizeDagRun(input.dagRun)
    : readDagRun(workspacePath, requestedRunId);
  if (!loadedDagRun.run_id) {
    throw new Error("archiveDagRunEvidence requires a DAG run via input.dagRun or input.run_id");
  }
  const paths = dagRunPathsForWorkspace(workspacePath, loadedDagRun.run_id);
  if (!paths.runDir || !fs.existsSync(paths.runDir)) {
    throw new Error(`archiveDagRunEvidence could not find DAG run directory: ${loadedDagRun.run_id}`);
  }
  const now = toIso();
  const archiveRoot = path.join(paths.workspace, ".codex-team", "dag-runs-archive");
  const archiveId = `${safeName(loadedDagRun.run_id, "dag-run")}-${Date.now()}`;
  const archiveDir = path.join(archiveRoot, archiveId);
  fs.mkdirSync(archiveDir, { recursive: true });

  const files = [
    { source: paths.runJson, name: "dag-run.json" },
    { source: paths.traceJsonl, name: "trace.jsonl" },
    { source: paths.traceIndexJson, name: "trace.index.json" },
    { source: paths.blackboardJsonl, name: "blackboard.jsonl" },
  ];
  const copiedFiles = files
    .filter(({ source, name }) => copyFileIfExists(source, path.join(archiveDir, name)))
    .map(({ name }) => name);
  const archivePath = normalizeWorkspacePath(path.relative(paths.workspace, archiveDir));
  const reason = String(input.reason || "").trim();
  const traceEvent = {
    event_id: `trace-archive-${safeName(loadedDagRun.run_id, "dag-run")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
    event_type: "dag_run_archived",
    run_id: loadedDagRun.run_id,
    archive_path: archivePath,
    copied_files: copiedFiles,
    reason: reason || undefined,
    created_at: now,
  };
  appendJsonLine(paths.traceJsonl, traceEvent);

  const priorIndex = readJson(paths.traceIndexJson, {});
  const eventCount = Number.isInteger(priorIndex.event_count) ? priorIndex.event_count + 1 : 1;
  const byType = priorIndex.events_by_type && typeof priorIndex.events_by_type === "object"
    ? { ...priorIndex.events_by_type }
    : {};
  byType[traceEvent.event_type] = Number(byType[traceEvent.event_type] || 0) + 1;
  writeJson(paths.traceIndexJson, {
    run_id: loadedDagRun.run_id,
    event_count: eventCount,
    events_by_type: byType,
    updated_at: now,
    last_event_at: traceEvent.created_at,
    last_event_id: traceEvent.event_id,
  });

  const manifestPath = path.join(archiveDir, "archive-manifest.json");
  writeJson(manifestPath, {
    run_id: loadedDagRun.run_id,
    archived_at: now,
    archived_path: archivePath,
    copied_files: copiedFiles,
    reason,
    trace_event_id: traceEvent.event_id,
  });

  return {
    run_id: loadedDagRun.run_id,
    archive_path: archivePath,
    archive_dir: archiveDir,
    manifest_path: manifestPath,
    copied_files: copiedFiles,
    traceEvent,
  };
}

function launchSchedulableWorkerBatch(workspacePath, dagRun = {}, options = {}) {
  const launchWorker = options.launchWorker;
  if (typeof launchWorker !== "function") {
    throw new Error("launchSchedulableWorkerBatch requires options.launchWorker");
  }
  const normalizedDagRun = normalizeDagRun(dagRun);
  const maxParallel = Number.isInteger(options.maxParallel) && options.maxParallel > 0
    ? options.maxParallel
    : undefined;
  const selection = selectSchedulableNodes(normalizedDagRun, { maxParallel });
  const blocked = selection.blocked.map((item) => ({
    node_id: item.node.node_id,
    reason: item.reason,
    conflict: item.conflict || null,
  }));
  const requestedWorkerModel = String(options.worker_model || options.workerModel || "").trim();
  const launched = [];
  let nextDagRun = normalizedDagRun;

  for (const selectedNode of selection.selected) {
    const node = normalizeDagNode(selectedNode);
    const workerModelInfo = resolveWorkerPromptModel({ worker_model: requestedWorkerModel }, node);
    const workerModel = workerModelInfo.resolved;
    const workerProvider = workerModelInfo.provider;
    const promptSnapshot = persistWorkerPromptSnapshot(workspacePath, {
      ...options,
      dagRun: nextDagRun,
      node_id: node.node_id,
      provider: workerProvider,
      worker_model: workerModel,
    });
    nextDagRun = promptSnapshot.dagRun;

    try {
      const launch = launchWorker({
        workspace: String(workspacePath || "").trim(),
        run_id: nextDagRun.run_id,
        node,
        account_profile_id: String(
          (node && node.account_profile_id)
          || (node && node.accountProfileId)
          || "",
        ).trim(),
        provider: workerProvider,
        model: workerModel,
        prompt: promptSnapshot.prompt,
      }) || {};
      const workerThreadId = String(
        launch.worker_thread_id
        || launch.thread_id
        || `worker-${safeName(node.node_id, "node")}-${Date.now()}`,
      ).trim();
      const persisted = persistWorkerLaunchMetadata(workspacePath, nextDagRun, {
        node_id: node.node_id,
        run_id: nextDagRun.run_id,
        worker_thread_id: workerThreadId,
        pid: launch.pid || launch.process_id || "",
        log_path: launch.log_path || launch.logPath || "",
        provider: launch.provider || workerProvider,
        account_profile_id: launch.account_profile_id || launch.accountProfileId || "",
        account_auth_source_path: launch.account_auth_source_path || launch.accountAuthSourcePath || "",
        account_token_health: launch.account_token_health || launch.accountTokenHealth || "",
        model: workerModel,
        started_at: launch.started_at || launch.startedAt || toIso(),
        trace_path: launch.trace_path || launch.tracePath || nextDagRun.trace?.trace_path || "",
        session_binding: launch.session_binding || launch.sessionBinding || null,
      });
      nextDagRun = persisted.dagRun;
      launched.push({
        node_id: node.node_id,
        worker_thread_id: persisted.node.worker_thread_id || workerThreadId,
        provider: persisted.worker_runtime.provider || workerProvider,
        model: workerModel,
        pid: persisted.worker_runtime.pid || "",
        log_path: persisted.worker_runtime.log_path || "",
        trace_path: persisted.worker_runtime.trace_path || "",
        account_profile_id: persisted.worker_runtime.account_profile_id || "",
        account_auth_source_path: persisted.worker_runtime.account_auth_source_path || "",
        account_token_health: persisted.worker_runtime.account_token_health || "",
        session_binding: persisted.worker_runtime.session_binding || null,
        started_at: persisted.worker_runtime.started_at || "",
      });
    } catch (error) {
      const now = toIso();
      const detail = error instanceof Error ? error.message : String(error || "worker launch failed");
      const preflightKind = error && typeof error === "object" && typeof error.kind === "string"
        ? String(error.kind).trim()
        : "";
      const blockedReason = preflightKind || "launch_failed";
      const failed = applyWorkerLaunchFailureMetadata(nextDagRun, {
        node_id: node.node_id,
        provider: workerProvider,
        model: workerModel,
        error: detail,
        failed_at: now,
      });
      const persistedFailure = writeDagRun(workspacePath, failed.dagRun);
      nextDagRun = persistedFailure.dagRun;
      const traceEvent = {
        event_id: `trace-${safeName(node.node_id || "node", "node")}-${Date.now()}-${crypto.randomBytes(2).toString("hex")}`,
        event_type: "worker_launch_failed",
        run_id: nextDagRun.run_id,
        node_id: node.node_id,
        node_status: node.status || DAG_NODE_STATES.PENDING,
        provider: workerProvider,
        model: workerModel,
        error: detail,
        preflight_kind: blockedReason,
        created_at: now,
      };
      appendJsonLine(promptSnapshot.paths.traceJsonl, traceEvent);
      const priorIndex = readJson(promptSnapshot.paths.traceIndexJson, {});
      const eventCount = Number.isInteger(priorIndex.event_count) ? priorIndex.event_count + 1 : 1;
      const byType = priorIndex.events_by_type && typeof priorIndex.events_by_type === "object"
        ? { ...priorIndex.events_by_type }
        : {};
      byType[traceEvent.event_type] = Number(byType[traceEvent.event_type] || 0) + 1;
      writeJson(promptSnapshot.paths.traceIndexJson, {
        run_id: nextDagRun.run_id,
        event_count: eventCount,
        events_by_type: byType,
        updated_at: now,
        last_event_at: traceEvent.created_at,
        last_event_id: traceEvent.event_id,
      });
      blocked.push({
        node_id: node.node_id,
        reason: blockedReason,
        error: detail,
      });
    }
  }

  return {
    dagRun: nextDagRun,
    launched,
    blocked,
    selected_node_ids: launched.map((item) => item.node_id),
    blocked_node_ids: blocked.map((item) => item.node_id),
  };
}

function ingestWorkerResultEnvelope(workspacePath, dagRun = {}, input = {}) {
  const nodeStatus = String(input.node_status || "").trim() || DAG_NODE_STATES.COMPLETED;
  return persistWorkerResultEnvelope(workspacePath, dagRun, {
    ...input,
    node_status: nodeStatus,
  });
}

function beginDagRunSchedulerTick(workspacePath, dagRun = {}, options = {}) {
  const normalizedDagRun = normalizeDagRun(dagRun);
  const runId = String(normalizedDagRun.run_id || options.run_id || options.runId || "").trim();
  if (!runId) {
    throw new Error("beginDagRunSchedulerTick requires a DAG run_id");
  }
  const paths = dagRunPathsForWorkspace(workspacePath, runId);
  if (!paths.runDir) {
    throw new Error(`beginDagRunSchedulerTick could not resolve run directory: ${runId}`);
  }
  fs.mkdirSync(paths.runDir, { recursive: true });
  const lockPath = path.join(paths.runDir, "scheduler.tick.lock");
  const now = Date.now();
  const staleAfterMs = Number.isInteger(options.staleAfterMs) && options.staleAfterMs > 0
    ? options.staleAfterMs
    : 10 * 60 * 1000;

  if (fs.existsSync(lockPath)) {
    const existing = readJson(lockPath, {});
    const startedAt = Date.parse(String(existing.started_at || ""));
    const ageMs = Number.isFinite(startedAt) ? (now - startedAt) : Number.POSITIVE_INFINITY;
    if (ageMs <= staleAfterMs) {
      throw new Error(`scheduler tick already active for run_id=${runId}`);
    }
    fs.unlinkSync(lockPath);
  }

  const tickId = `${runId}-tick-${now}-${crypto.randomBytes(2).toString("hex")}`;
  writeJson(lockPath, {
    tick_id: tickId,
    run_id: runId,
    started_at: toIso(now),
    pid: process.pid,
  });

  const release = () => {
    try {
      const current = readJson(lockPath, {});
      if (current && current.tick_id === tickId && current.run_id === runId && fs.existsSync(lockPath)) {
        fs.unlinkSync(lockPath);
      }
    } catch {
      // Best-effort cleanup only.
    }
  };

  return {
    tick_id: tickId,
    run_id: runId,
    lock_path: lockPath,
    release,
  };
}

function resolveLatestDagRunForSchedulerTick(workspacePath, dagRun = {}, options = {}) {
  const normalizedDagRun = normalizeDagRun(dagRun);
  const runId = String(normalizedDagRun.run_id || options.run_id || options.runId || "").trim();
  if (!runId) return normalizedDagRun;
  const persistedDagRun = readDagRun(workspacePath, runId);
  if (persistedDagRun && persistedDagRun.run_id) return persistedDagRun;
  return normalizeDagRun({
    ...normalizedDagRun,
    run_id: runId,
  });
}

function runLaunchSchedulerTick(workspacePath, dagRun = {}, options = {}) {
  const effectiveDagRun = resolveLatestDagRunForSchedulerTick(workspacePath, dagRun, options);
  const tick = beginDagRunSchedulerTick(workspacePath, effectiveDagRun, options);
  try {
    const launched = launchSchedulableWorkerBatch(workspacePath, effectiveDagRun, options);
    return {
      ...launched,
      tick_id: tick.tick_id,
      lock_path: tick.lock_path,
    };
  } finally {
    tick.release();
  }
}

function compileSupervisorPrompt(input = {}) {
  const dagRun = normalizeDagRun(input.dagRun || input.dag_run || {});
  const task = input.task && typeof input.task === "object" ? input.task : {};
  const blackboard = Array.isArray(input.blackboard)
    ? input.blackboard
    : Array.isArray(dagRun.blackboard)
      ? dagRun.blackboard
      : [];
  const schedule = input.schedule || explainDagSchedule(dagRun, {
    maxParallel: Number.isInteger(input.maxParallel) ? input.maxParallel : undefined,
  });
  const nodes = dagRun.nodes.map(summarizeNodeForPrompt);
  const maxParallel = Number.isInteger(input.maxParallel) && input.maxParallel > 0 ? input.maxParallel : "";
  const modelPolicy = input.modelPolicy || {
    supervisor: "gpt-5.4-or-gpt-5.5",
    worker: "gpt-5.3-codex",
  };

  return [
    "You are the CMA MoA Supervisor Thread.",
    "",
    "Mission:",
    "- Convert the current Team Space task into bounded worker assignments.",
    "- Launch or recommend only dependency-ready DAG nodes.",
    "- Keep the supervisor as planner, reviewer, and scheduler; do not do worker implementation yourself unless explicitly required.",
    "- Preserve local evidence, traces, blackboard updates, and archive readiness.",
    "",
    "Model policy:",
    compactJson(modelPolicy),
    "",
    "Team Space task:",
    compactJson({
      task_id: task.task_id || task.id || "",
      title: task.title || "",
      goal: task.goal || task.prompt || "",
      acceptance_criteria: task.acceptance_criteria || task.acceptanceCriteria || [],
      workspace: input.workspace || task.workspace || "",
    }),
    "",
    "DAG Run:",
    compactJson({
      run_id: dagRun.run_id,
      status: dagRun.status,
      team_space_id: dagRun.team_space_id || "",
      supervisor_thread_id: dagRun.supervisor_thread_id || "",
      max_parallel: maxParallel || "scheduler_default",
    }),
    "",
    "DAG nodes:",
    compactJson(nodes),
    "",
    "Blackboard:",
    compactJson(blackboard),
    "",
    "Scheduler dry-run:",
    compactJson(schedule),
    "",
    "Ownership rules:",
    "- A worker may read only the context needed for its node.",
    "- A worker may write only paths listed in its write_paths or exclusive_paths.",
    "- Two running workers must not overlap write_paths or exclusive_paths.",
    "- exclusive_paths also block other workers from reading overlapping paths while the node is active.",
    "- If a ready node conflicts with a running or already selected node, keep it blocked and explain the conflict.",
    "- Every worker prompt must state that other workers may be active and that unrelated files must not be reverted.",
    "",
    "Required supervisor output envelope:",
    compactJson({
      supervisor_summary: "",
      selected_worker_nodes: [{
        node_id: "",
        worker_model: "gpt-5.3-codex",
        reason: "",
        ownership: {
          read_paths: [],
          write_paths: [],
          exclusive_paths: [],
          expected_outputs: [],
        },
      }],
      blocked_nodes: [{
        node_id: "",
        reason: "",
        conflict: null,
      }],
      blackboard_updates: [{
        kind: "decision|finding|risk|handoff",
        summary: "",
        payload: {},
      }],
      plan_adjustments: [{
        reason: "",
        change: "",
      }],
      checks_to_run_after_workers: [],
      next_supervisor_action: "launch_workers|wait_for_workers|review_results|revise_plan|ask_user",
    }),
  ].join("\n");
}

module.exports = {
  DAG_NODE_STATES,
  TERMINAL_DAG_NODE_STATES,
  WORKER_PROVIDER_CODEX,
  WORKER_PROVIDER_GEMINI,
  GEMINI_CLI_MODEL_PRIORITY,
  DEFAULT_GEMINI_CLI_MODEL,
  ROLE_PLUGIN_SCHEMA_VERSION,
  ROLE_PLUGIN_CATALOG_SOURCE,
  ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION,
  ROLE_ORGANIZATION_TEMPLATE_CATALOG_SOURCE,
  listBuiltInRoleTemplateIds,
  listBuiltInRoleTemplates,
  buildBuiltInRolePluginCatalog,
  normalizeRolePluginTemplate,
  listLocalRolePluginTemplates,
  buildRolePluginCatalog,
  listBuiltInRoleOrganizationTemplates,
  buildBuiltInRoleOrganizationTemplateCatalog,
  resolveBuiltInRoleOrganizationTemplate,
  resolveBuiltInRoleTemplate,
  resolveRoleTemplate,
  normalizeRoleTemplateId,
  assertUniqueRoleTemplateTokens,
  normalizeWorkerProvider,
  normalizeRoleOrganizationTemplateId,
  normalizeRoleTemplateBinding,
  applyRoleTemplateToSupervisorDraft,
  applyRoleTemplateToWorkerDraft,
  applyRoleTemplateToOrchestrationWorkerDraft,
  applyBuiltInRoleTemplateToSupervisorDraft,
  applyBuiltInRoleTemplateToWorkerDraft,
  applyBuiltInRoleTemplateToOrchestrationWorkerDraft,
  applyBuiltInRoleOrganizationTemplateToDraft,
  makeDagRunId,
  normalizeDagRun,
  normalizeDagNode,
  normalizeOwnership,
  generateOrchestrationDraft,
  normalizeOrchestrationDraft,
  draftToDagRun,
  dependencyState,
  findReadyNodes,
  pathsOverlap,
  detectOwnershipConflicts,
  selectSchedulableNodes,
  dagRunPathsForWorkspace,
  createDagRunRecord,
  writeDagRun,
  readDagRun,
  explainDagSchedule,
  compileSupervisorPrompt,
  compileWorkerPrompt,
  normalizeWorkerResultEnvelope,
  parseWorkerResultEnvelope,
  validateWorkerChangedFiles,
  applyWorkerResultEnvelope,
  applyWorkerLaunchMetadata,
  applyWorkerLaunchFailureMetadata,
  applyWorkerResultIngestFailureMetadata,
  persistWorkerLaunchMetadata,
  launchSchedulableWorkerBatch,
  persistWorkerPromptSnapshot,
  persistWorkerResultEnvelope,
  persistWorkerResultIngestFailureMetadata,
  archiveDagRunEvidence,
  ingestWorkerResultEnvelope,
  beginDagRunSchedulerTick,
  runLaunchSchedulerTick,
};
