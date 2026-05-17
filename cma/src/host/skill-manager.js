const fs = require("fs");
const path = require("path");

const {
  BUNDLED_SKILLS,
  resolveSkillsRoot,
  bundledSkillState,
  bundledSkillDir,
  readJson,
} = require("./bundled-skills");

function walkSkillFiles(skillDir, subdir) {
  const targetDir = path.join(skillDir, subdir);
  if (!fs.existsSync(targetDir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relativePath = path.join(subdir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkSkillFiles(skillDir, relativePath));
    } else {
      results.push(relativePath);
    }
  }
  return results;
}

function readSkillDetail(skillPath) {
  const manifest = readJson(path.join(skillPath, ".cma-skill-manifest.json"), {});
  const skillMdPath = path.join(skillPath, "SKILL.md");
  const hasSkillMd = fs.existsSync(skillMdPath);
  let skillMd = "";
  if (hasSkillMd) {
    try {
      skillMd = fs.readFileSync(skillMdPath, "utf8");
    } catch {
      skillMd = "";
    }
  }
  const scripts = walkSkillFiles(skillPath, "scripts");
  const references = walkSkillFiles(skillPath, "references");
  const agents = walkSkillFiles(skillPath, "agents");
  return {
    manifest,
    skillMd,
    hasSkillMd,
    scripts,
    references,
    agents,
    files: [...scripts, ...references, ...agents],
  };
}

function scanInstalledSkills() {
  const skillsRoot = resolveSkillsRoot();
  if (!fs.existsSync(skillsRoot)) return [];
  const results = [];
  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsRoot, entry.name);
    const manifest = readJson(path.join(skillPath, ".cma-skill-manifest.json"), {});
    const detail = readSkillDetail(skillPath);
    results.push({
      name: entry.name,
      title: String(manifest.title || entry.name),
      description: String(manifest.description || ""),
      version: String(manifest.version || "0.0.0"),
      installed: true,
      bundled: false,
      managed: Boolean(manifest.managed_by === "codex-managed-agent"),
      updateAvailable: false,
      tags: Array.isArray(manifest.tags) ? manifest.tags : [],
      manifest,
      skillPath,
      bundledPath: null,
      hasSkillMd: detail.hasSkillMd,
      scripts: detail.scripts,
      references: detail.references,
      agents: detail.agents,
      files: detail.files,
      skillMd: detail.skillMd,
    });
  }
  return results;
}

function scanBundledSkills(panel) {
  return BUNDLED_SKILLS.map((definition) => {
    const state = bundledSkillState(panel, definition.name);
    const bundledPath = bundledSkillDir(panel, definition.name);
    const detail = readSkillDetail(bundledPath);
    return {
      name: definition.name,
      title: state.title || definition.title || definition.name,
      description: state.description || definition.description || "",
      version: state.bundledVersion || "0.0.0",
      installed: state.installed,
      bundled: true,
      managed: state.managed,
      updateAvailable: state.updateAvailable,
      tags: Array.isArray(detail.manifest.tags) ? detail.manifest.tags : [],
      manifest: detail.manifest,
      skillPath: state.skillPath,
      bundledPath,
      hasSkillMd: detail.hasSkillMd,
      scripts: detail.scripts,
      references: detail.references,
      agents: detail.agents,
      files: detail.files,
      skillMd: detail.skillMd,
    };
  });
}

function mergeSkillLists(installed, bundled) {
  const map = new Map();
  for (const skill of installed) {
    map.set(skill.name, { ...skill });
  }
  for (const skill of bundled) {
    const existing = map.get(skill.name);
    if (existing) {
      map.set(skill.name, {
        ...existing,
        bundled: true,
        bundledPath: skill.bundledPath,
        managed: skill.managed || existing.managed,
        updateAvailable: skill.updateAvailable,
        version: existing.version || skill.version,
        description: existing.description || skill.description,
        title: existing.title || skill.title,
        tags: existing.tags.length ? existing.tags : skill.tags,
        manifest: { ...skill.manifest, ...existing.manifest },
        hasSkillMd: existing.hasSkillMd || skill.hasSkillMd,
        scripts: Array.from(new Set([...existing.scripts, ...skill.scripts])),
        references: Array.from(new Set([...existing.references, ...skill.references])),
        agents: Array.from(new Set([...existing.agents, ...skill.agents])),
        files: Array.from(new Set([...existing.files, ...skill.files])),
        skillMd: existing.skillMd || skill.skillMd,
      });
    } else {
      map.set(skill.name, { ...skill });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function listAllSkillStates(panel) {
  const installed = scanInstalledSkills();
  const bundled = scanBundledSkills(panel);
  return mergeSkillLists(installed, bundled);
}

function skillSearchText(skill) {
  return [
    skill.name,
    skill.title,
    skill.description,
    skill.version,
    ...(Array.isArray(skill.tags) ? skill.tags : []),
    skill.skillMd,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

function searchSkills(query, skills) {
  const terms = String(query || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) return [...skills];
  return skills
    .map((skill) => {
      const haystack = skillSearchText(skill);
      const matched = terms.every((term) => haystack.includes(term));
      if (!matched) return null;
      const name = String(skill.name || "").toLowerCase();
      const title = String(skill.title || "").toLowerCase();
      const score = terms.reduce((total, term) => {
        if (name === term || title === term) return total + 8;
        if (name.includes(term) || title.includes(term)) return total + 5;
        if ((skill.tags || []).some((tag) => String(tag).toLowerCase().includes(term))) return total + 3;
        return total + 1;
      }, 0);
      return { skill, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .map((entry) => entry.skill);
}

function getSkillDetailForPayload(skill) {
  return {
    name: skill.name,
    title: skill.title,
    description: skill.description,
    version: skill.version,
    installed: skill.installed,
    bundled: skill.bundled,
    managed: skill.managed,
    updateAvailable: skill.updateAvailable,
    tags: skill.tags,
    manifest: skill.manifest,
    skillPath: skill.skillPath,
    bundledPath: skill.bundledPath,
    hasSkillMd: skill.hasSkillMd,
    scripts: skill.scripts,
    references: skill.references,
    agents: skill.agents,
    files: skill.files,
    skillMdPreview: skill.skillMd,
  };
}

module.exports = {
  scanInstalledSkills,
  scanBundledSkills,
  readSkillDetail,
  mergeSkillLists,
  searchSkills,
  listAllSkillStates,
  getSkillDetailForPayload,
};
