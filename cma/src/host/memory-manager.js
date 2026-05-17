const fs = require("fs");
const path = require("path");
const os = require("os");

const MEMORY_FILE_NAMES = ["AGENTS.md", "config.toml", "history.jsonl"];

function resolveCodexHome() {
  return process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
}

function resolveSystemCodexDir() {
  return "/etc/codex";
}

function resolveProjectCodexDir(workspacePath) {
  return workspacePath ? path.join(workspacePath, ".codex") : "";
}

function resolveProjectTeamDir(workspacePath) {
  return workspacePath ? path.join(workspacePath, ".codex-team") : "";
}

function statMemoryFile(filePath) {
  try {
    const stat = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    return {
      filePath,
      exists: true,
      size: stat.size,
      lineCount: content.split(/\r?\n/).length,
      lastModified: stat.mtime.toISOString(),
      preview: content.slice(0, 800),
      tokens: Math.ceil(content.length / 4),
    };
  } catch {
    return { filePath, exists: false };
  }
}

function scanMemoryScope(scope, baseDir, options = {}) {
  const files = [];
  if (!baseDir || !fs.existsSync(baseDir)) return files;

  for (const name of MEMORY_FILE_NAMES) {
    const filePath = path.join(baseDir, name);
    const meta = statMemoryFile(filePath);
    if (meta.exists || options.includeMissing) {
      files.push({
        kind: name === "AGENTS.md" ? "agents-md" : name === "config.toml" ? "config-toml" : "history-jsonl",
        scope,
        name,
        ...meta,
        editable: name !== "history.jsonl",
      });
    }
  }

  if (options.includeTeamDir) {
    const teamDir = baseDir.replace(/\.codex$/, ".codex-team");
    if (fs.existsSync(teamDir)) {
      files.push({
        kind: "team-state",
        scope,
        name: ".codex-team/",
        filePath: teamDir,
        exists: true,
        isDirectory: true,
        editable: false,
      });
    }
  }

  return files;
}

function scanAllMemory(workspacePath) {
  return {
    project: {
      cwd: workspacePath || null,
      files: workspacePath
        ? scanMemoryScope("project", resolveProjectCodexDir(workspacePath), { includeMissing: true, includeTeamDir: true })
        : [],
    },
    global: {
      home: os.homedir(),
      files: scanMemoryScope("global", resolveCodexHome(), { includeMissing: true }),
    },
    system: {
      files: scanMemoryScope("system", resolveSystemCodexDir(), { includeMissing: true }),
    },
  };
}

const TEMPLATES = {
  minimal: `# Project Instructions\n\n## Commands\n\n\x60\x60\x60bash\n# Dev\nnpm run dev\n\n# Test\nnpm test\n\x60\x60\x60\n\n## Rules\n\n- Always run tests before committing.\n`,
  full: `# Project Instructions\n\n## Commands\n\n\x60\x60\x60bash\n# Dev\nnpm run dev\n\n# Build\nnpm run build\n\n# Test\nnpm test\n\n# Lint\nnpm run lint\n\x60\x60\x60\n\n## Architecture\n\n- Add your stack here.\n\n## Rules\n\n- Always write tests for new features.\n- Do not commit secrets.\n`,
};

function createAgentsMdFromTemplate(templateKey, targetPath) {
  let content = TEMPLATES[templateKey] || TEMPLATES.minimal;
  if (templateKey === "from-global") {
    const globalPath = path.join(resolveCodexHome(), "AGENTS.md");
    try {
      content = fs.readFileSync(globalPath, "utf8");
    } catch {
      content = TEMPLATES.minimal;
    }
  }
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, "utf8");
    return { ok: true, filePath: targetPath, content };
  } catch (err) {
    return { ok: false, filePath: targetPath, error: err.message };
  }
}

function readHistoryJsonl(filePath, options = {}) {
  const maxLines = options.maxLines || 1000;
  const entries = [];
  let totalLines = 0;
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/).filter(Boolean);
    totalLines = lines.length;
    const start = Math.max(0, lines.length - maxLines);
    for (let i = start; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]);
        entries.push({
          index: i + 1,
          role: String(entry.role || "unknown"),
          content: String(entry.content || entry.output || ""),
          toolName: entry.name || null,
          toolInput: entry.input || null,
          timestamp: entry.timestamp || "",
        });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    return { entries: [], totalLines: 0, truncated: false, filePath, error: "Could not read file" };
  }
  return { entries, totalLines, truncated: totalLines > maxLines, filePath };
}

function saveMemoryFile(filePath, content) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, filePath, error: err.message };
  }
}

module.exports = {
  scanAllMemory,
  statMemoryFile,
  saveMemoryFile,
  createAgentsMdFromTemplate,
  readHistoryJsonl,
};
