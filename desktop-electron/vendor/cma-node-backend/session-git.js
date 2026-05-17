const childProcess = require("child_process");
const fs = require("fs");

const GIT_BRANCH_MAX_LENGTH = 64;
const GIT_BRANCH_TIMEOUT_MS = 120;

function emptyGitBranchMetadata(status = "unknown", error = null) {
  return {
    git_branch: null,
    git_branch_status: status,
    git_branch_error: error,
    git_has_remote: false,
    git_remote_name: null,
  };
}

function sanitizeGitBranchName(value) {
  const text = String(value || "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!text) return null;
  const withoutRef = text.replace(/^refs\/heads\//, "").trim();
  if (!withoutRef || /https?:\/\//i.test(withoutRef)) return null;
  const sanitized = withoutRef.replace(/[^A-Za-z0-9_.:/-]+/g, "_").slice(0, GIT_BRANCH_MAX_LENGTH).replace(/^[._:/-]+|[._:/-]+$/g, "");
  return sanitized || null;
}

function runGit(cwd, args) {
  const result = childProcess.spawnSync("git", ["-C", cwd, ...args], {
    cwd,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    encoding: "utf8",
    timeout: GIT_BRANCH_TIMEOUT_MS,
    windowsHide: true,
  });
  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    error: result.error ? String(result.error.message || result.error) : null,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function readGitRemoteMetadata(cwd) {
  const result = runGit(cwd, ["remote"]);
  if (!result.ok) {
    return {
      git_has_remote: false,
      git_remote_name: null,
    };
  }
  const remotes = result.stdout
    .split(/\r?\n/)
    .map((remote) => sanitizeGitBranchName(remote))
    .filter(Boolean);
  const remoteName = remotes.includes("origin") ? "origin" : (remotes[0] || null);
  return {
    git_has_remote: Boolean(remoteName),
    git_remote_name: remoteName,
  };
}

function readGitBranchMetadata(cwd) {
  const root = String(cwd || "").trim();
  if (!root) return emptyGitBranchMetadata();
  try {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return emptyGitBranchMetadata();
  } catch (error) {
    return emptyGitBranchMetadata("error", error instanceof Error ? error.message : String(error));
  }

  const inside = runGit(root, ["rev-parse", "--is-inside-work-tree"]);
  if (!inside.ok || inside.stdout !== "true") {
    if (inside.error && /timed out|timeout/i.test(inside.error)) return emptyGitBranchMetadata("error", inside.error);
    return emptyGitBranchMetadata("not_git_repo");
  }

  const branchResult = runGit(root, ["symbolic-ref", "--quiet", "--short", "HEAD"]);
  const branch = sanitizeGitBranchName(branchResult.stdout);
  const remoteMetadata = readGitRemoteMetadata(root);
  if (branch) {
    return {
      git_branch: branch,
      git_branch_status: "known",
      git_branch_error: null,
      ...remoteMetadata,
    };
  }

  const detachedResult = runGit(root, ["rev-parse", "--short", "HEAD"]);
  const detached = sanitizeGitBranchName(detachedResult.stdout);
  if (detached) {
    return {
      git_branch: detached,
      git_branch_status: "detached",
      git_branch_error: null,
      ...remoteMetadata,
    };
  }
  return {
    ...emptyGitBranchMetadata(branchResult.error || detachedResult.error ? "error" : "unknown", branchResult.error || detachedResult.error || null),
    ...remoteMetadata,
  };
}

function gitBranchMetadataForCwd(cwd, cache) {
  const key = String(cwd || "").trim();
  if (!key) return emptyGitBranchMetadata();
  if (!cache || typeof cache.get !== "function" || typeof cache.set !== "function") {
    return readGitBranchMetadata(key);
  }
  if (!cache.has(key)) cache.set(key, readGitBranchMetadata(key));
  return cache.get(key);
}

module.exports = {
  emptyGitBranchMetadata,
  gitBranchMetadataForCwd,
  readGitBranchMetadata,
};
