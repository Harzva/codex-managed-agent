module.exports = `            '</article>' +
            '<article class="provider-health-summary-item">' +
              '<div class="provider-health-card-label">Rollout logs</div>' +
              '<div class="provider-health-card-value">' + esc(dominantProviderLabel(rolloutActiveCounts)) + '</div>' +
              '<div class="provider-health-path mono">' + esc(String(rolloutKnownTotal || 0)) + ' recorded provider rows</div>' +
            '</article>' +
            '<article class="provider-health-summary-item">' +
              '<div class="provider-health-card-label">Desktop SQLite</div>' +
              '<div class="provider-health-card-value">' + esc(dominantProviderLabel(sqliteActiveCounts)) + '</div>' +
              '<div class="provider-health-path mono">' + esc(String(sqliteKnownTotal || 0)) + ' recorded provider rows</div>' +
            '</article>' +
            '<article class="provider-health-summary-item">' +
              '<div class="provider-health-card-label">SQLite files</div>' +
              '<div class="provider-health-card-value">' + esc(String(sqliteFileCount)) + '</div>' +
              '<div class="provider-health-path mono">' + esc(String(sqliteDatabaseCount)) + ' DB · ' + esc(String(sqliteCompanionCount)) + ' WAL/SHM · ' + esc(formatBytes(sqliteInventory.totalBytes || 0)) + '</div>' +
            '</article>' +
          '</div>' +
          '<article class="provider-health-action-card ' + esc(tone) + '">' +
            '<div class="provider-health-action-copy">' +
              '<div class="provider-health-card-label">Codex Provider Sync</div>' +
              '<div class="provider-health-card-value">' + esc(item.mismatch ? "Sync SQLite provider metadata" : "Keep monitoring") + '</div>' +
              '<div class="provider-health-copy">' + esc(actionCopy) + '</div>' +
            '</div>' +
            '<div class="provider-health-action-tools">' +
              '<div class="chip-row">' +
                '<button class="chip" data-provider-sync-action="preview" type="button"' + (syncBusy ? ' disabled' : '') + '>Preview Sync</button>' +
                '<button class="chip primary" data-provider-sync-action="apply" type="button"' + (syncBusy ? ' disabled' : '') + '>Apply Sync</button>' +
              '</div>' +
              renderProviderSyncSummary(syncState) +
            '</div>' +
          '</article>' +
          '<article class="provider-health-action-card muted">' +
            '<div class="provider-health-action-copy">' +
              '<div class="provider-health-card-label">OpenAI Extension Sidebar</div>' +
              '<div class="provider-health-card-value">Show more recent chats</div>' +
              '<div class="provider-health-copy">Patch the installed OpenAI VS Code extension so its sidebar requests 200 recent threads instead of the packaged 50-thread request.</div>' +
            '</div>' +
            '<div class="provider-health-action-tools">' +
              '<div class="chip-row">' +
                '<button class="chip" data-openai-sidebar-limit-action="preview" type="button"' + (syncState && syncState.sidebarLimit && syncState.sidebarLimit.busy ? ' disabled' : '') + '>Preview Limit Patch</button>' +
                '<button class="chip primary" data-openai-sidebar-limit-action="apply" type="button"' + (syncState && syncState.sidebarLimit && syncState.sidebarLimit.busy ? ' disabled' : '') + '>Apply 200 Limit</button>' +
              '</div>' +
              renderOpenAiSidebarLimitSummary(syncState && syncState.sidebarLimit) +
            '</div>' +
          '</article>' +
          '<div class="provider-health-evidence-grid">' +
            '<article class="provider-health-card">' +
              '<div class="provider-health-card-label">Rollout JSONL evidence</div>' +
              '<div class="provider-health-evidence-row">' +
                '<div><div class="provider-health-card-label">Active</div><div class="provider-health-provider-row">' + renderProviderCountPills(rolloutActiveCounts) + '</div></div>' +
                '<div><div class="provider-health-card-label">Archived</div><div class="provider-health-provider-row">' + renderProviderCountPills(rolloutArchivedCounts) + '</div></div>' +
              '</div>' +
              '<div class="provider-health-path mono">' +
                esc(String(rolloutActiveScanned || 0)) + ' active files · ' +
                esc(String(rolloutArchivedScanned || 0)) + ' archived files · ' +
                esc(item.sessionsDir || "~/.codex/sessions") +
              '</div>' +
            '</article>' +
            '<article class="provider-health-card">' +
              '<div class="provider-health-card-label">state_5.sqlite evidence</div>' +
              '<div class="provider-health-evidence-row">' +
                '<div><div class="provider-health-card-label">Active</div><div class="provider-health-provider-row">' + renderProviderCountPills(sqliteActiveCounts) + '</div></div>' +
                '<div><div class="provider-health-card-label">Archived</div><div class="provider-health-provider-row">' + renderProviderCountPills(sqliteArchivedCounts) + '</div></div>' +
              '</div>' +
              '<div class="provider-health-path mono">' +
                esc(String(sqliteActiveTotal || 0)) + ' active · ' +
                esc(String(sqliteArchivedTotal || 0)) + ' archived · ' +
                esc(String(sqliteTotal || 0)) + ' total' +
              '</div>' +
              '<div class="provider-health-path mono">' +
                'Missing provider rows: ' + esc(String(sqliteMissingProvider)) +
                (sqliteMissingProvider ? (" (active " + esc(String(sqliteMissingActive)) + ", archived " + esc(String(sqliteMissingArchived)) + ")") : "") +
                ' · ' + esc(sqliteDetail) + ' · ' + esc(item.sqlitePath || "~/.codex/state_5.sqlite") +
              '</div>' +
            '</article>' +
            '<article class="provider-health-card provider-health-card-wide">' +
              '<div class="provider-health-card-label">Codex SQLite inventory</div>' +
              renderSqliteInventory(sqliteInventory) +
              '<div class="provider-health-path mono">Provider sync only writes state_5.sqlite; logs databases are shown for visibility, not modified.</div>' +
            '</article>' +
            '<article class="provider-health-card provider-health-card-wide">' +
              '<div class="provider-health-card-label">state_5.sqlite schema map</div>' +
              renderSqliteSchemaMap(sqliteSchema) +
              '<div class="provider-health-path mono">Read-only schema view: tables, row counts, columns, and primary-key hints.</div>' +
            '</article>' +
          '</div>';
      }

      function renderCodexAutoAccounts(state = {}) {
        const accounts = Array.isArray(state.accounts) ? state.accounts : [];
        if (accounts.length === 0) {
          return '<div class="codex-auto-hero muted">' +
            '<div class="codex-auto-status-block">' +
              '<span class="codex-auto-kicker">Codex Accounts</span>' +
              '<div class="codex-auto-title">No accounts configured</div>' +
              '<div class="codex-auto-copy">No managed Codex accounts yet. Use "Add Account" to create an isolated slot and log in there. Import actions are for migration or diagnostics.</div>' +
              '<div class="chip-row" style="margin-top:10px">' +
                '<button class="chip primary" data-add-codex-account="true" type="button">Add Account</button>' +
                '<button class="chip" data-import-codex-account-from-path="true" type="button">Import auth file...</button>' +
                '<button class="chip" data-import-codex-account="true" type="button">Import from Codex</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }
        const currentAccount = state.currentAccount || "(none)";
        const preferredAccount = state.preferredAccountName;
        const lastSuccessfulAccount = state.lastSuccessfulAccount;
        const lastSessionId = state.lastSessionId;
        const updatedAt = state.updatedAt || "";
        const activeProfileName = state.activeProfileName || null;
        const retryMap = state.retryAvailabilityByAccount || {};
        const accountDetails = state.accountDetails || {};
        const activeProfileDetails = activeProfileName && accountDetails[activeProfileName] ? accountDetails[activeProfileName] : {};
        const activeTokenHealth = normalizeTokenHealthState(activeProfileDetails.tokenHealth);
        const activeProfileHasBlockingState = activeProfileName && (
          isTokenHealthBlocking(activeTokenHealth) || Boolean(retryMap[activeProfileName])
        );
        const activeSwitchRecommendation = activeProfileHasBlockingState
          ? pickSwitchRecommendedProfile(state, activeProfileName, retryMap)
          : null;
        const accountCount = accounts.length;
        const retryAccounts = accounts.filter(function(name) { return retryMap[name]; });
        const activeDetails = activeProfileName && accountDetails[activeProfileName] ? accountDetails[activeProfileName] : null;
        const activeSourcePath = activeDetails && activeDetails.sourceAuthPath ? activeDetails.sourceAuthPath : null;
        const activeProfile = state.activeProfile || {};
        const activeMethod = activeProfile && activeProfile.method ? String(activeProfile.method) : "";
        const globalAuthPath = activeProfile && activeProfile.authPath ? String(activeProfile.authPath) : "~/.codex/auth.json";
        const globalAuthRealPath = activeProfile && activeProfile.authRealPath ? String(activeProfile.authRealPath) : "";
        const globalAuthTarget = activeProfile && activeProfile.authLinkTarget ? String(activeProfile.authLinkTarget) : "";
        const globalAuthIsSymlink = Boolean(activeProfile && activeProfile.authIsSymlink);
        const activeStateText = activeProfileName
          ? 'Global auth: ' + esc(activeProfileName) + ' · ' + esc(activeMethod || "detected")
          : 'Global auth: unmanaged';
        const tokenMaintenance = state.tokenMaintenance || {};
        const maintenanceResults = Array.isArray(tokenMaintenance.lastResults) ? tokenMaintenance.lastResults : [];
        const refreshedCount = maintenanceResults.filter(function(item) { return item && item.ok && !item.skipped; }).length;
        const failedCount = maintenanceResults.filter(function(item) { return item && item.ok === false; }).length;
        const checkedCount = maintenanceResults.length;
        const maintenanceEnabled = tokenMaintenance.enabled !== false;
        const maintenanceIntervalLabel = tokenMaintenance.intervalMinutes
          ? String(tokenMaintenance.intervalMinutes) + "m"
          : "60m";
        const maintenanceLastLabel = tokenMaintenance.lastRunAt
          ? formatTimestamp(tokenMaintenance.lastRunAt)
          : "Not run yet";
        const maintenanceNextLabel = maintenanceEnabled && tokenMaintenance.nextRunAt
          ? formatTimestamp(tokenMaintenance.nextRunAt)
          : (maintenanceEnabled ? "After panel opens" : "Off");
        const globalAuthStatusHtml = '<div class="codex-auto-global-auth ' + (activeProfileName === currentAccount ? "ok" : (activeProfileName ? "warn" : "muted")) + '">' +
          '<div class="codex-auto-global-auth-head">' +
            '<span class="codex-auto-card-label">Global Codex auth</span>' +
            '<strong>' + esc(activeProfileName || "Unmanaged") + '</strong>' +
            (activeProfileName === currentAccount ? '<span class="codex-auto-badge terminal-default">Terminal default</span>' : '') +
          '</div>' +
          '<div class="codex-auto-global-auth-row mono">' +
            '<span>~/.codex/auth.json</span>' +
            '<em>' + esc(globalAuthIsSymlink ? "symlink" : (activeMethod || "file")) + '</em>' +
          '</div>' +
          '<div class="codex-auto-global-auth-path mono" title="' + esc(globalAuthRealPath || globalAuthTarget || globalAuthPath) + '">' +
            esc(short(globalAuthRealPath || globalAuthTarget || globalAuthPath, 94)) +
          '</div>' +
          (activeProfileName && activeProfileName !== currentAccount
            ? '<div class="codex-auto-global-auth-warning">CMA selected account differs from the terminal default.</div>'
            : '') +
        '</div>';
        const tokenMaintenanceHtml = '<div class="codex-auto-token-maintenance ' + (maintenanceEnabled ? "ok" : "muted") + '">' +
          '<div class="codex-auto-global-auth-head">' +
            '<span class="codex-auto-card-label">Token maintenance</span>' +
            '<strong>' + esc(maintenanceEnabled ? "Auto refresh on" : "Auto refresh off") + '</strong>' +
            '<span class="codex-auto-provider-plan">' + esc(maintenanceIntervalLabel) + '</span>' +
          '</div>' +
          '<div class="codex-auto-global-auth-row mono">' +
            '<span>Last: ' + esc(maintenanceLastLabel) + '</span>' +
            '<em>Next: ' + esc(maintenanceNextLabel) + '</em>' +
          '</div>' +
          '<div class="codex-auto-global-auth-path mono">' +
            esc(String(checkedCount) + " checked · " + String(refreshedCount) + " refreshed · " + String(failedCount) + " failed") +
            (tokenMaintenance.running ? esc(" · running") : "") +
            (tokenMaintenance.lastError ? esc(" · " + tokenMaintenance.lastError) : "") +
          '</div>' +
          '<div class="chip-row codex-auto-maintenance-actions">' +
            '<button class="chip" data-run-token-maintenance="true" type="button">Check Tokens Now</button>' +
            '<button class="chip" data-force-refresh-all-tokens="true" type="button">Force Refresh All</button>' +
            '<button class="chip" data-toggle-token-maintenance="' + esc(maintenanceEnabled ? "off" : "on") + '" type="button">' + esc(maintenanceEnabled ? "Disable Auto" : "Enable Auto") + '</button>' +
          '</div>' +
        '</div>';
        const formatRetryAvailability = function(retryInfo) {
          if (!retryInfo || typeof retryInfo !== "object") return "unknown";
          if (typeof retryInfo.displayText === "string" && retryInfo.displayText.trim()) {
            return retryInfo.displayText.trim();
          }
          if (typeof retryInfo.retryAfterSeconds === "number" && retryInfo.retryAfterSeconds > 0) {
            return "Retry in " + String(Math.max(1, Math.round(retryInfo.retryAfterSeconds))) + " seconds";
          }
          if (!retryInfo.availableAt) return retryInfo.message || "unknown";
          var parsed = Date.parse(String(retryInfo.availableAt));
          if (!Number.isFinite(parsed)) return retryInfo.message || "unknown";
          var remaining = Math.max(0, Math.round((parsed - Date.now()) / 1000));
          if (remaining <= 0) return "Retry window open now";
          return "Retry in " + String(remaining) + " seconds (at " + new Date(parsed).toISOString().replace("T", " ").replace("Z", " UTC") + ")";
        };

        const metadataLines = [];
        if (lastSessionId) metadataLines.push('Last session: <span class="mono">' + esc(lastSessionId) + '</span>');
        if (lastSuccessfulAccount) metadataLines.push('Last successful account: <span class="mono">' + esc(lastSuccessfulAccount) + '</span>');
        if (activeSourcePath) metadataLines.push('Active source auth: <span class="mono">' + esc(short(activeSourcePath, 90)) + '</span>');
        if (updatedAt) metadataLines.push('State updated: <span class="mono">' + esc(updatedAt) + '</span>');
        const tokenHealthScore = function(tokenHealth, retryInfo, hasAuth) {
          if (!hasAuth) return 8;
          if (retryInfo) return 18;
          const key = normalizeTokenHealthState(tokenHealth);
          if (key === "ok") return 100;
          if (key === "expiring_soon") return 62;
          if (key === "expired" || key === "invalid" || key === "refresh_failed") return 12;
          if (key === "rate_limited") return 18;
          return 64;
        };
        const profileHealthScore = function(name, details, retryInfo) {
          let score = 0;
          if (details && details.hasAuth) score += 34;
          if (details && details.hasConfig) score += 18;
          if (details && details.hasMeta) score += 18;
          if (activeProfileName === name) score += 20;
          if (preferredAccount === name) score += 10;
          if (retryInfo) score = Math.min(score, 35);
          return Math.max(6, Math.min(100, score));
        };
        const accountTone = function(score, blocked) {
          if (blocked || score < 25) return "danger";
          if (score < 70) return "warn";
          return "ok";
        };
        const renderAccountMeter = function(label, value, hint, tone) {
          const pct = Math.max(0, Math.min(100, Number(value || 0)));
          return '<div class="codex-auto-meter tone-' + esc(tone || "ok") + '">' +
            '<div class="codex-auto-meter-head"><span>' + esc(label) + '</span><strong>' + esc(String(Math.round(pct))) + '%</strong><em>' + esc(hint || "") + '</em></div>' +
            '<div class="codex-auto-meter-track"><span style="width:' + esc(String(pct)) + '%"></span></div>' +
          '</div>';
        };
        const coerceRateLimitBuckets = function(raw) {
          if (!raw) return [];
          if (Array.isArray(raw)) return raw.filter(Boolean);
          if (Array.isArray(raw.buckets)) return raw.buckets.filter(Boolean);
          if (Array.isArray(raw.rateLimits)) return raw.rateLimits.filter(Boolean);
          if (Array.isArray(raw.rate_limits)) return raw.rate_limits.filter(Boolean);
          if (raw && typeof raw === "object") {
            return Object.keys(raw).map(function(key) {
              const value = raw[key];
              if (!value || typeof value !== "object" || Array.isArray(value)) {
                return { label: key, remainingLabel: value };
              }
              return Object.assign({ label: key }, value);
            });
          }
          return [];
        };
        const firstDefined = function(values) {
          for (var i = 0; i < values.length; i += 1) {
            if (values[i] !== undefined && values[i] !== null && values[i] !== "") return values[i];
          }
          return null;
        };
        const formatQuotaWindowLabel = function(value) {
          const label = String(value || "").trim();
          if (!label) return "Quota";
          if (panelLanguageKey() === "zh") {
            const hourMatch = label.match(/^(\\d+)\\s*h(?:ours?)?$/i);
            if (hourMatch) return hourMatch[1] + "小时";
            if (/^weekly$/i.test(label)) return "每周";
          }
          return label;
        };
        const quotaPercent = function(bucket) {
          const raw = firstDefined([
            bucket.remainingPercent,
            bucket.remaining_percent,
            bucket.percent,
            bucket.percentage,
            bucket.remainingPct,
            bucket.remaining_pct,
          ]);
          if (raw !== null) {
            const numeric = Number(String(raw).replace("%", ""));
            if (Number.isFinite(numeric)) return Math.max(0, Math.min(100, numeric <= 1 ? numeric * 100 : numeric));
          }
          const remaining = Number(firstDefined([bucket.remaining, bucket.available]));
          const limit = Number(firstDefined([bucket.limit, bucket.total, bucket.capacity]));
          if (Number.isFinite(remaining) && Number.isFinite(limit) && limit > 0) {
            return Math.max(0, Math.min(100, (remaining / limit) * 100));
          }
          return null;
        };
        const formatDurationCompact = function(seconds) {
          const total = Math.max(0, Math.round(Number(seconds) || 0));
          if (total >= 3600) {
            const hours = Math.max(1, Math.round(total / 3600));
            return panelLanguageKey() === "zh" ? String(hours) + "小时" : String(hours) + "h";
          }
          if (total >= 60) {
            const minutes = Math.max(1, Math.round(total / 60));
            return panelLanguageKey() === "zh" ? String(minutes) + "分钟" : String(minutes) + "m";
          }
          return panelLanguageKey() === "zh" ? String(total || 1) + "秒" : String(total || 1) + "s";
        };
        const formatQuotaReset = function(bucket) {
          const direct = firstDefined([bucket.resetLabel, bucket.reset_label, bucket.displayReset, bucket.display_reset, bucket.resetsInLabel]);
          if (direct !== null) return String(direct);
          const resetSeconds = firstDefined([bucket.resetAfterSeconds, bucket.reset_after_seconds, bucket.retryAfterSeconds, bucket.retry_after_seconds]);
          if (resetSeconds !== null && Number.isFinite(Number(resetSeconds))) {
            return (panelLanguageKey() === "zh" ? "剩余 " : "") + formatDurationCompact(Number(resetSeconds)) + (panelLanguageKey() === "zh" ? "" : " left");
          }
          const resetAt = firstDefined([bucket.resetAt, bucket.reset_at, bucket.resetsAt, bucket.resets_at, bucket.availableAt, bucket.available_at]);
          if (resetAt === null) return "";
          const parsed = Date.parse(String(resetAt));
          if (!Number.isFinite(parsed)) return String(resetAt);
          const date = new Date(parsed);
          const now = new Date();
          const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
          return sameDay
            ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : date.toLocaleDateString([], { month: "short", day: "numeric" });
        };
        const accountRateLimitBuckets = function(name, details, retryInfo) {
          const byAccount = state.rateLimitsByAccount || state.rateLimitBucketsByAccount || {};
          const rawSources = [
            byAccount[name],
            details.rateLimits,
            details.rate_limits,
            details.rateLimitBuckets,
            details.rate_limit_buckets,
            details.rateLimit,
            retryInfo && retryInfo.rateLimits,
            retryInfo && retryInfo.rateLimitBuckets,
          ];
          let buckets = [];
          rawSources.forEach(function(raw) {
            buckets = buckets.concat(coerceRateLimitBuckets(raw));
          });
          if (!buckets.length && retryInfo) {
            buckets.push({
              label: retryInfo.bucket || retryInfo.window || "Retry",
              remainingPercent: 0,
              resetLabel: formatRetryAvailability(retryInfo),
            });
          }
          return buckets.slice(0, 4).map(function(bucket) {
            const label = formatQuotaWindowLabel(firstDefined([bucket.label, bucket.window, bucket.name, bucket.bucket, bucket.period]));
            const pct = quotaPercent(bucket);
            const remainingLabel = firstDefined([bucket.remainingLabel, bucket.remaining_label, bucket.displayRemaining, bucket.display_remaining]);
            const resetLabel = formatQuotaReset(bucket);
            return { label: label, percent: pct, remainingLabel: remainingLabel, resetLabel: resetLabel };
          }).filter(function(bucket) {
            return bucket.label || bucket.remainingLabel || bucket.percent !== null || bucket.resetLabel;
          });
        };
        const renderRateLimitBuckets = function(name, details, retryInfo) {
          const buckets = accountRateLimitBuckets(name, details, retryInfo);
          const usageInfo = details && details.usageAccountInfo && typeof details.usageAccountInfo === "object"
            ? details.usageAccountInfo
            : null;
          const usageInfoRows = usageInfo ? [
            usageInfo.email ? ["Email", usageInfo.email] : null,
            usageInfo.accountId ? ["Account", short(String(usageInfo.accountId), 22)] : null,
            usageInfo.planType ? ["Plan", usageInfo.planType] : null,
          ].filter(Boolean) : [];
          const usageInfoHtml = usageInfoRows.length
            ? '<div class="codex-auto-usage-account-info">' +
                usageInfoRows.map(function(row) {
                  return '<div class="codex-auto-rate-limit-row account-info">' +
                    '<span>' + esc(row[0]) + '</span>' +
                    '<strong title="' + esc(row[1]) + '">' + esc(row[1]) + '</strong>' +
                    '<em></em>' +
                  '</div>';
                }).join("") +
              '</div>'
            : "";
          if (!buckets.length) {
            if (details && details.lastUsageFetchError) {
              return '<div class="codex-auto-rate-limit-mini empty error">' +
                '<div class="codex-auto-rate-limit-title">Usage refresh failed</div>' +
                '<div class="codex-auto-rate-limit-source">' + esc(short(details.lastUsageFetchError, 120)) + '</div>' +
              '</div>';
            }
            return '<div class="codex-auto-rate-limit-mini empty">' +
              '<div class="codex-auto-rate-limit-title">Rate limits not reported yet</div>' +
              '<div class="codex-auto-rate-limit-source">Waiting for live quota metadata</div>' +
            '</div>';
          }
          return '<div class="codex-auto-rate-limit-mini">' +
            '<div class="codex-auto-rate-limit-title">Rate limits remaining</div>' +
            buckets.map(function(bucket) {
              const pctLabel = bucket.percent === null
                ? esc(String(bucket.remainingLabel || "-"))
                : esc(String(Math.round(bucket.percent)) + "%");
              return '<div class="codex-auto-rate-limit-row">' +
                '<span>' + esc(bucket.label) + '</span>' +
                '<strong>' + pctLabel + '</strong>' +
                '<em>' + esc(bucket.resetLabel || "") + '</em>' +
              '</div>';
            }).join("") +
            usageInfoHtml +
          '</div>';
        };

        return '<div class="codex-auto-hero ' + (accountCount > 0 ? "ok" : "muted") + '">' +
          '<div class="codex-auto-status-block">' +
            '<span class="codex-auto-kicker">Codex Accounts</span>' +
            '<div class="codex-auto-title">' + String(accountCount) + ' account' + (accountCount === 1 ? "" : "s") + ' monitored</div>' +
            '<div class="codex-auto-copy">Provider-style account cards show auth readiness, native profile state, source path, and blocking signals at a glance.</div>' +
            '<div class="chip-row" style="margin-top:10px">' +
              '<button class="chip" data-import-codex-account-from-path="true" type="button">Import auth file...</button>' +
              '<button class="chip" data-import-codex-account="true" type="button">Import from Codex</button>' +
            '</div>' +
          '</div>' +
          '<div class="codex-auto-hero-side">' +
            '<span class="codex-auto-status ' + (accountCount > 0 ? "ok" : "muted") + '">' + (accountCount > 0 ? "Available" : "No accounts") + '</span>' +
            '<div class="codex-auto-provider-now">' + esc(currentAccount) + '</div>' +
            '<div class="codex-auto-card-label">Current account</div>' +
            '<div class="codex-auto-meta">' + activeStateText + '</div>' +
          '</div>' +
        '</div>' +
        globalAuthStatusHtml +
        tokenMaintenanceHtml +
        '<div class="codex-auto-accounts-list">' +
          accounts.map(function(name, index) {
            const isCurrent = state.currentIndex === index;
            const isPreferred = preferredAccount === name;
            const isLastSuccessful = lastSuccessfulAccount === name;
            const retryInfo = retryMap[name];
            const details = accountDetails[name] || {};
            const isBackupCandidate = Boolean(details.isBackupCandidate || details.backupCandidate || details.origin === "codex-backup");
            const isRateLimited = Boolean(retryInfo);
            const tokenHealth = normalizeTokenHealthState(details.tokenHealth);
            const isTokenBlocked = isTokenHealthBlocking(tokenHealth);
            const duplicateWarnings = Array.isArray(details.duplicateWarnings) ? details.duplicateWarnings : [];
            const hasRecommendation = isCurrent && activeProfileHasBlockingState && activeSwitchRecommendation;
            const switchRecommendation = hasRecommendation
              ? '<div class="codex-auto-switch-recommendation">Switch recommended: <strong>' + esc(activeSwitchRecommendation) + '</strong></div>'
              : (isCurrent && activeProfileHasBlockingState
                  ? '<div class="codex-auto-switch-recommendation muted">Switch recommendation: no ready alternate account yet</div>'
                  : "");
            const switchAction = hasRecommendation
              ? '<button class="chip primary" data-switch-codex-account="' + esc(activeSwitchRecommendation) + '" type="button">Switch Account</button>'
              : "";

            const badges = [];
            if (isCurrent) badges.push('<span class="codex-auto-badge current">Active</span>');
            if (isPreferred) badges.push('<span class="codex-auto-badge preferred">Preferred</span>');
            if (isLastSuccessful) badges.push('<span class="codex-auto-badge last-ok">Last OK</span>');
            if (isBackupCandidate) badges.push('<span class="codex-auto-badge backup">Backup</span>');
            if (isBackupCandidate && activeProfileName !== name) badges.push('<span class="codex-auto-badge inactive">Not activated</span>');
            if (isRateLimited) badges.push('<span class="codex-auto-badge rate-limited">Rate limited</span>');
            if (isTokenBlocked) badges.push('<span class="codex-auto-badge token-blocked">Token blocked</span>');
            if (duplicateWarnings.length > 0) badges.push('<span class="codex-auto-badge duplicate">Possible Duplicate</span>');
            if (activeProfileName === name) badges.push('<span class="codex-auto-badge active-profile" title="Currently active in ~/.codex/">Currently Active</span>');

            // Account type badge
            const acctType = details.type || "unknown";
            if (acctType === "relay") {
              badges.push('<span class="codex-auto-badge relay" title="Relay/proxy subscription">Relay</span>');
            } else if (acctType === "official") {
              badges.push('<span class="codex-auto-badge official" title="Official Codex OAuth subscription">Official</span>');
            }

            const rateLimitNote = isRateLimited
              ? '<div class="codex-auto-retry-note">Retry status: ' + esc(formatRetryAvailability(retryInfo)) + '</div>'
              : "";
            const tokenHealthLabel = tokenHealth === "unknown" ? "unverified" : tokenHealth.replace("_", " ");
            const tokenHealthLine = tokenHealth
              ? '<div class="codex-auto-retry-note">Token health: ' + esc(tokenHealthLabel) + '</div>'
              : "";
            const sourceAuthPath = details.sourceAuthPath || null;

            const tokenInfoHtml = (acctType === "official" && details.tokenInfo)
              ? (function() {
                  var ti = details.tokenInfo;
                  var statusClass = ti.status === "expired" ? "token-expired" : (ti.status === "expiring_soon" ? "token-warning" : "token-ok");
                  var expiryLabel = ti.status === "expired" ? "Expired" : (ti.daysUntilExpiry + " day" + (ti.daysUntilExpiry === 1 ? "" : "s"));
                  var parts = [];
                  var subscriptionActiveUntil = ti.subscriptionActiveUntil ? String(ti.subscriptionActiveUntil).split("T")[0] : "";
                  if (ti.planType) parts.push('<span class="codex-auto-plan-badge">' + esc(ti.planType) + '</span>');
                  if (subscriptionActiveUntil) parts.push('<span class="codex-auto-sub-date">Sub until ' + esc(subscriptionActiveUntil) + '</span>');
                  parts.push('<span class="codex-auto-expiry">Token: ' + expiryLabel + '</span>');
                  return '<div class="codex-auto-token-info ' + statusClass + '">' + parts.join("") + '</div>';
                })()
              : "";

            const hasDuplicateWarnings = duplicateWarnings.length > 0;
            const statusIndicator = isTokenBlocked
              ? "danger"
              : hasDuplicateWarnings
              ? "warn"
              : (isRateLimited || isTokenBlocked ? "warn" : (isCurrent ? "ok" : "muted"));
            const duplicateWarningsHtml = hasDuplicateWarnings
              ? ('<div class="codex-auto-duplicate-warning">' +
                  duplicateWarnings.map(function (item) { return "<div>" + esc(item) + "</div>"; }).join("") +
`;
