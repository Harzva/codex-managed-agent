module.exports = `
      function statusBadge(status, label) {
        return '<span class="badge badge-' + esc(status) + '">' + esc(label || status) + '</span>';
      }

      function threadStateFacts(thread, payload = state.payload) {
        if (!thread) {
          return { process: "unknown", visibility: "visible", attention: "normal" };
        }
        const rawStatus = normalize(thread.status);
        const runningIds = effectiveRunningIdSet(payload);
        const process = runningIds.has(thread.id) || rawStatus === "running" || rawStatus === "active" ? "running" : (rawStatus ? "stopped" : "unknown");
        const visibility = thread.soft_deleted ? "soft_deleted" : ((thread.archived || rawStatus === "archived") ? "archived" : "visible");
        const attention = needsHumanIntervention(thread) ? "needs_human" : "normal";
        return { process, visibility, attention };
      }

      function formatRetryAvailability(retryInfo) {
        if (!retryInfo || typeof retryInfo !== "object") return "rate limited";
        if (typeof retryInfo.displayText === "string" && retryInfo.displayText.trim()) {
          return retryInfo.displayText.trim();
        }
        if (typeof retryInfo.message === "string" && retryInfo.message.trim()) {
          return retryInfo.message.trim();
        }
        if (typeof retryInfo.code === "string" && retryInfo.code.trim()) {
          return retryInfo.code.trim();
        }
        return "rate limited";
      }

      function normalizeTokenHealthState(value) {
        if (typeof value !== "string") return "unknown";
        return value.trim().toLowerCase() || "unknown";
      }

      function isTokenHealthBlocking(value) {
        const health = normalizeTokenHealthState(value);
        return health === "invalid" || health === "expired" || health === "refresh_failed";
      }

      function pickSwitchRecommendedProfile(codexAutoState = {}, activeProfileName = "", retryByAccount = null) {
        if (!activeProfileName) return null;
        const accountList = Array.isArray(codexAutoState.accounts) ? codexAutoState.accounts : [];
        const details = (codexAutoState.accountDetails && typeof codexAutoState.accountDetails === "object")
          ? codexAutoState.accountDetails
          : {};
        const retries = retryByAccount || (codexAutoState.retryAvailabilityByAccount || {});
        for (var i = 0; i < accountList.length; i++) {
          const candidate = accountList[i];
          if (candidate === activeProfileName) continue;
          const candidateDetails = details[candidate];
          if (!candidateDetails || !candidateDetails.hasAuth) continue;
          if (isTokenHealthBlocking(candidateDetails.tokenHealth)) continue;
          if (retries[candidate]) continue;
          return candidate;
        }
        return null;
      }

      function renderRunningCardQuotaBadge(thread, payload = state.payload) {
        const facts = threadStateFacts(thread, payload);
        if (!thread || facts.process !== "running") return "";

        const codexAutoState = (payload && payload.codexAutoState && typeof payload.codexAutoState === "object") ? payload.codexAutoState : {};
        const activeProfileName = String(
          (codexAutoState.activeProfileName || codexAutoState.currentAccount || "").trim()
        );
        if (!activeProfileName) return "";

        const retryMap = (codexAutoState.retryAvailabilityByAccount || {});
        const retryInfo = retryMap && retryMap[activeProfileName];
        const accountDetails = (codexAutoState.accountDetails && typeof codexAutoState.accountDetails === "object")
          ? codexAutoState.accountDetails
          : {};
        const activeProfileDetails = activeProfileName ? accountDetails[activeProfileName] || {} : {};
        const tokenHealth = normalizeTokenHealthState(activeProfileDetails.tokenHealth);
        const tokenBlocked = isTokenHealthBlocking(tokenHealth);
        if (!retryInfo && !tokenBlocked) return "";
        const recommendation = pickSwitchRecommendedProfile(codexAutoState, activeProfileName, retryMap);
        const recommendationText = recommendation
          ? "Switch recommended to " + recommendation
          : "No switch-ready profile found";

        if (tokenBlocked) {
          return (
            '<span class="badge badge-intervention" title="Running thread may be blocked by account auth state: ' +
            esc("Auth state is " + tokenHealth + ". " + recommendationText) +
            '">' +
              "Auth blocked" +
            "</span>"
          );
        }

        return (
          '<span class="badge badge-intervention" title="Running thread may be blocked by account-level rate-limit state: ' +
          esc(formatRetryAvailability(retryInfo)) +
          ". " +
          esc(recommendationText) +
          '">' +
            "Quota blocked" +
          "</span>"
        );
      }

      function factualStatusLabel(value) {
        return ({
          running: "Running",
          stopped: "Stopped",
          unknown: "Unknown",
          visible: "Visible",
          archived: "Archived",
          soft_deleted: "Soft Deleted",
          needs_human: "Needs Human",
          normal: "Normal"
        })[value] || String(value || "Unknown");
      }

      function factualBadgeKey(value) {
        return String(value || "unknown").replace(/_/g, "-");
      }

      function renderThreadFactBadges(thread, payload = state.payload, options = {}) {
        const facts = threadStateFacts(thread, payload);
        const includeVisibility = options.includeVisibility !== false && facts.visibility !== "visible";
        const includeAttention = options.includeAttention !== false && facts.attention === "needs_human";
        return [
          statusBadge(factualBadgeKey(facts.process), factualStatusLabel(facts.process)),
          includeVisibility ? statusBadge(factualBadgeKey(facts.visibility), factualStatusLabel(facts.visibility)) : "",
          includeAttention ? statusBadge("needs-human", factualStatusLabel(facts.attention)) : ""
        ].join("");
      }

      function threadFactSummaryLabel(thread, payload = state.payload) {
        const facts = threadStateFacts(thread, payload);
        const labels = [factualStatusLabel(facts.process)];
        if (facts.visibility !== "visible") labels.push(factualStatusLabel(facts.visibility));
        if (facts.attention === "needs_human") labels.push(factualStatusLabel(facts.attention));
        return labels.join(" · ");
      }

      function effectiveRunningIdSet(payload = state.payload) {
        return new Set((payload && payload.effectiveRunningThreadIds) || []);
      }

      function tabProjectionFor(payload = state.payload) {
        return (payload && (payload.codexLinkState || payload.codexTabProjection)) || { openThreadIds: [], focusedThreadId: undefined, tabGroups: [] };
      }

      function coordinationTruthFor(thread) {
        const truth = thread && thread.coordinationTruth;
        if (truth && typeof truth === "object") return truth;
        const meta = thread && thread.coordinationState;
        return {
          key: (meta && meta.key) || "waiting",
          label: (meta && meta.label) || "Waiting",
          reason: (meta && meta.reason) || "Ready for a follow-up assignment or baton pass.",
          needsHuman: Boolean(meta && meta.key === "handoff"),
          bucket: (meta && meta.key === "handoff") ? "urgent" : "ready",
          source: "webview-fallback",
        };
      }

      function normalizeHandoffCueBucket(value) {
        const key = normalize(value);
        if (key === "blocked" || key === "waiting") return key;
        return "urgent";
      }

      function findThreadByReference(reference, payload = state.payload) {
        const raw = String(reference || "").trim();
        if (!raw) return undefined;
        const normalized = raw.toLowerCase();
        const threads = ((payload && payload.dashboard && payload.dashboard.threads) || []);
        return threads.find((thread) => String(thread.id || "") === raw)
          || threads.find((thread) => String(displayThreadTitle(thread, "") || "").trim().toLowerCase() === normalized)
          || threads.find((thread) => String(thread.title || "").trim().toLowerCase() === normalized);
      }

      function handoffObjectsFor(payload = state.payload) {
        return (payload && payload.handoffObjects) || {};
      }

      function handoffObjectFor(threadId, payload = state.payload) {
        if (!threadId) return undefined;
        const handoffObject = handoffObjectsFor(payload)[threadId];
        return handoffObject && handoffObject.active !== false ? handoffObject : undefined;
      }

      function handoffTargetLabel(handoffObject, payload = state.payload) {
        if (!handoffObject) return "";
        if (handoffObject.targetThreadId) {
          const target = findThreadInPayload(handoffObject.targetThreadId, payload);
          if (target) return displayThreadTitle(target, handoffObject.targetThreadId);
        }
        return String(handoffObject.targetLabel || "").trim();
      }

      function effectiveCoordinationTruth(thread, payload = state.payload) {
        const base = coordinationTruthFor(thread);
        const handoffObject = handoffObjectFor(thread && thread.id, payload);
        if (!handoffObject) return base;
        return {
          key: "handoff",
          label: "Handoff",
          reason: String(handoffObject.note || base.reason || "Explicit handoff cue").trim() || "Explicit handoff cue",
          needsHuman: true,
          bucket: normalizeHandoffCueBucket(handoffObject.bucket),
          source: handoffObject.source || "host-storage-v1",
          explicit: true,
          targetThreadId: handoffObject.targetThreadId || undefined,
          targetLabel: handoffTargetLabel(handoffObject, payload),
          updatedAt: handoffObject.updatedAt || handoffObject.createdAt || "",
        };
      }

      function upsertHandoffCue(threadId) {
        const thread = findThreadInPayload(threadId);
        if (!thread) return;
        const current = handoffObjectFor(threadId) || {};
        const targetPrompt = window.prompt(
          "Optional next owner thread id or exact title. Leave empty if the handoff is unassigned.",
          current.targetThreadId || current.targetLabel || "",
        );
        if (targetPrompt === null) return;
        const notePrompt = window.prompt(
          "What needs to happen next?",
          current.note || "Review the latest state and take over the next slice.",
        );
        if (notePrompt === null) return;
        const bucketPrompt = window.prompt(
          "Handoff bucket: urgent, blocked, or waiting",
          current.bucket || "urgent",
        );
        if (bucketPrompt === null) return;
        const target = findThreadByReference(targetPrompt);
        vscode.postMessage({
          type: "setHandoffObject",
          handoff: {
            threadId,
            note: String(notePrompt || "").trim() || "Explicit handoff cue",
            bucket: normalizeHandoffCueBucket(bucketPrompt),
            targetThreadId: target ? target.id : undefined,
            targetLabel: target ? displayThreadTitle(target, target.id) : String(targetPrompt || "").trim(),
          },
        });
      }

      function clearHandoffCue(threadId) {
        if (!threadId) return;
        vscode.postMessage({
          type: "clearHandoffObject",
          threadId,
        });
      }

      function effectiveThreadStatus(thread, payload = state.payload) {
        if (!thread) return "idle";
        const rawStatus = normalize(thread.status) || "idle";
        if (rawStatus !== "running") return rawStatus;
        if (effectiveRunningIdSet(payload).has(thread.id)) return "running";
        const link = codexLinkMeta(thread.id, payload);
        if (link.isFocused || link.isOpen || link.pending) return "linked";
        if ((thread.board_source || "") === "attached") return "attached";
        return "recent";
      }

      function prunePendingCodexLinks() {
        const now = Date.now();
        Object.keys(state.ui.pendingCodexLink).forEach((threadId) => {
          const entry = state.ui.pendingCodexLink[threadId];
          if (!entry || entry.expiresAt <= now) {
            delete state.ui.pendingCodexLink[threadId];
          }
        });
      }

      function setSelectedThread(threadId, options = {}) {
        if (!threadId) return;
        state.selectedThreadId = threadId;
        state.ui.threadDrawerMode = options.drawerMode || "overview";
        if (options.scrollIntoView) {
          state.pendingScrollThreadId = threadId;
        }
        if (options.openDrawer) {
          state.ui.drawerOpen = true;
          state.ui.teamTaskDrawerId = undefined;
          const thread = findThreadInPayload(threadId);
          state.ui.optimisticDrawerThread = thread ? Object.assign({}, thread) : { id: threadId };
          renderDetail(state.payload);
        }
        if (options.view) {
          state.ui.currentView = options.view;
        }
        persistUi();
      }

      function openThreadTrace(threadId) {
        if (!threadId) return;
        state.ui.currentView = state.ui.currentView === "overview" ? "threads" : state.ui.currentView;
        state.ui.traceMode = "current";
        state.ui.traceViewTab = "summary";
        state.ui.traceSelectedItemId = "";
        setSelectedThread(threadId, { openDrawer: true, drawerMode: "trace" });
        persistUi();
        render(state.payload);
        vscode.postMessage({ type: "selectThread", threadId });
      }

      function markCodexLinking(threadId, mode = "sidebar") {
        if (!threadId) return;
        state.ui.pendingCodexLink[threadId] = {
          mode,
          expiresAt: Date.now() + 12000,
        };
        setSelectedThread(threadId);
      }

      function threadGroupKey(thread) {
        if (!thread) return "stopped";
        const facts = threadStateFacts(thread);
        if (facts.process === "running") return "running";
        if (facts.visibility === "soft_deleted") return "soft_deleted";
        if (facts.visibility === "archived") return "archived";
        if (facts.attention === "needs_human") return "needs_human";
        return "stopped";
      }

      function scrollFocusedCodexThreadIntoView(payload) {
        const focusedThreadId = tabProjectionFor(payload).focusedThreadId;
        if (!focusedThreadId) {
          state.lastAutoScrolledFocusedThreadId = undefined;
          return;
        }
        if (state.lastAutoScrolledFocusedThreadId === focusedThreadId) {
          return;
        }
        state.lastAutoScrolledFocusedThreadId = focusedThreadId;
        window.requestAnimationFrame(() => {
          const targets = Array.from(document.querySelectorAll("[data-thread-id]"))
            .filter((node) => node.dataset.threadId === focusedThreadId);
          targets.forEach((node) => {
            const pane = node.closest(".workspace-pane");
            const visible = !pane || pane.classList.contains("active");
            if (visible || targets.length === 1) {
              node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
            }
          });
        });
      }

      function scrollPendingThreadIntoView() {
        const threadId = state.pendingScrollThreadId;
        if (!threadId) return;
        window.requestAnimationFrame(() => {
          const targets = Array.from(document.querySelectorAll("[data-thread-id]"))
            .filter((node) => node.dataset.threadId === threadId);
          const preferred = targets.find((node) => {
            const pane = node.closest(".workspace-pane");
            return !pane || pane.classList.contains("active");
          }) || targets[0];
          if (preferred) {
            preferred.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          }
          state.pendingScrollThreadId = undefined;
        });
      }

      function flashLocatedNode(node) {
        if (!node) return;
        node.classList.remove("locate-flash");
        void node.offsetWidth;
        node.classList.add("locate-flash");
        window.setTimeout(() => {
          node.classList.remove("locate-flash");
        }, 1800);
      }

      function locateRenderedNode(selector, missingMessage) {
        window.requestAnimationFrame(() => {
          const node = document.querySelector(selector);
          if (!node) {
            if (missingMessage) {
              state.lastLocateNotice = missingMessage;
              setNodeText("heroSummary", missingMessage);
            }
            return;
          }
          node.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          flashLocatedNode(node);
        });
      }

      function locateThreadOnBoard(threadId) {
        const nextThreadId = String(threadId || "");
        if (!nextThreadId) return;
        if (!isBoardAttached(nextThreadId) && !document.querySelector('[data-running-card="' + CSS.escape(nextThreadId) + '"]')) {
          state.lastLocateNotice = "This thread is not attached to Board yet. Use Attach Board first.";
          setNodeText("heroSummary", state.lastLocateNotice);
          return;
        }
        const tab = boardTabFor(nextThreadId);
        state.ui.currentView = "board";
        state.ui.boardSubView = "status";
        if (tab) state.ui.activeBoardTab = tab;
        persistUi();
        render(state.payload);
        locateRenderedNode(
          '[data-running-card="' + CSS.escape(nextThreadId) + '"]',
          "Board card is not visible in the current board filter.",
        );
      }

      function locateThreadOnLoop(threadId) {
        const nextThreadId = String(threadId || "");
        if (!nextThreadId) return;
        if (!isLoopManagedThread(nextThreadId)) {
          state.lastLocateNotice = "This thread is not attached to Loop yet. Use Attach Loop first.";
          setNodeText("heroSummary", state.lastLocateNotice);
          return;
        }
        state.ui.currentView = "loop";
        persistUi();
        render(state.payload);
        locateRenderedNode(
          '[data-loop-thread-card="' + CSS.escape(nextThreadId) + '"]',
          "Loop card is not visible yet. Try Reload if the attach just happened.",
        );
      }

      function syncFocusedCodexGroup(payload) {
        const focusedThreadId = tabProjectionFor(payload).focusedThreadId;
        if (!focusedThreadId) return;
        const focusedThread = ((payload && payload.dashboard && payload.dashboard.threads) || []).find((thread) => thread.id === focusedThreadId);
        if (!focusedThread) return;
        const groupKey = threadGroupKey(focusedThread);
        if (!state.ui.groups[groupKey]) {
          state.ui.groups[groupKey] = true;
          persistUi();
        }
      }

      const BATCH_ACTIONS = {
        attach_board: { label: "Add to Board" },
        archive: { label: "Archive" },
        unarchive: { label: "Unarchive" },
        restore: { label: "Restore" },
        soft_delete: {
          label: "Soft Delete",
          intentLabel: "Confirm Soft Delete",
          summary: "Move the selected threads into the deleted bucket.",
          confirmLabel: "Confirm Soft Delete",
          tone: "warn",
          requiresConfirm: true,
        },
        hard_delete: {
          label: "Hard Delete",
          intentLabel: "Confirm Hard Delete",
          summary: "Permanently remove the selected threads and their logs.",
          confirmLabel: "Delete Permanently",
          tone: "danger",
          requiresConfirm: true,
        },
      };

      function normalize(value) {
        return (value || "").toString().toLowerCase();
      }

      const THREAD_SEARCH_GRAMMAR_FIELDS = ["title", "id", "cwd", "model", "status", "tab", "pinned", "tool", "file"];

      function emptySearchConstraints() {
        return THREAD_SEARCH_GRAMMAR_FIELDS.reduce((acc, field) => {
          acc[field] = [];
          return acc;
        }, {});
      }

      function isSearchWhitespace(char) {
        return !char || char.trim() === "";
`;
