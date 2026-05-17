const vscode = require("vscode");
const { createWebviewMedia } = require("./webview/media");
const { renderWorkspaceShell } = require("./webview/panes");
const { getWebviewStyles } = require("./webview/styles");
const { getBootProgressScript } = require("./webview/boot-progress");
const { getDisplayStateScript } = require("./webview/display-state");
const { getActionRenderersScript } = require("./webview/actions");
const { getThreadExplorerRenderersScript } = require("./webview/thread-explorer");
const { getInsightsRuntimeScript } = require("./webview/insights-runtime");
const { getInsightsTopicMapScript } = require("./webview/insights-topic-map");
const { getDrawerLeafRenderersScript } = require("./webview/drawer-runtime");
const { getThreadInsightPanelScript } = require("./webview/thread-insight-panel");
const { getHtmlUtilityScript } = require("./webview/html-utils");
const { getLocalizationScript } = require("./webview/localization");
const { getUiPersistenceScript } = require("./webview/ui-persistence");
const { getOverviewRenderersScript } = require("./webview/overview-renderers");
const { getInsightsPanelsScript } = require("./webview/insights-panels");
const { getThreadRuntimeScript } = require("./webview/thread-runtime");
const { getBoardDetailRuntimeScript } = require("./webview/board-detail-runtime");
const { getTeamRuntimeScript } = require("./webview/team-runtime");
const { getRenderRuntimeScript } = require("./webview/render-runtime");
const { getChromeRuntimeScript } = require("./webview/chrome-runtime");
const { getSkillsMemoryRuntimeScript } = require("./webview/skills-memory-runtime");
const {
  UI_STATE_VERSION,
  COLOR_THEME_ORDER,
  COLOR_THEME_LABELS,
  VISUAL_THEME_ORDER,
  VISUAL_THEME_LABELS,
  MOTION_MODE_ORDER,
  MOTION_MODE_LABELS,
  THREAD_SORT_LABELS,
  THREAD_SORT_KEYS,
  THREAD_FILTER_LABELS,
} = require("./webview/display");

