function getDrawerLeafRenderersScript() {
  return `
      function kv(label, value) {
        return '<div class="kv"><div class="kv-label">' + esc(label) + '</div><div class="kv-value">' + esc(value || "-") + '</div></div>';
      }

      function drawerStat(label, value) {
        return '<div class="drawer-stat"><div class="drawer-stat-label">' + esc(label) + '</div><div class="drawer-stat-value">' + esc(value || "-") + '</div></div>';
      }

      function renderDrawerLogRow(log) {
        return '<div class="drawer-log"><div class="chat-head"><span>' + esc(log.level || "INFO") + '</span><span>' + esc(log.ts_iso || "") + '</span></div><div class="kv-value">' + esc(log.message || "") + '</div></div>';
      }

      function conversationItemText(item) {
        return String((item && (item.text || item.content || item.message)) || "").trim();
      }

      function conversationRole(item) {
        return String((item && item.role) || "assistant").toLowerCase() || "assistant";
      }

      function nextAssistantPreview(history, startIndex) {
        for (let index = startIndex + 1; index < history.length; index += 1) {
          const item = history[index];
          if (conversationRole(item) === "assistant") {
            const text = conversationItemText(item);
            if (text) return text;
          }
        }
        return "";
      }

      function renderConversationLocator(history) {
        const turns = (Array.isArray(history) ? history : [])
          .map((item, index) => ({ item, index, role: conversationRole(item), text: conversationItemText(item) }))
          .filter((entry) => entry.text && entry.role === "user");
        if (!turns.length) return "";
        return '<div class="conversation-locator" data-conversation-locator="true">' +
          '<div class="conversation-locator-head">' +
            '<div>' +
              '<div class="conversation-locator-title">Conversation Locator</div>' +
              '<div class="sub">Jump across long Codex conversations by user prompt, inspired by AI-MarkDone directory navigation.</div>' +
            '</div>' +
            '<input class="conversation-locator-search" data-conversation-locator-search="true" type="search" placeholder="Filter prompts" />' +
          '</div>' +
          '<div class="conversation-locator-list">' +
            turns.map((entry, turnIndex) => {
              const assistantPreview = nextAssistantPreview(history, entry.index);
              return '<button class="conversation-locator-item" data-conversation-jump="' + esc(String(entry.index)) + '" type="button">' +
                '<span class="conversation-locator-index">' + esc(String(turnIndex + 1)) + '</span>' +
                '<span class="conversation-locator-copy">' +
                  '<span class="conversation-locator-prompt">' + esc(short(entry.text, 96)) + '</span>' +
                  (assistantPreview ? '<span class="conversation-locator-preview">' + esc(short(assistantPreview, 112)) + '</span>' : '') +
                '</span>' +
              '</button>';
            }).join("") +
          '</div>' +
        '</div>';
      }

      function renderConversationRow(item, index) {
        const role = conversationRole(item);
        const timestamp = item && (item.ts || item.ts_iso) ? (item.ts || item.ts_iso) : "";
        return '<div class="chat ' + esc(role) + ' conversation-turn" data-conversation-turn="' + esc(String(index)) + '"><div class="chat-head"><span>' + esc(role) + '</span><span>' + esc(timestamp) + '</span></div><div class="chat-text">' + esc(conversationItemText(item)) + '</div></div>';
      }

      function renderDrawerMeta(thread, summary, payload, phase) {
        return [
          renderThreadFactBadges(Object.assign({}, summary, thread), payload),
          renderInferredActivityChip(phase),
          codexLinkBadge(thread.id, payload),
          renderCopyableThreadId(thread.id, { full: true }),
          (thread.model || summary.model) ? '<span class="meta-pill">' + esc(thread.model || summary.model) + '</span>' : '',
          (thread.reasoning_effort || summary.reasoning_effort) ? '<span class="meta-pill">' + esc(thread.reasoning_effort || summary.reasoning_effort) + '</span>' : ''
        ].join("");
      }

      function renderDrawerSummaryStats(thread, summary, logs, phase, coordination, visibilityLabel, linkLabel, processText) {
        return [
          drawerStat("Updated", summary.updated_age || thread.updated_at_iso || "-"),
          drawerStat("Last Log", summary.log_age || (logs[0] && logs[0].age) || "-"),
          drawerStat("Inferred activity", phase.label),
          drawerStat("Coordination", coordination.label + (coordination.explicit ? " · explicit" : "")),
          drawerStat("Next Owner", coordination.targetLabel || "-"),
          drawerStat("Visibility", visibilityLabel),
          drawerStat("Codex Link", linkLabel),
          drawerStat("Process", processText),
          drawerStat("Commands", String(threadCommandCount(Object.assign({}, summary, thread)))),
          drawerStat("Compactions", String(thread.compaction_count || summary.compaction_count || 0))
        ].join("");
      }

      function renderDrawerActionRail(thread, summary, coordination, isArchived, isSoftDeleted, pendingDrawerAction, confirmMeta, hardDeleteAction, actionNotice) {
        if (pendingDrawerAction) {
          return [
            '<span class="batch-intent' + (confirmMeta.tone === "danger" ? ' danger' : '') + '">' + esc(confirmMeta.intentLabel) + '</span>',
            '<span class="batch-preview">' + esc(confirmMeta.summary + " " + short(thread.title || thread.id || "thread", 52)) + '</span>',
            '<span class="batch-spacer"></span>',
            '<button class="action-btn secondary" data-drawer-cancel="true" type="button">Cancel</button>',
            '<button class="action-btn ' + esc(confirmMeta.tone) + '" data-drawer-confirm="' + esc(pendingDrawerAction.action) + '" data-drawer-thread="' + esc(thread.id || "") + '" type="button">' + esc(confirmMeta.confirmLabel) + '</button>'
          ].join("");
        }
        const traceToggleAction = state.ui.threadDrawerMode === "trace" ? "thread_overview" : "thread_trace";
        const traceToggleLabel = state.ui.threadDrawerMode === "trace" ? "Thread View" : "Trace";
        const conversationToggleAction = state.ui.threadDrawerMode === "conversation" ? "thread_overview" : "thread_conversation";
        const conversationToggleLabel = state.ui.threadDrawerMode === "conversation" ? "Thread View" : "Conversation";
        const baseActions = isSoftDeleted
          ? [
              renderQuickActionButton("open_editor", "Open in Editor", "secondary", thread.id || "", ""),
              renderQuickActionButton(traceToggleAction, traceToggleLabel, "secondary", thread.id || "", ""),
              renderQuickActionButton(conversationToggleAction, conversationToggleLabel, "secondary", thread.id || "", ""),
              renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
              renderTerminalResumeButton(thread, { className: "action-btn secondary", label: "Resume Terminal" }),
              renderQuickActionButton("set_handoff", coordination.explicit ? "Edit Handoff Cue" : "Cue Handoff", "secondary", thread.id || "", ""),
              (coordination.explicit ? renderQuickActionButton("clear_handoff", "Clear Cue", "secondary", thread.id || "", "") : ""),
              (coordination.targetThreadId ? renderQuickActionButton("focus_handoff_target", "Focus Target", "secondary", coordination.targetThreadId, "") : ""),
              renderActionButton("restore", "Restore", "secondary", "RS", thread.id || ""),
              hardDeleteAction,
              '<span class="action-status">' + esc(actionNotice || '') + '</span>'
            ]
          : [
              renderQuickActionButton("show_in_codex", "Show in Editor", "secondary", thread.id || "", thread.title || ""),
              renderQuickActionButton(traceToggleAction, traceToggleLabel, "secondary", thread.id || "", ""),
              renderQuickActionButton(conversationToggleAction, conversationToggleLabel, "secondary", thread.id || "", ""),
              renderQuickActionButton("sidebar", "Sidebar Codex", "secondary", thread.id || "", ""),
              renderTerminalResumeButton(thread, { className: "action-btn secondary", label: "Resume Terminal" }),
              renderQuickActionButton("set_handoff", coordination.explicit ? "Edit Handoff Cue" : "Cue Handoff", "secondary", thread.id || "", ""),
              (coordination.explicit ? renderQuickActionButton("clear_handoff", "Clear Cue", "secondary", thread.id || "", "") : ""),
              (coordination.targetThreadId ? renderQuickActionButton("focus_handoff_target", "Focus Target", "secondary", coordination.targetThreadId, "") : ""),
              renderActionButton(isArchived ? "unarchive" : "archive", isArchived ? "Unarchive" : "Hide from Codex", "secondary", isArchived ? "UA" : "AR", thread.id || ""),
              renderActionButton("soft_delete", "Soft Delete", "warn", "SD", thread.id || ""),
              hardDeleteAction,
              '<span class="action-status">' + esc(actionNotice || '') + '</span>'
            ];
        return baseActions.join("") + renderMemoryShortcutRow();
      }

      function sessionCodeChangesForThread(thread, payload) {
        const sourcePayload = payload && typeof payload === "object" ? payload : (state && state.payload ? state.payload : {});
        const traceDashboard = sourcePayload.traceDashboard && typeof sourcePayload.traceDashboard === "object"
          ? sourcePayload.traceDashboard
          : {};
        const selectedId = String(traceDashboard.selected_thread_id || (traceDashboard.selected && traceDashboard.selected.id) || "").trim();
        const threadId = String((thread && thread.id) || "").trim();
        if (selectedId && threadId && selectedId !== threadId) return [];
        const replay = traceDashboard.session_replay && typeof traceDashboard.session_replay === "object"
          ? traceDashboard.session_replay
          : {};
        return Array.isArray(replay.code_changes) ? replay.code_changes : [];
      }

      function renderCodeChangeEvidence(thread, payload) {
        const changes = sessionCodeChangesForThread(thread, payload).slice(-6);
        if (!changes.length) {
          return '<div class="empty">No apply_patch or unified diff evidence is available in the loaded session replay yet.</div>';
        }
        return '<div class="team-id-list">' + changes.map((change, index) => {
          const diff = change && change.diff && typeof change.diff === "object" ? change.diff : {};
          const files = Array.isArray(diff.files) ? diff.files : [];
          const fileRows = files.length
            ? files.map((file) => '<span class="meta-pill mono">' + esc(short(file, 48)) + '</span>').join("")
            : '<span class="meta-pill">Files unknown</span>';
          const stat = '+' + String(Number(diff.additions || 0)) + ' -' + String(Number(diff.deletions || 0));
          const title = (change && (change.summary || change.title)) || (diff.summary || "Code change");
          const preview = String(diff.preview || "").trim();
          const eventIndex = change && change.event_index !== undefined ? String(change.event_index) : String(index);
          return '<details class="code-change-evidence"' + (index === changes.length - 1 ? ' open' : '') + '>' +
            '<summary><span>' + esc(short(title, 96)) + '</span><span class="meta-pill">' + esc(stat) + '</span></summary>' +
            '<div class="meta-strip">' + fileRows + '</div>' +
            '<div class="team-id-row"><span class="team-id-label">' + esc(change.tool_name || diff.kind || "tool") + '</span><span class="team-id-value">' + esc(change.timestamp ? formatTimestamp(change.timestamp) : "session replay") + '</span></div>' +
            '<div class="action-row"><button class="action-btn secondary" data-open-session-diff="' + esc(eventIndex) + '" data-open-session-diff-thread="' + esc((thread && thread.id) || "") + '" type="button">Open VS Code Diff</button></div>' +
            (preview ? '<pre class="team-drawer-pre tall">' + esc(preview) + '</pre>' : '') +
          '</details>';
        }).join("") + '</div>';
      }

      function renderThreadTraceSketch(thread, summary, logs, history, detail, payload) {
        const merged = Object.assign({}, summary, thread);
        const tracePreview = detail && detail.thread_trace_preview && typeof detail.thread_trace_preview === "object"
          ? detail.thread_trace_preview
          : {};
        const counts = tracePreview.counts && typeof tracePreview.counts === "object" ? tracePreview.counts : {};
        const sourceSummary = tracePreview.source_summary && typeof tracePreview.source_summary === "object" ? tracePreview.source_summary : {};
        const timelineEvents = Array.isArray(tracePreview.events) ? tracePreview.events : [];
        const fileEvents = Array.isArray(tracePreview.file_events) ? tracePreview.file_events : [];
        const commandEvents = Array.isArray(tracePreview.command_events) ? tracePreview.command_events : [];
        const checkEvents = Array.isArray(tracePreview.check_events) ? tracePreview.check_events : [];
        const errorEvents = Array.isArray(tracePreview.error_events) ? tracePreview.error_events : [];
        const rawTracePath = String(sourceSummary.trace_lane || "").trim();
        const commandCount = Math.max(0, Number(counts.commands || threadCommandCount(merged)));
        const logCount = Math.max(0, Number(counts.logs || (Array.isArray(logs) ? logs.length : 0)));
        const messageCount = Math.max(0, Number(counts.messages || (Array.isArray(history) ? history.length : 0)));
        const processSummary = String(sourceSummary.process || ((summary && summary.process && summary.process.summary) || "No live process"));
        const tabs = [
          { label: "Timeline", count: Math.max(0, Number(counts.timeline || timelineEvents.length)) },
          { label: "Files", count: Math.max(0, Number(counts.files || 0)) },
          { label: "Commands", count: commandCount },
          { label: "Checks", count: Math.max(0, Number(counts.checks || 0)) },
          { label: "Errors", count: Math.max(0, Number(counts.errors || 0)) },
          { label: "Raw JSONL", count: Math.max(0, Number(counts.raw_jsonl || 0)) },
        ];
        return [
          '<div class="drawer-section">' +
            renderSectionHeading("Thread Trace", "TR") +
            '<div class="sub">Thread Trace is the single-thread audit surface. It stays separate from Team Trace so this drawer can explain one conversation thread even when it is not attached to a Team task.</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Trace Tabs", "TB") +
            '<div class="meta-strip">' +
              tabs.map((tab, index) => '<span class="meta-pill' + (index === 0 ? ' badge-running' : '') + '">' + esc(tab.label + ' ' + String(tab.count)) + '</span>').join('') +
            '</div>' +
            '<div class="action-row"><button class="action-btn secondary" data-export-trace-report="' + esc(thread.id || "") + '" type="button">Export Markdown Report</button></div>' +
            (rawTracePath
              ? '<div class="action-row"><button class="action-btn secondary" data-drawer-open-file="' + esc(rawTracePath) + '" data-drawer-open-file-label="Opened thread trace JSONL" type="button">Open Raw JSONL</button></div>'
              : '') +
            '<div class="sub">Timeline remains the primary entry. Files, Commands, Checks, and Errors now prefer structured thread trace events when the JSONL lane contains them; the Markdown export is a product-level trace report, not a raw Codex API request/response capture.</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Observable Sources", "OS") +
            '<div class="kv-grid">' +
              kv("Messages", String(messageCount)) +
              kv("Recent Logs", String(logCount)) +
              kv("Commands Seen", String(commandCount)) +
              kv("Process", processSummary) +
              kv("Updated", sourceSummary.updated || summary.updated_age || thread.updated_at_iso || "-") +
              kv("Thread ID", sourceSummary.thread_id || thread.id || "-") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Trace-backed Files", "FL") +
            (fileEvents.length
              ? '<div class="team-id-list">' + fileEvents.map((item) => (
                  '<div class="team-id-row"><span class="team-id-label">' + esc(item.source || "trace") + '</span><span class="team-id-value">' + esc(item.path || item.summary || "-") + (item.timestamp ? '<span class="meta-inline">' + esc(formatTimestamp(item.timestamp)) + '</span>' : '') + '</span></div>'
                )).join("") + '</div>'
              : '<div class="empty">No structured file events are available in the current thread trace lane yet.</div>') +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Code Changes", "DF") +
            '<div class="sub">Session evidence from apply_patch or unified diff tool payloads. This explains what a tool step claimed to change; Git controls still show current repository state.</div>' +
            renderCodeChangeEvidence(thread, payload) +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Trace-backed Commands", "CM") +
            (commandEvents.length
              ? '<div class="team-id-list">' + commandEvents.map((item) => (
                  '<div class="team-id-row"><span class="team-id-label">' + esc(item.label || item.source || "command") + '</span><span class="team-id-value">' + esc(item.command || item.summary || "-") + (item.count > 0 ? '<span class="meta-inline">' + esc("x" + String(item.count)) + '</span>' : '') + (item.timestamp ? '<span class="meta-inline">' + esc(formatTimestamp(item.timestamp)) + '</span>' : '') + '</span></div>'
                )).join("") + '</div>'
              : '<div class="empty">No structured command events are available in the current thread trace lane yet.</div>') +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Trace-backed Checks", "CK") +
            (checkEvents.length
              ? '<div class="team-id-list">' + checkEvents.map((item) => (
                  '<div class="team-id-row"><span class="team-id-label">' + esc(item.level || item.source || "check") + '</span><span class="team-id-value">' + esc(item.summary || "-") + (item.timestamp ? '<span class="meta-inline">' + esc(formatTimestamp(item.timestamp)) + '</span>' : '') + '</span></div>'
                )).join("") + '</div>'
              : '<div class="empty">No structured check events are available in the current thread trace lane yet.</div>') +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Trace-backed Errors", "ER") +
            (errorEvents.length
              ? '<div class="team-id-list">' + errorEvents.map((item) => (
                  '<div class="team-id-row"><span class="team-id-label">' + esc(item.level || item.source || "error") + '</span><span class="team-id-value">' + esc(item.summary || "-") + (item.timestamp ? '<span class="meta-inline">' + esc(formatTimestamp(item.timestamp)) + '</span>' : '') + '</span></div>'
                )).join("") + '</div>'
              : '<div class="empty">No structured error events are available in the current thread trace lane yet.</div>') +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Planned Timeline Coverage", "PL") +
            '<div class="team-id-list">' +
              [
                "Messages and resumed turns already visible to the extension",
                "Codex run/resume activity launched from this extension",
                "Command and log evidence that can be observed today",
                "File signals, checks, errors, and future checkpoint summaries",
              ].map((line) => (
                '<div class="team-id-row"><span class="team-id-label">Trace</span><span class="team-id-value">' + esc(line) + '</span></div>'
              )).join("") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Current Timeline Preview", "TP") +
            (timelineEvents.length
              ? '<div class="timeline-card phase-planning team-drawer-timeline"><div class="timeline-header"><div class="timeline-title">Thread Timeline</div><span class="meta-pill">' + esc(String(timelineEvents.length)) + '</span></div><div class="timeline-events">' +
                  timelineEvents.map((item) => renderTimelineEvent(item.title, item.timestamp ? formatTimestamp(item.timestamp) : "", item.copy, item.tone || "live")).join("") +
                '</div></div>'
              : '<div class="empty">No thread trace preview is available yet from current metadata.</div>') +
          '</div>'
        ].join("");
      }

      function renderDrawerBodySections(detail, thread, summary, logs, history, payload, phase, phaseClass, coordination) {
        const resumeCommand = (detail.hint_commands && detail.hint_commands.resume) || "";
        const forkCommand = (detail.hint_commands && detail.hint_commands.fork) || "";
        if (state.ui.threadDrawerMode === "trace") {
          return renderThreadTraceSketch(thread, summary, logs, history, detail, payload);
        }
        if (state.ui.threadDrawerMode === "conversation") {
          const conversationCount = Array.isArray(history) ? history.length : 0;
          const lastTs = conversationCount ? (history[conversationCount - 1].ts || history[conversationCount - 1].ts_iso || "") : "";
          return [
            '<div class="drawer-section">' +
              renderSectionHeading("Full Conversation", "CV") +
              '<div class="sub">' + esc(String(conversationCount)) + ' messages' + (lastTs ? ' · last ' + esc(lastTs) : '') + '</div>' +
              (conversationCount
                ? renderConversationLocator(history) + history.map((item, index) => renderConversationRow(item, index)).join("")
                : '<div class="empty">No conversation history available.</div>') +
            '</div>'
          ].join("");
        }
        return [
          '<div class="drawer-section">' +
            renderSectionHeading("Inferred Activity", "IA") +
            '<div class="phase-panel ' + esc(phaseClass) + '">' +
              '<div class="phase-head"><span class="phase-title">' + renderThemeVisual(phaseArtFor(phase.label), "phase-art", phase.label, "phase") + '<span class="phase-label">Inferred activity: ' + esc(phase.label) + '</span></span><span class="meta-pill">' + esc(threadFactSummaryLabel(Object.assign({}, summary, thread), payload)) + '</span></div>' +
              '<div class="phase-copy">' + esc(phase.copy) + '</div>' +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Overview", "OV") +
            '<div class="kv-grid">' +
              kv("Workspace", thread.cwd || summary.cwd || "-") +
              kv("Messages", String(Array.isArray(history) ? history.length : 0)) +
              kv("Created", thread.created_at_iso || "-") +
              kv("Updated", thread.updated_at_iso || "-") +
              kv("Last Log", summary.last_log_iso || (logs[0] && logs[0].ts_iso) || "-") +
              kv("Commands", String(threadCommandCount(Object.assign({}, summary, thread)))) +
              kv("Compactions", String(thread.compaction_count || summary.compaction_count || 0)) +
              kv("Provider", thread.model_provider || summary.model_provider || "-") +
              kv("CLI", thread.cli_version || summary.cli_version || "-") +
              kv("Tokens", String(summary.tokens_used || thread.tokens_used || 0)) +
              kv("Approval", thread.approval_mode || summary.approval_mode || "-") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Coordination", "CO") +
            '<div class="kv-grid">' +
              kv("State", coordination.label + (coordination.explicit ? " (explicit cue)" : "")) +
              kv("Bucket", coordination.bucket || "-") +
              kv("Next Owner", coordination.targetLabel || "-") +
              kv("Source", coordination.source || "-") +
            '</div>' +
            '<div class="sub">' + esc(coordination.reason || "No explicit handoff note available.") + '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Commands", "CM") +
            '<div class="cmd-grid">' +
              renderCommandCard("Resume in Terminal", resumeCommand, "Resume", thread.id || "", thread.cwd || summary.cwd || "") +
              renderCommandCard("Fork in Terminal", forkCommand, "Fork", thread.id || "", thread.cwd || summary.cwd || "") +
            '</div>' +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Thread Insight", "TI") +
            renderThreadInsightPanel(thread.id || "", detail.threadInsight) +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Working Memory", "WM") +
            renderMemoryShellGrid(payload) +
          '</div>',
          '<div class="drawer-section">' +
            renderSectionHeading("Recent Logs", "LG") +
            (logs.length
              ? logs.slice(0, 12).map((log) => renderDrawerLogRow(log)).join("")
              : '<div class="empty">No logs available.</div>') +
          '</div>'
        ].join("");
      }
  `.trim();
}

module.exports = {
  getDrawerLeafRenderersScript,
};
