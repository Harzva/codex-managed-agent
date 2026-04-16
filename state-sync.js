const vscode = require("vscode");

const {
  getConfig,
  summarizeServiceState,
  fetchDashboardState,
  fetchThreadDetail,
  probeServer,
  startServer,
} = require("./server");

async function ensureServer(panel, options = {}) {
  const config = getConfig();
  const probe = await probeServer(config.baseUrl);
  if (probe.ok) {
    return summarizeServiceState(true, {
      baseUrl: config.baseUrl,
      autoStarted: false,
      message: "Connected",
    });
  }

  if (!config.autoStartServer && !options.forceStart) {
    return summarizeServiceState(false, {
      baseUrl: config.baseUrl,
      autoStarted: false,
      message: probe.error || "Server not reachable",
    });
  }

  const start = await startServer(panel.extensionUri);
  if (!start.ok) {
    return summarizeServiceState(false, {
      baseUrl: config.baseUrl,
      autoStarted: true,
      message: start.error || "Failed to start server",
      logPath: start.logPath,
    });
  }

  return summarizeServiceState(true, {
    baseUrl: config.baseUrl,
    autoStarted: true,
    message: "Server started",
    logPath: start.logPath,
  });
}

async function openExternal(panel) {
  const config = getConfig();
  const target = await vscode.env.asExternalUri(vscode.Uri.parse(config.baseUrl));
  await vscode.env.openExternal(target);
}

function postMessage(panel, payload) {
  if (panel.panel) panel.panel.webview.postMessage(payload);
  if (panel.sidebarView) panel.sidebarView.webview.postMessage(payload);
  if (panel.bottomView) panel.bottomView.webview.postMessage(payload);
}

function broadcastState(panel, payload) {
  const codexLinkState = panel.getCodexLinkState();
  const enrichedPayload = {
    ...payload,
    codexLinkState,
  };
  panel.lastPayload = enrichedPayload;
  if (panel.panel) {
    panel.panel.webview.postMessage({
      ...enrichedPayload,
      currentSurface: panel.editorSurface,
    });
  }
  if (panel.sidebarView) {
    panel.sidebarView.webview.postMessage({
      ...enrichedPayload,
      currentSurface: "left",
    });
  }
  if (panel.bottomView) {
    panel.bottomView.webview.postMessage({
      ...enrichedPayload,
      currentSurface: "bottom",
    });
  }
}

function broadcastLinkState(panel) {
  if (!panel.hasSurface() || !panel.lastPayload) return;
  broadcastState(panel, panel.lastPayload);
}

function promptQueueConfirmed(entry, thread, effectiveRunningIds, detailThread) {
  if (!entry) return false;
  if (effectiveRunningIds.has(entry.threadId)) return true;
  const queuedAtMs = Date.parse(entry.queuedAt || "");
  if (!Number.isFinite(queuedAtMs)) return false;
  const candidates = [thread, detailThread];
  return candidates.some((item) => {
    if (!item) return false;
    const updatedAtMs = Date.parse(item.updated_at_iso || item.updatedAt || "");
    if (Number.isFinite(updatedAtMs) && updatedAtMs >= queuedAtMs - 1000) {
      return true;
    }
    const previewLogs = Array.isArray(item.preview_logs) ? item.preview_logs : [];
    return previewLogs.some((log) => {
      const logTsMs = Date.parse(log.ts_iso || "");
      return Number.isFinite(logTsMs) && logTsMs >= queuedAtMs - 1000;
    });
  });
}

function reconcileOptimisticQueuedPrompts(panel, dashboard, effectiveRunningIds, detail) {
  const pending = panel.optimisticQueuedPrompts || {};
  const threads = Array.isArray(dashboard?.threads) ? dashboard.threads : [];
  const next = {};
  Object.entries(pending).forEach(([threadId, entry]) => {
    const thread = threads.find((item) => item.id === threadId);
    const detailThread = detail && detail.thread && detail.thread.id === threadId ? detail.thread : undefined;
    if (!promptQueueConfirmed(entry, thread, effectiveRunningIds, detailThread)) {
      next[threadId] = entry;
    }
  });
  panel.optimisticQueuedPrompts = next;
}

