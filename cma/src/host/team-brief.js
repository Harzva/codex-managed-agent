const path = require("path");

function buildTeamBrief(workspacePath) {
  const label = path.basename(workspacePath || "") || "workspace";
  return `# Team Brief

Workspace: ${label}

## Shared Goal
- Keep multiple Codex threads aligned inside one shared task space.

## Operating Rules
- Treat this file as the human-readable operating brief.
- Treat \`tasks/*.json\`, \`events/*.jsonl\`, and \`agents/*.json\` as the structured coordination source.
- Do not use this file as the only source of task truth.

## Shared Context
- Add durable links, constraints, and review notes here.

## Active Focus
- Keep the current milestone and handoff notes concise and current.
`;
}

module.exports = {
  buildTeamBrief,
};
