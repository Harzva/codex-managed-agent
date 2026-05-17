function createLifecycleBoardTabs(deps = {}) {
  const { vscode } = deps;

  function getPersistedUiState(panel) {
    return Object.assign({}, panel.storage.get("codexAgent.persistedUiState", {}));
  }

  async function savePersistedUiState(panel, nextState) {
    await panel.storage.update("codexAgent.persistedUiState", nextState || {});
  }

  function nextSuggestedCardLabel(panel) {
    const persisted = getPersistedUiState(panel);
    const labels = Object.values((persisted && persisted.cardLabels) || {}).map((value) => String(value || "").trim());
    const used = new Set();
    labels.forEach((value) => {
      const match = value.match(/^card\s+(\d+)$/i);
      if (match) used.add(Number(match[1]));
    });
    let next = 1;
    while (used.has(next)) next += 1;
    return `Card ${next}`;
  }

  function normalizeBoardTabName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 36);
  }

  function normalizeBoardTabOrder(list = []) {
    return list
      .map(normalizeBoardTabName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);
  }

  function combinedBoardTabOrder(persistedState = {}, boardTabOrder = []) {
    return normalizeBoardTabOrder([
      ...(Array.isArray(persistedState.boardTabOrder) ? persistedState.boardTabOrder : []),
      ...boardTabOrder,
    ]);
  }

  async function editCardLabel(panel, threadId, currentLabel = "", currentTitle = "", suggestedLabel = "") {
    const nextThreadId = String(threadId || "").trim();
    if (!nextThreadId) return;
    const fallback = String(suggestedLabel || "").trim() || nextSuggestedCardLabel(panel);
    const value = String(currentLabel || "").trim() || fallback;
    const nextLabel = await vscode.window.showInputBox({
      title: "Set Card Name",
      prompt: "This is the card-local display name used inside Codex-Managed-Agent",
      value,
      ignoreFocusOut: true,
      validateInput: (input) => String(input || "").trim() ? undefined : "Card Name cannot be empty",
    });
    if (nextLabel === undefined) return;
    const trimmed = String(nextLabel || "").trim() || fallback;
    const persisted = getPersistedUiState(panel);
    const nextState = Object.assign({}, persisted, {
      cardLabels: Object.assign({}, persisted.cardLabels || {}, {
        [nextThreadId]: trimmed,
      }),
    });
    await savePersistedUiState(panel, nextState);
    panel.postMessage({
      type: "cardLabelPatched",
      threadId: nextThreadId,
      label: trimmed,
    });
    panel.lastActionNotice = `Card Name set to ${trimmed}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  }

  async function setCardLabel(panel, threadId, label = "") {
    const nextThreadId = String(threadId || "").trim();
    if (!nextThreadId) return;
    const trimmed = String(label || "").trim();
    const persisted = getPersistedUiState(panel);
    const cardLabels = Object.assign({}, persisted.cardLabels || {});
    if (trimmed) {
      cardLabels[nextThreadId] = trimmed;
    } else {
      delete cardLabels[nextThreadId];
    }
    const nextState = Object.assign({}, persisted, { cardLabels });
    await savePersistedUiState(panel, nextState);
    panel.postMessage({
      type: "cardLabelPatched",
      threadId: nextThreadId,
      label: trimmed,
    });
    panel.lastActionNotice = trimmed ? `Card Name set to ${trimmed}` : "Card Name cleared";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 1800);
  }

  async function chooseBoardTab(panel, threadId, currentBoardTab = "", boardTabOrder = [], activeBoardTab = "all") {
    const nextThreadId = String(threadId || "").trim();
    if (!nextThreadId) return;
    const current = normalizeBoardTabName(currentBoardTab);
    const persisted = getPersistedUiState(panel);
    const order = combinedBoardTabOrder(persisted, boardTabOrder);
    const picks = [];
    if (order.length) {
      picks.push(...order.map((name) => ({
        label: name,
        description: current === name ? "Current tab" : "",
        action: "select",
        value: name,
      })));
    }
    picks.push({
      label: "+ New Tab",
      description: "Create a new group and assign this card to it",
      action: "new",
    });
    if (current) {
      picks.push({
        label: "Remove from Tab",
        description: "Keep the card on Board but clear its tab group",
        action: "clear",
      });
    }
    const picked = await vscode.window.showQuickPick(picks, {
      title: "Choose Tab Group",
      placeHolder: current || "Select a tab for this card",
      ignoreFocusOut: true,
    });
    if (!picked) return;
    let nextTab = "";
    let nextOrder = [...order];
    let nextActiveBoardTab = normalizeBoardTabName(activeBoardTab) || normalizeBoardTabName(persisted.activeBoardTab) || "all";
    if (picked.action === "new") {
      const created = await vscode.window.showInputBox({
        title: "Create Tab Group",
        prompt: "Tab is the manual group used on the Board",
        value: "",
        ignoreFocusOut: true,
        validateInput: (input) => {
          const normalized = normalizeBoardTabName(input);
          if (!normalized) return "Tab name cannot be empty";
          if (normalized.toLowerCase() === "all") return "\"all\" is reserved";
          return undefined;
        },
      });
      if (created === undefined) return;
      nextTab = normalizeBoardTabName(created);
      if (!nextTab) {
        vscode.window.showWarningMessage("Codex-Managed-Agent: Tab name cannot be empty");
        return;
      }
      if (nextTab.toLowerCase() === "all") {
        vscode.window.showWarningMessage("Codex-Managed-Agent: \"all\" is reserved and cannot be used as a tab name");
        return;
      }
      if (nextOrder.includes(nextTab)) {
        nextActiveBoardTab = nextTab;
        vscode.window.showInformationMessage(`Codex-Managed-Agent: Switched to existing tab ${nextTab}`);
      } else {
        nextOrder = normalizeBoardTabOrder([...nextOrder, nextTab]);
        nextActiveBoardTab = nextTab;
      }
    } else if (picked.action === "clear") {
      nextTab = "";
    } else {
      nextTab = normalizeBoardTabName(picked.value || picked.label || "");
    }
    const nextAssignments = Object.assign({}, persisted.boardTabAssignments || {});
    if (nextTab) nextAssignments[nextThreadId] = nextTab;
    else delete nextAssignments[nextThreadId];
    const nextAttached = Object.assign({}, persisted.boardAttached || {});
    if (nextTab) nextAttached[nextThreadId] = true;
    const nextState = Object.assign({}, persisted, {
      boardTabAssignments: nextAssignments,
      boardTabOrder: nextOrder,
      boardAttached: nextAttached,
      activeBoardTab: nextActiveBoardTab,
    });
    await savePersistedUiState(panel, nextState);
    panel.postMessage({
      type: "boardTabPatched",
      threadId: nextThreadId,
      boardTab: nextTab,
      boardTabOrder: nextOrder,
      activeBoardTab: nextState.activeBoardTab,
    });
    panel.lastActionNotice = nextTab ? `Moved card into tab ${nextTab}` : "Cleared card tab";
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  }

  async function createBoardTab(panel, boardTabOrder = [], activeBoardTab = "all") {
    const created = await vscode.window.showInputBox({
      title: "Create Tab Group",
      prompt: "Create a new manual Board group",
      value: "",
      ignoreFocusOut: true,
      validateInput: (input) => {
        const normalized = normalizeBoardTabName(input);
        if (!normalized) return "Tab name cannot be empty";
        if (normalized.toLowerCase() === "all") return "\"all\" is reserved";
        return undefined;
      },
    });
    if (created === undefined) return;
    const nextTab = normalizeBoardTabName(created);
    const persisted = getPersistedUiState(panel);
    const baseOrder = combinedBoardTabOrder(persisted, boardTabOrder);
    if (!nextTab) {
      vscode.window.showWarningMessage("Codex-Managed-Agent: Tab name cannot be empty");
      return;
    }
    if (nextTab.toLowerCase() === "all") {
      vscode.window.showWarningMessage("Codex-Managed-Agent: \"all\" is reserved and cannot be used as a tab name");
      return;
    }
    const exists = baseOrder.includes(nextTab);
    const nextOrder = exists ? baseOrder : normalizeBoardTabOrder([...baseOrder, nextTab]);
    const nextState = Object.assign({}, persisted, {
      boardTabOrder: nextOrder,
      activeBoardTab: nextTab || normalizeBoardTabName(activeBoardTab) || "all",
    });
    await savePersistedUiState(panel, nextState);
    panel.postMessage({
      type: "boardTabPatched",
      threadId: "",
      boardTab: "",
      boardTabOrder: nextOrder,
      activeBoardTab: nextState.activeBoardTab,
    });
    if (exists) {
      vscode.window.showInformationMessage(`Codex-Managed-Agent: Switched to existing tab ${nextTab}`);
    } else {
      vscode.window.showInformationMessage(`Codex-Managed-Agent: Created tab ${nextTab}`);
    }
    panel.lastActionNotice = exists ? `Switched to existing tab ${nextTab}` : `Created tab ${nextTab}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2200);
  }

  async function batchSetBoardTab(panel, threadIds = [], activeBoardTab = "all", boardTabOrder = []) {
    const ids = Array.isArray(threadIds) ? threadIds.map((id) => String(id || "").trim()).filter(Boolean) : [];
    if (!ids.length) return;
    const persisted = getPersistedUiState(panel);
    let nextOrder = combinedBoardTabOrder(persisted, boardTabOrder);
    const picks = [];
    if (nextOrder.length) {
      picks.push(...nextOrder.map((name) => ({
        label: name,
        description: normalizeBoardTabName(activeBoardTab) === name ? "Current active tab" : "",
        action: "select",
        value: name,
      })));
    }
    picks.push({
      label: "+ New Tab",
      description: "Create a new tab and move all selected cards into it",
      action: "new",
    });
    const picked = await vscode.window.showQuickPick(picks, {
      title: "Set Selected Cards to Tab",
      placeHolder: ids.length === 1 ? "Choose a tab for the selected card" : `Choose a tab for ${ids.length} selected cards`,
      ignoreFocusOut: true,
    });
    if (!picked) return;
    let nextTab = "";
    if (picked.action === "new") {
      const created = await vscode.window.showInputBox({
        title: "Create Tab Group",
        prompt: "Create a new manual Board group for the selected cards",
        value: "",
        ignoreFocusOut: true,
        validateInput: (input) => {
          const normalized = normalizeBoardTabName(input);
          if (!normalized) return "Tab name cannot be empty";
          if (normalized.toLowerCase() === "all") return "\"all\" is reserved";
          return undefined;
        },
      });
      if (created === undefined) return;
      nextTab = normalizeBoardTabName(created);
      if (!nextTab) {
        vscode.window.showWarningMessage("Codex-Managed-Agent: Tab name cannot be empty");
        return;
      }
      if (nextTab.toLowerCase() === "all") {
        vscode.window.showWarningMessage("Codex-Managed-Agent: \"all\" is reserved and cannot be used as a tab name");
        return;
      }
      if (!nextOrder.includes(nextTab)) {
        nextOrder = normalizeBoardTabOrder([...nextOrder, nextTab]);
      }
    } else {
      nextTab = normalizeBoardTabName(picked.value || picked.label || "");
    }
    if (!nextTab || nextTab === "all") {
      vscode.window.showWarningMessage("Codex-Managed-Agent: choose a specific tab for batch assignment");
      return;
    }
    const nextAssignments = Object.assign({}, persisted.boardTabAssignments || {});
    const nextAttached = Object.assign({}, persisted.boardAttached || {});
    ids.forEach((threadId) => {
      nextAssignments[threadId] = nextTab;
      nextAttached[threadId] = true;
    });
    const nextState = Object.assign({}, persisted, {
      boardTabAssignments: nextAssignments,
      boardTabOrder: nextOrder,
      boardAttached: nextAttached,
      activeBoardTab: nextTab,
    });
    await savePersistedUiState(panel, nextState);
    panel.postMessage({
      type: "batchBoardTabPatched",
      threadIds: ids,
      boardTab: nextTab,
      boardTabOrder: nextOrder,
      activeBoardTab: nextState.activeBoardTab,
    });
    panel.lastActionNotice = `Moved ${ids.length} card${ids.length > 1 ? "s" : ""} into tab ${nextTab}`;
    vscode.window.setStatusBarMessage(`Codex-Managed-Agent: ${panel.lastActionNotice}`, 2400);
  }

  return {
    editCardLabel,
    setCardLabel,
    chooseBoardTab,
    createBoardTab,
    batchSetBoardTab,
  };
}

module.exports = {
  createLifecycleBoardTabs,
};
