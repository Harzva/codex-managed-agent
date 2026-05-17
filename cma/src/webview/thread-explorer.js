function getThreadExplorerRenderersScript() {
  return `
      function renderThreadBaseDirectory(thread) {
        const root = threadRootKey(thread);
        if (!root) return "";
        return '<div class="thread-base-directory">' +
          '<span class="base-label">Base directory:</span>' +
          '<span class="base-path mono">' + esc(root) + '</span>' +
        '</div>';
      }

      function buildGroups(threads) {
        const groups = {
          pinned: [],
          running: [],
          stopped: [],
          needs_human: [],
          archived: [],
          soft_deleted: []
        };
        for (const thread of sortThreads(threads)) {
          const facts = threadStateFacts(thread);
          if (facts.process === "running") {
            groups.running.push(thread);
            continue;
          }
          if (facts.visibility === "soft_deleted") {
            groups.soft_deleted.push(thread);
            continue;
          }
          if (facts.visibility === "archived") {
            groups.archived.push(thread);
            continue;
          }
          if (isPinned(thread.id)) {
            groups.pinned.push(thread);
            continue;
          }
          if (facts.attention === "needs_human") groups.needs_human.push(thread);
          else groups.stopped.push(thread);
        }
        return groups;
      }

      function sortProjectDirectoryThreads(threads) {
        return [...(threads || [])].sort((a, b) =>
          (Number(b.updated_at || 0) - Number(a.updated_at || 0))
          || (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0))
          || displayThreadTitle(a, "").localeCompare(displayThreadTitle(b, ""), undefined, { sensitivity: "base", numeric: true })
          || String(a.id || "").localeCompare(String(b.id || "")));
      }

      function buildProjectDirectoryGroups(threads) {
        const groups = new Map();
        const running = [];
        for (const thread of threads || []) {
          const facts = threadStateFacts(thread);
          if (facts.process === "running") {
            running.push(thread);
            continue;
          }
          const rootKey = threadRootKey(thread) || "-";
          const current = groups.get(rootKey);
          if (current) {
            current.threads.push(thread);
            continue;
          }
          groups.set(rootKey, {
            key: "project:" + rootKey,
            label: threadRootLabel(thread) || rootKey,
            title: threadRootKey(thread) || rootKey,
            threads: [thread],
          });
        }
        return {
          running: sortProjectDirectoryThreads(running),
          projects: [...groups.values()]
            .map((group) => Object.assign({}, group, { threads: sortProjectDirectoryThreads(group.threads) }))
            .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), undefined, { sensitivity: "base", numeric: true })
              || String(a.title || "").localeCompare(String(b.title || ""))),
        };
      }

      function buildRootGroups(threads) {
        const groups = new Map();
        (threads || []).forEach((thread) => {
          const rootKey = threadRootKey(thread) || "-";
          const current = groups.get(rootKey);
          if (current) {
            current.threads.push(thread);
            return;
          }
          groups.set(rootKey, {
            rootKey,
            rootLabel: threadRootLabel(thread),
            threads: [thread],
          });
        });
        return [...groups.values()].sort((a, b) =>
          String(a.rootLabel || "").localeCompare(String(b.rootLabel || ""))
          || String(a.rootKey || "").localeCompare(String(b.rootKey || "")));
      }

      function renderRootSubgroup(rootGroup) {
        return '<div class="root-subgroup" data-root-group="' + esc(rootGroup.rootKey || "-") + '">' +
          '<div class="root-subgroup-head">' +
            '<span class="meta-pill mono" title="' + esc(rootGroup.rootKey || "-") + '">Root ' + esc(short(rootGroup.rootLabel || "-", 20)) + '</span>' +
            '<span class="group-count root-group-count">' + esc(String((rootGroup.threads || []).length)) + '</span>' +
          '</div>' +
          (rootGroup.threads || []).map(renderThreadRow).join("") +
        '</div>';
      }

      function renderGroup(groupKey, label, threads, options = {}) {
        if (!threads.length && !options.showWhenEmpty) return "";
        const openByDefault = options.openByDefault !== undefined ? Boolean(options.openByDefault) : Boolean(state.ui.groups[groupKey]);
        const openAttr = state.ui.groups[groupKey] !== undefined ? (state.ui.groups[groupKey] ? " open" : "") : (openByDefault ? " open" : "");
        const groupThreadIds = threads.map((thread) => thread.id).filter(Boolean);
        const groupAllSelected = groupThreadIds.length && groupThreadIds.every((threadId) => isSelected(threadId));
        const groupSomeSelected = groupThreadIds.some((threadId) => isSelected(threadId));
        const groupSelectClass = groupAllSelected ? " selected" : (groupSomeSelected ? " partial" : "");
        const groupSelectMark = groupAllSelected ? "✓" : (groupSomeSelected ? "-" : "");
        const groupSelectLabel = (groupAllSelected ? "Deselect all " : "Select all ") + label + " threads";
        const groupBoardAttached = areThreadsBoardAttached(groupThreadIds);
        const groupBoardLabel = groupBoardAttached ? "Board group attached" : "Attach board group";
        const groupBoardTitle = groupBoardAttached
          ? "Remove this whole group from the board"
          : "Attach this whole group to the board";
        const rootMarkup = options.flatRows ? threads.map(renderThreadRow).join("") : buildRootGroups(threads).map(renderRootSubgroup).join("");
        const groupTitle = options.title || label;
        const groupClass = String(groupKey || "group").replace(/[^a-z0-9_-]/gi, "_");
        const projectClass = options.projectRootKey ? " project-group" : "";
        const projectStyle = options.projectRootKey ? ' style="--project-accent: ' + esc(projectGroupAccent(options.projectRootKey)) + '"' : "";
        return '<details class="group-block group-' + esc(groupClass) + projectClass + '"' + openAttr + ' data-group="' + esc(groupKey) + '"' + projectStyle + '>' +
          '<summary class="group-summary"><span class="group-title-cluster">' +
            '<button class="group-select-btn' + groupSelectClass + '" data-select-group="' + esc(groupKey) + '" data-group-thread-ids="' + esc(JSON.stringify(groupThreadIds)) + '" title="' + esc(groupSelectLabel) + '" aria-label="' + esc(groupSelectLabel) + '" type="button">' + groupSelectMark + '</button>' +
            '<span class="group-label-dot"></span><span title="' + esc(groupTitle) + '">' + esc(label) + '</span>' +
          '</span><span class="group-summary-actions"><button class="group-board-btn' + (groupBoardAttached ? ' active' : '') + '" data-board-toggle-group="' + esc(groupKey) + '" data-group-thread-ids="' + esc(JSON.stringify(groupThreadIds)) + '" title="' + esc(groupBoardTitle) + '" aria-pressed="' + esc(groupBoardAttached ? "true" : "false") + '" type="button">' + esc(groupBoardLabel) + '</button><span class="group-count">' + esc(String(threads.length)) + '</span></span></summary>' +
          rootMarkup +
        '</details>';
      }

      function renderThreadGroups(filteredThreads, totalThreadCount) {
        if (state.ui.sort === "project") {
          const projectGroups = buildProjectDirectoryGroups(filteredThreads);
          const markup = [
            renderGroup("running", "Running", projectGroups.running, { openByDefault: true }),
            ...projectGroups.projects.map((group) => renderGroup(group.key, "Project: " + short(group.label || group.title || "-", 56), group.threads, {
              flatRows: true,
              openByDefault: true,
              title: group.title || group.label || "-",
              projectRootKey: group.title || group.label || group.key,
            })),
          ].join("");
          return markup || renderThreadListEmptyMarkup(totalThreadCount);
        }
        const groups = buildGroups(filteredThreads);
        return [
          renderGroup("running", "Running", groups.running),
          renderGroup("pinned", "Pinned", groups.pinned),
          renderGroup("needs_human", "Needs Human Attention", groups.needs_human),
          renderGroup("stopped", "Stopped", groups.stopped),
          renderGroup("archived", "Archived", groups.archived, { showWhenEmpty: true }),
          renderGroup("soft_deleted", "Soft Deleted", groups.soft_deleted, { showWhenEmpty: true })
        ].join("") || renderThreadListEmptyMarkup(totalThreadCount);
      }

      function renderThreadVisibilityPill(thread, payload = state.payload) {
        const label = codexVisibilityLabel(thread, payload);
        if (label === "Visible") return "";
        return '<span class="meta-pill">Vis ' + esc(label) + '</span>';
      }

      function renderThreadLifecycleLine(thread) {
        const lifecycle = thread && thread.lifecycle && typeof thread.lifecycle === "object" ? thread.lifecycle : {};
        const lifecycleState = String(lifecycle.state || "unknown").trim() || "unknown";
        const reason = String(lifecycle.reason || "").trim();
        const tools = Array.isArray(lifecycle.recent_tools) ? lifecycle.recent_tools.filter(Boolean).slice(0, 3) : [];
        if (!lifecycleState || lifecycleState === "unknown") return "";
        const label = typeof lifecycleStateLabel === "function" ? lifecycleStateLabel(lifecycleState) : (lifecycleState === "unknown" ? "No lifecycle" : lifecycleState.replace(/_/g, " "));
        return '<div class="thread-lifecycle-line lifecycle-' + esc(lifecycleState) + '">' +
          '<span class="thread-lifecycle-state">' + esc(label) + '</span>' +
          (reason ? '<span class="thread-lifecycle-reason">' + esc(reason) + '</span>' : '') +
          (tools.length ? '<span class="thread-lifecycle-tools">' + tools.map((tool) => '<span class="thread-lifecycle-tool">' + esc(short(tool, 18)) + '</span>').join("") + '</span>' : '') +
        '</div>';
      }

      function renderThreadRow(thread) {
        const active = state.selectedThreadId === thread.id ? " active" : "";
        const selectedClass = isSelected(thread.id) ? " selected" : "";
        const pinnedClass = isPinned(thread.id) ? " pinned" : "";
        const status = effectiveThreadStatus(thread);
        const linkMeta = codexLinkMeta(thread.id);
        const linkBadge = codexLinkBadge(thread.id);
        const codexClass = linkMeta.isFocused ? " codex-focused" : (linkMeta.isOpen ? " codex-open" : "");
        const boardAttached = isBoardAttached(thread.id);
        const loopManaged = isLoopManagedThread(thread.id);
        const updatedTitle = threadUpdatedTitle(thread);
        const drawerActive = state.selectedThreadId === thread.id && state.ui.drawerOpen;
        const inspectorActive = drawerActive && state.ui.threadDrawerMode !== "conversation" && state.ui.threadDrawerMode !== "trace";
        const chatActive = drawerActive && state.ui.threadDrawerMode === "conversation";
        const traceActive = drawerActive && state.ui.threadDrawerMode === "trace";
        const gitActions = renderGitActionMenu(thread, { className: "thread-quick-action git-action", pushClassName: "thread-quick-action git-action git-push" });
        return '<div class="thread-row' + active + selectedClass + codexClass + '" data-thread-id="' + esc(thread.id) + '">' +
          '<div class="thread-topline">' +
            '<div class="thread-status-cluster">' +
              '<button class="select-btn' + (isSelected(thread.id) ? ' selected' : '') + '" data-select-thread="' + esc(thread.id) + '" type="button">' + (isSelected(thread.id) ? '✓' : '') + '</button>' +
              '<span data-thread-status-badge="' + esc(thread.id) + '">' + renderThreadFactBadges(thread) + '</span>' +
              renderEditableCardName(thread, { maxLength: 46 }) +
              '<span data-thread-loop-managed-badge="' + esc(thread.id) + '">' + renderLoopManagedBadge(thread.id) + '</span>' +
              '<span data-thread-auto-loop-badge="' + esc(thread.id) + '">' + renderThreadAutoLoopBadge(thread.id) + '</span>' +
              '<span data-thread-pending-prompt="' + esc(thread.id) + '">' + renderPendingPromptBadge(thread.id) + '</span>' +
              '<span data-thread-link-badge="' + esc(thread.id) + '">' + linkBadge + '</span>' +
              renderCopyableThreadId(thread.id, { prefix: "ID ", maxLength: 18, className: "thread-top-id" }) +
            '</div>' +
            '<div class="thread-actions-inline">' +
              '<span class="thread-updated mono' + threadUpdatedClass(thread) + '"' + (updatedTitle ? ' title="' + esc(updatedTitle) + '"' : '') + '>' + esc(threadUpdatedLabel(thread)) + '</span>' +
              renderTerminalResumeButton(thread) +
              '<button class="mini-action-btn" data-codex-thread="' + esc(thread.id) + '" type="button">Codex</button>' +
              '<details class="more-menu"><summary class="more-trigger"><button class="mini-action-btn more-btn" type="button">•••</button></summary><div class="more-panel">' +
                '<button class="mini-action-btn attach-board' + (boardAttached ? ' attached' : '') + '" data-board-attach="' + esc(thread.id) + '" type="button">' + (boardAttached ? 'Unattach Board' : 'Attach Board') + '</button>' +
                (boardAttached ? '<button class="mini-action-btn locate" data-locate-board="' + esc(thread.id) + '" type="button">Locate Board</button>' : '') +
                '<button class="mini-action-btn attach-loop' + (loopManaged ? ' attached' : '') + '"' + (loopManaged ? ' disabled' : ' data-set-loop-managed="' + esc(thread.id) + '"') + ' type="button">' + esc(loopManaged ? "Loop Attached" : "Attach Loop") + '</button>' +
                (loopManaged ? '<button class="mini-action-btn locate" data-locate-loop="' + esc(thread.id) + '" type="button">Locate Loop</button>' : '') +
                '<button class="pin-btn' + pinnedClass + '" data-pin-thread="' + esc(thread.id) + '" type="button">' + (isPinned(thread.id) ? "Pinned" : "Pin") + '</button>' +
              '</div></details>' +
            '</div>' +
          '</div>' +
          renderInlineCardTitle(thread, "thread-title", 72, "(no title)") +
          renderThreadBaseDirectory(thread) +
          '<div class="thread-meta">' +
            renderCopyableThreadId(thread.id, { maxLength: 20 }) +
            renderRootIdentityPill(thread, { interactive: true }) +
            renderGitBranchPill(thread) +
            renderBoardTabPill(thread) +
            (thread.pending_new_agent ? '<span class="meta-pill">Waiting for session import</span>' : '') +
            '<span data-thread-visibility-pill="' + esc(thread.id) + '">' + renderThreadVisibilityPill(thread) + '</span>' +
            renderThreadCoordinationMeta(thread) +
            renderThreadModelMeta(thread) +
            renderThreadUsageMeta(thread) +
            '<span class="meta-pill" data-thread-status-meta="' + esc(thread.id) + '">' + esc(threadFactSummaryLabel(thread)) + '</span>' +
          '</div>' +
          renderThreadLifecycleLine(thread) +
          '<div class="thread-quick-actions" aria-label="Thread quick actions">' +
            '<button class="thread-quick-action quick-cmd" data-open-conversation="' + esc(thread.id) + '" type="button">Cmd ' + esc(String(threadCommandCount(thread))) + '</button>' +
            '<button class="thread-quick-action quick-cmp" type="button" disabled>Cmp ' + esc(String(thread.compaction_count || 0)) + '</button>' +
            gitActions +
          '</div>' +
          '<div class="thread-tab-actions" aria-label="Thread detail tabs">' +
            '<button class="thread-tab-action' + (inspectorActive ? ' active' : '') + '" data-open-inspector="' + esc(thread.id) + '" type="button">Inspector</button>' +
            '<button class="thread-tab-action' + (chatActive ? ' active' : '') + '" data-open-conversation="' + esc(thread.id) + '" type="button">Chat</button>' +
            '<button class="thread-tab-action' + (traceActive ? ' active' : '') + '" data-open-thread-trace="' + esc(thread.id) + '" type="button">Trace</button>' +
            '<button class="thread-tab-action" data-set-board-tab="' + esc(thread.id) + '" data-current-board-tab="' + esc(boardTabFor(thread.id)) + '" type="button">' + esc(boardTabFor(thread.id) ? ('Tab: ' + boardTabFor(thread.id)) : '+ Tab') + '</button>' +
          '</div>' +
        '</div>';
      }
  `.trim();
}

module.exports = {
  getThreadExplorerRenderersScript,
};
