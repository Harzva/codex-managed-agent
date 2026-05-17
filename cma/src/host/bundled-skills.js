const fs = require("fs");
const os = require("os");
const path = require("path");

const EXTENSION_MANAGED_MARKER = "codex-managed-agent";

const BUNDLED_SKILLS = Object.freeze([
  {
    name: "codex-loop",
    title: "codex-loop",
    description: "Plan-driven recurring iteration for Codex.",
    requiredPath: path.join("scripts", "codex_loop_automation.py"),
  },
  {
    name: "team-reflective-loop",
    title: "Team Reflective Loop",
    description: "Reflective mailbox workflow for .codex-team coordination.",
    requiredPath: "SKILL.md",
  },
]);

function resolveCodexHome() {
  return process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
}

function resolveSkillsRoot() {
  return path.join(resolveCodexHome(), "skills");
}

function bundledSkillDir(panel, skillName) {
  return path.join(panel.extensionUri.fsPath, "bundled-skills", skillName);
}

function installedSkillDir(skillName) {
  return path.join(resolveSkillsRoot(), skillName);
}

function manifestPath(skillDir) {
  return path.join(skillDir, ".cma-skill-manifest.json");
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

function readBundledManifest(panel, skillName) {
  const dir = bundledSkillDir(panel, skillName);
  const manifest = readJson(manifestPath(dir), {});
  return {
    name: skillName,
    version: String(manifest.version || "0.0.0"),
    title: String(manifest.title || skillName),
    description: String(manifest.description || ""),
    managed_by: EXTENSION_MANAGED_MARKER,
  };
}

function copyDirectoryContents(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (entry.name === "__pycache__" || entry.name.endsWith(".pyc")) continue;
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryContents(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
      try {
        fs.chmodSync(targetPath, fs.statSync(sourcePath).mode);
      } catch {
        // chmod is best-effort on remote/non-POSIX filesystems.
      }
    }
  }
}

function removeManagedSkillContents(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const targetPath = path.join(targetDir, entry.name);
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function bundledSkillState(panel, skillName) {
  const definition = BUNDLED_SKILLS.find((item) => item.name === skillName) || { name: skillName, title: skillName, requiredPath: "SKILL.md" };
  const bundledDir = bundledSkillDir(panel, skillName);
  const targetDir = installedSkillDir(skillName);
  const bundledManifest = readBundledManifest(panel, skillName);
  const installedManifest = readJson(manifestPath(targetDir), null);
  const bundledAvailable = fs.existsSync(path.join(bundledDir, definition.requiredPath || "SKILL.md"));
  const installed = fs.existsSync(path.join(targetDir, definition.requiredPath || "SKILL.md"));
  const installedVersion = String((installedManifest && installedManifest.version) || "");
  const bundledVersion = String(bundledManifest.version || "");
  const managed = Boolean(installedManifest && installedManifest.managed_by === EXTENSION_MANAGED_MARKER);
  return {
    name: skillName,
    title: definition.title || bundledManifest.title || skillName,
    description: definition.description || bundledManifest.description || "",
    installed,
    managed,
    installable: bundledAvailable && !installed,
    updateAvailable: bundledAvailable && installed && managed && installedVersion !== bundledVersion,
    bundledAvailable,
    bundledVersion,
    installedVersion,
    bundledSkillPath: bundledDir,
    skillPath: targetDir,
    requiredPath: definition.requiredPath || "SKILL.md",
  };
}

function listBundledSkillStates(panel) {
  return BUNDLED_SKILLS.map((skill) => bundledSkillState(panel, skill.name));
}

function installBundledSkill(panel, skillName, options = {}) {
  const state = bundledSkillState(panel, skillName);
  if (!state.bundledAvailable) {
    return { ok: false, state, reason: `Bundled skill not found: ${state.bundledSkillPath}` };
  }
  if (state.installed && !state.managed && !options.force) {
    return { ok: false, state, needsConfirmation: true, reason: `${skillName} exists but is not managed by CMA` };
  }
  if (state.installed && state.managed && !state.updateAvailable && !options.force) {
    return { ok: true, state, unchanged: true, reason: `${skillName} is already installed` };
  }
  removeManagedSkillContents(state.skillPath);
  copyDirectoryContents(state.bundledSkillPath, state.skillPath);
  const bundledManifest = readBundledManifest(panel, skillName);
  writeJson(manifestPath(state.skillPath), {
    ...bundledManifest,
    name: skillName,
    installed_at: new Date().toISOString(),
    source: state.bundledSkillPath,
    target: state.skillPath,
  });
  return { ok: true, state: bundledSkillState(panel, skillName), installed: true };
}

module.exports = {
  BUNDLED_SKILLS,
  resolveCodexHome,
  resolveSkillsRoot,
  installedSkillDir,
  bundledSkillState,
  bundledSkillDir,
  listBundledSkillStates,
  installBundledSkill,
  readJson,
};
