function getChromeRuntimeScript() {
  return `      function metric(label, value, phaseLabel = "Waiting", art) {
        const phaseClass = phaseClassFor(phaseLabel).trim();
        return '<div class="metric compact ' + esc(phaseClass) + '">' +
          '<div class="metric-head">' +
            renderThemeVisual(art || phaseArtFor(phaseLabel), "metric-art", phaseLabel, "metric") +
            '<div class="metric-head-copy">' +
              '<div class="metric-label">' + esc(label) + '</div>' +
              renderPhaseChip({ label: phaseLabel }) +
            '</div>' +
          '</div>' +
          '<div class="metric-value">' + esc(String(value)) + '</div>' +
        '</div>';
      }

      function closeChromeMenus(exceptId) {
        ["surfaceMenu", "serviceMenu", "moreMenu"].forEach((id) => {
          if (id === exceptId) return;
          const node = document.getElementById(id);
          if (node) node.open = false;
        });
      }

      function closeThreadFilterMenus(options = {}) {
        const wasOpen = Boolean(state.ui.rootFilterMenuOpen || state.ui.gitFilterMenuOpen || state.ui.rootFilterSearch);
        state.ui.rootFilterMenuOpen = false;
        state.ui.gitFilterMenuOpen = false;
        state.ui.rootFilterSearch = "";
        if (wasOpen && options.render !== false) {
          render(state.payload);
        }
        return wasOpen;
      }

      function syncNetworkToolsPanel(payload) {
        const panel = document.getElementById("networkToolsPanel");
        if (!panel) return false;
        const isNetworkVisible = state.ui.currentView === "overview" && state.ui.overviewSubView === "network";
        const source = payload || state.payload || {};
        const clashState = source.clashProxyState || {};
        const clashGroups = Array.isArray(clashState.groups) ? clashState.groups : [];
        const shouldAutoRefreshClash = isNetworkVisible
          && clashState.ok !== true
          && clashState.ok !== false
          && !clashState.loading
          && !clashGroups.length
          && Date.now() - Number(state.lastClashAutoRefreshAt || 0) > 10000;
        if (shouldAutoRefreshClash) {
          state.lastClashAutoRefreshAt = Date.now();
          source.clashProxyState = Object.assign({}, clashState, {
            loading: true,
            message: "Reading Clash/Mihomo proxy groups...",
          });
          vscode.postMessage({ type: "refreshClashProxies" });
        }
        panel.innerHTML = renderNetworkToolsPanel(source.networkProbeResults || {}, source.clashProxyState || {});
        return isNetworkVisible;
      }

      function bindChromeDelegation() {
        document.addEventListener("input", (event) => {
          const target = event.target instanceof Element ? event.target.closest("[data-root-filter-search]") : null;
          if (!target) return;
          state.ui.rootFilterSearch = target.value || "";
          state.ui.rootFilterMenuOpen = true;
          syncRootFilterControlDom(true);
        });
        document.addEventListener("change", (event) => {
          const target = event.target instanceof Element ? event.target : null;
          if (!target) return;
          if (target.dataset.usageCustomStart !== undefined) {
            state.ui.usageCustomStart = target.value || "";
            state.ui.usageRange = "custom";
            persistUi();
            render(state.payload);
            return;
          }
          if (target.dataset.usageCustomEnd !== undefined) {
            state.ui.usageCustomEnd = target.value || "";
            state.ui.usageRange = "custom";
            persistUi();
            render(state.payload);
          }
        });
        document.addEventListener("click", (event) => {
          const eventTarget = event.target instanceof Element
            ? event.target
            : (event.target && event.target.parentElement ? event.target.parentElement : null);
          if (!eventTarget) {
            closeChromeMenus();
            closeThreadFilterMenus();
            return;
          }
          if (!eventTarget.closest(".directory-picker")) {
            closeThreadFilterMenus();
          }
          const insideMenu = eventTarget.closest("#surfaceMenu, #serviceMenu, #moreMenu");
          if (!insideMenu) {
            closeChromeMenus();
          } else if (insideMenu.id) {
            closeChromeMenus(insideMenu.id);
          }
          const languageToggle = eventTarget.closest("[data-panel-language-toggle]");
          if (languageToggle) {
            event.preventDefault();
            state.ui.panelLanguage = panelLanguageKey() === "zh" ? "en" : "zh";
            persistUi();
            render(state.payload);
            return;
          }
          const commandLink = eventTarget.closest('a[data-command-direct="true"]');
          if (commandLink) {
            event.preventDefault();
            const menuId = commandLink.dataset.closeChromeMenu;
            if (menuId) {
              const menuNode = document.getElementById(menuId);
              if (menuNode) menuNode.open = false;
            }
            const href = String(commandLink.getAttribute("href") || "").trim();
            const commandUri = href.startsWith("command:") ? href.slice("command:".length) : "";
            const commandId = commandUri ? decodeURIComponent(commandUri.split("?")[0]) : "";
            const messageType = {
              "codexAgent.openPanel": "openPanel",
              "codexAgent.refreshPanel": "reload",
              "codexAgent.startServer": "startServer",
              "codexAgent.restartServer": "restartServer",
              "codexAgent.openExternal": "openExternal",
            }[commandId];
            if (messageType) {
              vscode.postMessage({ type: messageType });
            }
            return;
          }
          const target = eventTarget.closest("button, [data-view], [data-subtab], [data-topic-node]");
          if (!target) return;
          if (target.dataset.networkProbe !== undefined) {
            if (target.disabled) return;
            const probeId = target.dataset.networkProbe || "";
            if (state.payload) {
              state.payload.networkProbeResults = Object.assign({}, state.payload.networkProbeResults || {}, {
                [probeId]: {
                  id: probeId,
                  status: "running",
                  ok: null,
                  startedAt: new Date().toISOString(),
                },
              });
              syncNetworkToolsPanel(state.payload);
            }
            vscode.postMessage({ type: "runNetworkProbe", probeId });
            return;
          }
          if (target.dataset.refreshClashProxies !== undefined) {
            if (target.disabled) return;
            if (state.payload) {
              state.payload.clashProxyState = Object.assign({}, state.payload.clashProxyState || {}, {
                loading: true,
                message: "Reading Clash/Mihomo proxy groups...",
              });
              syncNetworkToolsPanel(state.payload);
            }
            vscode.postMessage({ type: "refreshClashProxies" });
            return;
          }
          if (target.dataset.openNetworkSettings !== undefined) {
            vscode.postMessage({ type: "openNetworkSettings" });
            return;
          }
          if (target.dataset.clashSwitchGroup !== undefined) {
            if (target.disabled) return;
            const groupName = target.dataset.clashSwitchGroup || "";
            const proxyName = target.dataset.clashSwitchProxy || "";
            if (state.payload) {
              state.payload.clashProxyState = Object.assign({}, state.payload.clashProxyState || {}, {
                switching: { group: groupName, proxy: proxyName },
                message: "Switching " + groupName + " to " + proxyName + "...",
              });
              syncNetworkToolsPanel(state.payload);
            }
            vscode.postMessage({ type: "switchClashProxy", groupName, proxyName });
            return;
          }
          if (target.dataset.bundledSkill !== undefined) {
            if (target.disabled) return;
            const skillName = target.dataset.bundledSkill || "";
            if (!skillName) return;
            target.disabled = true;
            target.textContent = "Installing...";
            vscode.postMessage({
              type: "installBundledSkill",
              skillName,
            });
            return;
          }
          if (target.dataset.openCodexSkillsFolder !== undefined) {
            if (target.disabled) return;
            vscode.postMessage({ type: "openCodexSkillsFolder" });
            return;
          }
          if (target.dataset.syncBundledSkills !== undefined) {
            if (target.disabled) return;
            target.disabled = true;
            target.textContent = "Syncing...";
            vscode.postMessage({ type: "syncBundledSkills" });
            return;
          }
          if (target.dataset.runCommand !== undefined) {
            if (target.disabled) return;
            setCommandFeedback(target.dataset.commandThread, target.dataset.commandLabel || "Command", "Sent to terminal", "success");
            render(state.payload);
            vscode.postMessage({
              type: "runCommand",
              command: target.dataset.runCommand,
              label: target.dataset.commandLabel || "Command",
              cwd: target.dataset.commandCwd || "",
            });
            return;
          }
          if (target.dataset.copyCommand !== undefined) {
            if (target.disabled) return;
            setCommandFeedback(target.dataset.commandThread, target.dataset.commandLabel || "Command", "Copied", "success");
            render(state.payload);
            vscode.postMessage({
              type: "copyText",
              text: target.dataset.copyCommand,
              label: target.dataset.commandLabel || "Command",
            });
            return;
          }
          if (target.id === "soundToggle") {
            cycleSoundStyle();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.id === "themeToggle") {
            toggleThemeMode();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.id === "followThemeToggle") {
            toggleFollowVsCodeTheme();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.id === "colorThemeToggle") {
            toggleColorTheme();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.id === "motionToggle") {
            toggleMotion();
            const more = document.getElementById("moreMenu"); if (more) more.open = false;
            return;
          }
          if (target.dataset.brandCycle) {
            cycleBrandFooterStyle();
            return;
          }
          if (target.dataset.generateUsageInsights) {
            vscode.postMessage({ type: "generateUsageInsights" });
            return;
          }
          if (target.dataset.openaiSidebarLimitAction) {
            if (target.disabled) return;
            const action = target.dataset.openaiSidebarLimitAction || "preview";
            target.disabled = true;
            target.textContent = action === "apply" ? "Applying..." : "Checking...";
            vscode.postMessage({
              type: action === "apply" ? "applyOpenAiSidebarLimitPatch" : "previewOpenAiSidebarLimitPatch",
            });
            return;
          }
          if (target.dataset.runTokenMaintenance) {
            target.disabled = true;
            target.textContent = "Checking...";
            vscode.postMessage({ type: "runCodexTokenMaintenance" });
            return;
          }
          if (target.dataset.forceRefreshAllTokens) {
            if (window.confirm("Force refresh all official account tokens now? This rotates each refresh token that is still valid.")) {
              target.disabled = true;
              target.textContent = "Refreshing...";
              vscode.postMessage({ type: "forceRefreshAllCodexTokens" });
            }
            return;
          }
          if (target.dataset.toggleTokenMaintenance) {
            vscode.postMessage({
              type: "setCodexTokenMaintenanceEnabled",
              enabled: target.dataset.toggleTokenMaintenance === "on",
            });
            return;
          }
          if (target.dataset.addCodexAccount) {
            const accountName = window.prompt("Enter a name for the new Codex account (letters, digits, ., _, -):");
            if (accountName && accountName.trim()) {
              vscode.postMessage({ type: "addCodexAccount", accountName: accountName.trim() });
            }
            return;
          }
          if (target.dataset.removeCodexAccount) {
            const name = target.dataset.removeCodexAccount;
            if (window.confirm('Remove Codex account "' + name + '"?')) {
              vscode.postMessage({ type: "removeCodexAccount", accountName: name });
            }
            return;
          }
          if (target.dataset.setCodexAccount) {
            vscode.postMessage({ type: "setCodexAccount", accountName: target.dataset.setCodexAccount });
            return;
          }
          if (target.dataset.switchCodexAccount) {
            vscode.postMessage({ type: "activateCodexAccount", accountName: target.dataset.switchCodexAccount });
            return;
          }
          if (target.dataset.activateCodexAccount) {
            vscode.postMessage({ type: "activateCodexAccount", accountName: target.dataset.activateCodexAccount });
            return;
          }
          if (target.dataset.loginCodexAccount) {
            var loginName = target.dataset.loginCodexAccount;
            var loginEl = document.getElementById("probe-" + loginName);
            if (loginEl) {
              loginEl.style.display = "block";
              loginEl.className = "codex-auto-probe-result";
              loginEl.textContent = "Opening login terminal...";
            }
            vscode.postMessage({ type: "loginCodexAccount", accountName: loginName });
            return;
          }
          if (target.dataset.refreshCodexToken) {
            var tokenName = target.dataset.refreshCodexToken;
            var tokenEl = document.getElementById("probe-" + tokenName);
            if (tokenEl) {
              tokenEl.style.display = "block";
              tokenEl.className = "codex-auto-probe-result";
              tokenEl.textContent = "Refreshing token...";
            }
            vscode.postMessage({ type: "refreshCodexAccountToken", accountName: tokenName });
            return;
          }
          if (target.dataset.openCodexAccountSourcePath) {
            const path = target.dataset.openCodexAccountSourcePath;
            if (path && path.trim()) {
              const name = target.dataset.openCodexAccountSourceName || "Account";
              vscode.postMessage({
                type: "openLocalFile",
                path,
                label: 'Opened source auth for "' + name + '"',
              });
            }
            return;
          }
          if (target.dataset.probeCodexAccount) {
            var probeName = target.dataset.probeCodexAccount;
            var probeEl = document.getElementById("probe-" + probeName);
            if (probeEl) {
              probeEl.style.display = "block";
              probeEl.className = "codex-auto-probe-result";
              probeEl.textContent = "Testing...";
            }
            vscode.postMessage({ type: "probeCodexAccount", accountName: probeName });
            return;
          }
          if (target.dataset.refreshCodexUsage) {
            var usageName = target.dataset.refreshCodexUsage;
            var usageEl = document.getElementById("probe-" + usageName);
            if (usageEl) {
              usageEl.style.display = "block";
              usageEl.className = "codex-auto-probe-result";
              usageEl.textContent = "Refreshing usage...";
            }
            vscode.postMessage({ type: "fetchCodexAccountUsage", accountName: usageName });
            return;
          }
          if (target.dataset.importCodexAccount) {
            const accountName = window.prompt(
              "Enter a name for the imported profile from ~/.codex/auth.json (letters, digits, ., _, -):",
              "imported-codex",
            );
            if (!(accountName && accountName.trim())) return;
            const trimmed = accountName.trim();
            if (
              window.confirm('Import current ~/.codex/auth.json as profile "' + trimmed + '"?')
            ) {
              vscode.postMessage({ type: "importCodexAccount", accountName: trimmed });
            }
            return;
          }
          if (target.dataset.importCodexAccountFromPath) {
            const accountName = window.prompt(
              "Enter a name for the imported profile from an auth.json file (letters, digits, ., _, -):",
              "imported-file",
            );
            if (!(accountName && accountName.trim())) return;
            const authPath = window.prompt("Enter the full path to the auth.json file:");
            if (!(authPath && authPath.trim())) return;
            const configTomlPath = window.prompt(
              "Optional: enter full path to config.toml (leave blank if not available):",
            );
            if (
              window.confirm(
                "Import " +
                  authPath.trim() +
                  " as profile '" +
                  accountName.trim() +
                  "'?",
              )
            ) {
              const payload = {
                type: "importCodexAccountFromFile",
                accountName: accountName.trim(),
                authPath: authPath.trim(),
              };
              if (configTomlPath && configTomlPath.trim()) {
                payload.configTomlPath = configTomlPath.trim();
              }
              vscode.postMessage(payload);
            }
            return;
          }
          if (target.dataset.addRelayCodexAccount) {
            const accountName = window.prompt("Enter a name for the relay account:");
            if (!(accountName && accountName.trim())) return;
            const authPath = window.prompt("Enter the full path to the relay auth.json file:", "/home/clashuser/.codex/auth56.json");
            if (!(authPath && authPath.trim())) return;
            const configPath = window.prompt("Enter the full path to the relay config.toml file:", "/home/clashuser/.codex/config-pro2.toml");
            if (!(configPath && configPath.trim())) return;
            vscode.postMessage({
              type: "addRelayCodexAccount",
              accountName: accountName.trim(),
              authPath: authPath.trim(),
              configTomlPath: configPath.trim(),
            });
            return;
          }
          if (target.dataset.usageRange) {
            state.ui.usageRange = target.dataset.usageRange;
            persistUi();
            render(state.payload);
            return;
          }
          if (target.dataset.surfaceAction === "left") {
            closeChromeMenus();
            vscode.postMessage({ type: "showSidebar" });
            return;
          }
          if (target.dataset.surfaceAction === "bottom") {
            closeChromeMenus();
            vscode.postMessage({ type: "showBottomPanel" });
            return;
          }
          if (target.dataset.surfaceAction === "editor") {
            closeChromeMenus();
            vscode.postMessage({ type: "openPanel" });
            return;
          }
          if (target.dataset.surfaceAction === "fullscreen") {
            closeChromeMenus();
            vscode.postMessage({ type: "maximizeDashboard" });
            return;
          }
          if (target.dataset.view) {
            setWorkspaceView(target.dataset.view, { boardSubView: target.dataset.boardWorkspace || undefined });
            return;
          }
          if (target.dataset.overviewSubview) {
            state.ui.currentView = "overview";
            state.ui.overviewSubView = target.dataset.overviewSubview || "dashboard";
            persistUi();
            render(state.payload);
            syncNetworkToolsPanel(state.payload);
            return;
          }
          if (target.dataset.boardSubview) {
            state.ui.currentView = "board";
            state.ui.boardSubView = target.dataset.boardSubview || "status";
            persistUi();
            render(state.payload);
            return;
          }
          if (target.dataset.clearTopicFocus) {
            applyTopicFocus(null);
            return;
          }
          if (target.dataset.clearRootFilter) {
            applyRootFilter(null);
            return;
          }
          if (target.dataset.modelFilter !== undefined) {
            applyModelFilter(target.dataset.modelFilter || "");
            return;
          }
          if (target.dataset.clearModelFilter) {
            applyModelFilter("");
            return;
          }
          if (target.dataset.clearThreadTabFilter) {
            setThreadTabFilter("all");
            return;
          }
          if (target.dataset.clearThreadExplorerFilters) {
            clearThreadExplorerConstraints();
            return;
          }
          if (target.dataset.refreshThreadExplorer) {
            vscode.postMessage({ type: "reload" });
            return;
          }
          if (target.dataset.scanThreadExplorer) {
            if (!canDispatchScanSessionsRequest()) return;
            vscode.postMessage({ type: "scanCodexSessions" });
            return;
          }
          if (target.dataset.toggleThreadTabFilter) {
            state.ui.threadTabFilterMenuOpen = !state.ui.threadTabFilterMenuOpen;
            state.ui.rootFilterMenuOpen = false;
            state.ui.gitFilterMenuOpen = false;
            render(state.payload);
            return;
          }
          if (target.dataset.threadTabFilterOption !== undefined) {
            setThreadTabFilter(target.dataset.threadTabFilterOption || "all");
            return;
          }
          if (target.dataset.toggleRootFilterMenu) {
            state.ui.rootFilterMenuOpen = !state.ui.rootFilterMenuOpen;
            state.ui.gitFilterMenuOpen = false;
            state.ui.threadTabFilterMenuOpen = false;
            render(state.payload);
            return;
          }
          if (target.dataset.rootFilterOption !== undefined) {
            setRootFilterFromMenu(target.dataset.rootFilterOption || "all");
            return;
          }
          if (target.dataset.toggleGitFilterMenu) {
            state.ui.gitFilterMenuOpen = !state.ui.gitFilterMenuOpen;
            state.ui.rootFilterMenuOpen = false;
            state.ui.rootFilterSearch = "";
            state.ui.threadTabFilterMenuOpen = false;
            render(state.payload);
            return;
          }
          if (target.dataset.gitFilterOption !== undefined) {
            setGitFilter(target.dataset.gitFilterOption || "all");
            return;
          }
          if (target.dataset.toggleWorkspaceFilter) {
            applyWorkspaceFilter();
            return;
          }
          if (target.dataset.rootFilter !== undefined) {
            applyRootFilter(target.dataset.rootFilter || null);
            return;
          }
          if (target.dataset.topicNode) {
            const group = target.dataset.topicGroup || "keyword";
            if (group === "thread") {
              applyTopicFocus({
                group,
                threadId: target.dataset.topicThread || "",
                value: target.dataset.topicLabel || "",
              });
            } else {
              applyTopicFocus({
                group,
                value: target.dataset.topicFocus || target.dataset.topicLabel || "",
              });
            }
            return;
          }
          if (target.dataset.subtab) {
            setRightPaneTab(target.dataset.subtab);
          }
        });
      }

      window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "state") {
          state.stateReceivedAt = new Date().toISOString();
          setDebugStatus(event.data.service && event.data.service.ok ? "state received" : "degraded");
          stopBootRetryLoop();
          stopBootProgressLoop();
          finishBootProgressBeforeRender();
          syncOptimisticAutoContinueState(event.data.autoContinueConfigs || {});
          syncPendingPromptState(event.data.optimisticQueuedPrompts || {});
          render(event.data);
          syncNetworkToolsPanel(event.data);
          return;
        }
        if (event.data && event.data.type === "networkProbePatched") {
          if (state.payload) {
            state.payload.networkProbeResults = Object.assign({}, state.payload.networkProbeResults || {}, {
              [event.data.probeId || ""]: event.data.result || {},
            });
          }
          if (!syncNetworkToolsPanel(state.payload)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "clashProxyStatePatched") {
          if (state.payload) {
            state.payload.clashProxyState = event.data.state || {};
          }
          if (!syncNetworkToolsPanel(state.payload)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "autoContinueConfigPatched") {
          patchAutoContinueState(event.data.threadId, event.data.config || null);
          if (!syncAutoLoopDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "codexTabProjectionPatched") {
          patchCodexTabProjection(event.data.codexTabProjection || {});
          if (!syncCodexTabProjectionDom()) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "codexLinkStatePatched") {
          patchCodexLinkState(event.data.codexLinkState || {});
          patchCodexPluginIntegration(event.data.codexPluginIntegration || {});
          if (!syncCodexTabProjectionDom()) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "handoffObjectsPatched") {
          patchHandoffObjects(event.data.handoffObjects || {});
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "threadPatched") {
          const patch = event.data.patch || {};
          patchThread(event.data.threadId, patch);
          const titleSynced = Object.prototype.hasOwnProperty.call(patch, "title")
            ? syncThreadTitleDom(event.data.threadId, patch.title || "")
            : false;
          const statusSynced = syncCodexTabProjectionDom();
          if (!(titleSynced || statusSynced)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "threadCreated") {
          addThread(event.data.thread || {});
          if (event.data.selectThreadId) {
            state.selectedThreadId = event.data.selectThreadId;
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "probeCodexAccountResult") {
          var probeEl = document.getElementById("probe-" + event.data.accountName);
          if (probeEl) {
            var r = event.data.result || {};
            probeEl.style.display = "block";
            if (r.ok) {
              probeEl.className = "codex-auto-probe-result ok";
              var modelList = Array.isArray(r.data) && r.data.length ? r.data.slice(0, 3).join(", ") : "";
              probeEl.innerHTML = "✅ Valid" + (modelList ? " · models: " + esc(modelList) : "");
            } else {
              probeEl.className = "codex-auto-probe-result error";
              probeEl.textContent = "❌ " + esc(r.error || "Connection failed");
            }
          }
          return;
        }
        if (event.data && event.data.type === "fetchCodexAccountUsageResult") {
          var usageEl = document.getElementById("probe-" + event.data.accountName);
          if (usageEl) {
            var u = event.data.result || {};
            usageEl.style.display = "block";
            if (u.ok) {
              usageEl.className = "codex-auto-probe-result ok";
              usageEl.textContent = "Usage refreshed" + (u.count ? " · " + String(u.count) + " window" + (u.count === 1 ? "" : "s") : "") + (u.source ? " · " + u.source : "");
            } else {
              usageEl.className = "codex-auto-probe-result error";
              usageEl.textContent = "Usage refresh failed: " + (u.error || "No usage source available");
            }
          }
          return;
        }
        if (event.data && event.data.type === "refreshCodexAccountTokenResult") {
          var tokenEl = document.getElementById("probe-" + event.data.accountName);
          if (tokenEl) {
            var t = event.data.result || {};
            tokenEl.style.display = "block";
            if (t.ok) {
              tokenEl.className = "codex-auto-probe-result ok";
              var nextDays = t.tokenInfo && Number.isFinite(Number(t.tokenInfo.daysUntilExpiry))
                ? " · Token: " + String(t.tokenInfo.daysUntilExpiry) + " day" + (Number(t.tokenInfo.daysUntilExpiry) === 1 ? "" : "s")
                : "";
              tokenEl.textContent = t.skipped
                ? ("Token still fresh" + (t.reason ? ": " + t.reason : ""))
                : ("Token refreshed" + nextDays);
            } else {
              tokenEl.className = "codex-auto-probe-result error";
              tokenEl.textContent = "Token refresh failed: " + (t.error || "Unknown error");
            }
          }
          return;
        }
        if (event.data && event.data.type === "codexTokenMaintenanceResult") {
          if (state.payload && state.payload.codexAutoState) {
            var maintenanceResult = event.data.result || {};
            state.payload.codexAutoState.tokenMaintenance = Object.assign(
              {},
              state.payload.codexAutoState.tokenMaintenance || {},
              {
                running: false,
                lastRunAt: new Date().toISOString(),
                lastResults: Array.isArray(maintenanceResult.results) ? maintenanceResult.results : [],
                lastError: maintenanceResult.error || "",
              },
            );
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "teamOrchestrationDraftGenerated") {
          state.ui.teamOrchestrationDraft = event.data.draft || {};
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "teamOrchestrationDraftSaved") {
          state.ui.teamOrchestrationDraft = undefined;
          if (event.data.workspaceId) {
            state.ui.teamWorkspacePageId = event.data.workspaceId;
            state.ui.currentView = "team";
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "cardLabelPatched") {
          applyCardLabelPatch(event.data.threadId, event.data.label || "");
          return;
        }
        if (event.data && event.data.type === "boardTabPatched") {
          applyBoardTabPatch(
            event.data.threadId || "",
            event.data.boardTab || "",
            Array.isArray(event.data.boardTabOrder) ? event.data.boardTabOrder : undefined,
            event.data.activeBoardTab || state.ui.activeBoardTab || "all"
          );
          return;
        }
        if (event.data && event.data.type === "threadInsightPatched") {
          if (state.payload && state.payload.detail && state.payload.detail.thread && state.payload.detail.thread.id === event.data.threadId) {
            state.payload = Object.assign({}, state.payload, {
              detail: Object.assign({}, state.payload.detail, {
                threadInsight: event.data.threadInsight || null,
              }),
            });
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "threadRemoved") {
          removeThread(event.data.threadId);
          if (!syncThreadRemovedDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "threadsPatched") {
          const threadIds = Array.isArray(event.data.threadIds) ? event.data.threadIds : [];
          patchThreads(threadIds, event.data.patch || {});
          if (!syncThreadsPatchedDom(threadIds)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "threadsRemoved") {
          removeThreads(Array.isArray(event.data.threadIds) ? event.data.threadIds : []);
          if (!syncThreadsRemovedDom(Array.isArray(event.data.threadIds) ? event.data.threadIds : [])) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "promptQueued") {
          queuePromptOptimistically(event.data.threadId, event.data.prompt || "continue");
          if (!syncPendingPromptDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "promptQueueFailed") {
          markPromptQueueFailed(event.data.threadId, event.data.prompt || "continue", event.data.message || "Failed to queue prompt");
          if (!syncPendingPromptDom(event.data.threadId)) {
            render(state.payload);
          }
          return;
        }
        if (event.data && event.data.type === "memoryFileContent") {
          state.ui.memoryEditorFile = event.data.payload.filePath;
          state.ui.memoryEditorContent = event.data.payload.content;
          persistUi();
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "memoryFileSaved") {
          const result = event.data.payload;
          const status = document.querySelector("[data-editor-status]");
          if (status) {
            if (result.ok) {
              status.textContent = "Saved";
              status.className = "memory-editor-status ok";
            } else {
              status.textContent = "Error: " + (result.error || "Unknown");
              status.className = "memory-editor-status err";
            }
          }
          return;
        }
        if (event.data && event.data.type === "memoryData") {
          if (state.payload) {
            state.payload.memoryData = event.data.payload;
          }
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "historyData") {
          const payload = event.data.payload;
          state.ui.historyViewerFile = payload.filePath;
          state.ui.historyData = payload;
          persistUi();
          render(state.payload);
          return;
        }
        if (event.data && event.data.type === "memoryFileCreated") {
          const result = event.data.payload;
          if (result.ok) {
            state.ui.memoryCreatorOpen = false;
            state.ui.memoryEditorFile = result.filePath;
            state.ui.memoryEditorContent = result.content;
            persistUi();
          }
          render(state.payload);
          return;
        }
      });

      window.addEventListener("error", (event) => {
        vscode.postMessage({
          type: "bootError",
          error: event && event.message ? event.message : "Unknown runtime error",
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event && event.reason;
        const detail = reason instanceof Error ? reason.message : String(reason || "Unknown promise rejection");
        vscode.postMessage({
          type: "bootError",
          error: detail,
        });
      });

      try {
        bindChromeDelegation();
        state.bridgeBoundAt = new Date().toISOString();
        setDebugStatus("bridge bound");
        applyBrandFooterStyle();
        applyPanelLanguageChrome();
        startBootProgressLoop();
        document.addEventListener("pointermove", (event) => {
          moveBoardPointerDrag(event);
          scheduleResizeUpdate(event);
        });
        document.addEventListener("pointerup", (event) => {
          finishBoardPointerDrag(event);
          finishRunningCardResize(event);
        });
        document.addEventListener("pointercancel", (event) => {
          cancelBoardPointerDrag(event);
          finishRunningCardResize(event);
        });
        document.addEventListener("keydown", (event) => {
          if (handleThreadSearchFocusShortcut(event)) return;
          if (event.key === "Escape" && state.pointerBoardDrag) {
            cancelBoardPointerDrag();
          }
        });
        notifyReady();
        setDebugStatus("boot ok");
        startBootRetryLoop();
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error || "Unknown startup error");
        vscode.postMessage({
          type: "bootError",
          error: detail,
        });
      }

      bindIfPresent("threadSearch", "input", (event) => {
        state.ui.search = event.target.value || "";
        state.ui.topicFocus = null;
        persistUi();
        render(state.payload);
      });
      bindIfPresent("threadSearchMirror", "input", (event) => {
        state.ui.search = event.target.value || "";
        state.ui.topicFocus = null;
        persistUi();
        render(state.payload);
      });
      bindIfPresent("createThreadButton", "click", () => {
        vscode.postMessage({ type: "createThread" });
      });
      bindIfPresent("codexSidebarButton", "click", () => {
        vscode.postMessage({ type: "revealInCodexSidebar" });
      });
      bindIfPresent("refreshThreadsMirror", "click", () => {
        vscode.postMessage({ type: "reload" });
      });
      bindIfPresent("scanCodexSessionsMirror", "click", () => {
        if (!canDispatchScanSessionsRequest()) return;
        vscode.postMessage({ type: "scanCodexSessions" });
      });
      bindIfPresent("toggleThreadGroupsMirror", "click", () => {
        toggleThreadGroupsExpanded();
      });
      document.querySelectorAll("[data-filter]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filter;
          persistUi();
          vscode.postMessage({ type: "threadFilterChanged", filter: state.ui.filter });
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-filter-mirror]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.filter = node.dataset.filterMirror;
          persistUi();
          vscode.postMessage({ type: "threadFilterChanged", filter: state.ui.filter });
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-sort]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.sort = node.dataset.sort;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-sort-mirror]").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.sort = node.dataset.sortMirror;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-toggle='pinned']").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.pinnedOnly = !state.ui.pinnedOnly;
          persistUi();
          render(state.payload);
        });
      });
      document.querySelectorAll("[data-toggle-mirror='pinned']").forEach((node) => {
        node.addEventListener("click", () => {
          state.ui.pinnedOnly = !state.ui.pinnedOnly;
          persistUi();
          render(state.payload);
        });
      });
      bindIfPresent("toggleLayoutLockPrimary", "click", () => {
        toggleLayoutLock();
      });
      bindIfPresent("resetRunningLayoutPrimary", "click", () => {
        resetRunningLayout();
      });
      bindIfPresent("saveLayoutPrimary", "click", () => {
        saveLayoutNow();
      });
      document.querySelectorAll("[data-open-board-view]").forEach((node) => {
        node.addEventListener("click", () => {
          setWorkspaceView("board");
        });
      });
      bindIfPresent("drawerClose", "click", () => {
        clearPendingDrawerAction();
        state.ui.teamTaskDrawerId = undefined;
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
      bindIfPresent("drawerBackdrop", "click", () => {
        clearPendingDrawerAction();
        state.ui.teamTaskDrawerId = undefined;
        state.ui.skillDrawerName = undefined;
        state.ui.drawerOpen = false;
        persistUi();
        render(state.payload);
      });
`;
}

module.exports = {
  getChromeRuntimeScript,
};
