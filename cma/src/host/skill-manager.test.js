const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("path");
const fs = require("fs");
const os = require("os");

const {
  scanInstalledSkills,
  scanBundledSkills,
  readSkillDetail,
  mergeSkillLists,
  searchSkills,
  getSkillDetailForPayload,
} = require("./skill-manager");

test("readSkillDetail reads manifest, SKILL.md, and file tree", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "skill-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "references"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, ".cma-skill-manifest.json"), JSON.stringify({ name: "test-skill", version: "1.0.0" }));
    fs.writeFileSync(path.join(tmpDir, "SKILL.md"), "# Test Skill\n");
    fs.writeFileSync(path.join(tmpDir, "scripts", "run.sh"), "#!/bin/sh\n");
    fs.writeFileSync(path.join(tmpDir, "references", "ref.md"), "Ref\n");

    const detail = readSkillDetail(tmpDir);
    assert.equal(detail.manifest.name, "test-skill");
    assert.equal(detail.hasSkillMd, true);
    assert.ok(detail.skillMd.includes("# Test Skill"));
    assert.deepEqual(detail.scripts, ["scripts/run.sh"]);
    assert.deepEqual(detail.references, ["references/ref.md"]);
    assert.deepEqual(detail.agents, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("scanInstalledSkills returns normalized skills from ~/.codex/skills", () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-"));
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = tmpHome;
  try {
    const skillsDir = path.join(tmpHome, "skills", "my-skill");
    fs.mkdirSync(path.join(skillsDir, "scripts"), { recursive: true });
    fs.writeFileSync(
      path.join(skillsDir, ".cma-skill-manifest.json"),
      JSON.stringify({ name: "my-skill", title: "My Skill", version: "2.0.0", description: "A test skill.", tags: ["test"] }),
    );
    fs.writeFileSync(path.join(skillsDir, "SKILL.md"), "# My Skill\n");
    fs.writeFileSync(path.join(skillsDir, "scripts", "script.sh"), "echo ok\n");

    const skills = scanInstalledSkills();
    assert.equal(skills.length, 1);
    const skill = skills[0];
    assert.equal(skill.name, "my-skill");
    assert.equal(skill.title, "My Skill");
    assert.equal(skill.version, "2.0.0");
    assert.equal(skill.installed, true);
    assert.equal(skill.bundled, false);
    assert.deepEqual(skill.tags, ["test"]);
    assert.equal(skill.hasSkillMd, true);
    assert.deepEqual(skill.scripts, ["scripts/script.sh"]);
  } finally {
    process.env.CODEX_HOME = originalCodexHome;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test("scanInstalledSkills handles missing manifests gracefully", () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "codex-home-"));
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = tmpHome;
  try {
    const skillsDir = path.join(tmpHome, "skills", "no-manifest");
    fs.mkdirSync(skillsDir, { recursive: true });
    fs.writeFileSync(path.join(skillsDir, "SKILL.md"), "# No Manifest\n");

    const skills = scanInstalledSkills();
    assert.equal(skills.length, 1);
    assert.equal(skills[0].name, "no-manifest");
    assert.equal(skills[0].version, "0.0.0");
    assert.equal(skills[0].installed, true);
  } finally {
    process.env.CODEX_HOME = originalCodexHome;
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

test("mergeSkillLists merges bundled and installed data", () => {
  const installed = [
    {
      name: "codex-loop",
      title: "Installed Loop",
      description: "Installed desc",
      version: "1.0.0",
      installed: true,
      bundled: false,
      managed: true,
      updateAvailable: false,
      tags: ["a"],
      manifest: { a: 1 },
      skillPath: "/installed/codex-loop",
      bundledPath: null,
      hasSkillMd: true,
      scripts: ["s1"],
      references: ["r1"],
      agents: [],
      files: ["s1", "r1"],
      skillMd: "# Installed",
    },
  ];
  const bundled = [
    {
      name: "codex-loop",
      title: "Bundled Loop",
      description: "Bundled desc",
      version: "2.0.0",
      installed: false,
      bundled: true,
      managed: false,
      updateAvailable: true,
      tags: ["b"],
      manifest: { b: 2 },
      skillPath: "/installed/codex-loop",
      bundledPath: "/bundled/codex-loop",
      hasSkillMd: false,
      scripts: ["s2"],
      references: ["r2"],
      agents: ["a1"],
      files: ["s2", "r2", "a1"],
      skillMd: "",
    },
  ];
  const merged = mergeSkillLists(installed, bundled);
  assert.equal(merged.length, 1);
  const skill = merged[0];
  assert.equal(skill.installed, true);
  assert.equal(skill.bundled, true);
  assert.equal(skill.managed, true);
  assert.equal(skill.updateAvailable, true);
  assert.equal(skill.version, "1.0.0");
  assert.equal(skill.bundledPath, "/bundled/codex-loop");
  assert.deepEqual(skill.scripts, ["s1", "s2"]);
  assert.deepEqual(skill.references, ["r1", "r2"]);
  assert.deepEqual(skill.agents, ["a1"]);
  assert.equal(skill.skillMd, "# Installed");
});

test("mergeSkillLists keeps only-installed and only-bundled skills", () => {
  const installed = [{ name: "only-installed", title: "O", description: "", version: "1", installed: true, bundled: false, managed: false, updateAvailable: false, tags: [], manifest: {}, skillPath: "/a", bundledPath: null, hasSkillMd: false, scripts: [], references: [], agents: [], files: [], skillMd: "" }];
  const bundled = [{ name: "only-bundled", title: "B", description: "", version: "1", installed: false, bundled: true, managed: false, updateAvailable: false, tags: [], manifest: {}, skillPath: null, bundledPath: "/b", hasSkillMd: false, scripts: [], references: [], agents: [], files: [], skillMd: "" }];
  const merged = mergeSkillLists(installed, bundled);
  assert.equal(merged.length, 2);
  assert.ok(merged.some((s) => s.name === "only-installed"));
  assert.ok(merged.some((s) => s.name === "only-bundled"));
});

test("searchSkills matches name, tags, description, and SKILL.md content", () => {
  const skills = [
    { name: "codex-loop", title: "Codex Loop", description: "Plan-driven recurring iteration", version: "1", tags: ["automation"], skillMd: "Continue roadmap tasks" },
    { name: "team-reflective-loop", title: "Team Reflective Loop", description: "Mailbox workflow", version: "1", tags: ["team"], skillMd: "Review blocked work" },
    { name: "frontend-polish", title: "Frontend Polish", description: "UI quality pass", version: "1", tags: ["design"], skillMd: "Layout and accessibility" },
  ];

  assert.deepEqual(searchSkills("automation", skills).map((skill) => skill.name), ["codex-loop"]);
  assert.deepEqual(searchSkills("mailbox", skills).map((skill) => skill.name), ["team-reflective-loop"]);
  assert.deepEqual(searchSkills("roadmap tasks", skills).map((skill) => skill.name), ["codex-loop"]);
  assert.deepEqual(searchSkills("", skills).map((skill) => skill.name), ["codex-loop", "team-reflective-loop", "frontend-polish"]);
});

test("getSkillDetailForPayload strips skillMd", () => {
  const skill = {
    name: "x",
    title: "X",
    description: "",
    version: "1",
    installed: true,
    bundled: true,
    managed: true,
    updateAvailable: false,
    tags: [],
    manifest: {},
    skillPath: "/a",
    bundledPath: "/b",
    hasSkillMd: true,
    scripts: [],
    references: [],
    agents: [],
    files: [],
    skillMd: "# Secret",
  };
  const payload = getSkillDetailForPayload(skill);
  assert.equal(payload.skillMd, undefined);
  assert.equal(payload.skillMdPreview, "# Secret");
  assert.equal(payload.hasSkillMd, true);
  assert.equal(payload.name, "x");
});
