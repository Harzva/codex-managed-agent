module.exports = `      }

      function ensureBoardTab(name) {
        const next = normalizeBoardTabName(name);
        if (!next) return "";
        const order = boardTabOrderList();
        if (!order.includes(next)) {
          order.push(next);
          state.ui.boardTabOrder = order;
        } else {
          state.ui.boardTabOrder = order;
        }
        return next;
      }

      function boardTabFor(threadId) {
        if (!threadId) return "";
        const current = normalizeBoardTabName((state.ui.boardTabAssignments || {})[threadId]);
        if (current) ensureBoardTab(current);
        return current;
      }

      function activeBoardTabKey() {
        return normalizeBoardTabName(state.ui.activeBoardTab) || "all";
      }

      function setActiveBoardTab(name) {
        const next = normalizeBoardTabName(name);
        state.ui.activeBoardTab = next || "all";
        persistUi();
        render(state.payload);
      }

      function setThreadBoardTab(threadId, preferredTab = "") {
        if (!threadId) return;
        vscode.postMessage({
          type: "chooseBoardTab",
          threadId,
          currentBoardTab: boardTabFor(threadId) || normalizeBoardTabName(preferredTab) || "",
          boardTabOrder: boardTabOrderList(),
          activeBoardTab: activeBoardTabKey(),
        });
      }

      function createBoardTab() {
        vscode.postMessage({
          type: "createBoardTab",
          boardTabOrder: boardTabOrderList(),
          activeBoardTab: activeBoardTabKey(),
        });
      }

      function applyCardLabelPatch(threadId, label) {
        if (!threadId) return;
        const trimmed = String(label || "").trim();
        if (!trimmed) {
          delete state.ui.cardLabels[threadId];
        } else {
          state.ui.cardLabels[threadId] = trimmed;
        }
        persistUi();
        render(state.payload);
      }

      function beginInlineCardLabelEdit(threadId, node) {
        if (!threadId || !node || node.classList.contains("is-editing")) return;
        const value = cardLabelFor(threadId);
        let finished = false;
        node.classList.add("is-editing");
        node.innerHTML = '<input class="inline-card-label-input" type="text" value="' + esc(value) + '" />';
        const input = node.querySelector("input");
        if (!input) return;
        const commit = () => {
          if (finished) return;
          finished = true;
          const trimmed = String(input.value || "").trim();
          applyCardLabelPatch(threadId, trimmed);
          setCardLabel(threadId, trimmed);
        };
        const cancel = () => {
          if (finished) return;
          finished = true;
          render(state.payload);
        };
        input.addEventListener("click", (event) => event.stopPropagation());
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            commit();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancel();
          }
        });
        input.addEventListener("blur", () => {
          commit();
        });
        input.focus();
        input.select();
      }

      function applyBoardTabPatch(threadId, boardTab, boardTabOrder, activeBoardTab) {
        if (Array.isArray(boardTabOrder)) {
          state.ui.boardTabOrder = boardTabOrder.map(normalizeBoardTabName).filter((name, index, list) => name && list.indexOf(name) === index);
        }
        const trimmed = normalizeBoardTabName(boardTab);
        if (threadId) {
          if (!trimmed) {
            delete state.ui.boardTabAssignments[threadId];
          } else {
            ensureBoardTab(trimmed);
            state.ui.boardTabAssignments[threadId] = trimmed;
            state.ui.boardAttached[threadId] = true;
          }
        }
        state.ui.activeBoardTab = normalizeBoardTabName(activeBoardTab) || "all";
        persistUi();
        render(state.payload);
      }

      function patchThread(threadId, updates) {
        if (!state.payload || !threadId) return;
        const nextUpdates = updates || {};
        const patch = (thread) => {
          if (!thread || thread.id !== threadId) return thread;
          return Object.assign({}, thread, nextUpdates, {
            db_title: nextUpdates.title !== undefined ? nextUpdates.title : thread.db_title,
          });
        };
        const dashboard = state.payload.dashboard || {};
        state.payload = Object.assign({}, state.payload, {
          dashboard: Object.assign({}, dashboard, {
            threads: Array.isArray(dashboard.threads) ? dashboard.threads.map(patch) : dashboard.threads,
            runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.map(patch) : dashboard.runningThreads,
          }),
          detail: state.payload.detail && state.payload.detail.thread && state.payload.detail.thread.id === threadId
            ? Object.assign({}, state.payload.detail, { thread: patch(state.payload.detail.thread) })
            : state.payload.detail,
        });
      }

      function addThread(thread) {
        if (!state.payload || !thread || !thread.id) return;
        const dashboard = state.payload.dashboard || {};
        const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
        const withoutDuplicate = currentThreads.filter((item) => item && item.id !== thread.id);
        state.payload = Object.assign({}, state.payload, {
          dashboard: Object.assign({}, dashboard, {
            threads: [thread].concat(withoutDuplicate),
          }),
        });
      }

      function removeThread(threadId) {
        if (!state.payload || !threadId) return;
        const dashboard = state.payload.dashboard || {};
        state.payload = Object.assign({}, state.payload, {
          dashboard: Object.assign({}, dashboard, {
            threads: Array.isArray(dashboard.threads) ? dashboard.threads.filter((thread) => thread && thread.id !== threadId) : dashboard.threads,
            runningThreads: Array.isArray(dashboard.runningThreads) ? dashboard.runningThreads.filter((thread) => thread && thread.id !== threadId) : dashboard.runningThreads,
          }),
          detail: state.payload.detail && state.payload.detail.thread && state.payload.detail.thread.id === threadId
            ? Object.assign({}, state.payload.detail, { thread: undefined })
            : state.payload.detail,
        });
        if (state.selectedThreadId === threadId) {
          state.selectedThreadId = undefined;
        }
      }

      function patchThreads(threadIds, updates) {
        (threadIds || []).forEach((threadId) => patchThread(threadId, updates));
      }

      function removeThreads(threadIds) {
        (threadIds || []).forEach((threadId) => removeThread(threadId));
      }

      function findThreadInPayload(threadId, payload = state.payload) {
        if (!threadId || !payload) return undefined;
        const dashboard = payload.dashboard || {};
        return (dashboard.threads || []).find((thread) => thread.id === threadId)
          || (dashboard.runningThreads || []).find((thread) => thread.id === threadId)
          || ((payload.detail && payload.detail.thread && payload.detail.thread.id === threadId) ? payload.detail.thread : undefined);
      }

      function syncCodexTabProjectionDom() {
        if (!state.payload) return false;
        let synced = false;

        document.querySelectorAll("[data-thread-id]").forEach((node) => {
          const threadId = node.dataset.threadId;
          const thread = findThreadInPayload(threadId);
          if (!thread) return;
          const linkMeta = codexLinkMeta(threadId);
          const status = effectiveThreadStatus(thread);
          node.classList.toggle("codex-focused", Boolean(linkMeta.isFocused));
          node.classList.toggle("codex-open", !linkMeta.isFocused && Boolean(linkMeta.isOpen));
          const statusBadgeSlot = node.querySelector('[data-thread-status-badge="' + CSS.escape(threadId) + '"]');
          if (statusBadgeSlot) statusBadgeSlot.innerHTML = renderThreadFactBadges(thread);
          const linkBadgeSlot = node.querySelector('[data-thread-link-badge="' + CSS.escape(threadId) + '"]');
          if (linkBadgeSlot) linkBadgeSlot.innerHTML = codexLinkBadge(threadId);
          const visibilitySlot = node.querySelector('[data-thread-visibility-pill="' + CSS.escape(threadId) + '"]');
          if (visibilitySlot) visibilitySlot.innerHTML = renderThreadVisibilityPill(thread);
          const statusMetaSlot = node.querySelector('[data-thread-status-meta="' + CSS.escape(threadId) + '"]');
          if (statusMetaSlot) statusMetaSlot.textContent = threadFactSummaryLabel(thread);
          synced = true;
        });

        document.querySelectorAll("[data-running-card]").forEach((card) => {
          const threadId = card.dataset.runningCard;
          const thread = findThreadInPayload(threadId);
          if (!thread) return;
          const linkMeta = codexLinkMeta(threadId);
          const status = effectiveThreadStatus(thread);
          const attached = (thread.board_source === "attached" || thread.board_source === "linked" || status === "attached" || status === "linked") && status !== "running";
          card.classList.toggle("codex-card-focused", Boolean(linkMeta.isFocused));
          card.classList.toggle("codex-card-open", !linkMeta.isFocused && Boolean(linkMeta.isOpen));
          card.classList.toggle("running-live", status === "running");
          card.classList.toggle("board-attached", attached);
          const badgesSlot = card.querySelector('[data-running-status-badges="' + CSS.escape(threadId) + '"]');
          if (badgesSlot) {
            const compactId = (card.classList.contains("fixed-tiny") || card.classList.contains("compact-card"))
              ? renderCopyableThreadId(threadId, { maxLength: 10 })
              : "";
            badgesSlot.innerHTML = renderThreadFactBadges(thread) + boardBadge(thread) + renderBoardTabPill(thread) + renderLoopManagedBadge(threadId) + '<span data-running-pending-badge="' + esc(threadId) + '">' + renderPendingPromptBadge(threadId) + '</span>' + codexLinkBadge(threadId) + compactId;
          }
          const linkMetaSlot = card.querySelector('[data-running-link-meta="' + CSS.escape(threadId) + '"]');
          if (linkMetaSlot) linkMetaSlot.textContent = linkMeta.isFocused ? "Focused" : (linkMeta.isSidebar ? "Sidebar" : (linkMeta.isOpen ? "Linked" : "Inferred"));
          const progressValueSlot = card.querySelector('[data-running-progress-value="' + CSS.escape(threadId) + '"]');
          if (progressValueSlot) {
            const progress = extractThreadProgress(thread);
            progressValueSlot.textContent = progress.percent !== undefined ? (String(progress.percent) + "%") : factualStatusLabel(threadStateFacts(thread).process);
          }
          synced = true;
        });

        const spotlightThreadId = state.selectedThreadId || (state.payload && state.payload.selectedThreadId);
        const spotlightThread = findThreadInPayload(spotlightThreadId);
        if (spotlightThread) {
          const spotlightStatusSlot = document.querySelector('[data-spotlight-status-badge="' + CSS.escape(spotlightThread.id) + '"]');
          if (spotlightStatusSlot) spotlightStatusSlot.innerHTML = renderThreadFactBadges(spotlightThread);
          const spotlightLinkBadgeSlot = document.querySelector('[data-spotlight-link-badge="' + CSS.escape(spotlightThread.id) + '"]');
          if (spotlightLinkBadgeSlot) spotlightLinkBadgeSlot.innerHTML = codexLinkBadge(spotlightThread.id);
          const spotlightLinkValueSlot = document.querySelector('[data-spotlight-link-value="' + CSS.escape(spotlightThread.id) + '"]');
          if (spotlightLinkValueSlot) {
            const linkMeta = codexLinkMeta(spotlightThread.id);
            spotlightLinkValueSlot.textContent = linkMeta.isFocused ? "Focused in Codex" : (linkMeta.isSidebar ? "Shown in Codex Sidebar" : (linkMeta.isOpen ? "Open in Codex" : (linkMeta.pending ? "Linking to Codex" : "Not linked")));
          }
          synced = true;
        }

        return synced;
      }

      function syncThreadTitleDom(threadId, title) {
        if (!threadId) return false;
        let synced = false;
        document.querySelectorAll('[data-thread-title-slot="' + CSS.escape(threadId) + '"]').forEach((node) => {
          const max = Number(node.dataset.titleMax || 120);
          const fullTitle = displayThreadTitle(threadId, title || "(no title)");
          node.textContent = short(fullTitle, Number.isFinite(max) ? max : 120);
          node.setAttribute("title", fullTitle);
          synced = true;
        });
        return synced;
      }

      function syncPendingPromptState(hostPending) {
        const next = {};
        Object.entries(hostPending || {}).forEach(([threadId, entry]) => {
          next[threadId] = Object.assign({ state: "queued" }, entry || {});
        });
        const now = Date.now();
        Object.entries(state.ui.pendingPromptState || {}).forEach(([threadId, entry]) => {
          if (!entry || entry.state !== "failed") return;
          const updatedAtMs = Date.parse(entry.updatedAt || entry.queuedAt || "");
          if (!Number.isFinite(updatedAtMs) || now - updatedAtMs < 12000) {
            next[threadId] = entry;
          }
        });
        state.ui.pendingPromptState = next;
      }

      function queuePromptOptimistically(threadId, prompt) {
        if (!threadId) return;
        state.ui.pendingPromptState[threadId] = {
          state: "queued",
          prompt: String(prompt || "").trim() || "continue",
          queuedAt: new Date().toISOString(),
        };
      }

      function markPromptQueueFailed(threadId, prompt, message) {
        if (!threadId) return;
        state.ui.pendingPromptState[threadId] = {
          state: "failed",
          prompt: String(prompt || "").trim() || "continue",
          message: String(message || "Failed to queue prompt"),
          updatedAt: new Date().toISOString(),
        };
      }

      function esc(value) {
        return (value ?? "").toString().replace(/[&<>"']/g, (ch) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "\\"": "&quot;",
          "'": "&#39;",
        }[ch]));
      }

      function shellQuote(value) {
        const text = String(value || "");
        if (!text) return "''";
        return "'" + text.replace(/'/g, "'\\\"'\\\"'") + "'";
      }

      function renderCuteEmpty(title, copy, art) {
        return '<div class="empty-state cute">' +
          '<div class="empty-state-inner">' +
            renderThemeVisual(art || MEDIA.rest, "empty-state-art", "Waiting", "empty") +
            '<div class="empty-state-title">' + esc(title) + '</div>' +
            '<div class="empty-state-copy">' + esc(copy) + '</div>' +
          '</div>' +
        '</div>';
      }

      function phaseArtFor(label) {
        const key = String(label || "").toLowerCase();
        if (key === "planning") return MEDIA.planning;
        if (key === "tooling") return MEDIA.tooling;
        if (key === "editing") return MEDIA.editing;
        if (key === "testing") return MEDIA.testing;
        return MEDIA.waiting;
      }

      function phaseClassFor(label) {
        const key = String(label || "").toLowerCase();
        if (key === "running") return " phase-tooling";
        if (key === "planning") return " phase-planning";
        if (key === "tooling") return " phase-tooling";
        if (key === "editing") return " phase-editing";
        if (key === "testing") return " phase-testing";
        return " phase-waiting";
      }

      function renderRunningAnimatedIcon(imgClass = "", label = "Running", variant = "phase") {
        return '<span class="' + esc(imgClass) + ' running-animated-icon theme-is-optional variant-' + esc(variant) + '" role="img" aria-label="' + esc(label || "Running") + '">' +
          '<svg viewBox="0 0 80 80" focusable="false">' +
            '<circle class="running-icon-track" cx="40" cy="40" r="29"></circle>' +
            '<circle class="running-icon-ring" cx="40" cy="40" r="29" pathLength="100"></circle>' +
            '<circle class="running-icon-arc" cx="40" cy="40" r="21" pathLength="100"></circle>' +
            '<path class="running-icon-link" d="M24 56 L40 24 L56 56"></path>' +
            '<circle class="running-icon-halo" cx="40" cy="40" r="13"></circle>' +
            '<circle class="running-icon-core" cx="40" cy="40" r="6"></circle>' +
            '<circle class="running-icon-node node-a" cx="24" cy="56" r="3.6"></circle>' +
            '<circle class="running-icon-node node-b" cx="40" cy="24" r="3.6"></circle>' +
            '<circle class="running-icon-node node-c" cx="56" cy="56" r="3.6"></circle>' +
            '<circle class="running-icon-satellite" cx="40" cy="11" r="2.8"></circle>' +
          '</svg>' +
        '</span>';
      }

      function renderThemeVisual(src, imgClass, phaseLabel = "Waiting", variant = "phase") {
        const mode = themeMode();
        const phaseClass = phaseClassFor(phaseLabel).trim() || "phase-waiting";
        if (mode === "pure") return "";
        if (String(phaseLabel || "").toLowerCase() === "running") {
          return renderRunningAnimatedIcon(imgClass, phaseLabel, variant);
        }
        if (mode === "clean") {
          return '<span class="theme-bar theme-is-optional variant-' + esc(variant) + ' ' + esc(phaseClass) + '" aria-hidden="true"></span>';
        }
        return '<img class="' + esc(imgClass) + ' theme-is-optional" src="' + esc(src || phaseArtFor(phaseLabel)) + '" alt="" />';
      }

      function inferredActivityText(phase) {
        return (phase && phase.label) || "Unknown";
      }

      function renderPhaseChip(phase) {
        const phaseClass = phaseClassFor(phase.label).trim();
        return '<span class="phase-chip ' + esc(phaseClass) + '">' +
          renderThemeVisual(phaseArtFor(phase.label), "phase-chip-art", phase.label, "phase-chip") +
          '<span>' + esc(phase.label) + '</span>' +
        '</span>';
      }

      function renderInferredActivityChip(phase) {
        const label = inferredActivityText(phase);
        const phaseClass = phaseClassFor(label).trim();
        return '<span class="phase-chip ' + esc(phaseClass) + '" title="Inferred from recent logs and rendered history">' +
          renderThemeVisual(phaseArtFor(label), "phase-chip-art", label, "phase-chip") +
          '<span>Inferred activity: ' + esc(label) + '</span>' +
        '</span>';
      }

      function renderSummaryCard(label, value, copy, phaseLabel, art, actionsHtml, extraHtml, badgeLabel) {
        const phaseClass = phaseClassFor(phaseLabel).trim();
        const summaryBadge = badgeLabel || phaseLabel;
        return '<div class="summary-card ' + esc(phaseClass) + '">' +
          '<div class="summary-head">' +
            renderThemeVisual(art || phaseArtFor(phaseLabel), "summary-art", phaseLabel, "summary") +
            '<div class="summary-head-copy">' +
              '<div class="summary-label">' + esc(label) + '</div>' +
              '<span class="phase-chip ' + esc(phaseClass) + '">' +
                '<span>' + esc(summaryBadge) + '</span>' +
              '</span>' +
            '</div>' +
          '</div>' +
          '<div class="summary-body">' +
            '<div class="summary-value">' + esc(value) + '</div>' +
            '<div class="summary-copy">' + esc(copy) + '</div>' +
            (extraHtml || '') +
            (actionsHtml ? '<div class="summary-actions">' + actionsHtml + '</div>' : '') +
          '</div>' +
        '</div>';
      }

      function codexSourceLabel(source) {
        const key = String(source || "").toLowerCase();
        if (key === "user") return "user npm";
        if (key === "system") return "system npm";
        if (key === "workspace") return "workspace";
        if (key === "bundled") return "VS Code bundled";
        if (key === "wrapper") return "wrapper";
        if (key === "symlink") return "symlink";
        return "unknown source";
      }

      function renderCodexInventoryRow(item, activePath) {
        const pathText = String(item && item.path ? item.path : "unknown").trim();
        const versionText = String((item && item.version) || "unknown").trim();
        const sourceText = codexSourceLabel(item && item.installSource ? item.installSource : (item && item.source));
        const versionSuffix = String(item && item.ok ? (item.version ? " (ok)" : "") : " (unreadable)");
        const activeSuffix = pathText && activePath && pathText === activePath ? " · active" : "";
        return '<div class="summary-copy mono">' +
          esc(pathText) +
          ' · ' + esc(versionText + versionSuffix) +
          (sourceText ? ' · ' + esc(sourceText) : '') +
          esc(activeSuffix) +
        '</div>';
      }

      function renderCodexInventorySummaryCard(activeCodex, codexInventory) {
        const activePath = activeCodex && activeCodex.path ? String(activeCodex.path) : "";
        const activeVersion = activeCodex && activeCodex.ok ? String(activeCodex.version || "unknown") : "unknown";
        const activeSource = activeCodex ? codexSourceLabel(activeCodex.installSource || activeCodex.source || "unknown") : "unknown source";

        const items = Array.isArray(codexInventory && codexInventory.items)
          ? codexInventory.items.filter((item) => item && item.path)
          : [];

        const discoveredRows = items
          .slice()
          .sort((a, b) => {
            const aActive = String(a.path || "") === activePath;
            const bActive = String(b.path || "") === activePath;
            if (aActive === bActive) return 0;
            return aActive ? -1 : 1;
          })
          .slice(0, 6)
          .map((item) => renderCodexInventoryRow(item, activePath))
          .join("");

        const hiddenRows = Math.max(0, items.length - 6);
        const conflictRows = items
          .filter((item) => item && item.path !== activePath && item.ok && String(item.version || "") && String(activeVersion || "") && item.version !== activeVersion)
          .filter((item) => item.installSource === "system" || item.installSource === "bundled");
        const conflictText = conflictRows.length
          ? "Active Codex " + activeVersion + " differs from " + String(conflictRows.length) + " system or bundled install" + (conflictRows.length > 1 ? "s" : "") + "; verify PATH precedence before upgrading."
          : "Active path is currently the one resolved by CMA runtime.";

        const upgradeGuidance = [
`;
