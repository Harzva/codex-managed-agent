const fs = require("fs");
const path = require("path");

function readJson(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

const WORKER_PROVIDER_CODEX = "codex-cli";
const WORKER_PROVIDER_GEMINI = "gemini-cli";
const GEMINI_CLI_MODEL_PRIORITY = Object.freeze([
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
]);
const DEFAULT_GEMINI_CLI_MODEL = GEMINI_CLI_MODEL_PRIORITY[0];

function normalizeWorkerProvider(value = "", model = "") {
  const raw = String(value || "").trim().toLowerCase();
  const normalized = raw.replace(/[_\s]+/g, "-");
  if (["gemini", "gemini-cli", "google-gemini"].includes(normalized)) return WORKER_PROVIDER_GEMINI;
  if (["codex", "codex-cli", "openai-codex"].includes(normalized)) return WORKER_PROVIDER_CODEX;
  const modelName = String(model || "").trim().toLowerCase();
  if (modelName.startsWith("gemini")) return WORKER_PROVIDER_GEMINI;
  return WORKER_PROVIDER_CODEX;
}

function splitLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readOptionalBooleanField(source, snakeCaseKey, camelCaseKey) {
  const input = source && typeof source === "object" ? source : {};
  if (input[snakeCaseKey] !== undefined) return normalizeOptionalBoolean(input[snakeCaseKey]);
  if (input[camelCaseKey] !== undefined) return normalizeOptionalBoolean(input[camelCaseKey]);
  return undefined;
}

function normalizeOptionalBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isNaN(value)) return undefined;
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["false", "0", "no", "off", "n"].includes(normalized)) return false;
    if (["true", "1", "yes", "on", "y"].includes(normalized)) return true;
  }
  return Boolean(value);
}

function resolveRoleTemplateOptions(...sources) {
  const resolved = {};
  sources.forEach((source) => {
    if (!source || typeof source !== "object") return;
    const workspacePath = String(source.workspacePath || source.workspace_path || "").trim();
    if (workspacePath && !resolved.workspacePath) {
      resolved.workspacePath = workspacePath;
    }
    if (!resolved.customTemplates && Array.isArray(source.customTemplates)) {
      resolved.customTemplates = source.customTemplates;
    }
  });
  return resolved;
}

const ROLE_PLUGIN_SCHEMA_VERSION = 1;
const ROLE_PLUGIN_CATALOG_SOURCE = "local_builtin";
const ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION = 1;
const ROLE_ORGANIZATION_TEMPLATE_CATALOG_SOURCE = "local_builtin";
const DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT = Object.freeze([
  "summary",
  "changed_files",
  "checks_run",
  "open_risks",
  "blackboard_updates",
  "next_request",
]);

