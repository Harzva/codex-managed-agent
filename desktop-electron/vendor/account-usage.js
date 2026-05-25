function createAccountUsage(deps = {}) {
  const {
    CODEX_DEFAULT_USAGE_BASE_URL,
    usageLedger,
    httpsGetJson,
    readAccountBaseUrl,
    readAccountUsageUrl,
    getTokenInfo,
    shouldRefreshToken,
    refreshAccountToken,
    readAccountAuth,
    codexAccountIdFromAuth,
    decodeJwtPayload,
    getAccountTypeFromAuth,
    loadAccountsState,
    writeMeta,
  } = deps;

  function appendUsagePath(baseUrl, usagePath) {
    const base = String(baseUrl || "").trim();
    if (!base) return "";
    if (/^https?:\/\//i.test(usagePath || "")) return usagePath;
    const normalizedBase = base.endsWith("/") ? base : base + "/";
    const normalizedPath = String(usagePath || "").replace(/^\/+/, "");
    return normalizedBase + normalizedPath;
  }

  function codexUsageUrlForAccount(name) {
    const configuredBase = readAccountBaseUrl(name);
    const baseUrl = configuredBase && /^https?:\/\//i.test(configuredBase)
      ? configuredBase
      : CODEX_DEFAULT_USAGE_BASE_URL;
    const pathPart = String(baseUrl).includes("/backend-api") ? "wham/usage" : "api/codex/usage";
    return appendUsagePath(baseUrl, pathPart);
  }

  function isoFromResetValue(value) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return new Date(value * 1000).toISOString();
    }
    if (typeof value === "string" && value.trim()) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) return new Date(numeric * 1000).toISOString();
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
    }
    return "";
  }

  function compactResetLabel(resetAt) {
    const parsed = Date.parse(resetAt || "");
    if (!Number.isFinite(parsed)) return "";
    const remaining = Math.max(0, Math.round((parsed - Date.now()) / 1000));
    if (remaining <= 0) return "soon";
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    if (days > 0) return String(days) + "d " + String(hours) + "h";
    if (hours > 0) return String(hours) + "h " + String(minutes) + "m";
    return String(Math.max(1, minutes)) + "m";
  }

  function normalizePercentWindow(label, window) {
    if (!window || typeof window !== "object") return null;
    const usedRaw = window.used_percent ?? window.usedPercent;
    const remainingRaw = window.remaining_percent ?? window.remainingPercent ?? window.percent ?? window.percentage;
    let remainingPercent = Number.isFinite(Number(remainingRaw)) ? Number(remainingRaw) : null;
    if (remainingPercent === null && Number.isFinite(Number(usedRaw))) {
      remainingPercent = 100 - Number(usedRaw);
    }
    if (remainingPercent === null) return null;
    remainingPercent = Math.max(0, Math.min(100, remainingPercent <= 1 ? remainingPercent * 100 : remainingPercent));
    const resetAt = isoFromResetValue(window.reset_at ?? window.resetAt ?? window.available_at ?? window.availableAt);
    return {
      label,
      remainingPercent,
      resetAt: resetAt || null,
      resetLabel: resetAt ? compactResetLabel(resetAt) : (window.resetLabel || window.reset_label || ""),
      source: "codex-wham",
    };
  }

  function normalizeCodexUsageResponse(json) {
    const rateLimit = json && typeof json === "object" && json.rate_limit && typeof json.rate_limit === "object" ? json.rate_limit : {};
    const codeReviewLimit = json && typeof json === "object" && json.code_review_rate_limit && typeof json.code_review_rate_limit === "object"
      ? json.code_review_rate_limit
      : {};
    return [
      normalizePercentWindow("5h", rateLimit.primary_window),
      normalizePercentWindow("Weekly", rateLimit.secondary_window),
      normalizePercentWindow("Code Review", codeReviewLimit.primary_window),
    ].filter(Boolean);
  }

  function extractUsageAccountInfo(json, auth) {
    const info = {};
    const authClaim = auth && auth.tokens && auth.tokens.id_token
      ? decodeJwtPayload(auth.tokens.id_token)?.["https://api.openai.com/auth"]
      : null;
    const email = firstNonEmpty(
      json && json.email,
      json && json.account_email,
      json && json.account && json.account.email,
      auth && auth.email,
      authClaim && authClaim.email,
    );
    const accountId = firstNonEmpty(
      json && json.account_id,
      json && json.accountId,
      json && json.account && (json.account.id || json.account.account_id),
      codexAccountIdFromAuth(auth),
    );
    const planType = firstNonEmpty(
      json && json.plan_type,
      json && json.planType,
      json && json.account && (json.account.plan_type || json.account.planType),
      authClaim && authClaim.chatgpt_plan_type,
    );
    const orgId = firstNonEmpty(
      json && json.organization_id,
      json && json.organizationId,
      json && json.account && (json.account.organization_id || json.account.organizationId),
    );
    if (email) info.email = email;
    if (accountId) info.accountId = accountId;
    if (planType) info.planType = planType;
    if (orgId) info.organizationId = orgId;
    return info;
  }

  function firstNonEmpty() {
    for (var i = 0; i < arguments.length; i += 1) {
      const value = arguments[i];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    return null;
  }

  function normalizeProviderSpecificUsageResponse(json) {
    if (!json || typeof json !== "object") return [];
    if (Array.isArray(json.rateLimits)) return json.rateLimits.filter(Boolean);
    if (Array.isArray(json.rate_limits)) return json.rate_limits.filter(Boolean);
    if (Array.isArray(json.quota_windows)) return json.quota_windows.filter(Boolean);
    const codexWindows = normalizeCodexUsageResponse(json);
    if (codexWindows.length) return codexWindows;
    const usage = json.usage && typeof json.usage === "object" ? json.usage : json;
    const totalTokens = Number(usage.total_tokens || usage.totalTokens || usage.tokens || 0);
    if (Number.isFinite(totalTokens) && totalTokens > 0) {
      return [{
        label: "Provider Usage",
        remainingLabel: compactTokenCount(totalTokens) + " tokens",
        resetLabel: json.updated_at || json.updatedAt || "",
        source: "provider-usage-api",
      }];
    }
    return [];
  }

  function compactTokenCount(value) {
    const count = Math.max(0, Number(value || 0));
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1) + "M";
    if (count >= 1_000) return (count / 1_000).toFixed(count >= 10_000 ? 0 : 1) + "K";
    return String(Math.round(count));
  }

  function localLedgerUsageBuckets() {
    const report = usageLedger && typeof usageLedger.rebuildPersistedUsageReport === "function"
      ? usageLedger.rebuildPersistedUsageReport()
      : null;
    const summary = report && report.summary ? report.summary : {};
    const recentTokenDays = report && report.activity && Array.isArray(report.activity.recent_token_days)
      ? report.activity.recent_token_days
      : [];
    const now = Date.now();
    const tokensInWindow = function(windowMs) {
      return recentTokenDays.reduce((sum, day) => {
        const parsed = Date.parse(String(day.day || ""));
        if (!Number.isFinite(parsed) || now - parsed > windowMs) return sum;
        return sum + Number(day.total_tokens || 0);
      }, 0);
    };
    const buckets = [];
    const tokens24h = Number(summary.tokens24h || summary.tokens_24h || 0) || tokensInWindow(24 * 60 * 60 * 1000);
    const tokens7d = Number(summary.tokens7d || summary.tokens_7d || 0) || tokensInWindow(7 * 24 * 60 * 60 * 1000);
    const totalTokens = Number(summary.total_tokens || summary.totalTokens || 0);
    if (tokens24h > 0) buckets.push({ label: "Local 24h", remainingLabel: compactTokenCount(tokens24h) + " tokens", source: "local-proxy-ledger" });
    if (tokens7d > 0) buckets.push({ label: "Local 7d", remainingLabel: compactTokenCount(tokens7d) + " tokens", source: "local-proxy-ledger" });
    if (totalTokens > 0) buckets.push({ label: "Local Total", remainingLabel: compactTokenCount(totalTokens) + " tokens", source: "local-proxy-ledger" });
    return buckets;
  }

  async function fetchOfficialCodexAccountUsage(name, auth) {
    let workingAuth = auth;
    const tokenInfo = getTokenInfo(workingAuth);
    if (tokenInfo && tokenInfo.hasRefreshToken && shouldRefreshToken(tokenInfo)) {
      const refreshResult = await refreshAccountToken(name);
      if (!refreshResult.ok && !refreshResult.skipped) {
        return { ok: false, status: "refresh_failed", error: refreshResult.error || "Failed to refresh token before usage fetch." };
      }
      workingAuth = readAccountAuth(name) || workingAuth;
    }
    const accessToken = workingAuth && workingAuth.tokens && workingAuth.tokens.access_token;
    if (!accessToken) return { ok: false, status: "no_access_token", error: "Official Codex account has no access_token." };
    const headers = {
      Authorization: "Bearer " + accessToken,
      Accept: "application/json",
      "User-Agent": "Codex-Managed-Agent",
    };
    const accountId = codexAccountIdFromAuth(workingAuth);
    if (accountId) headers["ChatGPT-Account-Id"] = accountId;
    const usageUrl = codexUsageUrlForAccount(name);
    let json;
    try {
      json = await httpsGetJson(usageUrl, 15000, headers);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/HTTP\s+(401|403)\b/.test(message) && workingAuth.tokens && workingAuth.tokens.refresh_token) {
        const refreshResult = await refreshAccountToken(name, { force: true });
        if (refreshResult.ok) {
          workingAuth = readAccountAuth(name) || workingAuth;
          headers.Authorization = "Bearer " + (workingAuth.tokens && workingAuth.tokens.access_token || accessToken);
          json = await httpsGetJson(usageUrl, 15000, headers);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
    const rateLimits = normalizeCodexUsageResponse(json);
    if (!rateLimits.length) {
      return { ok: false, status: "empty_usage", error: "Codex usage API returned no quota windows.", raw: json };
    }
    return {
      ok: true,
      status: "ok",
      source: "codex-wham",
      usageUrl,
      rateLimits,
      accountInfo: extractUsageAccountInfo(json, workingAuth),
      raw: json,
    };
  }

  async function fetchRelayAccountUsage(name, auth) {
    const apiKey = auth && typeof auth.OPENAI_API_KEY === "string" ? auth.OPENAI_API_KEY.trim() : "";
    const usageUrl = readAccountUsageUrl(name);
    if (usageUrl && /^https?:\/\//i.test(usageUrl)) {
      const json = await httpsGetJson(usageUrl, 15000, apiKey ? { Authorization: "Bearer " + apiKey, Accept: "application/json" } : { Accept: "application/json" });
      const rateLimits = normalizeProviderSpecificUsageResponse(json);
      if (rateLimits.length) {
        return {
          ok: true,
          status: "ok",
          source: "provider-usage-api",
          usageUrl,
          rateLimits,
          accountInfo: extractUsageAccountInfo(json, auth),
          raw: json,
        };
      }
    }
    const localBuckets = localLedgerUsageBuckets();
    return {
      ok: true,
      status: localBuckets.length ? "local_ledger" : "no_usage_source",
      source: "local-proxy-ledger",
      rateLimits: localBuckets,
      accountInfo: extractUsageAccountInfo({}, auth),
      note: localBuckets.length
        ? "Relay usage is sourced from the local CMA usage ledger."
        : "No relay usage_url is configured and the local usage ledger has no token events yet.",
    };
  }

  async function fetchAccountUsage(name) {
    const state = loadAccountsState();
    if (!state.accounts.includes(name)) return { ok: false, status: "not_found", error: 'Account "' + name + '" not found.' };
    const auth = readAccountAuth(name);
    if (!auth) return { ok: false, status: "no_auth", error: 'No auth.json for account "' + name + '".' };
    const accountType = getAccountTypeFromAuth(auth);
    try {
      const result = accountType === "official"
        ? await fetchOfficialCodexAccountUsage(name, auth)
        : await fetchRelayAccountUsage(name, auth);
      if (result.ok) {
        writeMeta(name, {
          rateLimits: result.rateLimits || [],
          rateLimitUpdatedAt: new Date().toISOString(),
          rateLimitSource: result.source || accountType,
          rateLimitStatus: result.status || "ok",
          usageAccountInfo: result.accountInfo || null,
          usageAccountInfoUpdatedAt: new Date().toISOString(),
          lastUsageFetchError: null,
        });
      } else {
        writeMeta(name, {
          rateLimitStatus: result.status || "error",
          lastUsageFetchError: result.error || "Usage fetch failed.",
        });
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        writeMeta(name, {
          rateLimitStatus: "error",
          lastUsageFetchError: message,
        });
      } catch {}
      return { ok: false, status: "error", error: message };
    }
  }

  return {
    fetchAccountUsage,
  };
}

module.exports = {
  createAccountUsage,
};
