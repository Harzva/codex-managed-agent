function getUiPersistenceScript() {
  return `      function persistUi() {
        const nextState = {
          uiStateVersion: UI_STATE_VERSION,
          seenCompletionIds: state.seenCompletionIds,
          currentView: state.ui.currentView,
          overviewSubView: state.ui.overviewSubView,
          boardSubView: state.ui.boardSubView,
          headerMode: state.ui.headerMode,
          panelLanguage: state.ui.panelLanguage,
          colorTheme: state.ui.colorTheme,
          manualColorTheme: state.ui.manualColorTheme,
          themeMode: state.ui.themeMode,
          usageRange: state.ui.usageRange,
          usageCustomStart: state.ui.usageCustomStart,
          usageCustomEnd: state.ui.usageCustomEnd,
          traceMode: state.ui.traceMode,
          traceSearch: state.ui.traceSearch,
          traceViewTab: state.ui.traceViewTab,
          traceEventFilter: state.ui.traceEventFilter,
          traceSelectedItemId: state.ui.traceSelectedItemId,
          skillSearch: state.ui.skillSearch,
          search: state.ui.search,
          topicFocus: state.ui.topicFocus,
          rootFilter: state.ui.rootFilter,
          workspaceFilter: state.ui.workspaceFilter,
          gitFilter: state.ui.gitFilter,
          modelFilter: state.ui.modelFilter,
          threadTabFilter: state.ui.threadTabFilter,
          filter: state.ui.filter,
          sort: state.ui.sort,
          pinnedOnly: state.ui.pinnedOnly,
          cardLabels: state.ui.cardLabels,
          boardTabAssignments: state.ui.boardTabAssignments,
          boardTabOrder: state.ui.boardTabOrder,
          activeBoardTab: state.ui.activeBoardTab,
          soundEnabled: state.ui.soundEnabled,
          soundStyle: state.ui.soundStyle,
          motionMode: state.ui.motionMode,
          motionEnabled: state.ui.motionMode === "full",
          pinned: state.ui.pinned,
          boardAttached: state.ui.boardAttached,
          runningCardSizes: state.ui.runningCardSizes,
          runningCardLayout: state.ui.runningCardLayout,
          runningCardPositions: state.ui.runningCardPositions,
          runningCardOrder: state.ui.runningCardOrder,
          layoutLocked: state.ui.layoutLocked,
          interventionCollapsed: state.ui.interventionCollapsed,
          selected: state.ui.selected,
          drawerOpen: state.ui.drawerOpen,
          teamWorkspacePageId: state.ui.teamWorkspacePageId,
          teamTaskPageId: state.ui.teamTaskPageId,
          brandFontIndex: state.ui.brandFontIndex,
          rightPaneTab: state.ui.rightPaneTab,
          groups: state.ui.groups,
          lastInsightsSnapshot: state.lastInsightsSnapshot,
          lastInsightsSource: state.lastInsightsSource,
          lastInsightsCapturedAt: state.lastInsightsCapturedAt
        };
        vscode.setState(nextState);
        vscode.postMessage({ type: "persistUiState", state: nextState });
      }

      function saveLayoutNow() {
        persistUi();
        setNodeText("saveLayoutStatus", "Saved " + formatTimestamp(new Date().toISOString()));
      }
`;
}

module.exports = {
  getUiPersistenceScript,
};
