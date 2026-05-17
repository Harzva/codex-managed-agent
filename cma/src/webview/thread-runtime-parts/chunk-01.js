module.exports = `      function activeWorkspaceRootKeys(payload = state.payload) {
        const roots = Array.isArray(payload && payload.workspaceRoots) ? payload.workspaceRoots : [];
        return new Set(roots.map((item) => String(item && item.rootKey || "").trim()).filter(Boolean));
      }

      function threadSortLabel(sort) {
        return THREAD_SORT_LABELS[sort] || THREAD_SORT_LABELS.updated;
      }

      function threadFilterLabel(filter) {
        return THREAD_FILTER_LABELS[filter] || THREAD_FILTER_LABELS.all;
      }

      function renderThreadSummaryMarkup(visibleCount, totalCount, topicFocus, sort, rootFilter, workspaceFilter, threadTabFilter = activeThreadTabFilterKey()) {
        const rootLabel = rootFilter ? compactRootIdentity(rootFilter) : "";
        const modelLabel = String(state.ui.modelFilter || "").trim();
        const tabLabel = threadTabFilter && threadTabFilter !== "all" ? threadTabFilter : "";
        const gitLabel = activeGitFilterKey() === "repo" ? "git repo" : (activeGitFilterKey() === "no_git" ? "no git" : "");
        const sortLabel = threadSortLabel(sort);
        const filterLabel = threadFilterLabel(state.ui.filter);
        const modelSuffix = modelLabel ? " · model " + modelLabel : "";
        const gitSuffix = gitLabel ? " · " + gitLabel : "";
        const filterSuffix = state.ui.filter && state.ui.filter !== "all" ? " · filter " + filterLabel : "";
        const pinnedSuffix = state.ui.pinnedOnly ? " · pinned only" : "";
        const searchSuffix = state.ui.search ? " · search active" : "";
        const factualBasis = " by factual process, visibility, and attention filters";
        const summaryText = visibleCount
          ? (
              topicFocus
                ? ("Showing " + visibleCount + " linked threads from topic map · " + (topicFocus.group === "thread" ? "focused thread" : (topicFocus.value || topicFocus.group)) + (tabLabel ? " · tab " + tabLabel : "") + modelSuffix)
                : workspaceFilter && rootFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads" + factualBasis + " · active workspace · root " + rootLabel + (tabLabel ? " · tab " + tabLabel : "") + modelSuffix + gitSuffix + filterSuffix + pinnedSuffix + searchSuffix + " · sorted by " + sortLabel)
                : workspaceFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads" + factualBasis + " · active workspace" + (tabLabel ? " · tab " + tabLabel : "") + modelSuffix + gitSuffix + filterSuffix + pinnedSuffix + searchSuffix + " · sorted by " + sortLabel)
                : rootFilter
                  ? ("Showing " + visibleCount + " of " + totalCount + " loaded threads" + factualBasis + " · root " + rootLabel + (tabLabel ? " · tab " + tabLabel : "") + modelSuffix + gitSuffix + filterSuffix + pinnedSuffix + searchSuffix + " · sorted by " + sortLabel)
                : ("Showing " + visibleCount + " of " + totalCount + " loaded threads" + factualBasis + (tabLabel ? " · tab " + tabLabel : "") + modelSuffix + gitSuffix + filterSuffix + pinnedSuffix + searchSuffix + " · sorted by " + sortLabel)
            )
          : (modelLabel ? ("No threads match model " + modelLabel + " with the current filters.") : (tabLabel ? ("No threads match tab " + tabLabel + " with the current filters.") : (topicFocus ? "No threads match the current topic-map focus." : (workspaceFilter ? "No threads match the active workspace filter." : (rootFilter ? "No threads match the current root filter." : "No threads match the current search/filter.")))));
        const actions = [];
        const workspaceRoots = Array.isArray(state.payload && state.payload.workspaceRoots) ? state.payload.workspaceRoots : [];
        if (topicFocus) actions.push('<button class="chip" data-clear-topic-focus="true" type="button">Clear topic focus</button>');
        if (workspaceRoots.length) actions.push('<button class="chip' + (workspaceFilter ? ' active' : '') + '" data-toggle-workspace-filter="true" type="button">' + esc(workspaceFilter ? 'Show All Roots' : 'Active Workspace') + '</button>');
        if (rootFilter) actions.push('<button class="chip" data-clear-root-filter="true" type="button">Clear root filter</button>');
        if (gitLabel) actions.push('<button class="chip" data-git-filter-option="all" type="button">Clear git filter</button>');
        if (modelLabel) actions.push('<button class="chip" data-clear-model-filter="true" type="button">Clear model filter</button>');
        if (tabLabel) actions.push('<button class="chip" data-clear-thread-tab-filter="true" type="button">Clear tab filter</button>');
        if (state.ui.search || state.ui.filter !== "all" || state.ui.pinnedOnly || modelLabel) actions.push('<button class="chip" data-clear-thread-explorer-filters="true" type="button">Clear search and filters</button>');
        if (!actions.length) return esc(summaryText);
        return '<span>' + esc(summaryText) + '</span> ' + actions.join(" ");
      }

      function renderThreadListEmptyMarkup(totalCount) {
        const hasLoadedThreads = Number(totalCount || 0) > 0;
        const hasLocalConstraints = Boolean(
          state.ui.search ||
          state.ui.topicFocus ||
          state.ui.rootFilter ||
          state.ui.workspaceFilter ||
          activeGitFilterKey() !== "all" ||
          state.ui.modelFilter ||
          state.ui.pinnedOnly ||
          state.ui.filter !== "all" ||
          activeThreadTabFilterKey() !== "all"
        );
        const title = hasLoadedThreads ? "No matching threads" : "No threads loaded";
        const copy = hasLoadedThreads
          ? (hasLocalConstraints ? "Clear the active search, factual state filter, model, git, pin, tab, topic, or root constraint to show loaded threads." : "The current factual state view has no matching threads.")
          : "Refresh or scan sessions to load workspace threads.";
        const actions = hasLoadedThreads
          ? '<button class="chip" data-clear-thread-explorer-filters="true" type="button">Clear search and filters</button>'
          : '<button class="chip" data-refresh-thread-explorer="true" type="button">Refresh</button><button class="chip" data-scan-thread-explorer="true" type="button">Scan Sessions</button>';
        return '<div class="empty thread-list-empty">' +
          '<div class="empty-state-title">' + esc(title) + '</div>' +
          '<div class="empty-state-copy">' + esc(copy) + '</div>' +
          '<div class="chip-row">' + actions + '</div>' +
        '</div>';
      }

      function clearThreadExplorerConstraints() {
        state.ui.search = "";
        state.ui.topicFocus = null;
        state.ui.rootFilter = null;
        state.ui.workspaceFilter = false;
        state.ui.gitFilter = "all";
        state.ui.modelFilter = "";
        state.ui.threadTabFilter = "all";
        state.ui.rootFilterMenuOpen = false;
        state.ui.gitFilterMenuOpen = false;
        state.ui.threadTabFilterMenuOpen = false;
        state.ui.filter = "all";
        state.ui.pinnedOnly = false;
        persistUi();
        vscode.postMessage({ type: "threadFilterChanged", filter: state.ui.filter });
        render(state.payload);
      }

      function renderThreadCountSummaryStats(allThreads, visibleThreads, payload = state.payload) {
        const all = Array.isArray(allThreads) ? allThreads : [];
        const visible = Array.isArray(visibleThreads) ? visibleThreads : [];
        const running = all.filter((thread) => threadStateFacts(thread, payload).process === "running").length;
        const stopped = all.filter((thread) => threadStateFacts(thread, payload).process === "stopped").length;
        const pinned = all.filter((thread) => isPinned(thread.id)).length;
        const needsHuman = all.filter((thread) => needsHumanIntervention(thread)).length;
        const archived = all.filter((thread) => Boolean(thread.archived) || effectiveThreadStatus(thread, payload) === "archived").length;
        const deleted = all.filter((thread) => Boolean(thread.soft_deleted)).length;
        return [
          drawerStat("Total", String(all.length || 0)),
          drawerStat("Visible", String(visible.length || 0)),
          drawerStat("Running", String(running || 0)),
          drawerStat("Stopped", String(stopped || 0)),
          drawerStat("Pinned", String(pinned || 0)),
          drawerStat("Needs Human", String(needsHuman || 0)),
          drawerStat("Archived / Deleted", String(archived || 0) + " / " + String(deleted || 0))
        ].join("");
      }

      function tabManagementSummary(allThreads) {
        const all = Array.isArray(allThreads) ? allThreads : [];
        const order = boardTabOrderList();
        const counts = {};
        order.forEach((name) => {
          counts[name] = 0;
        });
        let assigned = 0;
        all.forEach((thread) => {
          const name = boardTabFor(thread && thread.id);
          if (!name) return;
          assigned += 1;
          if (!counts[name]) counts[name] = 0;
          counts[name] = (counts[name] || 0) + 1;
        });
        const extraNames = Object.keys(counts).filter((name) => !order.includes(name)).sort((a, b) => a.localeCompare(b));
        const tabs = order.concat(extraNames);
        return {
          tabs,
          counts,
          assigned,
          unassigned: Math.max(0, all.length - assigned),
          activeFilter: activeThreadTabFilterKey(),
          activeBoardTab: activeBoardTabKey(),
        };
      }

      function renderTabManagementStats(allThreads) {
        const summary = tabManagementSummary(allThreads);
        return [
          drawerStat("Tabs", String(summary.tabs.length || 0)),
          drawerStat("Assigned", String(summary.assigned || 0)),
          drawerStat("Unassigned", String(summary.unassigned || 0)),
          drawerStat("Filter", summary.activeFilter === "all" ? "All" : summary.activeFilter)
        ].join("");
      }

      function renderTabManagementList(allThreads) {
        const summary = tabManagementSummary(allThreads);
        if (!summary.tabs.length) {
          return '<div class="section-note">📑 No tabs yet. <strong>Create one</strong>, then use <strong>Set to Tab</strong> on selected threads to organize your board.</div>';
        }
        return summary.tabs.slice(0, 8).map((name) =>
          '<button class="tab-management-chip' + (summary.activeFilter === name ? ' active' : '') + '" data-thread-tab-filter-option="' + esc(name) + '" type="button">' +
            '<span class="tab-management-name"' + boardTabStyle(name, false) + '>' + esc(name) + '</span>' +
            '<span class="meta-pill">' + esc(String(summary.counts[name] || 0)) + '</span>' +
          '</button>'
        ).join("") +
        (summary.tabs.length > 8 ? '<span class="meta-pill">+' + esc(String(summary.tabs.length - 8)) + ' more</span>' : '');
      }

      function renderToolIcon(name, filled = false) {
        const icons = {
          open: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 4h6v6"></path><path d="M5 11 12 4"></path><path d="M12 9.5V12H4V4h2.5"></path></svg>',
          prompt: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3.5h10v7H7.5L5 13v-2.5H3z"></path><path d="M5.5 6.2h5"></path><path d="M5.5 8.4h3.8"></path></svg>',
          codex: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5 12.5 5v6L8 13.5 3.5 11V5L8 2.5Z"></path><path d="M5.5 6.2 8 7.7l2.5-1.5"></path><path d="M8 7.8V11"></path></svg>',
          terminal: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 4A1.5 1.5 0 0 1 4 2.5h8A1.5 1.5 0 0 1 13.5 4v8A1.5 1.5 0 0 1 12 13.5H4A1.5 1.5 0 0 1 2.5 12Z"></path><path d="m5 6 2 2-2 2"></path><path d="M8.2 10h3"></path></svg>',
          git: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v6"></path><circle cx="8" cy="3.5" r="1.5"></circle><circle cx="5" cy="11.5" r="1.5"></circle><circle cx="11" cy="11.5" r="1.5"></circle><path d="M8 8.5 5 10"></path><path d="M8 8.5 11 10"></path></svg>',
          board: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="10" rx="2"></rect><path d="M7.5 3v10"></path><path d="M2.5 7.8h11"></path></svg>',
          pin: filled
            ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 10.2 6l3.6.6-2.5 2.5.5 3.7L8 11l-3.8 1.8.5-3.7L2.2 6.6 5.8 6 8 2.2Z" style="fill:currentColor;stroke:none"></path></svg>'
            : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2 10.2 6l3.6.6-2.5 2.5.5 3.7L8 11l-3.8 1.8.5-3.7L2.2 6.6 5.8 6 8 2.2Z"></path></svg>',
          chat: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5h10A1.5 1.5 0 0 1 14.5 4v6a1.5 1.5 0 0 1-1.5 1.5H6l-3 3V4A1.5 1.5 0 0 1 3 2.5Z"></path><path d="M5.5 6.5h5"></path><path d="M5.5 8.5h3.5"></path></svg>',
        };
        return '<span class="tool-icon">' + (icons[name] || '') + '</span>';
      }

      function short(value, len = 120) {
        if (value === undefined || value === null || value === "") return "";
        var text;
        if (typeof value === "string") {
          text = value;
        } else if (value instanceof Error) {
          text = value.message || String(value);
        } else if (typeof value === "object") {
          try {
            text = JSON.stringify(value);
          } catch (_) {
            text = String(value);
          }
        } else {
          text = String(value);
        }
        var limit = Number(len);
        if (!Number.isFinite(limit) || limit < 0) limit = 120;
        return text.length > limit ? text.slice(0, limit) + "..." : text;
      }

      function renderAccountSummaryCard(state) {
        var accounts = Array.isArray(state.accounts) ? state.accounts : [];
        var currentAccount = state.currentAccount || null;
        var activeProfileName = state.activeProfileName || null;
        var activeProfile = state.activeProfile || {};
        var details = state.accountDetails || {};

        if (accounts.length === 0 || !currentAccount) {
          return '<div class="section-note">No accounts configured. <a class="chip" data-overview-subview="accounts" style="display:inline-flex">Add one</a></div>';
        }

        var curDetails = details[currentAccount] || {};
        var acctType = curDetails.type || "unknown";
        var typeLabel = acctType === "official" ? "Official" : (acctType === "relay" ? "Relay" : "Unknown");
        var isActive = activeProfileName === currentAccount;
        var statusDot = isActive
          ? '<span class="codex-auto-status-dot ok" title="Active in ~/.codex/"></span>'
          : '<span class="codex-auto-status-dot missing" title="Not active"></span>';
        var sourcePath = typeof curDetails.sourceAuthPath === "string" && curDetails.sourceAuthPath.trim() ? curDetails.sourceAuthPath.trim() : null;
        var normalizedSourcePath = typeof curDetails.normalizedSourceAuthPath === "string" && curDetails.normalizedSourceAuthPath.trim() ? curDetails.normalizedSourceAuthPath.trim() : null;
        var globalAuthTarget = typeof activeProfile.authRealPath === "string" && activeProfile.authRealPath.trim()
          ? activeProfile.authRealPath.trim()
          : (typeof activeProfile.authLinkTarget === "string" ? activeProfile.authLinkTarget.trim() : "");

        var parts = [];
        parts.push('<div class="codex-account-summary-head">' +
          statusDot +
          '<strong title="' + esc(currentAccount) + '">' + esc(currentAccount) + '</strong>' +
          '<span class="codex-auto-plan-badge">' + esc(typeLabel) + '</span>' +
          (isActive ? '<span class="codex-auto-badge active-profile">Active</span>' : '') +
        '</div>');

        // Token info if available
        var ti = curDetails.tokenInfo;
        var curDuplicateWarnings = Array.isArray(curDetails.duplicateWarnings) ? curDetails.duplicateWarnings : [];
        if (ti) {
          var tokenDotClass = ti.status === "expired" ? "expired" : (ti.status === "expiring_soon" ? "warning" : "ok");
          var subscriptionActiveUntil = ti.subscriptionActiveUntil ? String(ti.subscriptionActiveUntil).split("T")[0] : "";
          parts.push('<div class="codex-account-summary-token mono">' +
            '<span class="codex-account-summary-token-dot ' + esc(tokenDotClass) + '"></span>' +
            '<span>' + esc(ti.planType || "unknown") +
            (ti.daysUntilExpiry !== undefined ? ' · Token ' + (ti.status === "expired" ? "expired" : ti.daysUntilExpiry + "d left") : '') +
            (subscriptionActiveUntil ? ' · Sub until ' + esc(subscriptionActiveUntil) : '') +
            '</span>' +
          '</div>');
        } else if (acctType === "relay") {
          parts.push('<div class="codex-account-summary-token mono">API Key account · no expiry</div>');
        }

        parts.push('<div class="codex-account-summary-count">' +
          String(accounts.length) + ' account' + (accounts.length === 1 ? '' : 's') + ' configured' +
        '</div>');

        if (curDuplicateWarnings.length > 0) {
          parts.push('<div class="codex-auto-duplicate-warning">' +
            curDuplicateWarnings.map(function (item) { return "<div>" + esc(item) + "</div>"; }).join("") +
          '</div>');
        }

        parts.push('<div class="codex-auto-account-state">Source auth: ' +
          (sourcePath
            ? '<span title="' + esc(sourcePath) + '">' + esc(short(sourcePath, 88)) + '</span>'
            : '<span class="muted">unknown</span>') +
          ' · ' + (isActive ? "Global terminal default" : "Not terminal default") +
          (activeProfile.method ? ' · ' + esc(activeProfile.method) : '') +
          '</div>');
        if (globalAuthTarget) {
          parts.push('<div class="codex-auto-source-path mono" title="' + esc(globalAuthTarget) + '">Global auth target: ' + esc(short(globalAuthTarget, 88)) + '</div>');
        }
        if (normalizedSourcePath && normalizedSourcePath !== sourcePath) {
          parts.push('<div class="codex-auto-source-path mono" title="' + esc(normalizedSourcePath) + '">Normalized source: ' + esc(short(normalizedSourcePath, 88)) + '</div>');
        }

        // Provider/endpoint
        if (curDetails.baseUrl) {
          parts.push('<div class="mono" style="font-size:10px;opacity:0.5;margin-top:2px">' +
            'Endpoint: ' + esc(curDetails.baseUrl.replace(/^https?:\\/\\//, "").replace(/\\/+$/, "")) +
          '</div>');
        } else if (acctType === "official") {
          parts.push('<div class="mono" style="font-size:10px;opacity:0.5;margin-top:2px">Endpoint: api.openai.com</div>');
        }

        return parts.join("");
      }

      function tailShort(value, len = 18) {
        const text = String(value || "");
        const max = Number(len || 18);
        if (!text || text.length <= max) return text;
        return "…" + text.slice(Math.max(0, text.length - Math.max(1, max - 1)));
      }

      function byId(id) {
        return document.getElementById(id);
      }

      function setNodeText(id, value) {
        const node = byId(id);
        const next = uiText(value);
        if (node && node.textContent !== next) node.textContent = next;
        return node;
      }

      function setNodeHtml(id, value) {
        const node = byId(id);
        if (node) node.innerHTML = translateHtmlFragment(value);
        return node;
      }

      function clearNodeHtml(id) {
        const node = byId(id);
        if (node && node.innerHTML) node.innerHTML = "";
        return node;
      }

      function setNodeClassName(id, value) {
        const node = byId(id);
        if (node && node.className !== value) node.className = value;
        return node;
      }

      function setNodeActive(id, active) {
        const node = byId(id);
        if (node) node.classList.toggle("active", Boolean(active));
        return node;
      }

      function captureTeamLaneScrolls() {
        const next = Object.assign({}, state.ui.teamLaneScroll || {});
        document.querySelectorAll("[data-team-board-lane] .team-board-lane-grid").forEach((node) => {
          const lane = node.closest("[data-team-board-lane]");
          const key = lane && lane.dataset ? lane.dataset.teamBoardLane : "";
          if (key) next[key] = Number(node.scrollTop || 0);
        });
        state.ui.teamLaneScroll = next;
        return next;
      }

      function restoreTeamLaneScrolls(scrolls = state.ui.teamLaneScroll || {}) {
        document.querySelectorAll("[data-team-board-lane] .team-board-lane-grid").forEach((node) => {
          const lane = node.closest("[data-team-board-lane]");
          const key = lane && lane.dataset ? lane.dataset.teamBoardLane : "";
          if (!key || scrolls[key] === undefined) return;
          node.scrollTop = Math.max(0, Number(scrolls[key]) || 0);
        });
      }

      function bindTeamLaneScrollMemory() {
        document.querySelectorAll("[data-team-board-lane] .team-board-lane-grid").forEach((node) => {
          if (node.dataset.teamScrollBound === "1") return;
          node.dataset.teamScrollBound = "1";
          node.addEventListener("scroll", () => {
            const lane = node.closest("[data-team-board-lane]");
            const key = lane && lane.dataset ? lane.dataset.teamBoardLane : "";
            if (!key) return;
            state.ui.teamLaneScroll = Object.assign({}, state.ui.teamLaneScroll || {}, {
              [key]: Number(node.scrollTop || 0),
            });
          }, { passive: true });
        });
      }

      function setInputValue(id, value) {
        const node = byId(id);
        if (node && node.value !== value) node.value = value;
        return node;
      }

      function bindIfPresent(id, eventName, handler) {
        const node = byId(id);
        if (node) {
          node.addEventListener(eventName, (event) => {
            try {
              handler(event);
            } catch (error) {
              const detail = error instanceof Error ? error.message : String(error || "Unknown bound-handler error");
              vscode.postMessage({
                type: "bootError",
                error: "Bound handler failed for " + id + " (" + eventName + "): " + detail,
              });
            }
          });
        }
        return node;
      }

      function compactRootIdentity(cwd) {
        const raw = String(cwd || "").trim();
        if (!raw) return "-";
        const normalized = raw.replace(/\\\\/g, "/").replace(/\\/+$/, "");
        if (!normalized) return raw;
        const parts = normalized.split("/").filter(Boolean);
        if (!parts.length) return raw;
        return parts[parts.length - 1] || raw;
      }

      function threadRootKey(thread) {
        if (!thread || typeof thread !== "object") return "";
        return String(thread.rootKey || thread.cwd || "").trim();
      }

      function threadRootLabel(thread) {
        if (!thread || typeof thread !== "object") return "-";
        return String(thread.rootLabel || compactRootIdentity(thread.rootKey || thread.cwd || "")).trim() || "-";
      }

      function renderRootIdentityPill(threadOrPath, options = {}) {
        const thread = threadOrPath && typeof threadOrPath === "object"
          ? threadOrPath
          : { cwd: threadOrPath };
        const fullPath = threadRootKey(thread);
        const root = threadRootLabel(thread);
        if (!options.interactive) {
          return '<span class="meta-pill mono" title="' + esc(fullPath || "-") + '">Root ' + esc(short(root, 20)) + '</span>';
        }
        const active = state.ui.rootFilter && (state.ui.rootFilter === fullPath || state.ui.rootFilter === root);
        return '<button class="meta-pill mono' + (active ? ' active' : '') + '" type="button" data-root-filter="' + esc(fullPath || root) + '" title="' + esc(fullPath || "-") + '">Root ' + esc(short(root, 20)) + '</button>';
      }

      function threadGitMetadata(thread) {
        const legacyGit = thread && thread.git && typeof thread.git === "object" && !Array.isArray(thread.git) ? thread.git : {};
        const branch = String((thread && thread.git_branch) || legacyGit.branch || legacyGit.current_branch || "").trim();
        const status = String((thread && thread.git_branch_status) || legacyGit.status || legacyGit.branch_status || (branch ? "known" : "")).trim();
        const error = String((thread && thread.git_branch_error) || legacyGit.error || "").trim();
        const hasRemote = Boolean((thread && thread.git_has_remote) || legacyGit.has_remote || legacyGit.hasRemote);
        const remoteName = String((thread && thread.git_remote_name) || legacyGit.remote_name || legacyGit.remoteName || (hasRemote ? "origin" : "")).trim();
        return { branch, status, error, hasRemote, remoteName };
      }

      function threadGitFilterKey(thread) {
        const git = threadGitMetadata(thread);
        if (git.branch || git.status === "known" || git.status === "detached") return "repo";
        if (git.status === "not_git_repo") return "no_git";
        return "unknown";
      }

      function renderGitBranchPill(thread) {
        const git = threadGitMetadata(thread);
        if (git.branch) {
          const detached = git.status === "detached";
          return '<span class="meta-pill meta-pill-git' + (detached ? ' detached' : '') + '" title="' + esc(detached ? "Detached git HEAD" : "Git branch") + '">Git ' + esc(short(git.branch, 22)) + '</span>';
        }
        if (git.status === "not_git_repo") {
          return '<span class="meta-pill meta-pill-git missing" title="Working directory is not inside a git repository">No Git</span>';
        }
        if (git.status === "error") {
          return '<span class="meta-pill meta-pill-git missing" title="' + esc(git.error || "Unable to inspect git status") + '">Git ?</span>';
        }
        return "";
      }

      function formatTimestamp(value) {
        if (!value) return "none";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }

      function formatScanStats(stats) {
        const data = stats && typeof stats === "object" ? stats : null;
        if (!data) return "";
        const sessions = Number(data.totalFiles);
        const indexed = Number(data.indexed);
        const reparsed = Number(data.reparsed);
        const workers = Number(data.workerCount);
        const parts = [];
        if (Number.isFinite(sessions)) parts.push("sessions " + String(sessions));
        if (Number.isFinite(indexed)) parts.push("indexed " + String(indexed));
        if (Number.isFinite(reparsed)) parts.push("reparsed " + String(reparsed));
        if (Number.isFinite(workers)) parts.push("workers " + String(workers));
        return parts.length ? parts.join(" · ") : "";
      }

      function formatFreshnessTimestamp(value) {
        if (!value) return "unknown time";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString([], {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
      }

      function isOlderThanThreshold(value, thresholdMs) {
        if (!value) return false;
        const time = new Date(value).getTime();
        if (Number.isNaN(time)) return false;
        return (Date.now() - time) > thresholdMs;
      }
`;
