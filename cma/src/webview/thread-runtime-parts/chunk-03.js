module.exports = `      }

      function isSearchFieldChar(char, index) {
        if (!char) return false;
        const code = char.charCodeAt(0);
        const isAlpha = (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
        const isDigit = code >= 48 && code <= 57;
        return isAlpha || char === "_" || char === "-" || (index > 0 && isDigit);
      }

      function readSearchFieldName(source, start) {
        let index = start;
        let name = "";
        while (index < source.length && isSearchFieldChar(source[index], index - start)) {
          name += source[index];
          index += 1;
        }
        if (!name || source[index] !== ":") return null;
        return { name, end: index + 1 };
      }

      function readSearchValue(source, start) {
        if (source[start] === '"') {
          let index = start + 1;
          let value = "";
          while (index < source.length) {
            if (source[index] === '"') {
              return { value, end: index + 1, valid: true };
            }
            value += source[index];
            index += 1;
          }
          return { value, end: source.length, valid: false };
        }
        let index = start;
        let value = "";
        while (index < source.length && !isSearchWhitespace(source[index])) {
          value += source[index];
          index += 1;
        }
        return { value, end: index, valid: true };
      }

      function parseSearchBoolean(value) {
        const normalized = normalize(value).trim();
        if (["1", "true", "yes", "y", "pinned"].includes(normalized)) return true;
        if (["0", "false", "no", "n", "unpinned"].includes(normalized)) return false;
        return undefined;
      }

      function parseThreadSearchQuery(rawSearch) {
        const source = String(rawSearch || "");
        const plain = normalize(source).trim();
        const parsed = {
          raw: source,
          plain,
          textTerms: [],
          constraints: emptySearchConstraints(),
          hasGrammar: false,
          invalid: false,
        };
        let index = 0;
        while (index < source.length) {
          while (index < source.length && isSearchWhitespace(source[index])) index += 1;
          if (index >= source.length) break;
          const tokenStart = index;
          const field = readSearchFieldName(source, index);
          if (field) {
            const fieldName = normalize(field.name).trim();
            const valueResult = readSearchValue(source, field.end);
            const rawToken = source.slice(tokenStart, valueResult.end);
            index = valueResult.end;
            if (!THREAD_SEARCH_GRAMMAR_FIELDS.includes(fieldName)) {
              parsed.textTerms.push(rawToken);
              continue;
            }
            const value = String(valueResult.value || "").trim();
            if (!valueResult.valid || !value || (fieldName === "pinned" && parseSearchBoolean(value) === undefined)) {
              parsed.invalid = true;
              return parsed;
            }
            parsed.constraints[fieldName].push(value);
            parsed.hasGrammar = true;
            continue;
          }
          let token = "";
          while (index < source.length && !isSearchWhitespace(source[index])) {
            token += source[index];
            index += 1;
          }
          if (token) parsed.textTerms.push(token);
        }
        return parsed;
      }

      function normalizeSearchEnum(value) {
        return normalize(value).trim().replace(/ +/g, "_").replace(/-+/g, "_");
      }

      function searchFieldIncludes(candidate, values) {
        const haystack = normalize(candidate);
        return values.some((value) => haystack.includes(normalize(value).trim()));
      }

      function searchFieldEqualsAny(candidates, values) {
        const normalizedCandidates = candidates.map(normalizeSearchEnum).filter(Boolean);
        return values.some((value) => normalizedCandidates.includes(normalizeSearchEnum(value)));
      }

      function threadSearchStatusValues(thread, status, flags) {
        const values = [status];
        if (flags.running) values.push("running");
        if (flags.stopped) values.push("stopped", "idle", "waiting");
        if (flags.recent) values.push("recent");
        if (flags.linked) values.push("linked");
        if (flags.archived) values.push("archived");
        if (flags.softDeleted) values.push("soft_deleted", "deleted");
        if (needsHumanIntervention(thread)) values.push("needs_human", "needs human");
        return values;
      }

      function pushThreadSearchValue(values, value) {
        const text = String(value || "").trim();
        if (text) values.push(text);
      }

      function pushThreadSearchFields(values, source, fields) {
        if (!source || typeof source !== "object") return;
        fields.forEach((field) => pushThreadSearchValue(values, source[field]));
      }

      function selectedDetailForThreadSearch(thread) {
        const payload = state && state.payload ? state.payload : {};
        const detail = payload.detail && typeof payload.detail === "object" ? payload.detail : {};
        const detailThread = detail.thread && typeof detail.thread === "object" ? detail.thread : {};
        return String(detailThread.id || "") === String(thread && thread.id || "") ? detail : null;
      }

      function selectedTraceDashboardForThreadSearch(thread) {
        const payload = state && state.payload ? state.payload : {};
        const dashboard = payload.traceDashboard && typeof payload.traceDashboard === "object" ? payload.traceDashboard : {};
        const selectedId = String(dashboard.selected_thread_id || (dashboard.selected && dashboard.selected.id) || "").trim();
        return selectedId && selectedId === String(thread && thread.id || "") ? dashboard : null;
      }

      function threadLoadedTracePreviews(thread) {
        const previews = [];
        if (thread && thread.thread_trace_preview && typeof thread.thread_trace_preview === "object") previews.push(thread.thread_trace_preview);
        const detail = selectedDetailForThreadSearch(thread);
        if (detail && detail.thread_trace_preview && typeof detail.thread_trace_preview === "object") previews.push(detail.thread_trace_preview);
        return previews;
      }

      function threadSearchToolValues(thread) {
        const values = [];
        const lifecycle = thread && thread.lifecycle && typeof thread.lifecycle === "object" ? thread.lifecycle : {};
        (Array.isArray(lifecycle.recent_tools) ? lifecycle.recent_tools : []).forEach((tool) => pushThreadSearchValue(values, tool));
        (Array.isArray(thread && thread.recent_tools) ? thread.recent_tools : []).forEach((tool) => pushThreadSearchValue(values, tool));
        (Array.isArray(thread && thread.commands) ? thread.commands : []).forEach((command) => {
          pushThreadSearchFields(values, command, ["kind", "label", "name", "tool_name", "command", "summary"]);
        });
        threadLoadedTracePreviews(thread).forEach((preview) => {
          (Array.isArray(preview.command_events) ? preview.command_events : []).forEach((event) => {
            pushThreadSearchFields(values, event, ["label", "tool_name", "source", "command", "summary"]);
          });
        });
        const traceDashboard = selectedTraceDashboardForThreadSearch(thread);
        const replay = traceDashboard && traceDashboard.session_replay && typeof traceDashboard.session_replay === "object" ? traceDashboard.session_replay : {};
        (Array.isArray(replay.tool_counts) ? replay.tool_counts : []).forEach((tool) => pushThreadSearchValue(values, tool && tool.name));
        (Array.isArray(replay.events) ? replay.events : []).forEach((event) => pushThreadSearchFields(values, event, ["tool_name", "title", "summary"]));
        (Array.isArray(replay.code_changes) ? replay.code_changes : []).forEach((change) => pushThreadSearchFields(values, change, ["tool_name", "summary"]));
        return values;
      }

      function threadSearchFileValues(thread) {
        const values = [];
        threadLoadedTracePreviews(thread).forEach((preview) => {
          (Array.isArray(preview.file_events) ? preview.file_events : []).forEach((event) => {
            pushThreadSearchFields(values, event, ["path", "summary", "source"]);
          });
        });
        const traceDashboard = selectedTraceDashboardForThreadSearch(thread);
        const replay = traceDashboard && traceDashboard.session_replay && typeof traceDashboard.session_replay === "object" ? traceDashboard.session_replay : {};
        (Array.isArray(replay.code_changes) ? replay.code_changes : []).forEach((change) => {
          const diff = change && change.diff && typeof change.diff === "object" ? change.diff : {};
          pushThreadSearchFields(values, change, ["summary"]);
          (Array.isArray(diff.files) ? diff.files : []).forEach((filePath) => pushThreadSearchValue(values, filePath));
        });
        return values;
      }

      function threadSearchEvidenceValues(thread) {
        const values = [];
        const lifecycle = thread && thread.lifecycle && typeof thread.lifecycle === "object" ? thread.lifecycle : {};
        const process = thread && thread.process && typeof thread.process === "object" ? thread.process : {};
        pushThreadSearchFields(values, lifecycle, ["state", "reason"]);
        pushThreadSearchFields(values, process, ["summary"]);
        threadSearchToolValues(thread).forEach((value) => pushThreadSearchValue(values, value));
        threadSearchFileValues(thread).forEach((value) => pushThreadSearchValue(values, value));
        threadLoadedTracePreviews(thread).forEach((preview) => {
          ["events", "check_events", "error_events"].forEach((key) => {
            (Array.isArray(preview[key]) ? preview[key] : []).forEach((event) => {
              pushThreadSearchFields(values, event, ["title", "summary", "copy", "source", "level"]);
            });
          });
        });
        return values;
      }

      function threadSearchHaystack(thread) {
        return [
          thread.title,
          thread.db_title,
          displayThreadTitle(thread, ""),
          cardLabelFor(thread.id),
          thread.id,
          thread.cwd,
          thread.updated_at_iso,
          ...threadSearchEvidenceValues(thread),
        ].map(normalize).join(" ");
      }

      function threadMatchesSearchQuery(thread, parsed, haystack, status, flags) {
        if (!parsed.plain) return true;
        if (!parsed.hasGrammar || parsed.invalid) return haystack.includes(parsed.plain);
        const textMatches = parsed.textTerms.every((term) => haystack.includes(normalize(term).trim()));
        if (!textMatches) return false;
        const constraints = parsed.constraints;
        if (constraints.title.length) {
          const titleHaystack = [
            thread.title,
            thread.db_title,
            displayThreadTitle(thread, ""),
            cardLabelFor(thread.id),
          ].map(normalize).join(" ");
          if (!searchFieldIncludes(titleHaystack, constraints.title)) return false;
        }
        if (constraints.id.length && !searchFieldIncludes(thread.id, constraints.id)) return false;
        if (constraints.cwd.length && !searchFieldIncludes(thread.cwd, constraints.cwd)) return false;
        if (constraints.model.length && !searchFieldIncludes(threadModelChartLabel(thread), constraints.model)) return false;
        if (constraints.status.length && !searchFieldEqualsAny(threadSearchStatusValues(thread, status, flags), constraints.status)) return false;
        if (constraints.tab.length && !searchFieldIncludes(boardTabFor(thread.id), constraints.tab)) return false;
        if (constraints.tool.length && !searchFieldIncludes(threadSearchToolValues(thread).join(" "), constraints.tool)) return false;
        if (constraints.file.length && !searchFieldIncludes(threadSearchFileValues(thread).join(" "), constraints.file)) return false;
        if (constraints.pinned.length) {
          const pinned = isPinned(thread.id);
          const matchesPinned = constraints.pinned.some((value) => parseSearchBoolean(value) === pinned);
          if (!matchesPinned) return false;
        }
        return true;
      }

      function runThreadSearchGrammarSelfTest() {
        const quoted = parseThreadSearchQuery('model:"openai / gpt-5.4" status:running task');
        const plain = parseThreadSearchQuery("plain title query");
        const unknown = parseThreadSearchQuery("owner:local task");
        const invalid = parseThreadSearchQuery('model:"unterminated');
        const pinned = parseThreadSearchQuery("pinned:true tab:Inbox");
        const evidence = parseThreadSearchQuery('tool:apply_patch file:"src/app.js"');
        return Boolean(
          quoted.hasGrammar &&
          quoted.constraints.model[0] === "openai / gpt-5.4" &&
          quoted.constraints.status[0] === "running" &&
          quoted.textTerms[0] === "task" &&
          !plain.hasGrammar &&
          plain.plain === "plain title query" &&
          !unknown.hasGrammar &&
          unknown.textTerms[0] === "owner:local" &&
          invalid.invalid &&
          pinned.constraints.pinned[0] === "true" &&
          pinned.constraints.tab[0] === "Inbox" &&
          evidence.constraints.tool[0] === "apply_patch" &&
          evidence.constraints.file[0] === "src/app.js"
        );
      }

      if (typeof window !== "undefined") {
        window.__codexThreadSearchGrammarSelfTest = runThreadSearchGrammarSelfTest;
      }

      function normalizeServiceMetadata(service) {
        const source = service || {};
        const ok = Boolean(source.ok);
        const backendMode = String(source.backendMode || (ok ? "configured" : "unavailable"));
        const backendSource = String(source.backendSource || "configured");
        const readOnly = typeof source.readOnly === "boolean" ? source.readOnly : !ok;
        const defaultCapabilities = ok && !readOnly
          ? {
              threads: true,
              threadDetail: true,
              insights: true,
              scanSessions: true,
              lifecycle: true,
              rename: false,
              hardDelete: true,
            }
          : {
              threads: false,
              threadDetail: false,
              insights: false,
              scanSessions: false,
              lifecycle: false,
              rename: false,
              hardDelete: false,
            };
        const sourceCapabilities = source.capabilities && typeof source.capabilities === "object" ? source.capabilities : {};
        return {
          backendMode,
          backendSource,
          readOnly,
          capabilities: Object.assign({}, defaultCapabilities, sourceCapabilities),
        };
      }

      function buildServiceCapabilityGuard(metadata) {
        const source = metadata || normalizeServiceMetadata({ ok: false });
        const capabilities = source.capabilities && typeof source.capabilities === "object" ? source.capabilities : {};
        const readOnly = Boolean(source.readOnly);
        return {
          readOnly,
          backendMode: source.backendMode || "unavailable",
          canLifecycle: !readOnly && capabilities.lifecycle !== false,
          canRename: false,
          canScanSessions: !readOnly && capabilities.scanSessions !== false,
          canHardDelete: !readOnly && capabilities.lifecycle !== false && capabilities.hardDelete !== false,
          reason: readOnly ? "Backend is read-only." : "",
        };
      }

      function formatBackendModeLabel(mode) {
        const key = String(mode || "").trim();
        if (key === "node" || key === "node-backend" || key === "node-fallback") return "Node";
        if (key === "remote") return "Remote";
        if (key === "configured") return "Configured";
        if (key === "unavailable") return "Unavailable";
        return key || "Backend";
      }

      function canDispatchLifecycleRequest() {
        const guard = state.serviceCapabilityGuard || buildServiceCapabilityGuard(state.serviceMetadata);
        return Boolean(guard && guard.canLifecycle);
      }

      function canDispatchScanSessionsRequest() {
        const guard = state.serviceCapabilityGuard || buildServiceCapabilityGuard(state.serviceMetadata);
        return Boolean(guard && guard.canScanSessions);
      }

      function canDispatchHardDeleteRequest() {
        const guard = state.serviceCapabilityGuard || buildServiceCapabilityGuard(state.serviceMetadata);
        return Boolean(guard && guard.canHardDelete);
      }

      function getBatchActionMeta(action) {
        return BATCH_ACTIONS[action] || { label: action || "Action" };
      }

      function sameIdSet(left, right) {
        if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
        const sortedLeft = [...left].sort();
        const sortedRight = [...right].sort();
        return sortedLeft.every((id, index) => id === sortedRight[index]);
      }

      function setPendingBatch(action, threadIds) {
        state.ui.pendingBatch = {
          action,
          threadIds: [...threadIds],
        };
      }

      function clearPendingBatch() {
        state.ui.pendingBatch = undefined;
      }

      function setRightPaneTab(tab) {
        state.ui.rightPaneTab = tab;
        persistUi();
        render(state.payload);
      }

      function setWorkspaceView(view, options = {}) {
        if (view === "skills" || view === "memory") {
          state.ui.currentView = "overview";
          state.ui.overviewSubView = view;
        } else {
          state.ui.currentView = view;
        }
        if (view === "board") {
          state.ui.boardSubView = options.boardSubView || state.ui.boardSubView || "status";
        }
        persistUi();
        render(state.payload);
      }

      function isKeyboardShortcutTypingTarget(target) {
        if (!target || !(target instanceof Element)) return false;
        return Boolean(target.closest([
          "input",
          "textarea",
          "select",
          "button",
          "a",
          "[contenteditable='true']",
          "[role='button']",
          ".inline-card-label-input",
          ".loop-input",
          "[data-compose-prompt-input]",
          "[data-loop-prompt-input]",
          "[data-loop-count-input]",
          "[data-run-command]",
          "[data-copy-command]",
          "[data-drawer-confirm]",
          "[data-drawer-cancel]",
          "[data-close-chrome-menu]",
          "[data-command-direct]",
        ].join(", ")));
      }

      function handleThreadSearchFocusShortcut(event) {
        if (!event || event.defaultPrevented || event.key !== "/") return false;
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
        if (state.pointerBoardDrag || state.resizingRunningCard || state.draggedRunningThreadId) return false;
        const target = event.target instanceof Element ? event.target : document.activeElement;
        if (isKeyboardShortcutTypingTarget(target)) return false;
        const searchNode = document.getElementById("threadSearchMirror") || document.getElementById("threadSearch");
        if (!searchNode) return false;
        event.preventDefault();
        event.stopPropagation();
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
        requestAnimationFrame(() => {
          const nextSearchNode = document.getElementById("threadSearchMirror") || document.getElementById("threadSearch");
          if (!nextSearchNode) return;
          nextSearchNode.focus();
          if (typeof nextSearchNode.select === "function") nextSearchNode.select();
        });
        return true;
      }

      function toggleHeaderCollapsed() {
        const current = state.ui.headerMode || "expanded";
        state.ui.headerMode = current === "expanded"
          ? "collapsed"
          : current === "collapsed"
            ? "ultra"
            : "expanded";
        persistUi();
        render(state.payload);
      }

      function openLoopPanel(threadId, currentPrompt = "continue", currentCount = "10") {
        state.ui.loopPanelThreadId = threadId;
        state.ui.loopDraftPrompt = String(currentPrompt || "continue");
        state.ui.loopDraftCount = String(currentCount || "10");
        render(state.payload);
      }

      function closeLoopPanel() {
        state.ui.loopPanelThreadId = undefined;
        state.ui.loopDraftPrompt = "continue";
        state.ui.loopDraftCount = "10";
        render(state.payload);
      }

      function openQuickComposer(threadId, currentPrompt = "continue") {
        if (!threadId) return;
        state.ui.quickComposerThreadId = threadId;
        if (!state.ui.quickComposerDrafts[threadId]) {
          state.ui.quickComposerDrafts[threadId] = String(currentPrompt || "continue");
        }
        render(state.payload);
      }

      function closeQuickComposer(threadId) {
        if (!threadId || state.ui.quickComposerThreadId === threadId) {
          state.ui.quickComposerThreadId = undefined;
        }
        render(state.payload);
      }

      function setQuickComposerDraft(threadId, value) {
        if (!threadId) return;
        state.ui.quickComposerDrafts[threadId] = String(value || "");
      }

      function setLoopDraftCount(value) {
        state.ui.loopDraftCount = String(value || "");
      }

      function setLoopDraftPrompt(value) {
        state.ui.loopDraftPrompt = String(value || "");
      }

      function setPendingDrawerAction(threadId, action) {
        state.ui.pendingDrawerAction = { threadId, action };
      }

      function clearPendingDrawerAction() {
        state.ui.pendingDrawerAction = undefined;
      }

      function getDrawerConfirmMeta(action) {
        if (action === "hard_delete") {
          return {
            tone: "danger",
            intentLabel: "Confirm Hard Delete",
            summary: "Permanently remove this thread and its logs.",
            confirmLabel: "Delete Permanently",
          };
        }
        return {
          tone: "warn",
          intentLabel: "Confirm Soft Delete",
          summary: "Move this thread into the deleted bucket.",
          confirmLabel: "Confirm Soft Delete",
        };
      }

      function summarizeThreadSelection(threads, threadIds) {
        const picked = threads
          .filter((thread) => threadIds.includes(thread.id))
          .slice(0, 3)
          .map((thread) => short(thread.title || thread.id || "thread", 28));
        if (!picked.length) return "";
        const remainder = threadIds.length - picked.length;
        return picked.join(", ") + (remainder > 0 ? " +" + remainder + " more" : "");
      }

      function isPinned(threadId) {
        return Boolean(state.ui.pinned[threadId]);
      }

      function isBoardAttached(threadId) {
        return Boolean(state.ui.boardAttached[threadId]);
      }

      function togglePin(threadId) {
        if (state.ui.pinned[threadId]) {
          delete state.ui.pinned[threadId];
        } else {
          state.ui.pinned[threadId] = true;
          state.ui.boardAttached[threadId] = true;
          const activeTab = activeBoardTabKey();
          if (activeTab !== "all" && !boardTabFor(threadId)) {
            ensureBoardTab(activeTab);
            state.ui.boardTabAssignments[threadId] = activeTab;
          }
        }
        persistUi();
        render(state.payload);
      }

      function toggleBoardAttach(threadId) {
        if (!threadId) return;
        if (state.ui.boardAttached[threadId]) {
          delete state.ui.boardAttached[threadId];
        } else {
          state.ui.boardAttached[threadId] = true;
          const activeTab = activeBoardTabKey();
          if (activeTab !== "all" && !boardTabFor(threadId)) {
            state.ui.boardTabAssignments[threadId] = activeTab;
            ensureBoardTab(activeTab);
          }
        }
        persistUi();
        render(state.payload);
      }

      function attachThreadsToBoard(threadIds) {
        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        if (!ids.length) return;
        const activeTab = activeBoardTabKey();
        ids.forEach((threadId) => {
          state.ui.boardAttached[threadId] = true;
          if (activeTab !== "all") {
            ensureBoardTab(activeTab);
            state.ui.boardTabAssignments[threadId] = activeTab;
          }
        });
        persistUi();
        render(state.payload);
      }

      function unattachThreadsFromBoard(threadIds) {
`;
