module.exports = `                "</div>")
              : "";
            const tokenScore = tokenHealthScore(tokenHealth, retryInfo, details.hasAuth);
            const profileScore = profileHealthScore(name, details, retryInfo);
            const tokenTone = accountTone(tokenScore, isTokenBlocked || isRateLimited);
            const profileTone = accountTone(profileScore, false);
            const tokenHint = tokenHealth && tokenHealth !== "unknown"
              ? tokenHealth.replace("_", " ")
              : (details.hasAuth ? "needs Validate" : "missing auth");
            const accountFooter = sourceAuthPath
              ? short(sourceAuthPath, 48)
              : (details.baseUrl ? String(details.baseUrl).replace(/^https?:\\/\\//, "").replace(/\\/+$/, "") : "No source auth");
            const membershipLabel = isBackupCandidate
              ? "Backup"
              : acctType === "relay"
              ? "Relay"
              : (details.tokenInfo && details.tokenInfo.planType ? details.tokenInfo.planType : (acctType === "official" ? "Official" : "Local"));
            const subtitle = activeProfileName === name
              ? "Native profile active"
              : (isBackupCandidate ? "Backup candidate" : (isCurrent ? "Selected in CMA" : "Managed account"));
            const profileHint = activeProfileName === name
              ? "active in ~/.codex"
              : (isBackupCandidate ? "backup only" : "managed only");

            return '<article class="codex-auto-account-card ' + esc(statusIndicator) + '">' +
              '<div class="codex-auto-provider-card-head">' +
                '<div class="codex-auto-provider-mark" aria-hidden="true">C</div>' +
                '<div class="codex-auto-provider-title-stack">' +
                  '<div class="codex-auto-account-name">' + esc(name) + '</div>' +
                  '<div class="codex-auto-provider-subtitle">' + esc(subtitle) + '</div>' +
                '</div>' +
                '<span class="codex-auto-provider-plan">' + esc(membershipLabel) + '</span>' +
              '</div>' +
              '<div class="codex-auto-account-badges">' + badges.join("") + '</div>' +
              '<div class="codex-auto-meter-stack">' +
                renderAccountMeter("Token health", tokenScore, tokenHint, tokenTone) +
                renderAccountMeter("Profile state", profileScore, profileHint, profileTone) +
              '</div>' +
              renderRateLimitBuckets(name, details, retryInfo) +
              switchRecommendation +
              tokenInfoHtml +
              duplicateWarningsHtml +
              '<div class="codex-auto-provider-foot">' +
                '<span class="codex-auto-provider-account mono" title="' + esc(sourceAuthPath || details.baseUrl || "") + '">' + esc(accountFooter) + '</span>' +
                '<span class="codex-auto-provider-time mono">' + esc(updatedAt ? formatTimestamp(updatedAt) : "") + '</span>' +
              '</div>' +
              '<div class="codex-auto-account-meta mono">' +
                (details.hasConfig ? "config" : "no config") + ' · ' + (details.hasMeta ? "meta" : "no meta") + ' · ' + (details.hasAuth ? "auth" : "no auth") +
              '</div>' +
              '<div class="chip-row codex-auto-card-actions">' +
                (isCurrent ? '' : '<button class="chip" data-set-codex-account="' + esc(name) + '" type="button">Set Active</button>') +
                '<button class="chip" data-activate-codex-account="' + esc(name) + '" type="button">Activate</button>' +
                switchAction +
                (details.sourceAuthPath
                  ? '<button class="chip" data-open-codex-account-source-path="' + esc(details.sourceAuthPath) + '" data-open-codex-account-source-name="' + esc(name) + '" type="button">Open Source</button>'
                  : '') +
                (acctType === "official"
                  ? '<button class="chip" data-login-codex-account="' + esc(name) + '" type="button">Login</button>'
                  : '') +
                '<button class="chip" data-probe-codex-account="' + esc(name) + '" type="button">Validate</button>' +
                '<button class="chip" data-refresh-codex-usage="' + esc(name) + '" type="button">Refresh Usage</button>' +
                (acctType === "official" && details.tokenInfo
                  ? '<button class="chip" data-refresh-codex-token="' + esc(name) + '" type="button">Refresh Token</button>'
                  : "") +
                '<button class="chip" data-remove-codex-account="' + esc(name) + '" type="button">Remove</button>' +
              '</div>' +
              rateLimitNote +
              tokenHealthLine +
              '<div class="codex-auto-probe-result" id="probe-' + esc(name) + '" style="display:none;margin-top:6px;font-size:11px"></div>' +
            '</article>';
          }).join("") +
        '</div>' +
        (retryAccounts.length
          ? '<article class="codex-auto-rate-limit-card">' +
              '<div class="codex-auto-card-label">Rate-limited accounts</div>' +
              '<div class="codex-auto-rate-limit-list">' +
                retryAccounts.map(function(name) {
                  var info = retryMap[name];
                  return '<div class="codex-auto-rate-limit-item">' +
                    '<span class="codex-auto-account-name">' + esc(name) + '</span>' +
                    '<span class="mono">' + esc(info.displayText || "") + '</span>' +
                    '<span class="sub">' + esc(info.availableAt || "") + '</span>' +
                  '</div>';
                }).join("") +
              '</div>' +
            '</article>'
          : "") +
        (metadataLines.length
          ? '<div class="codex-auto-session-footer">' +
              '<div class="codex-auto-card-label">Session metadata</div>' +
              '<div class="codex-auto-session-info">' +
                metadataLines.map(function(s) {
                  return '<div class="codex-auto-session-item mono">' + s + '</div>';
                }).join("") +
              '</div>' +
            '</div>'
          : "");
      }

      function watchItemTitle(item) {
        return item && (item.title || item.thread_title || item.threadId || item.thread_id || item.id) || "Watched thread";
      }

      function watchItemId(item) {
        return String(item && (item.thread_id || item.threadId || item.id) || "").trim();
      }

      function renderWatchSurface(watch = {}) {
        const items = Array.isArray(watch.items) ? watch.items : [];
        const meta = watch.meta && typeof watch.meta === "object" ? watch.meta : {};
        if (!watch || watch.ok === false) {
          return '<div class="empty">' +
            '<div class="empty-state-title">Watch unavailable</div>' +
            '<div class="empty-state-copy">' + esc((watch && watch.error) || "The backend did not return watch state yet.") + '</div>' +
            '<div class="chip-row"><button class="chip" data-refresh-thread-explorer="true" type="button">Refresh</button></div>' +
          '</div>';
        }
        if (!items.length) {
          return '<div class="empty">' +
            '<div class="empty-state-title">No watched threads</div>' +
            '<div class="empty-state-copy">Threads appear here when they are added to the local watchlist. Auto-continue remains explicit and count-limited.</div>' +
            '<div class="chip-row"><button class="chip" data-refresh-thread-explorer="true" type="button">Refresh</button></div>' +
          '</div>';
        }
        const launchable = items.filter((item) => item && item.launchable).length;
        const stopped = items.filter((item) => item && item.stopped).length;
        const activeAuto = items.filter((item) => {
          const auto = item && item.auto_continue;
          return auto && auto.enabled && Number(auto.remaining_count || 0) > 0;
        }).length;
        return '<div class="drawer-summary">' +
            drawerStat("Watched", String(items.length)) +
            drawerStat("Launchable", String(launchable)) +
            drawerStat("Auto", String(activeAuto)) +
            drawerStat("Stopped", String(stopped)) +
            drawerStat("Updated", meta.generated_at ? formatTimestamp(meta.generated_at) : "-") +
          '</div>' +
          '<div class="codex-auto-accounts-list">' +
            items.map((item) => {
              const id = watchItemId(item);
              const auto = item && item.auto_continue || {};
              const blocked = String((item && item.blocked_reason) || (auto && auto.blocked_reason) || "").trim();
              const remaining = Number(auto.remaining_count || 0);
              const maxCount = Number(auto.max_count || 0);
              const prompt = String(auto.prompt || "continue");
              const tone = item.stopped ? "warn" : (item.launchable ? "ok" : (blocked ? "warn" : "muted"));
              const status = item.stopped ? "Stopped" : (item.launchable ? "Ready" : (blocked || "Waiting"));
              return '<article class="codex-auto-account-card ' + esc(tone) + '">' +
                '<div class="codex-auto-account-head">' +
                  '<span class="codex-auto-status-dot ' + (tone === "ok" ? "ok" : "missing") + '"></span>' +
                  '<div class="codex-auto-account-name">' + esc(watchItemTitle(item)) + '</div>' +
                  '<div class="codex-auto-account-badges">' +
                    '<span class="codex-auto-badge ' + (tone === "ok" ? "active-profile" : "token-blocked") + '">' + esc(status) + '</span>' +
                    (auto.enabled ? '<span class="codex-auto-badge current">Auto ' + esc(String(remaining)) + '/' + esc(String(maxCount || remaining)) + '</span>' : '<span class="codex-auto-badge preferred">Manual</span>') +
                  '</div>' +
                '</div>' +
                '<div class="codex-auto-source-path mono">Thread: ' + esc(id || "-") + '</div>' +
                '<div class="codex-auto-retry-note">' + esc(blocked || "Will continue only after explicit task_complete evidence.") + '</div>' +
                '<div class="codex-auto-source-path mono">Prompt: ' + esc(short(prompt, 120)) + '</div>' +
                '<div class="chip-row" style="margin-top:8px">' +
                  '<button class="chip primary" data-watch-auto="' + esc(id) + '" data-watch-prompt="' + esc(prompt) + '" data-watch-count="' + esc(String(maxCount || remaining || 1)) + '" type="button">Set Auto</button>' +
                  '<button class="chip danger-chip" data-watch-control="' + esc(id) + '" data-watch-action="stop" type="button">Stop</button>' +
                  '<button class="chip" data-watch-control="' + esc(id) + '" data-watch-action="resume" type="button">Resume</button>' +
                '</div>' +
              '</article>';
            }).join("") +
          '</div>';
      }

      function networkProbeDefaultCommand(id) {
        const key = String(id || "");
        if (key === "google") return "curl -I -L https://www.google.com";
        if (key === "baidu") return "curl -I -L https://www.baidu.com";
        if (key === "ipinfo") return "curl -s https://ipinfo.io/json";
        return "curl";
      }

      function renderNetworkProbeCard(id, label, copy, result) {
        const item = result && typeof result === "object" ? result : {};
        const status = String(item.status || "idle");
        const tone = status === "ok" ? "ok" : (status === "failed" ? "warn" : "muted");
        const running = status === "running";
        const statusLabel = status === "running"
          ? "Running"
          : status === "ok"
            ? "Passed"
            : status === "failed"
              ? "Failed"
              : "Ready";
        const output = item.stdout || item.stderr || item.error || "";
        const duration = Number.isFinite(Number(item.durationMs)) ? String(Math.round(Number(item.durationMs))) + " ms" : "Not run";
        const lastRun = item.completedAt || item.startedAt || "";
        const lastRunLabel = lastRun ? formatTimestamp(lastRun) : "Not run";
        const runner = item.via || (item.command ? "curl" : "curl");
        const command = item.command || networkProbeDefaultCommand(id);
        return '<article class="network-probe-card ' + esc(tone) + '" style="display:grid;gap:12px;min-height:188px;padding:14px;border-radius:12px;border:1px solid color-mix(in srgb, var(--blue) 12%, var(--line));background:linear-gradient(180deg,color-mix(in srgb,var(--panel-elevated) 78%,transparent),color-mix(in srgb,var(--panel-soft) 56%,transparent));overflow:hidden">' +
          '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:12px">' +
            '<div class="codex-auto-account-head" style="align-items:flex-start">' +
              '<span class="codex-auto-status-dot ' + (tone === "ok" ? "ok" : "missing") + '" style="margin-top:5px"></span>' +
              '<div style="display:grid;gap:4px;min-width:0">' +
                '<div class="codex-auto-account-name" style="font-size:13px;white-space:normal">' + esc(label) + '</div>' +
                '<div class="codex-auto-retry-note" style="margin:0;color:var(--muted-soft)">' + esc(copy) + '</div>' +
              '</div>' +
            '</div>' +
            '<button class="chip primary" data-network-probe="' + esc(id) + '" type="button"' + (running ? " disabled" : "") + '>' + esc(running ? "Pinging..." : "Ping") + '</button>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">' +
            '<div style="display:grid;gap:4px;min-width:0;padding:8px;border:1px solid var(--line);border-radius:9px;background:color-mix(in srgb,var(--panel-elevated) 54%,transparent)"><span class="codex-auto-provider-subtitle">Status</span><strong style="font-size:12px;color:var(--text-strong)">' + esc(statusLabel) + '</strong></div>' +
            '<div style="display:grid;gap:4px;min-width:0;padding:8px;border:1px solid var(--line);border-radius:9px;background:color-mix(in srgb,var(--panel-elevated) 54%,transparent)"><span class="codex-auto-provider-subtitle">Latency</span><strong style="font-size:12px;color:var(--text-strong)">' + esc(duration) + '</strong></div>' +
            '<div style="display:grid;gap:4px;min-width:0;padding:8px;border:1px solid var(--line);border-radius:9px;background:color-mix(in srgb,var(--panel-elevated) 54%,transparent)"><span class="codex-auto-provider-subtitle">Last run</span><strong style="font-size:12px;color:var(--text-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(lastRunLabel) + '</strong></div>' +
            '<div style="display:grid;gap:4px;min-width:0;padding:8px;border:1px solid var(--line);border-radius:9px;background:color-mix(in srgb,var(--panel-elevated) 54%,transparent)"><span class="codex-auto-provider-subtitle">Runner</span><strong style="font-size:12px;color:var(--text-strong)">' + esc(runner) + '</strong></div>' +
          '</div>' +
          '<div class="codex-auto-source-path mono" style="padding:7px 9px;border-radius:8px;background:color-mix(in srgb,var(--panel-soft) 64%,transparent)">' + esc(command) + '</div>' +
          (output ? '<pre class="team-drawer-pre" style="max-height:180px;overflow:auto;margin-top:8px">' + esc(output) + '</pre>' : '') +
        '</article>';
      }

      function proxyDelayLabel(proxy) {
        const delay = Number(proxy && proxy.delay);
        return Number.isFinite(delay) && delay >= 0 ? String(Math.round(delay)) + " ms" : "--";
      }

      function proxyDelayTone(proxy) {
        const delay = Number(proxy && proxy.delay);
        if (!Number.isFinite(delay) || delay < 0) return "muted";
        if (delay <= 700) return "ok";
        if (delay <= 1300) return "warn";
        return "danger";
      }

      function renderClashProxyCard(group, proxy, current, switchingGroup, switching) {
        const name = String((proxy && proxy.name) || "").trim();
        if (!name) return "";
        const active = name === current;
        const isSwitching = switchingGroup && switching && switching.proxy === name;
        const delayTone = proxyDelayTone(proxy);
        const protocol = String((proxy && proxy.type) || "Proxy").trim();
        return '<button class="clash-proxy-card ' + esc(delayTone) + (active ? ' active' : '') + '" data-clash-switch-group="' + esc(group.name || "") + '" data-clash-switch-proxy="' + esc(name) + '" title="' + esc(protocol + " · " + proxyDelayLabel(proxy) + " · " + name) + '" type="button"' + (active || isSwitching ? " disabled" : "") + ' style="appearance:none;box-sizing:border-box;display:flex;flex-direction:column;gap:9px;min-height:132px;min-width:0;padding:12px;border:1px solid ' + (active ? 'color-mix(in srgb, var(--blue) 76%, var(--line))' : 'color-mix(in srgb, var(--line) 88%, transparent)') + ';border-radius:12px;background:' + (active ? 'linear-gradient(180deg,color-mix(in srgb,var(--blue) 18%,var(--panel-elevated)),color-mix(in srgb,var(--panel-elevated) 76%,transparent))' : 'color-mix(in srgb, var(--panel-elevated) 68%, transparent)') + ';color:var(--text);text-align:left;cursor:' + (active ? 'default' : 'pointer') + ';overflow:hidden;box-shadow:' + (active ? 'inset 0 0 0 1px color-mix(in srgb, var(--blue) 34%, transparent)' : 'inset 0 1px 0 rgba(255,255,255,0.025)') + '">' +
          '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:8px;min-width:0">' +
            '<div class="clash-proxy-title" style="min-height:36px;overflow:hidden;color:var(--text-strong);font-size:12px;font-weight:850;line-height:1.28;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;word-break:break-word">' + esc(name) + '</div>' +
            '<span class="codex-auto-badge preferred" style="flex:0 0 auto">' + esc(proxy && proxy.udp ? "UDP" : "TCP") + '</span>' +
          '</div>' +
          '<div style="min-height:18px;color:var(--muted-soft);font-size:11px;line-height:1.3">' + esc(active ? "Current selection" : (isSwitching ? "Switching..." : "Click to switch")) + '</div>' +
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;margin-top:auto">' +
            '<span class="codex-auto-badge inactive" style="max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(protocol || "Proxy") + '</span>' +
            '<span class="codex-auto-badge ' + esc(delayTone === "ok" ? "active-profile" : (delayTone === "danger" ? "token-blocked" : "rate-limited")) + '" style="flex:0 0 auto">' + esc(proxyDelayLabel(proxy)) + '</span>' +
          '</div>' +
        '</button>';
      }

      function renderClashProxyGroup(group, switching) {
        const current = String((group && group.now) || "").trim();
        const all = Array.isArray(group && group.all) ? group.all : [];
        const switchingGroup = switching && switching.group === group.name;
        return '<section class="clash-proxy-group" style="display:grid;gap:12px;min-width:0;padding:14px;border:1px solid color-mix(in srgb, var(--blue) 12%, var(--line));border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--panel-elevated) 58%,transparent),color-mix(in srgb,var(--panel-soft) 56%,transparent))">' +
          '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:12px;min-width:0;padding-bottom:10px;border-bottom:1px solid color-mix(in srgb,var(--line) 72%,transparent)">' +
            '<div style="display:grid;gap:5px;min-width:0">' +
              '<div style="color:var(--text-strong);font-size:13px;font-weight:900;line-height:1.2;letter-spacing:0;text-transform:none">' + esc(group.name || "Proxy Group") + '</div>' +
              '<div class="section-note" style="margin:0">' + esc(String(group.type || "Selector")) + ' · ' + esc(String(all.length)) + ' options' + (switchingGroup ? ' · switching to ' + esc(switching.proxy || "") : '') + '</div>' +
            '</div>' +
            '<div class="codex-auto-account-badges" style="justify-content:flex-end;max-width:48%;overflow:hidden">' +
              '<span class="codex-auto-badge current">' + esc(current || "None") + '</span>' +
              (group && group.udp ? '<span class="codex-auto-badge preferred">UDP</span>' : '') +
              '<span class="codex-auto-badge inactive">' + esc(proxyDelayLabel(group)) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="clash-proxy-card-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;max-height:560px;overflow:auto;padding:1px 3px 1px 1px">' +
            all.map((proxy) => renderClashProxyCard(group, proxy, current, switchingGroup, switching)).join("") +
          '</div>' +
        '</section>';
      }

      function renderClashProxySwitcher(clashState = {}) {
        const stateObj = clashState && typeof clashState === "object" ? clashState : {};
        const groups = Array.isArray(stateObj.groups) ? stateObj.groups : [];
        const status = stateObj.loading ? "Loading" : (stateObj.ok ? "Connected" : (stateObj.ok === false ? "Unavailable" : "Not loaded"));
        const tone = stateObj.ok ? "ok" : (stateObj.ok === false ? "warn" : "muted");
        const connectionReset = stateObj.connectionReset && typeof stateObj.connectionReset === "object" ? stateObj.connectionReset : null;
        const selectedLabel = stateObj.selectedGroup && stateObj.selectedProxy
          ? String(stateObj.selectedGroup) + " -> " + String(stateObj.selectedProxy)
          : "";
        return '<section class="network-clash-panel" style="display:grid;gap:12px;margin-top:12px;padding:14px 16px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb, var(--panel-elevated) 48%, transparent)">' +
          '<div class="running-board-toolbar">' +
            '<div>' +
              '<div class="section-title">Clash/Mihomo Proxy Switcher</div>' +
              '<div class="section-note">' + esc(stateObj.message || "Use Refresh Proxies to load selector groups from the external controller.") + '</div>' +
            '</div>' +
            '<div class="chip-row">' +
              '<span class="codex-auto-badge active-profile">No restart</span>' +
              '<span class="codex-auto-badge ' + (tone === "ok" ? "active-profile" : "preferred") + '">' + esc(status) + '</span>' +
              '<button class="chip primary" data-refresh-clash-proxies="true" type="button"' + (stateObj.loading ? " disabled" : "") + '>' + esc(stateObj.loading ? "Refreshing..." : "Refresh Proxies") + '</button>' +
            '</div>' +
          '</div>' +
          '<div style="display:grid;gap:8px;padding:10px 12px;border:1px solid color-mix(in srgb,var(--line) 72%,transparent);border-radius:10px;background:color-mix(in srgb,var(--panel-soft) 58%,transparent)">' +
            '<div class="codex-auto-source-path mono">Controller: ' + esc(stateObj.controllerUrl || "http://127.0.0.1:9090") + (stateObj.hasSecret ? " · secret configured" : "") + '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;min-width:0;flex-wrap:wrap">' +
              '<div class="section-note" style="margin:0;min-width:240px;flex:1">Switches use the Clash/Mihomo external controller API, then CMA closes old connections and refreshes Public IP Info. If your controller uses another port, update <span class="mono">codexAgent.clashControllerUrl</span> in VS Code Settings.</div>' +
              '<button class="chip" data-open-network-settings="true" type="button">Open Settings</button>' +
            '</div>' +
            (selectedLabel || connectionReset
              ? '<div class="chip-row" style="gap:6px">' +
                  (selectedLabel ? '<span class="chip primary" title="' + esc(selectedLabel) + '">' + esc(short(selectedLabel, 44)) + '</span>' : '') +
                  (connectionReset ? '<span class="codex-auto-badge ' + esc(connectionReset.ok ? "active-profile" : "rate-limited") + '">' + esc(connectionReset.ok ? "Old connections closed" : "Old connections may linger") + '</span>' : '') +
                  (stateObj.ipVerificationOk !== undefined ? '<span class="codex-auto-badge ' + esc(stateObj.ipVerificationOk ? "active-profile" : "rate-limited") + '">' + esc(stateObj.ipVerificationOk ? "IP verified" : "IP check failed") + '</span>' : '') +
                '</div>'
              : '') +
          '</div>' +
          (groups.length
            ? '<div class="chip-row" style="gap:6px;max-height:74px;overflow:auto">' +
                '<span class="chip primary">Proxy Groups ' + esc(String(groups.length)) + '</span>' +
                groups.map((group) => '<span class="chip" title="' + esc(group.name || "") + '">' + esc(short(group.name || "Proxy Group", 28)) + ' <span class="mono">' + esc(String((group.all || []).length)) + '</span></span>').join("") +
              '</div>'
            : '') +
          (groups.length
            ? '<div class="clash-proxy-layout" style="display:grid;gap:12px;margin-top:2px">' + groups.map((group) => renderClashProxyGroup(group, stateObj.switching || null)).join("") + '</div>'
            : '<div class="empty" style="margin-top:10px"><div class="empty-state-title">No proxy groups loaded</div><div class="empty-state-copy">Set codexAgent.clashControllerUrl if your external controller is not on 127.0.0.1:9090, then refresh.</div></div>') +
        '</section>';
      }

      function renderNetworkToolsPanel(networkResults = {}, clashState = {}) {
        return '<section class="network-probe-panel" style="display:grid;gap:10px;margin-top:4px">' +
          '<div class="running-board-toolbar" style="padding:0;border:0;background:transparent;box-shadow:none">' +
            '<div>' +
              '<div class="section-title">Connectivity Tests</div>' +
              '<div class="section-note">Each module runs from the VS Code extension host and keeps its latest status here.</div>' +
            '</div>' +
          '</div>' +
          '<div class="network-probe-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:10px">' +
          renderNetworkProbeCard("google", "Google Connectivity", "Equivalent to mylaunch curlg: checks access to https://www.google.com.", networkResults.google) +
          renderNetworkProbeCard("baidu", "Baidu Connectivity", "Checks access to https://www.baidu.com for China-side reachability.", networkResults.baidu) +
          renderNetworkProbeCard("ipinfo", "Public IP Info", "Runs curl -s https://ipinfo.io/json from the VS Code extension host.", networkResults.ipinfo) +
          '</div>' +
        '</section>' +
        renderClashProxySwitcher(clashState || {});
      }

      function codexSidecarTone(integration = {}) {
        if (integration.available) return "ok";
        if (integration.installed || integration.partial) return "warn";
        return "muted";
      }

      function codexSidecarLabel(integration = {}) {
        if (integration.label) return integration.label;
        if (integration.available) return "Sidecar Ready";
        if (integration.installed) return "Partial Bridge";
        return "Official Codex Not Detected";
      }

      function renderCodexSidecarCommandPills(commands = {}) {
        const entries = Object.keys(commands || {}).sort();
        if (!entries.length) return '<span class="codex-sidecar-pill muted">No command manifest</span>';
        return entries.map((command) => {
          const ok = Boolean(commands[command]);
          return '<span class="codex-sidecar-pill ' + esc(ok ? "ok" : "muted") + '">' +
            '<span>' + esc(command.replace(/^chatgpt\\./, "")) + '</span>' +
            '<strong>' + esc(ok ? "Ready" : "Missing") + '</strong>' +
          '</span>';
        }).join("");
      }

      function renderCodexSidecarIntegration(integration = {}) {
        const item = integration && typeof integration === "object" ? integration : {};
        const tone = codexSidecarTone(item);
        const customEditor = item.customEditor && typeof item.customEditor === "object" ? item.customEditor : {};
        const commands = item.commands && typeof item.commands === "object" ? item.commands : {};
        const commandKeys = Object.keys(commands || {});
        const readyCommands = commandKeys.filter((command) => Boolean(commands[command])).length;
        const openThreadCount = Number(item.openThreadCount || 0);
        const activeLabel = item.installed ? (item.active ? "Active" : "Installed") : "Unavailable";
        const focused = item.focusedThreadId ? short(item.focusedThreadId, 22) : "None";
        const sidebar = item.sidebarThreadId ? short(item.sidebarThreadId, 22) : "None";
        const limitations = Array.isArray(item.limitations) ? item.limitations : [];
        const actionTitle = item.available
          ? (openThreadCount ? "Continue linked Codex work" : "Open a Codex sidecar")
          : (item.installed ? "Complete bridge activation" : "Install or enable official Codex");
        const actionCopy = item.available
          ? "Use the sidecar when you need the official Codex editor or sidebar for a selected thread."
          : "The bridge is optional, but Team and Thread workflows get better when the official surface is reachable.";
        return '<div class="codex-sidecar-hero ' + esc(tone) + '">' +
            '<div class="codex-sidecar-status-block">' +
              '<span class="codex-sidecar-kicker">Official Codex bridge</span>' +
              '<div class="codex-sidecar-title">' + esc(codexSidecarLabel(item)) + '</div>' +
              '<div class="codex-sidecar-copy">' + esc(item.message || "CMA can use official Codex surfaces as a sidecar when the extension bridge is available.") + '</div>' +
            '</div>' +
            '<span class="codex-sidecar-status ' + esc(tone) + '">' + esc(activeLabel) + '</span>' +
          '</div>' +
          '<div class="codex-sidecar-summary-strip">' +
            '<article class="codex-sidecar-summary-item">' +
              '<div class="codex-sidecar-card-label">Extension</div>' +
              '<div class="codex-sidecar-card-value">' + esc(item.displayName || "Codex") + '</div>' +
              '<div class="codex-sidecar-path mono">' + esc(item.extensionId || "openai.chatgpt") + (item.version ? " · " + esc(item.version) : "") + '</div>' +
            '</article>' +
            '<article class="codex-sidecar-summary-item">' +
              '<div class="codex-sidecar-card-label">Commands ready</div>' +
              '<div class="codex-sidecar-card-value">' + esc(String(readyCommands)) + '/' + esc(String(commandKeys.length || 0)) + '</div>' +
              '<div class="codex-sidecar-path mono">Custom editor ' + esc(customEditor.available ? "ready" : "missing") + '</div>' +
            '</article>' +
            '<article class="codex-sidecar-summary-item">' +
              '<div class="codex-sidecar-card-label">Linked threads</div>' +
              '<div class="codex-sidecar-card-value">' + esc(String(openThreadCount)) + '</div>' +
              '<div class="codex-sidecar-path mono">Focused ' + esc(focused) + ' · Sidebar ' + esc(sidebar) + '</div>' +
            '</article>' +
          '</div>' +
          '<article class="codex-sidecar-action-card ' + esc(tone) + '">' +
            '<div>' +
              '<div class="codex-sidecar-card-label">Recommended action</div>' +
              '<div class="codex-sidecar-card-value">' + esc(actionTitle) + '</div>' +
              '<div class="codex-sidecar-copy">' + esc(actionCopy) + '</div>' +
            '</div>' +
            '<div>' +
              '<div class="codex-sidecar-card-label">Bridge capabilities</div>' +
              '<div class="codex-sidecar-pill-row">' + renderCodexSidecarCommandPills(commands) + '</div>' +
              '<div class="codex-sidecar-path mono">' + esc(customEditor.viewType || "chatgpt.conversationEditor") + '</div>' +
            '</div>' +
          '</article>' +
          (limitations.length ? '<div class="codex-sidecar-note">' + limitations.map((line) => '<span>' + esc(line) + '</span>').join("") + '</div>' : '');
      }
`;
