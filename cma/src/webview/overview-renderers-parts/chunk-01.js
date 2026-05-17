module.exports = `      function markPendingLoopAction(stateDir, action) {
        const key = String(stateDir || "").trim();
        if (!key) return;
        state.ui.pendingLoopActions[key] = {
          action: String(action || "").trim(),
          requestedAt: Date.now(),
        };
      }

      function reconcilePendingLoopActions(loopDaemons) {
        const next = {};
        const current = state.ui.pendingLoopActions || {};
        Object.entries(current).forEach(([stateDir, pending]) => {
          const daemon = (loopDaemons || []).find((item) => item && item.stateDir === stateDir);
          if (!daemon) return;
          const ageMs = Date.now() - Number(pending.requestedAt || 0);
          if (pending.action === "stop" && !daemon.running) return;
          if (pending.action === "start" && daemon.running) return;
          if (pending.action === "start" && ageMs > 12000) return;
          if (pending.action === "restart" && ageMs > 12000) return;
          next[stateDir] = pending;
        });
        state.ui.pendingLoopActions = next;
      }

      function applyBrandFooterStyle() {
        const footer = byId("overviewBrandFooter");
        if (!footer) return;
        const index = Number.isFinite(Number(state.ui.brandFontIndex)) ? Math.max(0, Number(state.ui.brandFontIndex) % 4) : 0;
        footer.classList.remove("is-font-0", "is-font-1", "is-font-2", "is-font-3");
        footer.classList.add("is-font-" + index);
      }

      function cycleBrandFooterStyle() {
        state.ui.brandFontIndex = (Number(state.ui.brandFontIndex) + 1) % 4;
        applyBrandFooterStyle();
        persistUi();
      }

      function pendingPromptMeta(threadId) {
        if (!threadId) return undefined;
        return state.ui.pendingPromptState[threadId];
      }

      function autoContinueConfigFor(threadId) {
        if (!threadId) return undefined;
        const optimistic = state.ui.optimisticAutoContinueConfigs[threadId];
        if (optimistic !== undefined) return optimistic || undefined;
        return ((state.payload && state.payload.autoContinueConfigs) || {})[threadId];
      }

      function syncOptimisticAutoContinueState(hostConfigs) {
        state.ui.optimisticAutoContinueConfigs = Object.assign({}, hostConfigs || {});
      }

      function patchAutoContinueState(threadId, config) {
        if (!threadId) return;
        if (!config) {
          delete state.ui.optimisticAutoContinueConfigs[threadId];
          return;
        }
        state.ui.optimisticAutoContinueConfigs[threadId] = config;
      }

      function patchCodexTabProjection(codexTabProjection) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          codexTabProjection: codexTabProjection || { openThreadIds: [], focusedThreadId: undefined, tabGroups: [] },
        });
      }

      function patchCodexLinkState(codexLinkState) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          codexLinkState: codexLinkState || { openThreadIds: [], focusedThreadId: undefined },
        });
      }

      function patchCodexPluginIntegration(codexPluginIntegration) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          codexPluginIntegration: codexPluginIntegration || {},
        });
      }

      function patchHandoffObjects(handoffObjects) {
        if (!state.payload) return;
        state.payload = Object.assign({}, state.payload, {
          handoffObjects: Object.assign({}, handoffObjects || {}),
        });
      }

      function cardLabelFor(threadId) {
        if (!threadId) return "";
        return String((state.ui.cardLabels && state.ui.cardLabels[threadId]) || "").trim();
      }

      function suggestedCardName(threadId) {
        const current = cardLabelFor(threadId);
        if (current) return current;
        const labels = Object.values(state.ui.cardLabels || {}).map((value) => String(value || "").trim());
        const used = new Set();
        labels.forEach((value) => {
          const match = value.match(/^card\s+(\d+)$/i);
          if (match) used.add(Number(match[1]));
        });
        let next = 1;
        while (used.has(next)) next += 1;
        return "Card " + String(next);
      }

      function displayThreadTitle(threadOrId, fallback = "Thread") {
        const thread = threadOrId && typeof threadOrId === "object"
          ? threadOrId
          : ((state.payload && state.payload.dashboard && Array.isArray(state.payload.dashboard.threads))
            ? state.payload.dashboard.threads.find((item) => item && item.id === threadOrId)
            : undefined);
        const threadId = thread && thread.id ? thread.id : String(threadOrId || "");
        return String((thread && (thread.title || thread.id)) || threadId || fallback);
      }

      function displayCardName(threadOrId) {
        const threadId = threadOrId && typeof threadOrId === "object" ? threadOrId.id : String(threadOrId || "");
        return cardLabelFor(threadId);
      }

      function compactTokenCount(value) {
        const num = Number(value || 0);
        if (!Number.isFinite(num) || num <= 0) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(num >= 10000000 ? 0 : 1).replace(/\.0$/, "") + "M";
        if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K";
        return String(Math.round(num));
      }

      function formatBytes(value) {
        const num = Number(value || 0);
        if (!Number.isFinite(num) || num <= 0) return "0 B";
        const units = ["B", "KB", "MB", "GB"];
        let size = num;
        let index = 0;
        while (size >= 1024 && index < units.length - 1) {
          size /= 1024;
          index += 1;
        }
        return (index === 0 ? String(Math.round(size)) : size.toFixed(size >= 10 ? 0 : 1).replace(/\.0$/, "")) + " " + units[index];
      }

      function renderThreadUsageMeta(thread) {
        const tokenLabel = compactTokenCount(thread && thread.tokens_used);
        const storageLabel = (thread && thread.storage_label) || formatBytes(thread && thread.storage_bytes);
        const rawTokens = Number(thread && thread.tokens_used);
        const tokenTitle = Number.isFinite(rawTokens) && rawTokens > 0
          ? String(Math.round(rawTokens)) + " known local tokens"
          : "No known local token usage";
        return '<span class="meta-pill meta-pill-token" title="' + esc(tokenTitle) + '">Tokens ' + esc(tokenLabel) + '</span>' +
          '<span class="meta-pill" title="Local session storage size">Size ' + esc(storageLabel || "0 B") + '</span>';
      }

      function threadModelDisplayLabel(thread) {
        const model = String((thread && thread.model) || "").trim();
        return model || "Unknown model";
      }

      function threadUpdatedLabel(thread) {
        const age = String((thread && (thread.updated_age || thread.log_age)) || "").trim();
        if (age) return "Updated " + age;
        const timestamp = String((thread && (thread.updated_at_iso || thread.updated_at)) || "").trim();
        if (!timestamp) return "Updated unknown";
        const formatted = formatTimestamp(timestamp);
        return "Updated " + (formatted || timestamp);
      }

      function threadUpdatedClass(thread) {
        const age = normalize((thread && (thread.updated_age || thread.log_age)) || "");
        if (age === "now" || age === "0m" || age === "1m" || age.endsWith("m")) return " fresh";
        return "";
      }

      function threadUpdatedTitle(thread) {
        return String((thread && (thread.updated_at_iso || thread.updated_at || thread.log_path)) || "").trim();
      }

      function renderThreadModelMeta(thread) {
        const provider = String((thread && thread.model_provider) || "").trim();
        const model = String((thread && thread.model) || "").trim();
        const reasoning = String((thread && thread.reasoning_effort) || "").trim();
        let html = "";
        if (model || provider) {
          const label = threadModelDisplayLabel(thread);
          const title = [model ? ("Model " + model) : "", provider ? ("Provider " + provider) : ""].filter(Boolean).join(" · ");
          html += '<span class="meta-pill meta-pill-model" title="' + esc(title || label) + '">Model ' + esc(short(label, 28)) + '</span>';
        }
        if (reasoning) {
          html += '<span class="meta-pill" title="Reasoning effort">Reason ' + esc(short(reasoning, 14)) + '</span>';
        }
        return html;
      }

      function renderThreadCoordinationMeta(thread) {
        const truth = effectiveCoordinationTruth(thread);
        if (!truth || !truth.needsHuman) return "";
        const title = String(truth.reason || truth.label || "Needs human attention").trim();
        return '<span class="meta-pill meta-pill-human" title="' + esc(title) + '">Needs Human</span>';
      }

      function lifecycleStateLabel(state) {
        const key = String(state || "").trim().toLowerCase();
        if (key === "needs_attention") return "Needs Human";
        if (key === "task_complete") return "Completed";
        if (!key || key === "unknown") return "No lifecycle";
        return key.replace(/_/g, " ").replace(/\b[a-z]/g, (char) => char.toUpperCase());
      }

      function renderBoardLifecycleStrip(thread, options = {}) {
        const lifecycle = thread && typeof thread.lifecycle === "object" ? thread.lifecycle : {};
        const state = String(lifecycle.state || "unknown").trim() || "unknown";
        const reason = String(lifecycle.reason || "").trim();
        const tools = Array.isArray(lifecycle.recent_tools)
          ? lifecycle.recent_tools.map((tool) => String(tool || "").trim()).filter(Boolean).slice(0, options.compact ? 2 : 3)
          : [];
        if (!state || state === "unknown") return "";
        const label = lifecycleStateLabel(state);
        const reasonLimit = options.compact ? 92 : (options.size === "l" ? 140 : 104);
        const visibleReason = reason ? short(reason, reasonLimit) : "";
        return '<div class="board-lifecycle-strip lifecycle-' + esc(state) + '">' +
          '<span class="board-lifecycle-badge">' + esc(label) + '</span>' +
          (visibleReason ? '<span class="board-lifecycle-reason">' + esc(visibleReason) + '</span>' : '') +
          (tools.length ? '<span class="board-lifecycle-tools">' + tools.map((tool) => '<span class="board-lifecycle-tool">' + esc(short(tool, 18)) + '</span>').join("") + '</span>' : '') +
        '</div>';
      }

      function renderBoardQuickActions(thread, options = {}) {
        const threadId = String((thread && thread.id) || "").trim();
        const quickPrompt = String(options.prompt || "continue").trim();
        const isQuickComposerOpen = Boolean(options.quickComposerOpen);
        const showPrompt = Boolean(options.showPrompt);
        const codexClassName = options.codexClassName || "tool-btn codex-link primary";
        const autoLoop = autoContinueConfigFor(threadId);
        const cmpCount = Math.max(0, Number(thread && thread.compaction_count) || 0);
        const compactPrompt = isQuickComposerOpen ? ' primary' : '';
        return '<button class="tool-btn quick-cmd" data-open-conversation="' + esc(threadId) + '" type="button"' + (threadId ? '' : ' disabled') + '>' + renderToolIcon('chat') + '<span>' + esc(uiText('Cmd ' + String(threadCommandCount(thread)))) + '</span></button>' +
          '<button class="tool-btn quick-cmp" type="button" disabled>' + esc(uiText('Cmp ' + String(cmpCount))) + '</button>' +
          renderTerminalResumeButton(thread, { className: "tool-btn terminal-resume", label: "Terminal", icon: true }) +
          renderGitActionMenu(thread, { className: "tool-btn git-action", pushClassName: "tool-btn git-action git-push", icon: true }) +
          '<button class="tool-btn auto-continue' + (autoLoop ? ' primary' : '') + '" data-auto-loop="' + esc(threadId) + '" data-auto-prompt="' + esc((autoLoop && autoLoop.prompt) || quickPrompt || "continue") + '" data-auto-count="' + esc(String((autoLoop && autoLoop.remaining) || 10)) + '" type="button">' + renderToolIcon('codex') + '<span>' + esc(uiText(autoLoop ? ('Auto ' + String(autoLoop.remaining || 0)) : 'Auto')) + '</span></button>' +
          (showPrompt
            ? '<button class="tool-btn' + compactPrompt + '" data-open-composer="' + esc(threadId) + '" data-current-prompt="' + esc(quickPrompt) + '" type="button">' + renderToolIcon('prompt') + '<span>' + esc(uiText('Prompt')) + '</span></button>'
            : '') +
          '<button class="' + esc(codexClassName) + '" data-codex-thread="' + esc(threadId) + '" type="button">' + renderToolIcon('codex') + '<span>' + esc(uiText('Codex')) + '</span></button>';
      }

      function threadCommandCount(thread) {
        const rolloutCount = Number(thread && thread.rollout_user_message_count);
        if (Number.isFinite(rolloutCount) && rolloutCount > 0) return Math.round(rolloutCount);
        const userCommandCount = Number(thread && thread.user_command_count);
        if (Number.isFinite(userCommandCount) && userCommandCount > 0) return Math.round(userCommandCount);
        return 0;
      }

      function renderCopyableThreadId(threadOrId, options = {}) {
        const raw = threadOrId && typeof threadOrId === "object" ? threadOrId.id : threadOrId;
        const threadId = String(raw || "").trim();
        if (!threadId) return "";
        const maxLength = Number(options.maxLength || options.length || 18);
        const prefix = options.prefix === undefined ? "ID " : String(options.prefix || "");
        const label = options.full ? threadId : tailShort(threadId, maxLength);
        const extraClass = options.className ? " " + options.className : "";
        return '<button class="meta-pill mono copy-thread-id' + extraClass + '" type="button" data-copy-thread-id="' + esc(threadId) + '" title="Copy session/thread id: ' + esc(threadId) + '">' + esc(prefix + label) + '</button>';
      }

      function renderInlineCardTitle(thread, className, maxLength, fallback = "Thread") {
        const threadId = thread && thread.id ? thread.id : "";
        const fullTitle = displayThreadTitle(thread, fallback);
        const display = short(fullTitle, maxLength);
        return '<div class="' + esc(className) + '" data-thread-title-slot="' + esc(threadId) + '" data-title-max="' + esc(String(maxLength)) + '" title="' + esc(fullTitle) + '">' + esc(display) + '</div>';
      }

      function renderEditableCardName(threadOrId, options = {}) {
        const threadId = threadOrId && typeof threadOrId === "object" ? threadOrId.id : String(threadOrId || "");
        const label = displayCardName(threadId);
        const prefix = options.prefix === false ? "" : "Card: ";
        const placeholder = options.placeholder || "Card Name";
        const text = label ? (prefix + label) : placeholder;
        const extraClass = options.className ? " " + options.className : "";
        const max = Number(options.maxLength || 56);
        return '<span class="editable-card-name inline-card-label' + extraClass + (label ? '' : ' empty') + '" role="button" tabindex="0" data-edit-card-name="' + esc(threadId) + '" data-card-name-slot="' + esc(threadId) + '" data-card-prefix="' + esc(prefix) + '" data-card-placeholder="' + esc(placeholder) + '" data-title-max="' + esc(String(max)) + '">' + esc(short(text, max)) + '</span>';
      }

      function setCardLabel(threadId, label) {
        if (!threadId) return;
        vscode.postMessage({
          type: "setCardLabel",
          threadId,
          label: String(label || ""),
        });
      }

      function normalizeBoardTabName(value) {
        return String(value || "").trim().replace(/\s+/g, " ").slice(0, 36);
      }

      function boardTabTone(name) {
        const text = normalizeBoardTabName(name);
        let hash = 0;
        for (let index = 0; index < text.length; index += 1) {
          hash = ((hash << 5) - hash) + text.charCodeAt(index);
          hash |= 0;
        }
        const hue = Math.abs(hash % 360);
        return {
          border: 'hsla(' + hue + ', 42%, 52%, 0.34)',
          bg: 'linear-gradient(180deg, hsla(' + hue + ', 48%, 72%, 0.16), hsla(' + hue + ', 34%, 50%, 0.08))',
          fg: 'var(--text)',
          glow: 'hsla(' + hue + ', 42%, 52%, 0.14)',
          countBg: 'hsla(' + hue + ', 38%, 48%, 0.14)',
        };
      }

      function boardTabStyle(name, active = false) {
        const tone = boardTabTone(name);
        return ' style="' +
          'border-color:' + tone.border + ';' +
          'background:' + tone.bg + ';' +
          'color:' + tone.fg + ';' +
          (active ? ('box-shadow: inset 0 0 0 1px ' + tone.border + ', 0 0 0 1px ' + tone.glow + ', 0 12px 28px ' + tone.glow + ';') : ('box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03), 0 8px 18px rgba(0,0,0,0.16);')) +
        '"';
      }

      function boardTabCountStyle(name) {
        const tone = boardTabTone(name);
        return ' style="' +
          'background:' + tone.countBg + ';' +
          'border:1px solid ' + tone.border + ';' +
          'color:' + tone.fg + ';' +
        '"';
      }

      function boardTabOrderList() {
        const order = Array.isArray(state.ui.boardTabOrder) ? state.ui.boardTabOrder : [];
        return order
          .map(normalizeBoardTabName)
          .filter((name, index, list) => name && list.indexOf(name) === index);
      }

      function threadTabFilterOptions() {
        const seen = new Set();
        const names = [];
        const addName = (value) => {
          const name = normalizeBoardTabName(value);
          if (!name || seen.has(name)) return;
          seen.add(name);
          names.push(name);
        };
        boardTabOrderList().forEach(addName);
        Object.values(state.ui.boardTabAssignments || {}).forEach(addName);
        return names;
      }

      function activeThreadTabFilterKey() {
        const selected = normalizeBoardTabName(state.ui.threadTabFilter);
        if (!selected || selected === "all") return "all";
        return threadTabFilterOptions().includes(selected) ? selected : "all";
      }

      function setThreadTabFilter(name) {
        const next = normalizeBoardTabName(name);
        state.ui.threadTabFilter = next || "all";
        state.ui.threadTabFilterMenuOpen = false;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function renderThreadTabFilterControl() {
        const active = activeThreadTabFilterKey();
        const tabs = threadTabFilterOptions();
        const label = active === "all" ? "Tab: All" : ("Tab: " + active);
        const menu = state.ui.threadTabFilterMenuOpen
          ? '<span class="thread-tab-menu">' +
              '<button class="chip' + (active === "all" ? ' active' : '') + '" data-thread-tab-filter-option="all" type="button">All</button>' +
              (tabs.length
                ? tabs.map((name) => '<button class="chip' + (active === name ? ' active' : '') + '" data-thread-tab-filter-option="' + esc(name) + '" type="button">' + esc(name) + '</button>').join("")
                : '<span class="thread-tab-empty">No tabs yet</span>') +
            '</span>'
          : '';
        return '<span class="thread-tab-filter">' +
          '<button class="chip' + (active !== "all" ? ' active' : '') + '" data-toggle-thread-tab-filter="true" type="button">' + esc(label) + '</button>' +
          menu +
        '</span>';
      }

      function threadRootFilterOptions(threads) {
        const byRoot = new Map();
        (threads || []).forEach((thread) => {
          const key = threadRootKey(thread);
          if (!key) return;
          const current = byRoot.get(key) || {
            key,
            label: threadRootLabel(thread),
            count: 0,
          };
          current.count += 1;
          byRoot.set(key, current);
        });
        return [...byRoot.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
      }

      function activeRootFilterOption(options) {
        const rootFilter = String(state.ui.rootFilter || "").trim();
        if (!rootFilter) return null;
        return (options || []).find((option) => (
          option.key === rootFilter ||
          option.label === rootFilter ||
          compactRootIdentity(option.key) === rootFilter
        )) || { key: rootFilter, label: compactRootIdentity(rootFilter), count: 0 };
      }

      function setRootFilterFromMenu(root) {
        state.ui.rootFilter = root && root !== "all" ? root : null;
        state.ui.rootFilterMenuOpen = false;
        state.ui.rootFilterSearch = "";
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function activeGitFilterKey() {
        return ["repo", "no_git"].includes(state.ui.gitFilter) ? state.ui.gitFilter : "all";
      }

      function setGitFilter(value) {
        state.ui.gitFilter = ["repo", "no_git"].includes(value) ? value : "all";
        state.ui.rootFilterMenuOpen = false;
        state.ui.gitFilterMenuOpen = false;
        state.ui.threadTabFilterMenuOpen = false;
        state.ui.currentView = "threads";
        persistUi();
        render(state.payload);
      }

      function renderGitFilterControl() {
        const active = activeGitFilterKey();
        const labels = { all: "All", repo: "Repo", no_git: "No Git" };
        const option = (key) => '<button class="chip directory-picker-option' + (active === key ? ' active' : '') + '" data-git-filter-option="' + esc(key) + '" type="button">' + esc(labels[key] || key) + '</button>';
        const menu = state.ui.gitFilterMenuOpen
          ? '<span class="directory-picker-menu"><span class="directory-picker-options">' +
              option("all") +
              option("repo") +
              option("no_git") +
            '</span></span>'
          : '';
        return '<span class="directory-picker git-picker">' +
          '<button class="chip directory-picker-trigger' + (active !== "all" ? ' active' : '') + '" data-toggle-git-filter-menu="true" type="button" title="Filter by Git repository state">Git: ' + esc(labels[active] || "All") + '</button>' +
          menu +
        '</span>';
      }

      function renderRootFilterControl(threads) {
        const roots = threadRootFilterOptions(threads || []);
        const active = activeRootFilterOption(roots);
        const search = String(state.ui.rootFilterSearch || "").trim().toLowerCase();
        const visibleRoots = search
          ? roots.filter((root) => String(root.key || "").toLowerCase().includes(search) || String(root.label || "").toLowerCase().includes(search))
          : roots;
        const label = active ? ("Base: " + short(active.label || active.key, 38)) : "Base: All";
        const menu = state.ui.rootFilterMenuOpen
          ? '<span class="directory-picker-menu">' +
              '<input class="directory-picker-search" data-root-filter-search="true" type="search" placeholder="Search directory" value="' + esc(state.ui.rootFilterSearch || "") + '" />' +
              '<span class="directory-picker-options">' +
                '<button class="chip directory-picker-option' + (!active ? ' active' : '') + '" data-root-filter-option="all" type="button">All directories</button>' +
                (visibleRoots.length
                  ? visibleRoots.slice(0, 32).map((root) => '<button class="chip directory-picker-option' + (active && active.key === root.key ? ' active' : '') + '" data-root-filter-option="' + esc(root.key) + '" type="button" title="' + esc(root.key) + '"><span class="directory-option-label">' + esc(root.label || root.key) + '</span><span class="group-count">' + esc(String(root.count)) + '</span></button>').join("")
                  : '<span class="thread-tab-empty">No matching directories</span>') +
              '</span>' +
            '</span>'
          : '';
        return '<span class="directory-picker">' +
          '<button class="chip directory-picker-trigger' + (active ? ' active' : '') + '" data-toggle-root-filter-menu="true" type="button" title="' + esc(active ? active.key : "All working directories") + '">' + esc(label) + '</button>' +
          menu +
        '</span>';
`;