function getWebviewHtml(webview, extensionUri, initialPersistedState = {}) {
  const nonce = String(Date.now());
  const media = createWebviewMedia(vscode, webview, extensionUri);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Codex-Managed-Agent</title>
    <style>${getWebviewStyles()}</style>
  </head>
  <body>
    ${renderWorkspaceShell(media)}
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      let bootRetryTimer;
      let bootProgressTimer;
      let bootRetryCount = 0;
      const bootStartedAt = Date.now();
      const MEDIA = ${JSON.stringify(media)};
      const UI_STATE_VERSION = ${JSON.stringify(UI_STATE_VERSION)};
      const COLOR_THEME_ORDER = ${JSON.stringify(COLOR_THEME_ORDER)};
      const COLOR_THEME_LABELS = ${JSON.stringify(COLOR_THEME_LABELS)};
      const VISUAL_THEME_ORDER = ${JSON.stringify(VISUAL_THEME_ORDER)};
      const VISUAL_THEME_LABELS = ${JSON.stringify(VISUAL_THEME_LABELS)};
      const MOTION_MODE_ORDER = ${JSON.stringify(MOTION_MODE_ORDER)};
      const MOTION_MODE_LABELS = ${JSON.stringify(MOTION_MODE_LABELS)};
      const THREAD_SORT_LABELS = ${JSON.stringify(THREAD_SORT_LABELS)};
      const THREAD_SORT_KEYS = ${JSON.stringify(THREAD_SORT_KEYS)};
      const THREAD_FILTER_LABELS = ${JSON.stringify(THREAD_FILTER_LABELS)};
      const persisted = Object.assign({}, vscode.getState() || {}, ${JSON.stringify(initialPersistedState)});
      if (Number(persisted.uiStateVersion || 0) < UI_STATE_VERSION) {
        persisted.sort = "project";
        if (!persisted.colorTheme || persisted.colorTheme === "dark" || persisted.colorTheme === "light") {
          persisted.colorTheme = "system";
        }
        persisted.uiStateVersion = UI_STATE_VERSION;
      }
      const persistedView = ["skills", "memory", "trace"].includes(persisted.currentView) ? "overview" : (persisted.currentView || "overview");
      const persistedOverviewSubView = ["dashboard", "config", "skills", "memory", "sidecar", "provider", "network", "accounts", "watch"].includes(persisted.overviewSubView)
        ? persisted.overviewSubView
        : (persisted.currentView === "skills" || persisted.currentView === "memory" ? persisted.currentView : "dashboard");
      const state = {
        selectedThreadId: undefined,
        payload: undefined,
        currentSurface: "editor",
        debugStatus: "booting",
        serviceMetadata: undefined,
        serviceCapabilityGuard: undefined,
        bridgeBoundAt: undefined,
        stateReceivedAt: undefined,
        lastClashAutoRefreshAt: 0,
        lastAutoScrolledFocusedThreadId: undefined,
        pendingScrollThreadId: undefined,
        draggedRunningThreadId: undefined,
        activeBoardId: undefined,
        dragPreviewEl: undefined,
        boardDragGhostEl: undefined,
        pointerBoardDrag: undefined,
        pendingBoardDragPointer: undefined,
        resizingRunningCard: undefined,
        runningDropIndicator: undefined,
        pendingDragIndicator: undefined,
        pendingDragPointer: undefined,
        dragMetricCache: undefined,
        lastDropOverlayKey: "",
        boardDragRaf: 0,
        dragRaf: 0,
        resizeRaf: 0,
        pendingResizeEvent: undefined,
        lastInterventionCount: 0,
        lastInsightsSnapshot: persisted.lastInsightsSnapshot || undefined,
        lastInsightsSource: persisted.lastInsightsSource || "live",
        lastInsightsCapturedAt: persisted.lastInsightsCapturedAt || undefined,
        seenCompletionIds: persisted.seenCompletionIds || {},
        pendingRemovals: {},
        ui: {
          currentView: persistedView,
          overviewSubView: persistedOverviewSubView,
          boardSubView: persisted.boardSubView === "canvas" ? "status" : (persisted.boardSubView || "status"),
          headerMode: persisted.headerMode || (persisted.headerCollapsed ? "collapsed" : "expanded"),
          panelLanguage: ["en", "zh"].includes(persisted.panelLanguage) ? persisted.panelLanguage : "en",
          colorTheme: COLOR_THEME_ORDER.includes(persisted.colorTheme) ? persisted.colorTheme : "system",
          manualColorTheme: COLOR_THEME_ORDER.includes(persisted.manualColorTheme) && persisted.manualColorTheme !== "system" ? persisted.manualColorTheme : "light",
          themeMode: VISUAL_THEME_ORDER.includes(persisted.themeMode) ? persisted.themeMode : "vivid",
          usageRange: ["all", "24h", "7d", "30d", "90d", "custom"].includes(persisted.usageRange) ? persisted.usageRange : "all",
          usageCustomStart: String(persisted.usageCustomStart || ""),
          usageCustomEnd: String(persisted.usageCustomEnd || ""),
          traceMode: ["current", "explorer", "session"].includes(persisted.traceMode) ? persisted.traceMode : "current",
          traceSearch: String(persisted.traceSearch || ""),
          traceViewTab: ["summary", "timeline", "raw"].includes(persisted.traceViewTab) ? persisted.traceViewTab : "summary",
          traceEventFilter: ["all", "commands", "checks", "errors", "messages"].includes(persisted.traceEventFilter) ? persisted.traceEventFilter : "all",
          traceSelectedItemId: String(persisted.traceSelectedItemId || ""),
          skillSearch: String(persisted.skillSearch || ""),
          search: persisted.search || "",
          topicFocus: persisted.topicFocus || null,
          rootFilter: persisted.rootFilter || null,
          workspaceFilter: Boolean(persisted.workspaceFilter),
          gitFilter: ["all", "repo", "no_git"].includes(persisted.gitFilter) ? persisted.gitFilter : "all",
          gitFilterMenuOpen: false,
          rootFilterSearch: "",
          modelFilter: String(persisted.modelFilter || "").trim(),
          threadTabFilter: normalizeBoardTabName(persisted.threadTabFilter) || "all",
          filter: persisted.filter || "all",
          sort: THREAD_SORT_KEYS.includes(persisted.sort) ? persisted.sort : "project",
          pinnedOnly: Boolean(persisted.pinnedOnly),
          cardLabels: persisted.cardLabels || {},
          boardTabAssignments: persisted.boardTabAssignments || {},
          boardTabOrder: Array.isArray(persisted.boardTabOrder) ? persisted.boardTabOrder : [],
          activeBoardTab: persisted.activeBoardTab || "all",
          soundEnabled: persisted.soundEnabled !== false,
          soundStyle: persisted.soundStyle || "plink",
          motionMode: MOTION_MODE_ORDER.includes(persisted.motionMode) ? persisted.motionMode : (persisted.motionEnabled === true ? "full" : "quiet"),
          motionEnabled: persisted.motionEnabled === true,
          pinned: persisted.pinned || {},
          boardAttached: persisted.boardAttached || {},
          runningCardSizes: persisted.runningCardSizes || {},
          runningCardLayout: persisted.runningCardLayout || {},
          runningCardPositions: persisted.runningCardPositions || {},
          runningCardOrder: Array.isArray(persisted.runningCardOrder) ? persisted.runningCardOrder : [],
          layoutLocked: Boolean(persisted.layoutLocked),
          interventionCollapsed: Boolean(persisted.interventionCollapsed),
          selected: persisted.selected || {},
          pendingBatch: undefined,
          rootFilterMenuOpen: false,
          threadTabFilterMenuOpen: false,
          pendingDrawerAction: undefined,
          optimisticDrawerThread: undefined,
          teamTaskDrawerId: undefined,
          teamTaskPageId: persisted.teamTaskPageId || undefined,
          teamWorkspacePageId: persisted.teamWorkspacePageId || undefined,
          teamOrchestrationDraft: undefined,
          teamOrchestrationStep: undefined,
          teamLaneScroll: {},
          pendingCodexLink: {},
          commandFeedback: {},
          rightPaneTab: persisted.rightPaneTab || "console",
          drawerOpen: persisted.drawerOpen !== false,
          brandFontIndex: Number.isFinite(Number(persisted.brandFontIndex)) ? Math.max(0, Number(persisted.brandFontIndex) % 4) : 0,
          optimisticAutoContinueConfigs: {},
          groups: Object.assign({
            pinned: true,
            running: true,
            needs_human: true,
            stopped: false,
            linked: true,
            recent: true,
            idle: false,
            archived: false,
            soft_deleted: false
          }, persisted.groups || {}),
          loopPanelThreadId: undefined,
          loopDraftPrompt: "continue",
          loopDraftCount: "10",
          quickComposerThreadId: undefined,
          quickComposerDrafts: {},
          pendingPromptState: {},
          pendingLoopActions: {}
        }
      };
${getDisplayStateScript()}

      document.body.classList.add("color-theme-" + colorThemeKey(), "theme-mode-" + themeMode());

      function syncHtmlBackground() {
        const theme = colorThemeKey();
        const bodyHasDark = document.body.classList.contains("vscode-dark") || document.body.classList.contains("vscode-high-contrast");
        const isDark = theme === "dark" || (theme === "system" && bodyHasDark);
        const lightBackgrounds = {
          "light": "#f6f7f9",
          "light-warm": "#f6f7f5",
          "light-mint": "#f3fbf8",
          "system": "var(--vscode-editor-background, #f7f9fc)",
        };
        document.documentElement.style.backgroundColor = isDark ? "#000000" : (lightBackgrounds[theme] || "#f7f9fc");
      }
      syncHtmlBackground();
      if (typeof MutationObserver !== "undefined") {
        new MutationObserver(syncHtmlBackground).observe(document.body, { attributes: true, attributeFilter: ["class"] });
      }

${getLocalizationScript()}
${getUiPersistenceScript()}
${getBootProgressScript()}

${getOverviewRenderersScript()}
      ${getInsightsRuntimeScript()}

${getInsightsPanelsScript()}
      ${getInsightsTopicMapScript()}



${getThreadRuntimeScript()}
${getThreadExplorerRenderersScript()}

${getBoardDetailRuntimeScript()}
      ${getDrawerLeafRenderersScript()}

${getTeamRuntimeScript()}
${getHtmlUtilityScript()}

${getActionRenderersScript()}

      ${getThreadInsightPanelScript()}

${getRenderRuntimeScript()}
${getChromeRuntimeScript()}
${getSkillsMemoryRuntimeScript()}
    </script>
  </body>
</html>`;
}

module.exports = {
  getWebviewHtml,
};
