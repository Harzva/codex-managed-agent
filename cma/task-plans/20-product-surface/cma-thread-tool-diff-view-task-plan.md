# CMA Thread Tool Diff View Task Plan

## Goal

Make existing CMA Thread drawer and Trace views better at explaining what happened
inside a Codex session, without building a separate log workbench.

This plan is intentionally narrow. CMA remains a VS Code-native multi-thread
watch surface. The work adds readable evidence to existing Thread, Trace, and
Insights paths instead of creating a new database product.

## Current Fit

CMA already has:

- Thread Explorer grouped by project, lifecycle, and status.
- Thread drawer modes for Overview, Conversation, and Trace.
- Session replay parsing in `src/host/trace-dashboard.js`.
- Thread trace previews in `src/host/state-sync.js`.
- Token and tool aggregate panels in Insights.
- Optional, cached AI advice through `src/host/thread-insight.js`.

The useful gap is not another navigation shell. The gap is richer local evidence:
tool calls, tool results, and code changes should be readable where the user is
already inspecting a thread.

## Non-Goals

- Do not build a standalone CC Log Workbench clone.
- Do not index every byte of every JSONL file in the first pass.
- Do not auto-run AI summaries during background scans.
- Do not replace Git status, Git diff, or VS Code's native source control UI.
- Do not infer repository history from incomplete session data.

## Product Behavior

### Tool Summaries

Default tool summaries are deterministic and local:

- Tool name.
- Command, file path, query, or operation target when available.
- Exit or error cue when visible.
- Short result text.
- Diff stats when the payload contains patch or unified diff text.

AI summaries remain explicit user actions only:

- Summarize this thread.
- Explain this failure.
- Extract reusable lessons.

Generated summaries must be cached and based on compact local summaries, not raw
full transcripts.

### Diff Rendering

Diff rendering is session-evidence rendering, not a replacement for `git diff`.

- `git diff` answers: what is different now versus a Git baseline?
- Tool diff answers: what did this specific tool call or tool result claim to
  change during this session?

First-pass diff sources:

- `apply_patch` input.
- Shell output containing unified diff text.
- Trace file events that already mention changed files.

The first UI should render a compact diff preview inside the existing Thread
Trace drawer. A later button can open VS Code's native diff editor only when CMA
has enough before/after material to do so accurately.

## Implementation Slices

### Slice 1: Structured Diff Metadata

Add deterministic diff extraction to session replay parsing.

- Detect `apply_patch` payloads.
- Detect unified diff text in tool output.
- Extract changed files and added/deleted line counts.
- Preserve a bounded preview string for rendering.
- Add focused unit coverage in `trace-dashboard.test.js`.

### Slice 2: Existing Drawer Rendering

Render the structured diff metadata in the current Thread Trace drawer.

- Add a "Code Changes" section to `src/webview/drawer-runtime.js`.
- Show file chips, stats, and a bounded diff preview.
- Do not add a new top-level view.
- Keep raw JSONL and Markdown export actions unchanged.

### Slice 3: Thread-Local Search

Extend only existing local search surfaces.

- Conversation locator keeps searching user prompts.
- Thread Explorer search can include tool and file summaries already loaded.
- Full cross-session indexing is deferred until there is a proven need.

### Slice 4: Optional AI Review

Reuse the existing cached thread insight pattern.

- Add an explicit "Summarize Thread Evidence" action later.
- Feed compact message/tool/diff summaries, not full raw JSONL.
- Cache outputs and mark stale by session fingerprint.

## Acceptance Criteria

- Opening an existing Thread Trace can show code-change evidence when the
  session contains `apply_patch` or unified diff payloads.
- Tool/diff summaries are produced without AI.
- Existing Git controls still mean current Git state, not historical tool state.
- Tests cover the parser contract for apply_patch and unified diff events.
- No unrelated files are reformatted or cleaned.

## Execution Log

- 2026-05-10: Plan created. Starting Slice 1 with deterministic diff metadata.
- 2026-05-10: Completed the first implementation slice:
  - `parseSessionReplay` now extracts bounded code-change metadata from
    `apply_patch` payloads and unified diff tool output.
  - Thread Trace drawer now renders a `Code Changes` section from loaded session
    replay evidence.
  - Added focused host and webview regression coverage.
- 2026-05-10: Added a conservative `Open VS Code Diff` path for session tool
  diffs. The action opens temporary before/after excerpt files through VS Code's
  native diff command. It is explicitly session evidence and not current Git
  state.
- 2026-05-10: Completed the narrow Thread Explorer search slice:
  - Existing search now matches loaded lifecycle tools, command summaries,
    current thread trace file/command evidence, and session code-change files.
  - Added `tool:` and `file:` field filters without adding a cross-session
    index or AI summarization path.
- 2026-05-10: Completed the explicit AI review slice:
  - Added a `Summarize Thread Evidence` action to the existing Thread Insight
    panel.
  - The action uses compact local summaries of messages, logs, trace commands,
    trace files, and session code changes; no background scan triggers AI.
  - Results are cached separately from vibe advice and surfaced with loading,
    error, cached, and stale states.
