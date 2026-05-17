const SNAKE_DEMO_PROMPT = `You are a worker in a Codex-Managed-Agent team space.

Team task: build a small playable Snake game demo in this workspace.

Requirements:
- Inspect the repository first and choose the smallest appropriate place for a demo.
- Create a playable browser-based Snake game with keyboard controls, score, restart, and game-over state.
- Keep it lightweight and self-contained. Prefer plain HTML/CSS/JS unless the repo clearly has an app framework already.
- Add or update a short README note explaining how to run the demo.
- Run a basic verification command that fits the repo, or explain why no automated check is available.
- When finished, report a result envelope with summary, outputs, checks_run, open_risks, and next_request.

Boundaries:
- Do not delete existing source files.
- Do not change package metadata unless it is required to run the demo.
- Keep the implementation scoped to this demo.`;

module.exports = {
  SNAKE_DEMO_PROMPT,
};