async function refresh(panel, options = {}) {
  if (!panel.hasSurface()) return;

  const service = await ensureServer(panel);
  if (!service.ok) {
    broadcastState(panel, {
      type: "state",
      service,
      dashboard: null,
      selectedThreadId: panel.selectedThreadId,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
    if (!options.silent) {
      vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${service.message}`, 2500);
    }
    return;
  }

  try {
    const dashboard = await fetchDashboardState(service.baseUrl);
    const codexLinkState = panel.getCodexLinkState();
    const currentThreads = Array.isArray(dashboard.threads) ? dashboard.threads : [];
    const effectiveRunningThreads = (dashboard.runningThreads || []).filter((thread) =>
      panel.isEffectivelyRunningThread(thread, codexLinkState),
    );
    const nextRunningIds = new Set(effectiveRunningThreads.map((thread) => thread.id));
    const completedEvents = [...panel.previousRunningIds]
      .filter((threadId) => !nextRunningIds.has(threadId))
      .map((threadId) => {
        const thread = currentThreads.find((item) => item.id === threadId) || {};
        return {
          id: `${threadId}:${Date.now()}`,
          threadId,
          title: thread.title || threadId,
          status: thread.status || "completed",
          updatedAt: thread.updated_at_iso || "",
        };
      });
    for (const item of completedEvents) {
      const loopConfig = panel.autoContinueConfigs[item.threadId];
      if (loopConfig && loopConfig.active && loopConfig.remaining > 0) {
        await panel.triggerAutoContinue(item.threadId, loopConfig);
      }
    }
    if (completedEvents.length) {
      panel.recentCompletions = [...completedEvents, ...panel.recentCompletions].slice(0, 8);
      const label = completedEvents.length === 1
        ? completedEvents[0].title
        : `${completedEvents.length} threads`;
      vscode.window.showInformationMessage(`Codex-Managed-Agent: completed ${label}`);
    }
    panel.previousRunningIds = nextRunningIds;
    if (!panel.selectedThreadId && dashboard.threads.length) {
      panel.selectedThreadId = dashboard.threads[0].id;
    }
    const hasSelected = dashboard.threads.some((thread) => thread.id === panel.selectedThreadId);
    if (!hasSelected) {
      panel.selectedThreadId = dashboard.threads[0]?.id;
    }
    const detail = panel.selectedThreadId
      ? await fetchThreadDetail(service.baseUrl, panel.selectedThreadId).catch(() => null)
      : null;
    reconcileOptimisticQueuedPrompts(panel, dashboard, nextRunningIds, detail);
    panel.lastSuccessfulRefreshAt = new Date().toISOString();

    broadcastState(panel, {
      type: "state",
      service,
      dashboard,
      effectiveRunningThreadIds: [...nextRunningIds],
      selectedThreadId: panel.selectedThreadId,
      detail,
      recentCompletions: panel.recentCompletions,
      autoContinueConfigs: panel.enrichAutoContinueConfigs(),
      optimisticQueuedPrompts: panel.optimisticQueuedPrompts,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
    if (!options.silent) {
      vscode.window.setStatusBarMessage("Codex-Managed-Agent ready", 1800);
    }
  } catch (error) {
    broadcastState(panel, {
      type: "state",
      service: summarizeServiceState(false, {
        baseUrl: service.baseUrl,
        autoStarted: service.autoStarted,
        message: error instanceof Error ? error.message : String(error),
        logPath: service.logPath,
      }),
      dashboard: null,
      selectedThreadId: panel.selectedThreadId,
      actionNotice: panel.lastActionNotice,
      lastSuccessfulRefreshAt: panel.lastSuccessfulRefreshAt,
    });
  }
}

module.exports = {
  ensureServer,
  openExternal,
  postMessage,
  broadcastState,
  broadcastLinkState,
  refresh,
};
