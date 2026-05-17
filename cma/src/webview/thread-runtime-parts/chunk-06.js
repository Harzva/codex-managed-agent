module.exports = `      }

      function clearRunningDropIndicator() {
        state.runningDropIndicator = undefined;
      }

      function clearRunningDragState() {
        clearRunningDropIndicator();
        state.draggedRunningThreadId = undefined;
        state.activeBoardId = undefined;
        state.pointerBoardDrag = undefined;
        state.pendingBoardDragPointer = undefined;
        state.pendingDragPointer = undefined;
        state.pendingDragIndicator = undefined;
        state.dragMetricCache = undefined;
        state.lastDropOverlayKey = "";
        if (state.boardDragRaf) {
          window.cancelAnimationFrame(state.boardDragRaf);
          state.boardDragRaf = 0;
        }
        syncRunningDropIndicatorDom();
      }

      function resetRunningDropIndicator(boardId) {
        cancelScheduledDragIndicator();
        clearRunningDropIndicator();
        if (boardId !== undefined) {
          state.activeBoardId = boardId;
        }
        markDragBoardActive(state.draggedRunningThreadId ? state.activeBoardId : undefined);
        syncRunningDropIndicatorDom();
      }

      function syncRunningDropIndicatorDom() {
        const board = document.getElementById(state.activeBoardId || "statusBoardPrimary");
        const overlay = document.getElementById("boardDropOverlayPrimary");
        if (!overlay) return;
        if (!board) {
          overlay.style.transform = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.classList.remove("visible");
          state.lastDropOverlayKey = "";
          return;
        }
        if (board.id !== "statusBoardPrimary") {
          overlay.style.transform = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.classList.remove("visible");
          state.lastDropOverlayKey = "";
          return;
        }
        if (state.runningDropIndicator && state.runningDropIndicator.col && state.runningDropIndicator.row) {
          const snapshot = cachedBoardMetricSnapshot(board);
          const metrics = snapshot.metrics;
          const preview = dropPreviewMetrics(board, undefined, metrics);
          const left = metrics.paddingLeft + (state.runningDropIndicator.col - 1) * (metrics.width + metrics.gap);
          const top = metrics.paddingTop + (state.runningDropIndicator.row - 1) * (metrics.rowHeight + metrics.gap);
          const nextKey = [
            Math.round(left),
            Math.round(top),
            Math.round(preview.width),
            Math.round(preview.height),
          ].join(":");
          if (state.lastDropOverlayKey !== nextKey) {
            overlay.style.transform = "translate3d(" + String(Math.round(left)) + "px, " + String(Math.round(top)) + "px, 0)";
            overlay.style.width = String(Math.round(preview.width)) + "px";
            overlay.style.height = String(Math.round(preview.height)) + "px";
            state.lastDropOverlayKey = nextKey;
          }
          overlay.classList.add("visible");
        } else {
          overlay.style.transform = "";
          overlay.style.width = "";
          overlay.style.height = "";
          overlay.classList.remove("visible");
          state.lastDropOverlayKey = "";
        }
      }

      function toggleLayoutLock() {
        state.ui.layoutLocked = !state.ui.layoutLocked;
        persistUi();
        render(state.payload);
      }

      function resetRunningLayout() {
        state.ui.runningCardOrder = [];
        state.ui.runningCardSizes = {};
        state.ui.runningCardLayout = {};
        state.ui.runningCardPositions = {};
        state.ui.layoutLocked = false;
        persistUi();
        render(state.payload);
      }

      function isSelected(threadId) {
        return Boolean(state.ui.selected[threadId]);
      }

      function toggleSelected(threadId) {
        clearPendingBatch();
        if (state.ui.selected[threadId]) {
          delete state.ui.selected[threadId];
        } else {
          state.ui.selected[threadId] = true;
        }
        persistUi();
        render(state.payload);
      }

      function parseGroupThreadIds(value) {
        try {
          const ids = JSON.parse(value || "[]");
          return Array.isArray(ids) ? ids.map((id) => String(id || "")).filter(Boolean) : [];
        } catch (error) {
          return [];
        }
      }

      function toggleGroupSelection(threadIds) {
        const ids = [...new Set((threadIds || []).map((id) => String(id || "")).filter(Boolean))];
        if (!ids.length) return;
        clearPendingBatch();
        const allSelected = ids.every((threadId) => isSelected(threadId));
        ids.forEach((threadId) => {
          if (allSelected) {
            delete state.ui.selected[threadId];
          } else {
            state.ui.selected[threadId] = true;
          }
        });
        persistUi();
        render(state.payload);
      }

      function clearSelection() {
        clearPendingBatch();
        state.ui.selected = {};
        persistUi();
        render(state.payload);
      }

      function topicFocusMatches(thread, focus) {
        if (!focus || !thread) return true;
        const title = normalize(thread.title);
        const cwd = normalize(thread.cwd);
        const haystack = [title, cwd, normalize(thread.id), normalize(thread.updated_at_iso)].join(" ");
        if (focus.group === "keyword") {
          return haystack.includes(normalize(focus.value));
        }
        if (focus.group === "thread") {
          return thread.id === focus.threadId;
        }
        if (focus.group === "style") {
          const styleMap = {
            "规划型": ["计划", "规划", "plan", "roadmap", "方案", "设计"],
            "执行型": ["fix", "实现", "run", "deploy", "build", "改", "修"],
            "探索型": ["分析", "analyze", "compare", "search", "inspect", "review"],
            "自动化型": ["loop", "auto", "daemon", "tmux", "nohup", "监控", "自动"],
            "界面型": ["ui", "theme", "layout", "board", "card", "界面", "布局", "主题"],
          };
          const tokens = styleMap[focus.value] || [focus.value];
          return tokens.some((token) => haystack.includes(normalize(token)));
        }
        return true;
      }

      function applyTopicFocus(focus) {
        state.ui.topicFocus = focus || null;
        state.ui.currentView = "threads";
        if (focus && focus.group === "keyword") {
          state.ui.search = focus.value || "";
          state.ui.filter = "all";
        } else if (focus && focus.group === "thread") {
          state.ui.search = "";
          state.ui.filter = "all";
          setSelectedThread(focus.threadId, { view: "threads", openDrawer: true, scrollIntoView: true });
        } else if (focus && focus.group === "style") {
          state.ui.search = "";
          state.ui.filter = "all";
        }
        persistUi();
        render(state.payload);
      }

      function applyRootFilter(root) {
        const nextRoot = root && state.ui.rootFilter === root ? null : (root || null);
        state.ui.rootFilter = nextRoot;
        state.ui.rootFilterMenuOpen = false;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function applyWorkspaceFilter() {
        state.ui.workspaceFilter = !state.ui.workspaceFilter;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function applyModelFilter(modelLabel) {
        const nextLabel = String(modelLabel || "").trim();
        state.ui.modelFilter = nextLabel;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function currentThreadGroupKeys() {
        const dashboard = (state.payload && state.payload.dashboard) || {};
        const visibleThreads = (dashboard.threads || []).filter(threadMatches);
        if (state.ui.sort === "project") {
          const projectGroups = buildProjectDirectoryGroups(visibleThreads);
          return [
            ...(projectGroups.running.length ? ["running"] : []),
            ...projectGroups.projects.map((group) => group.key),
          ];
        }
        return ["running", "pinned", "needs_human", "stopped", "archived", "soft_deleted"];
      }

      function setThreadGroupsExpanded(expanded) {
        const groupKeys = currentThreadGroupKeys();
        groupKeys.forEach((key) => {
          state.ui.groups[key] = Boolean(expanded);
        });
        persistUi();
        render(state.payload);
      }

      function areMostThreadGroupsExpanded() {
        const groupKeys = currentThreadGroupKeys();
        if (!groupKeys.length) return false;
        const expandedCount = groupKeys.filter((key) => state.ui.groups[key] !== false).length;
        return expandedCount >= Math.ceil(groupKeys.length / 2);
      }

      function toggleThreadGroupsExpanded() {
        setThreadGroupsExpanded(!areMostThreadGroupsExpanded());
      }

      function threadMatches(thread) {
        const searchQuery = parseThreadSearchQuery(state.ui.search);
        const haystack = threadSearchHaystack(thread);

        const effectiveStatus = effectiveThreadStatus(thread);
        const facts = threadStateFacts(thread);
        const archived = facts.visibility === "archived";
        const softDeleted = facts.visibility === "soft_deleted";
        const running = facts.process === "running";
        const stopped = facts.process === "stopped";
        const status = facts.process;
        const recent = effectiveStatus === "recent";
        const linked = effectiveStatus === "linked";

        const matchesQuery = threadMatchesSearchQuery(thread, searchQuery, haystack, status, {
          archived,
          softDeleted,
          running,
          stopped,
          recent,
          linked,
        });
        const matchesTopic = topicFocusMatches(thread, state.ui.topicFocus);
        const rootKey = threadRootKey(thread);
        const rootLabel = threadRootLabel(thread);
        const workspaceRoots = activeWorkspaceRootKeys();
        const matchesRoot = !state.ui.rootFilter
          || rootKey === state.ui.rootFilter
          || rootLabel === state.ui.rootFilter
          || compactRootIdentity(thread.cwd) === state.ui.rootFilter;
        const matchesWorkspace = !state.ui.workspaceFilter || !workspaceRoots.size || workspaceRoots.has(rootKey);
        const gitFilter = activeGitFilterKey();
        const matchesGit = gitFilter === "all" || threadGitFilterKey(thread) === gitFilter;
        const modelFilter = String(state.ui.modelFilter || "").trim();
        const matchesModel = !modelFilter || threadModelChartLabel(thread) === modelFilter;
        const threadTabFilter = activeThreadTabFilterKey();
        const matchesThreadTab = threadTabFilter === "all" || boardTabFor(thread.id) === threadTabFilter;
        const matchesFilter =
          state.ui.filter === "all" ||
          (state.ui.filter === "running" && running) ||
          (state.ui.filter === "recent" && (recent || linked)) ||
          (state.ui.filter === "idle" && stopped && !archived && !softDeleted) ||
          (state.ui.filter === "needs_human" && needsHumanIntervention(thread)) ||
          (state.ui.filter === "archived" && archived) ||
          (state.ui.filter === "soft_deleted" && softDeleted);
        const matchesPinned = !state.ui.pinnedOnly || isPinned(thread.id);
        return matchesQuery && matchesTopic && matchesRoot && matchesWorkspace && matchesGit && matchesModel && matchesThreadTab && matchesFilter && matchesPinned;
      }

      function sortThreads(threads) {
        return [...threads].sort((a, b) => {
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          if (state.ui.sort === "project") {
            const rootDelta = String(threadRootLabel(a) || threadRootKey(a) || "").localeCompare(String(threadRootLabel(b) || threadRootKey(b) || ""), undefined, { sensitivity: "base", numeric: true })
              || String(threadRootKey(a) || "").localeCompare(String(threadRootKey(b) || ""));
            if (rootDelta) return rootDelta;
            const aRunning = threadStateFacts(a).process === "running" ? 1 : 0;
            const bRunning = threadStateFacts(b).process === "running" ? 1 : 0;
            if (aRunning !== bRunning) return bRunning - aRunning;
            return (Number(b.updated_at || 0) - Number(a.updated_at || 0))
              || String(a.id || "").localeCompare(String(b.id || ""));
          }
          if (state.ui.sort === "oldest") {
            return (Number(a.updated_at || 0) - Number(b.updated_at || 0))
              || (Number(a.created_at || 0) - Number(b.created_at || 0));
          }
          if (state.ui.sort === "created") {
            return (Number(b.created_at || 0) - Number(a.created_at || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          if (state.ui.sort === "name_asc" || state.ui.sort === "name_desc") {
            const delta = displayThreadTitle(a, "").localeCompare(displayThreadTitle(b, ""), undefined, { sensitivity: "base", numeric: true })
              || String(a.id || "").localeCompare(String(b.id || ""));
            return state.ui.sort === "name_asc" ? delta : -delta;
          }
          if (state.ui.sort === "tokens_desc") {
            return (Number(b.tokens_used || 0) - Number(a.tokens_used || 0))
              || (Number(b.updated_at || 0) - Number(a.updated_at || 0));
          }
          return (Number(b.updated_at || 0) - Number(a.updated_at || 0))
            || (Number(b.last_log_ts || 0) - Number(a.last_log_ts || 0));
        });
      }

      function projectGroupAccent(rootKey) {
        const text = String(rootKey || "-");
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
          hash ^= text.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        const hue = Math.abs(hash >>> 0) % 360;
        const saturation = 64 + ((hash >>> 8) % 12);
        const lightness = 54 + ((hash >>> 16) % 8);
        return "hsl(" + hue + " " + saturation + "% " + lightness + "%)";
      }

      function extractThreadProgress(thread) {
        const messages = (thread.preview_logs || []).map((item) => item.message || item.target || "").filter(Boolean);
        for (const message of messages) {
          const pctMatch = message.match(/(?:^|\\b)(100|[1-9]?\\d)\\s?%/);
          if (pctMatch) {
            const percent = Math.max(0, Math.min(100, Number(pctMatch[1])));
            return {
              percent,
              label: percent >= 100 ? "Completed" : "Estimated progress",
              note: short(message, 120),
            };
          }
          const ratioMatch = message.match(/(\\d{1,4})\\s*\\/\\s*(\\d{1,4})/);
          if (ratioMatch) {
            const current = Number(ratioMatch[1]);
            const total = Number(ratioMatch[2]);
            if (Number.isFinite(current) && Number.isFinite(total) && total > 0) {
              const percent = Math.max(0, Math.min(100, Math.round((current / total) * 100)));
              return {
                percent,
                label: "Estimated progress",
                note: short(message, 120),
              };
            }
          }
        }
        return {
          percent: undefined,
          label: "Live status",
          note: messages[0] ? short(messages[0], 120) : "No explicit progress marker found in recent logs yet.",
        };
      }

      function boardBadge(thread) {
        if ((thread.board_source || "") === "attached" && effectiveThreadStatus(thread) !== "running") {
          return '<span class="badge badge-board" title="This thread is attached to the current board group">Board Group Attached</span>';
        }
        if ((thread.board_source || "") === "linked") {
          return '<span class="badge badge-linked" title="This thread is linked on the board">Board Linked</span>';
        }
        return "";
      }

      function needsHumanIntervention(thread) {
        return Boolean(effectiveCoordinationTruth(thread).needsHuman);
      }

      function inferCodexPhase(thread) {
        const logMessages = (thread.preview_logs || []).map((item) => item.message || item.target || "").filter(Boolean);
        const historyTexts = (thread.history || []).map((item) => item.text || "").filter(Boolean);
        const corpus = [...logMessages, ...historyTexts].join(" \\n").toLowerCase();
        const latest = logMessages[0] || historyTexts[0] || "";
        const status = normalize(thread.status);
        if (!corpus && status !== "running") {
          return {
            label: "Waiting",
            copy: "Pinned on the board and ready to reopen when you need it.",
          };
        }

        const planningRe = /plan|planning|todo|next step|roadmap|slice|outline|proposal|strategy|break down|decompose|milestone|task list/;
        const toolingRe = /tool call|spawn|agent|terminal|shell|command|uvicorn|server|process|session|attach|resume|fork|openexternal|webview|panel|workspace|rg /;
        const editingRe = /patch|update file|write file|apply_patch|rename|create file|delete file|move to|refactor|implement|edit|change code|modify/;
        const testingRe = /pytest|npm run|package|build|compile|check|validate|test|lint|verify|vsce|py_compile|node --check/;
        const waitingRe = /waiting|idle|standby|queued|sleep|no live process|no explicit progress marker|ready to reopen|ready for inspection/;

        if (planningRe.test(corpus)) {
          return {
            label: "Planning",
            copy: short(latest || "The agent is likely outlining tasks or deciding the next step.", 120),
          };
        }
        if (toolingRe.test(corpus)) {
          return {
            label: "Tooling",
            copy: short(latest || "The agent is orchestrating tools, terminals, sessions, or environment setup.", 120),
          };
        }
        if (editingRe.test(corpus)) {
          return {
            label: "Editing",
            copy: short(latest || "The agent appears to be modifying files right now.", 120),
          };
        }
        if (testingRe.test(corpus)) {
          return {
            label: "Testing",
            copy: short(latest || "The agent is validating code or packaging output.", 120),
          };
        }
        if (/search|open|read|inspect|analy|trace|grep|find /.test(corpus)) {
          return {
            label: "Tooling",
            copy: short(latest || "The agent is reading project context and exploring state.", 120),
          };
        }
        if (waitingRe.test(corpus) || status === "recent") {
          return {
            label: "Waiting",
            copy: short(latest || "The agent has paused and is waiting for the next steer or follow-up.", 120),
          };
        }
        if (status === "running") {
          return {
            label: "Tooling",
            copy: short(latest || "The agent is active, but the current phase is inferred from limited logs.", 120),
          };
        }
        return {
          label: "Waiting",
          copy: short(latest || "Recent activity is available, but no stronger phase signal was found.", 120),
        };
      }

      function codexLinkMeta(threadId, payload = state.payload) {
        prunePendingCodexLinks();
        const projection = tabProjectionFor(payload);
        const openThreadIds = Array.isArray(projection.openThreadIds) ? projection.openThreadIds : [];
        const isFocused = Boolean(threadId) && projection.focusedThreadId === threadId;
        const isSidebar = Boolean(threadId) && projection.sidebarThreadId === threadId;
        const isOpen = Boolean(threadId) && (openThreadIds.includes(threadId) || isSidebar);
        if (isOpen || isFocused) {
          delete state.ui.pendingCodexLink[threadId];
        }
        const pending = Boolean(threadId) ? state.ui.pendingCodexLink[threadId] : undefined;
        return { isOpen, isFocused, isSidebar, pending };
      }

      function codexVisibilityLabel(thread, payload = state.payload) {
`;
