# Non-Negotiable Project Guardrails

These instructions override broader guidance for this repository.

## Do Not Lose Work

- Do not delete, move, rename, overwrite, or regenerate files unless the user
  explicitly requested that exact operation.
- Do not "clean up" untracked files, task plans, evolution notes, screenshots,
  demos, backups, recovered files, or temporary research artifacts just because
  they look unrelated.
- Do not revert user changes. If a file has existing edits, work with them or
  ask before touching overlapping lines.
- Do not run broad formatters or codemods across the repo unless the user
  explicitly requests a formatting/refactor pass.

## Preserve Meaning

- Do not simplify away behavior, copy, statuses, telemetry, trace evidence,
  account switching semantics, or lifecycle state just to reduce code size.
- Do not replace specific product language with generic wording.
- Do not change UI structure, navigation, command names, configuration keys,
  storage schemas, or public contracts unless the task explicitly requires it.
- If a requested change conflicts with existing behavior, stop and explain the
  conflict before making a larger product decision.

## Scope Control

- Touch the minimum file set needed for the task.
- Keep unrelated refactors out of feature and bug-fix changes.
- Treat `package.json`, `package-lock.json`, `.vscodeignore`, extension
  activation events, command IDs, and backend API contracts as high-risk files.
- Treat account/auth/session files and anything under `~/.codex` as sensitive;
  never print secrets or modify auth material unless explicitly requested.

## Commit And Handoff

- Every completed task must end with a fresh `git status --short`.
- If the user requested a commit, stage only the intended files and commit with
  a precise message.
- If the user did not request a commit, do not commit automatically. State the
  exact files that are ready to commit and mention any unrelated dirty files
  were left untouched.
- Never claim work is complete without saying what validation ran or why it was
  skipped.