const BUILTIN_ROLE_TEMPLATES = Object.freeze([
  Object.freeze({
    role_id: "supervisor",
    role_name: "Supervisor",
    display_name: "Supervisor",
    description: "Owns planning, DAG decisions, worker scheduling, result review, and blackboard updates.",
    default_model: "gpt-5.4",
    can_edit_code: false,
    writes_blackboard: true,
    aliases: Object.freeze(["lead", "manager"]),
    icon_svg: "avatar-badge.svg",
    role_prompt: "Own planning, DAG decisions, worker scheduling, result review, and blackboard updates.",
    prompt_contract: Object.freeze([
      "Own planning and DAG decisions for the active Team run.",
      "Do not implement worker code directly unless the plan explicitly collapses to one node.",
      "Maintain blackboard updates and clear next actions.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["task-plans", "docs"]),
    default_write_paths: Object.freeze(["task-plans"]),
    default_expected_outputs: Object.freeze(["updated DAG plan and launch/review decisions"]),
  }),
  Object.freeze({
    role_id: "planner",
    role_name: "Planner",
    display_name: "Planner",
    description: "Refines bounded implementation plans with acceptance checks and ownership-safe slices.",
    default_model: "gpt-5.3-codex",
    can_edit_code: true,
    writes_blackboard: true,
    aliases: Object.freeze(["planning", "plan"]),
    icon_svg: "avatar-set-04-minimal-line.svg",
    role_prompt: "Refine one bounded implementation plan with acceptance checks and ownership-safe slices.",
    prompt_contract: Object.freeze([
      "Refine one bounded implementation contract.",
      "Keep acceptance checks explicit and ownership-safe.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["task-plans", "docs"]),
    default_write_paths: Object.freeze(["task-plans"]),
    default_expected_outputs: Object.freeze(["updated task plan checklist and acceptance criteria"]),
  }),
  Object.freeze({
    role_id: "implementer",
    role_name: "Implementer",
    display_name: "Implementer",
    description: "Implements one bounded code slice with local, additive, ownership-safe changes.",
    default_model: "gpt-5.3-codex",
    can_edit_code: true,
    writes_blackboard: true,
    aliases: Object.freeze(["developer", "coder"]),
    icon_svg: "avatar-set-15-tech-avatar.svg",
    role_prompt: "Implement one bounded code slice and keep changes local, additive, and ownership-safe.",
    prompt_contract: Object.freeze([
      "Implement only one bounded slice within declared ownership.",
      "Do not revert unrelated edits; other workers may run in parallel.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["src", "task-plans"]),
    default_write_paths: Object.freeze(["src"]),
    default_expected_outputs: Object.freeze(["bounded code changes with focused tests"]),
  }),
  Object.freeze({
    role_id: "tester",
    role_name: "Tester",
    display_name: "Tester",
    description: "Adds focused tests, runs checks, and reports failures or residual risks.",
    default_model: "gpt-5.3-codex",
    can_edit_code: true,
    writes_blackboard: true,
    aliases: Object.freeze(["qa", "verification"]),
    icon_svg: "avatar-set-12-circular-clean.svg",
    role_prompt: "Add or update targeted tests, run checks, and report failures or residual risks.",
    prompt_contract: Object.freeze([
      "Focus on verification and test evidence for the bounded slice.",
      "Report residual risk explicitly when checks are incomplete.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["src"]),
    default_write_paths: Object.freeze(["src/host", "src/webview"]),
    default_expected_outputs: Object.freeze(["test updates and verification evidence"]),
  }),
  Object.freeze({
    role_id: "reviewer",
    role_name: "Reviewer",
    display_name: "Reviewer",
    description: "Reviews for regressions, missing coverage, and contract mismatches before handoff.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    aliases: Object.freeze(["audit"]),
    icon_svg: "avatar-fullface-glasses.svg",
    role_prompt: "Review changes for regressions, missing coverage, and contract mismatches before handoff.",
    prompt_contract: Object.freeze([
      "Focus on findings, risks, and missing evidence.",
      "Do not rewrite implementation unless explicitly assigned.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["src", "docs", "task-plans"]),
    default_write_paths: Object.freeze(["task-plans", "docs"]),
    default_expected_outputs: Object.freeze(["review findings and remediation requests"]),
  }),
  Object.freeze({
    role_id: "reflector",
    role_name: "Reflector",
    display_name: "Reflector",
    description: "Summarizes outcomes, failures, and next bounded improvements.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    aliases: Object.freeze(["retrospective"]),
    icon_svg: "avatar-profile-card.svg",
    role_prompt: "Summarize what worked, what failed, and what should change for the next bounded iteration.",
    prompt_contract: Object.freeze([
      "Summarize outcomes and failure patterns with concise evidence.",
      "Propose practical next-step improvements for the next tick.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["task-plans", "docs"]),
    default_write_paths: Object.freeze(["task-plans"]),
    default_expected_outputs: Object.freeze(["retrospective notes and next-step recommendations"]),
  }),
  Object.freeze({
    role_id: "debugger",
    role_name: "Debugger",
    display_name: "Debugger",
    description: "Reproduces failures, isolates root cause, and ships smallest reliable fixes.",
    default_model: "gpt-5.3-codex",
    can_edit_code: true,
    writes_blackboard: true,
    aliases: Object.freeze(["bugfix", "fixer"]),
    icon_svg: "avatar-set-16-high-contrast.svg",
    role_prompt: "Reproduce failures, isolate root cause, and implement the smallest reliable fix with evidence.",
    prompt_contract: Object.freeze([
      "Reproduce before fixing whenever practical.",
      "Deliver root cause plus smallest reliable fix and regression check.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["src", "task-plans"]),
    default_write_paths: Object.freeze(["src"]),
    default_expected_outputs: Object.freeze(["root-cause summary, fix, and regression check"]),
  }),
  Object.freeze({
    role_id: "researcher",
    role_name: "Researcher",
    display_name: "Researcher",
    description: "Collects focused context and converts it into actionable implementation guidance.",
    default_model: "gpt-5.3-codex",
    can_edit_code: false,
    writes_blackboard: true,
    aliases: Object.freeze(["investigator"]),
    icon_svg: "avatar-set-08-side-angle.svg",
    role_prompt: "Collect focused technical context and summarize actionable findings for implementation.",
    prompt_contract: Object.freeze([
      "Collect focused context only from relevant local artifacts.",
      "Produce concise findings that unblock implementation.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["docs", "task-plans"]),
    default_write_paths: Object.freeze(["docs", "task-plans"]),
    default_expected_outputs: Object.freeze(["concise research notes and implementation guidance"]),
  }),
  Object.freeze({
    role_id: "documenter",
    role_name: "Documenter",
    display_name: "Documenter",
    description: "Updates docs and usage notes to match implemented behavior.",
    default_model: "gpt-5.3-codex",
    can_edit_code: true,
    writes_blackboard: true,
    aliases: Object.freeze(["writer", "docs"]),
    icon_svg: "avatar-set-13-id-photo.svg",
    role_prompt: "Update documentation and usage notes that match the implemented behavior.",
    prompt_contract: Object.freeze([
      "Document only behavior that is implemented and verifiable.",
      "Keep instructions concise and consistent with current code paths.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["docs", "src", "readme.md"]),
    default_write_paths: Object.freeze(["docs", "readme.md"]),
    default_expected_outputs: Object.freeze(["documentation updates and verification notes"]),
  }),
  Object.freeze({
    role_id: "integrator",
    role_name: "Integrator",
    display_name: "Integrator",
    description: "Integrates bounded slices safely and resolves cross-slice interface mismatches.",
    default_model: "gpt-5.3-codex",
    can_edit_code: true,
    writes_blackboard: true,
    aliases: Object.freeze(["merge", "synthesizer"]),
    icon_svg: "avatar-outline-premium.svg",
    role_prompt: "Integrate bounded slices safely, resolve interface mismatches, and keep evidence coherent.",
    prompt_contract: Object.freeze([
      "Resolve interface mismatches across bounded slices without widening scope.",
      "Keep integration evidence and validation coherent.",
    ]),
    result_envelope: DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT,
    default_read_paths: Object.freeze(["src", "docs", "task-plans"]),
    default_write_paths: Object.freeze(["src", "docs"]),
    default_expected_outputs: Object.freeze(["integration updates and cross-slice validation"]),
  }),
]);

const BUILTIN_ROLE_ORGANIZATION_TEMPLATES = Object.freeze([
  Object.freeze({
    template_id: "fast-build-team",
    display_name: "Fast Build Team",
    description: "Prioritizes implementation speed with bounded planning and verification.",
    aliases: Object.freeze(["fast", "build-fast"]),
    supervisor_model: "gpt-5.4",
    worker_model: "gpt-5.3-codex",
    workers: Object.freeze([
      Object.freeze({
        title: "Planning lane",
        role_id: "planner",
        write_paths: Object.freeze(["task-plans"]),
      }),
      Object.freeze({
        title: "Implementation lane",
        role_id: "implementer",
        write_paths: Object.freeze(["src"]),
      }),
      Object.freeze({
        title: "Verification lane",
        role_id: "tester",
        write_paths: Object.freeze(["src/host", "src/webview"]),
      }),
    ]),
  }),
  Object.freeze({
    template_id: "careful-build-team",
    display_name: "Careful Build Team",
    description: "Adds explicit review coverage before final integration handoff.",
    aliases: Object.freeze(["careful", "quality"]),
    supervisor_model: "gpt-5.4",
    worker_model: "gpt-5.3-codex",
    workers: Object.freeze([
      Object.freeze({
        title: "Planning lane",
        role_id: "planner",
        write_paths: Object.freeze(["task-plans"]),
      }),
      Object.freeze({
        title: "Implementation lane",
        role_id: "implementer",
        write_paths: Object.freeze(["src"]),
      }),
      Object.freeze({
        title: "Review lane",
        role_id: "reviewer",
        write_paths: Object.freeze(["task-plans", "docs"]),
      }),
      Object.freeze({
        title: "Integration lane",
        role_id: "integrator",
        write_paths: Object.freeze(["src", "docs"]),
      }),
    ]),
  }),
  Object.freeze({
    template_id: "research-team",
    display_name: "Research Team",
    description: "Starts with focused investigation and ends with concise recommendations.",
    aliases: Object.freeze(["research", "investigation"]),
    supervisor_model: "gpt-5.4",
    worker_model: "gpt-5.3-codex",
    workers: Object.freeze([
      Object.freeze({
        title: "Research lane",
        role_id: "researcher",
        write_paths: Object.freeze(["docs", "task-plans"]),
      }),
      Object.freeze({
        title: "Implementation lane",
        role_id: "implementer",
        write_paths: Object.freeze(["src"]),
      }),
      Object.freeze({
        title: "Reflection lane",
        role_id: "reflector",
        write_paths: Object.freeze(["task-plans"]),
      }),
      Object.freeze({
        title: "Documentation lane",
        role_id: "documenter",
        write_paths: Object.freeze(["docs", "readme.md"]),
      }),
    ]),
  }),
  Object.freeze({
    template_id: "bugfix-team",
    display_name: "Bugfix Team",
    description: "Reproduce, fix, validate, and summarize residual risk for a targeted failure.",
    aliases: Object.freeze(["bugfix", "debug"]),
    supervisor_model: "gpt-5.4",
    worker_model: "gpt-5.3-codex",
    workers: Object.freeze([
      Object.freeze({
        title: "Reproduction lane",
        role_id: "debugger",
        write_paths: Object.freeze(["src"]),
      }),
      Object.freeze({
        title: "Fix lane",
        role_id: "implementer",
        write_paths: Object.freeze(["src"]),
      }),
      Object.freeze({
        title: "Verification lane",
        role_id: "tester",
        write_paths: Object.freeze(["src/host", "src/webview"]),
      }),
      Object.freeze({
        title: "Review lane",
        role_id: "reviewer",
        write_paths: Object.freeze(["task-plans", "docs"]),
      }),
    ]),
  }),
]);

function cloneRoleTemplate(template) {
  if (!template || typeof template !== "object") return null;
  const expectedOutputs = splitLines(
    template.default_expected_outputs !== undefined
      ? template.default_expected_outputs
      : template.expected_outputs,
  );
  const defaultModel = String(template.default_model || "").trim();
  return {
    role_id: String(template.role_id || "").trim(),
    role_name: String(template.role_name || "").trim(),
    display_name: String(template.display_name || template.role_name || "").trim(),
    description: String(template.description || template.role_prompt || "").trim(),
    default_provider: normalizeWorkerProvider(template.default_provider || template.provider, defaultModel),
    default_model: defaultModel,
    can_edit_code: Boolean(template.can_edit_code),
    writes_blackboard: Boolean(template.writes_blackboard),
    aliases: Array.isArray(template.aliases) ? template.aliases.map((item) => String(item || "").trim()).filter(Boolean) : [],
    role_prompt: String(template.role_prompt || "").trim(),
    prompt_contract: splitLines(template.prompt_contract),
    result_envelope: splitLines(template.result_envelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
    default_read_paths: splitLines(template.default_read_paths),
    default_write_paths: splitLines(template.default_write_paths),
    default_expected_outputs: expectedOutputs,
    expected_outputs: expectedOutputs.slice(),
  };
}

function normalizeRoleTemplateId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listRoleTemplateTokens(template = {}) {
  return [
    template.role_id,
    template.role_name,
    template.display_name,
    ...(Array.isArray(template.aliases) ? template.aliases : []),
  ]
    .map((value) => normalizeRoleTemplateId(value))
    .filter(Boolean);
}

function findRoleTemplateTokenCollisions(templates = []) {
  const ownersByToken = new Map();
  templates.forEach((template) => {
    if (!template || typeof template !== "object") return;
    const ownerId = normalizeRoleTemplateId(template.role_id || template.role_name || template.display_name);
    if (!ownerId) return;
    listRoleTemplateTokens(template).forEach((token) => {
      if (!ownersByToken.has(token)) ownersByToken.set(token, new Set());
      ownersByToken.get(token).add(ownerId);
    });
  });
  return Array.from(ownersByToken.entries())
    .map(([token, owners]) => ({ token, owners: Array.from(owners).sort() }))
    .filter((entry) => entry.owners.length > 1);
}

function assertUniqueRoleTemplateTokens(templates = [], options = {}) {
  const collisions = findRoleTemplateTokenCollisions(templates);
  if (!collisions.length) return;
  const label = String(options.label || "role_templates").trim() || "role_templates";
  const details = collisions
    .map((entry) => `${entry.token} => ${entry.owners.join(", ")}`)
    .join("; ");
  throw new Error(`${label} has conflicting role tokens: ${details}`);
}

function roleTemplateIdToDisplayName(value) {
  const normalized = normalizeRoleTemplateId(value);
  if (!normalized) return "";
  return normalized
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.slice(0, 1).toUpperCase() + segment.slice(1))
    .join(" ");
}

function normalizeRoleDefaultModel(value, fallback = "gpt-5.3-codex") {
  const model = String(value || "").trim();
  const fallbackModel = String(fallback || "gpt-5.3-codex").trim() || "gpt-5.3-codex";
  return model || fallbackModel;
}

function listBuiltInRoleTemplates() {
  assertUniqueRoleTemplateTokens(BUILTIN_ROLE_TEMPLATES, { label: "BUILTIN_ROLE_TEMPLATES" });
  return BUILTIN_ROLE_TEMPLATES.map((template) => cloneRoleTemplate(template)).filter(Boolean);
}

function listBuiltInRoleTemplateIds() {
  return listBuiltInRoleTemplates()
    .map((template) => normalizeRoleTemplateId(template && template.role_id))
    .filter(Boolean);
}

function cloneRoleOrganizationTemplate(template) {
  if (!template || typeof template !== "object") return null;
  return {
    template_id: String(template.template_id || "").trim(),
    display_name: String(template.display_name || "").trim(),
    description: String(template.description || "").trim(),
    aliases: splitLines(template.aliases),
    supervisor_model: String(template.supervisor_model || "").trim(),
    worker_model: String(template.worker_model || "").trim(),
    workers: Array.isArray(template.workers)
      ? template.workers.map((worker) => ({
        title: String((worker && worker.title) || "").trim(),
        role_id: String((worker && worker.role_id) || "").trim(),
        role: String((worker && worker.role) || "").trim(),
        model: String((worker && worker.model) || "").trim(),
        read_paths: splitLines(worker && (worker.read_paths || worker.readPaths)),
        write_paths: splitLines(worker && (worker.write_paths || worker.writePaths)),
        exclusive_paths: splitLines(worker && (worker.exclusive_paths || worker.exclusivePaths)),
        expected_outputs: splitLines(worker && (worker.expected_outputs || worker.expectedOutputs)),
      })).filter((worker) => worker.role_id || worker.title)
      : [],
  };
}

function normalizeRoleOrganizationTemplateId(value) {
  return normalizeRoleTemplateId(value);
}

function listBuiltInRoleOrganizationTemplates() {
  return BUILTIN_ROLE_ORGANIZATION_TEMPLATES
    .map((template) => cloneRoleOrganizationTemplate(template))
    .filter(Boolean);
}

function buildBuiltInRoleOrganizationTemplateCatalog() {
  const templates = listBuiltInRoleOrganizationTemplates().map((template) => ({
    template_id: String(template.template_id || "").trim(),
    display_name: String(template.display_name || "").trim(),
    description: String(template.description || "").trim(),
    aliases: splitLines(template.aliases),
    supervisor_model: String(template.supervisor_model || "").trim(),
    worker_model: String(template.worker_model || "").trim(),
    organization_template_source: "builtin",
    organization_template_version: ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION,
    workers: Array.isArray(template.workers)
      ? template.workers.map((worker) => ({
        title: String(worker.title || "").trim(),
        role_id: String(worker.role_id || "").trim(),
        role: String(worker.role || "").trim(),
        model: String(worker.model || "").trim(),
        read_paths: splitLines(worker.read_paths || worker.readPaths),
        write_paths: splitLines(worker.write_paths || worker.writePaths),
        exclusive_paths: splitLines(worker.exclusive_paths || worker.exclusivePaths),
        expected_outputs: splitLines(worker.expected_outputs || worker.expectedOutputs),
      }))
      : [],
  }));
  return {
    schema_version: ROLE_ORGANIZATION_TEMPLATE_SCHEMA_VERSION,
    source: ROLE_ORGANIZATION_TEMPLATE_CATALOG_SOURCE,
    templates,
  };
}

function resolveBuiltInRoleOrganizationTemplate(value) {
  const target = normalizeRoleOrganizationTemplateId(value);
  if (!target) return null;
  const found = BUILTIN_ROLE_ORGANIZATION_TEMPLATES.find((template) => {
    const templateId = normalizeRoleOrganizationTemplateId(template.template_id);
    const displayName = normalizeRoleOrganizationTemplateId(template.display_name);
    const aliases = Array.isArray(template.aliases)
      ? template.aliases.map((alias) => normalizeRoleOrganizationTemplateId(alias))
      : [];
    return target === templateId || target === displayName || aliases.includes(target);
  });
  return cloneRoleOrganizationTemplate(found);
}

function buildBuiltInRolePluginCatalog() {
  const templates = listBuiltInRoleTemplates().map((template) => ({
    role_id: String(template.role_id || "").trim(),
    role_name: String(template.role_name || "").trim(),
    display_name: String(template.display_name || template.role_name || "").trim(),
    description: String(template.description || template.role_prompt || "").trim(),
    default_provider: normalizeWorkerProvider(template.default_provider || template.provider, template.default_model),
    default_model: String(template.default_model || "").trim(),
    can_edit_code: Boolean(template.can_edit_code),
    writes_blackboard: Boolean(template.writes_blackboard),
    role_template_source: "builtin",
    role_template_version: ROLE_PLUGIN_SCHEMA_VERSION,
    role_prompt: String(template.role_prompt || "").trim(),
    summary: String(template.role_prompt || "").trim(),
    aliases: splitLines(template.aliases),
    prompt_contract: splitLines(template.prompt_contract),
    result_envelope: splitLines(template.result_envelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
    default_read_paths: splitLines(template.default_read_paths),
    default_write_paths: splitLines(template.default_write_paths),
    default_expected_outputs: splitLines(template.default_expected_outputs),
    expected_outputs: splitLines(
      template.default_expected_outputs !== undefined
        ? template.default_expected_outputs
        : template.expected_outputs,
    ),
  }));
  return {
    schema_version: ROLE_PLUGIN_SCHEMA_VERSION,
    source: ROLE_PLUGIN_CATALOG_SOURCE,
    built_in_role_ids: listBuiltInRoleTemplateIds(),
    templates,
  };
}

function normalizeRolePluginTemplate(input = {}, options = {}) {
  const source = input && typeof input === "object" ? input : {};
  const fallbackDisplayName = String(source.display_name || source.displayName || "").trim();
  const rawRoleId = String(source.role_id || source.roleId || "").trim();
  const rawRoleName = String(source.role_name || source.roleName || fallbackDisplayName).trim();
  const normalizedRoleId = normalizeRoleTemplateId(rawRoleId || rawRoleName || fallbackDisplayName);
  if (!normalizedRoleId) return null;
  const fallbackTitle = roleTemplateIdToDisplayName(normalizedRoleId) || normalizedRoleId;
  const roleName = rawRoleName || fallbackDisplayName || fallbackTitle;
  const displayName = fallbackDisplayName || roleName || fallbackTitle;
  const roleTemplateSource = String(options.role_template_source || options.roleTemplateSource || "custom").trim() || "custom";
  const explicitVersion = Number.parseInt(
    options.role_template_version || options.roleTemplateVersion || source.role_template_version || source.roleTemplateVersion || "",
    10,
  );
  const roleTemplateVersion = Number.isFinite(explicitVersion) && explicitVersion > 0
    ? explicitVersion
    : ROLE_PLUGIN_SCHEMA_VERSION;
  const description = String(source.description || "").trim();
  const explicitRolePrompt = String(source.role_prompt || source.rolePrompt || "").trim();
  const rolePrompt = explicitRolePrompt || description;
  const defaultModel = normalizeRoleDefaultModel(source.default_model || source.defaultModel);
  const expectedOutputs = splitLines(
    source.default_expected_outputs
    || source.defaultExpectedOutputs
    || source.expected_outputs
    || source.expectedOutputs,
  );
  return {
    role_id: normalizedRoleId,
    role_name: roleName,
    display_name: displayName,
    description: description || rolePrompt,
    default_provider: normalizeWorkerProvider(source.default_provider || source.defaultProvider || source.provider, defaultModel),
    default_model: defaultModel,
    can_edit_code: readOptionalBooleanField(source, "can_edit_code", "canEditCode") ?? false,
    writes_blackboard: readOptionalBooleanField(source, "writes_blackboard", "writesBlackboard") ?? true,
    role_template_source: roleTemplateSource,
    role_template_version: roleTemplateVersion,
    role_prompt: rolePrompt,
    summary: rolePrompt,
    aliases: splitLines(source.aliases),
    prompt_contract: splitLines(source.prompt_contract || source.promptContract),
    result_envelope: splitLines(source.result_envelope || source.resultEnvelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
    default_read_paths: splitLines(source.default_read_paths || source.defaultReadPaths),
    default_write_paths: splitLines(source.default_write_paths || source.defaultWritePaths),
    default_expected_outputs: expectedOutputs,
    expected_outputs: expectedOutputs.slice(),
  };
}

function listLocalRolePluginTemplates(workspacePath = "") {
  const root = String(workspacePath || "").trim();
  if (!root) return [];
  const rolesDir = path.join(root, ".codex-team", "roles");
  if (!fs.existsSync(rolesDir)) return [];
  let entries = [];
  try {
    entries = fs.readdirSync(rolesDir, { withFileTypes: true })
      .filter((entry) => entry && entry.isFile() && /\.json$/i.test(String(entry.name || "")))
      .map((entry) => String(entry.name || ""))
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
  const seenRoleIds = new Set();
  const templates = [];
  entries.forEach((fileName) => {
    const payload = readJson(path.join(rolesDir, fileName), null);
    const candidates = Array.isArray(payload)
      ? payload
      : (payload && Array.isArray(payload.templates) ? payload.templates : [payload]);
    candidates.forEach((candidate) => {
      const normalized = normalizeRolePluginTemplate(candidate, {
        role_template_source: "custom",
        role_template_version: ROLE_PLUGIN_SCHEMA_VERSION,
      });
      if (!normalized) return;
      if (resolveBuiltInRoleTemplate(normalized.role_id)) return;
      if (seenRoleIds.has(normalized.role_id)) return;
      seenRoleIds.add(normalized.role_id);
      templates.push(normalized);
    });
  });
  return templates;
}

function buildRolePluginCatalog(options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const workspacePath = String(source.workspacePath || source.workspace_path || "").trim();
  const customTemplates = Array.isArray(source.customTemplates)
    ? source.customTemplates
      .map((template) => normalizeRolePluginTemplate(template, {
        role_template_source: "custom",
        role_template_version: ROLE_PLUGIN_SCHEMA_VERSION,
      }))
      .filter(Boolean)
    : listLocalRolePluginTemplates(workspacePath);
  const builtInCatalog = buildBuiltInRolePluginCatalog();
  const templates = builtInCatalog.templates.slice();
  const seenRoleIds = new Set(templates.map((template) => String(template.role_id || "").trim()).filter(Boolean));
  customTemplates.forEach((template) => {
    const roleId = String(template.role_id || "").trim();
    if (!roleId || seenRoleIds.has(roleId)) return;
    seenRoleIds.add(roleId);
    templates.push(template);
  });
  return {
    schema_version: ROLE_PLUGIN_SCHEMA_VERSION,
    source: customTemplates.length > 0 ? "local_mixed" : ROLE_PLUGIN_CATALOG_SOURCE,
    built_in_role_ids: listBuiltInRoleTemplateIds(),
    templates,
  };
}

function resolveBuiltInRoleTemplate(value) {
  const target = normalizeRoleTemplateId(value);
  if (!target) return null;
  const found = BUILTIN_ROLE_TEMPLATES.find((template) => {
    const roleId = normalizeRoleTemplateId(template.role_id);
    const roleName = normalizeRoleTemplateId(template.role_name);
    const aliases = Array.isArray(template.aliases)
      ? template.aliases.map((alias) => normalizeRoleTemplateId(alias))
      : [];
    return target === roleId || target === roleName || aliases.includes(target);
  });
  return cloneRoleTemplate(found);
}

function resolveRoleTemplate(value, options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const builtInTemplate = resolveBuiltInRoleTemplate(value);
  if (builtInTemplate) {
    return {
      ...builtInTemplate,
      default_provider: normalizeWorkerProvider(builtInTemplate.default_provider || builtInTemplate.provider, builtInTemplate.default_model),
      role_template_source: "builtin",
      role_template_version: ROLE_PLUGIN_SCHEMA_VERSION,
    };
  }
  const customTemplates = Array.isArray(source.customTemplates)
    ? source.customTemplates
      .map((template) => normalizeRolePluginTemplate(template, {
        role_template_source: "custom",
        role_template_version: ROLE_PLUGIN_SCHEMA_VERSION,
      }))
      .filter(Boolean)
    : listLocalRolePluginTemplates(String(source.workspacePath || source.workspace_path || "").trim());
  const target = normalizeRoleTemplateId(value);
  if (!target || customTemplates.length === 0) return null;
  const found = customTemplates.find((template) => {
    const roleId = normalizeRoleTemplateId(template.role_id);
    const roleName = normalizeRoleTemplateId(template.role_name);
    const displayName = normalizeRoleTemplateId(template.display_name);
    const aliases = Array.isArray(template.aliases)
      ? template.aliases.map((alias) => normalizeRoleTemplateId(alias))
      : [];
    return target === roleId || target === roleName || target === displayName || aliases.includes(target);
  });
  if (!found) return null;
  return {
    role_id: String(found.role_id || "").trim(),
    role_name: String(found.role_name || found.display_name || "").trim(),
    display_name: String(found.display_name || found.role_name || "").trim(),
    description: String(found.description || found.role_prompt || "").trim(),
    default_provider: normalizeWorkerProvider(found.default_provider || found.defaultProvider || found.provider, found.default_model),
    default_model: normalizeRoleDefaultModel(found.default_model),
    can_edit_code: Boolean(found.can_edit_code),
    writes_blackboard: Boolean(found.writes_blackboard),
    aliases: splitLines(found.aliases),
    role_prompt: String(found.role_prompt || found.description || "").trim(),
    prompt_contract: splitLines(found.prompt_contract || found.promptContract),
    result_envelope: splitLines(found.result_envelope || found.resultEnvelope || DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT),
    default_read_paths: splitLines(found.default_read_paths || found.defaultReadPaths),
    default_write_paths: splitLines(found.default_write_paths || found.defaultWritePaths),
    default_expected_outputs: splitLines(
      found.default_expected_outputs
      || found.defaultExpectedOutputs
      || found.expected_outputs
      || found.expectedOutputs,
    ),
    expected_outputs: splitLines(
      found.default_expected_outputs
      || found.defaultExpectedOutputs
      || found.expected_outputs
      || found.expectedOutputs,
    ),
    role_template_source: "custom",
    role_template_version: Number.parseInt(found.role_template_version, 10) || ROLE_PLUGIN_SCHEMA_VERSION,
  };
}

function normalizeRoleTemplateBinding(input = {}, options = {}) {
  const source = typeof input === "string" ? { role_id: input } : (input && typeof input === "object" ? input : {});
  const rawRoleId = String(
    source.role_id
    || source.roleId
    || source.role_template_id
    || source.roleTemplateId
    || "",
  ).trim();
  const rawRoleName = String(
    source.role_name
    || source.roleName
    || source.role_template_name
    || source.roleTemplateName
    || "",
  ).trim();
  const roleLookupValue = rawRoleId || rawRoleName;
  const template = resolveRoleTemplate(roleLookupValue, options);
  const normalizedCustomRoleId = normalizeRoleTemplateId(roleLookupValue);
  const roleTemplateSource = template
    ? String(template.role_template_source || "builtin").trim() || "builtin"
    : (normalizedCustomRoleId ? "custom" : "");
  const roleTemplateVersion = template
    ? (Number.parseInt(template.role_template_version, 10)
      || (roleTemplateSource === "builtin" ? ROLE_PLUGIN_SCHEMA_VERSION : ROLE_PLUGIN_SCHEMA_VERSION))
    : 0;
  const customDisplayName = roleTemplateIdToDisplayName(normalizedCustomRoleId);
  return {
    role_id: template ? template.role_id : normalizedCustomRoleId,
    role_name: template ? template.role_name : (rawRoleName || customDisplayName),
    display_name: template ? template.display_name : (rawRoleName || customDisplayName),
    role_template_source: roleTemplateSource,
    role_template_version: roleTemplateVersion,
    template,
  };
}

function applyBuiltInRoleTemplateToSupervisorDraft(supervisor = {}, options = {}) {
  const source = supervisor && typeof supervisor === "object" ? supervisor : {};
  const roleBinding = normalizeRoleTemplateBinding({
    role_id: source.role_id || source.roleId || "supervisor",
    role_name: source.role_name || source.roleName || "",
  }, options);
  const template = roleBinding.template;
  const explicitInstructions = String(
    source.instructions
    || source.role
    || source.role_prompt
    || source.rolePrompt
    || "",
  ).trim();
  const fallbackInstructions = String(options.defaultInstructions || "").trim();
  const explicitPromptContract = splitLines(source.prompt_contract || source.promptContract);
  const explicitExpectedOutputs = splitLines(source.expected_outputs || source.expectedOutputs);
  const explicitWritesBlackboard = readOptionalBooleanField(source, "writes_blackboard", "writesBlackboard");
  const explicitCanEditCode = readOptionalBooleanField(source, "can_edit_code", "canEditCode");
  return {
    ...source,
    role_id: roleBinding.role_id || "supervisor",
    role_name: roleBinding.role_name || "Supervisor",
    display_name: String(source.display_name || roleBinding.display_name || roleBinding.role_name || "Supervisor").trim(),
    role_template_source: roleBinding.role_template_source || "builtin",
    role_template_version: Number.parseInt(roleBinding.role_template_version, 10) || ROLE_PLUGIN_SCHEMA_VERSION,
    instructions: explicitInstructions || fallbackInstructions || (template ? template.role_prompt : ""),
    model: String(source.model || source.supervisor_model || source.supervisorModel || (template ? template.default_model : "") || "").trim(),
    prompt_contract: explicitPromptContract.length
      ? explicitPromptContract
      : (template ? template.prompt_contract.slice() : []),
    expected_outputs: explicitExpectedOutputs.length
      ? explicitExpectedOutputs
      : (template ? template.default_expected_outputs.slice() : []),
    writes_blackboard: explicitWritesBlackboard !== undefined
      ? explicitWritesBlackboard
      : Boolean(template ? template.writes_blackboard : true),
    can_edit_code: explicitCanEditCode !== undefined
      ? explicitCanEditCode
      : Boolean(template ? template.can_edit_code : false),
  };
}

function applyBuiltInRoleTemplateToWorkerDraft(worker = {}, options = {}) {
  const source = worker && typeof worker === "object" ? worker : {};
  const roleBinding = normalizeRoleTemplateBinding({
    ...(options.role && typeof options.role === "object" ? options.role : {}),
    ...source,
  }, options);
  const template = roleBinding.template;
  const explicitRole = String(source.role || source.instructions || "").trim();
  const explicitReadPaths = splitLines(source.read_paths || source.readPaths);
  const explicitWritePaths = splitLines(source.write_paths || source.writePaths);
  const explicitExpectedOutputs = splitLines(source.expected_outputs || source.expectedOutputs);
  const explicitPromptContract = splitLines(source.prompt_contract || source.promptContract);
  const explicitResultEnvelope = splitLines(source.result_envelope || source.resultEnvelope);
  const explicitWritesBlackboard = readOptionalBooleanField(source, "writes_blackboard", "writesBlackboard");
  const explicitCanEditCode = readOptionalBooleanField(source, "can_edit_code", "canEditCode");
  const resolvedModel = String(source.model || (template ? template.default_model : "") || "").trim();
  return {
    ...source,
    role_id: roleBinding.role_id,
    role_name: roleBinding.role_name,
    display_name: String(source.display_name || roleBinding.display_name || roleBinding.role_name || "").trim(),
    role_template_source: roleBinding.role_template_source,
    role_template_version: roleBinding.role_template_version,
    role: explicitRole || (template ? template.role_prompt : ""),
    provider: normalizeWorkerProvider(source.provider || source.worker_provider || source.workerProvider || (template && template.default_provider), resolvedModel),
    model: resolvedModel,
    read_paths: explicitReadPaths.length
      ? explicitReadPaths
      : (template ? template.default_read_paths.slice() : []),
    write_paths: explicitWritePaths.length
      ? explicitWritePaths
      : (template ? template.default_write_paths.slice() : []),
    exclusive_paths: splitLines(source.exclusive_paths || source.exclusivePaths),
    expected_outputs: explicitExpectedOutputs.length
      ? explicitExpectedOutputs
      : (template ? template.default_expected_outputs.slice() : []),
    prompt_contract: explicitPromptContract.length
      ? explicitPromptContract
      : (template ? template.prompt_contract.slice() : []),
    result_envelope: explicitResultEnvelope.length
      ? explicitResultEnvelope
      : (template ? template.result_envelope.slice() : DEFAULT_ROLE_RESULT_ENVELOPE_CONTRACT.slice()),
    writes_blackboard: explicitWritesBlackboard !== undefined
      ? explicitWritesBlackboard
      : Boolean(template ? template.writes_blackboard : true),
    can_edit_code: explicitCanEditCode !== undefined
      ? explicitCanEditCode
      : Boolean(template ? template.can_edit_code : false),
  };
}

function applyRoleTemplateToSupervisorDraft(supervisor = {}, options = {}) {
  return applyBuiltInRoleTemplateToSupervisorDraft(supervisor, options);
}

function applyRoleTemplateToWorkerDraft(worker = {}, options = {}) {
  return applyBuiltInRoleTemplateToWorkerDraft(worker, options);
}

function applyRoleTemplateToOrchestrationWorkerDraft(worker = {}, options = {}) {
  const source = options && typeof options === "object" ? options : {};
  const defaultWorkerModel = String(
    source.defaultWorkerModel || source.default_worker_model || "gpt-5.3-codex",
  ).trim() || "gpt-5.3-codex";
  const templated = applyRoleTemplateToWorkerDraft(worker, options);
  return {
    ...templated,
    model: String(templated.model || defaultWorkerModel).trim() || defaultWorkerModel,
  };
}

function applyBuiltInRoleTemplateToOrchestrationWorkerDraft(worker = {}, options = {}) {
  return applyRoleTemplateToOrchestrationWorkerDraft(worker, options);
}

module.exports = {
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
  normalizeOptionalBoolean,
  resolveRoleTemplateOptions,
};
