module.exports = `        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        if (!ids.length) return;
        ids.forEach((threadId) => {
          delete state.ui.boardAttached[threadId];
        });
        persistUi();
        render(state.payload);
      }

      function areThreadsBoardAttached(threadIds) {
        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        return Boolean(ids.length) && ids.every((threadId) => isBoardAttached(threadId));
      }

      function toggleThreadsBoardAttach(threadIds) {
        const ids = Array.isArray(threadIds) ? threadIds.filter(Boolean) : [];
        if (!ids.length) return;
        if (areThreadsBoardAttached(ids)) {
          unattachThreadsFromBoard(ids);
        } else {
          attachThreadsToBoard(ids);
        }
      }

      function getBoardThreads(dashboard, payload = state.payload) {
        const threadMap = new Map(((dashboard && dashboard.threads) || []).map((thread) => [thread.id, thread]));
        const boardMap = new Map();
	        const effectiveRunning = effectiveRunningIdSet(payload);
	        ((dashboard && dashboard.runningThreads) || []).forEach((thread) => {
	          if (!effectiveRunning.has(thread.id) && threadStateFacts(thread, payload).process !== "running") return;
	          boardMap.set(thread.id, Object.assign({}, threadMap.get(thread.id) || {}, thread, { board_source: "running" }));
	        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!state.ui.boardAttached[threadId]) return;
          const thread = threadMap.get(threadId);
          if (!thread) return;
          const existing = boardMap.get(threadId);
          boardMap.set(threadId, Object.assign({}, thread, existing || {}, {
            board_source: existing && effectiveRunning.has(threadId) ? "running" : "attached",
          }));
        });
        return Array.from(boardMap.values()).map((thread) => {
          const boardTab = boardTabFor(thread.id);
          return Object.assign({}, thread, {
            board_tab: boardTab || "",
          });
        });
      }

      function boardThreadsForActiveTab(boardThreads) {
        const active = activeBoardTabKey();
        if (active === "all") return boardThreads;
        return (boardThreads || []).filter((thread) => boardTabFor(thread.id) === active);
      }

      function buildBoardProjectGroups(boardThreads) {
        const groups = new Map();
        (boardThreads || []).forEach((thread) => {
          if (!thread || !thread.id) return;
          const rootKey = threadRootKey(thread) || "-";
          const current = groups.get(rootKey);
          if (current) {
            current.threads.push(thread);
            return;
          }
          groups.set(rootKey, {
            key: rootKey,
            label: threadRootLabel(thread) || rootKey,
            title: threadRootKey(thread) || rootKey,
            threads: [thread],
          });
        });
        return [...groups.values()].sort((a, b) =>
          String(a.label || "").localeCompare(String(b.label || ""), undefined, { sensitivity: "base", numeric: true })
          || String(a.title || "").localeCompare(String(b.title || "")));
      }

      function buildBoardStatusGroups(boardThreads) {
        const groups = {
          running: [],
          needs_human: [],
          pinned: [],
          stopped: [],
          linked: [],
          attached: [],
          archived: [],
          soft_deleted: [],
        };
        sortThreads(boardThreads || []).forEach((thread) => {
	          if (!thread || !thread.id) return;
	          const status = effectiveThreadStatus(thread);
	          const facts = threadStateFacts(thread);
	          if (status === "running" || facts.process === "running") groups.running.push(thread);
	          else if (facts.visibility === "soft_deleted") groups.soft_deleted.push(thread);
	          else if (facts.visibility === "archived") groups.archived.push(thread);
	          else if (facts.attention === "needs_human") groups.needs_human.push(thread);
          else if (status === "linked") groups.linked.push(thread);
          else if (isPinned(thread.id)) groups.pinned.push(thread);
          else if (facts.process === "stopped" || status === "stopped" || status === "idle" || status === "recent") groups.stopped.push(thread);
          else if (status === "attached" || thread.board_source === "attached") groups.attached.push(thread);
          else groups.stopped.push(thread);
        });
        return [
          { key: "status:running", label: "Running", title: "Running", threads: groups.running },
          { key: "status:needs_human", label: "Needs Human", title: "Needs Human", threads: groups.needs_human },
          { key: "status:linked", label: "Linked", title: "Linked", threads: groups.linked },
          { key: "status:pinned", label: "Pinned", title: "Pinned", threads: groups.pinned },
          { key: "status:stopped", label: "Stopped", title: "Stopped", threads: groups.stopped },
          { key: "status:attached", label: "Attached", title: "Attached", threads: groups.attached },
          { key: "status:archived", label: "Archived", title: "Archived", threads: groups.archived },
          { key: "status:soft_deleted", label: "Soft Deleted", title: "Soft Deleted", threads: groups.soft_deleted },
        ].filter((group) => group.threads.length);
      }

      function buildBoardColumnGroups(boardThreads, mode = "status") {
        return mode === "directory" ? buildBoardProjectGroups(boardThreads) : buildBoardStatusGroups(boardThreads);
      }

      function boardProjectDomId(rootKey, index) {
        const safe = String(rootKey || "-").replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48) || "root";
        return "runningBoardProject_" + String(index) + "_" + safe;
      }

      function boardProjectCollapsedMap() {
        if (!state.ui.boardProjectCollapsed || typeof state.ui.boardProjectCollapsed !== "object") {
          state.ui.boardProjectCollapsed = {};
        }
        return state.ui.boardProjectCollapsed;
      }

      function isBoardProjectCollapsed(projectKey) {
        return Boolean(boardProjectCollapsedMap()[String(projectKey || "-")]);
      }

      function boardTabCounts(boardThreads) {
        const counts = { all: (boardThreads || []).length };
        boardTabOrderList().forEach((name) => {
          counts[name] = 0;
        });
        (boardThreads || []).forEach((thread) => {
          const name = boardTabFor(thread.id);
          if (!name) return;
          counts[name] = (counts[name] || 0) + 1;
        });
        return counts;
      }

      function renderBoardTabRail(boardThreads) {
        const counts = boardTabCounts(boardThreads);
        const active = activeBoardTabKey();
        const chips = [
          '<button class="board-tab-chip' + (active === "all" ? ' active' : '') + '" data-board-tab="all" type="button"><span>All</span><span class="board-tab-chip-count">' + esc(String(counts.all || 0)) + '</span></button>'
        ];
        boardTabOrderList().forEach((name) => {
          chips.push(
            '<button class="board-tab-chip' + (active === name ? ' active' : '') + '" data-board-tab="' + esc(name) + '" type="button"' + boardTabStyle(name, active === name) + '><strong>' + esc(name) + '</strong><span class="board-tab-chip-count"' + boardTabCountStyle(name) + '>' + esc(String(counts[name] || 0)) + '</span></button>'
          );
        });
        chips.push('<button class="board-tab-chip add" data-create-board-tab="true" type="button">' + (boardTabOrderList().length ? '+ New Tab' : '+ Create First Tab') + '</button>');
        if (!boardTabOrderList().length) {
          return '<div class="board-tab-rail">' + chips.join("") + '</div>' +
            '<div class="board-tab-helper">No tab group yet. Create the first tab here, then click a card\\'s <strong>+ Tab</strong> button to put that card into a colored group.</div>';
        }
        return '<div class="board-tab-rail">' + chips.join("") + '</div>' +
          '<div class="board-tab-helper">Tab is a manual group for board cards. Different tabs show as different color blocks, and cards in the same tab can still be managed independently.</div>';
      }

      function renderBoardTabPill(thread) {
        const name = boardTabFor(thread && thread.id);
        if (!name) return "";
        return '<span class="board-tab-pill" title="Manual group"' + boardTabStyle(name, false) + '><strong>' + esc(name) + '</strong></span>';
      }

      function renderBoardTodoPane(boardThreads) {
        const tabNames = boardTabOrderList();
        const title = "Board Operations";
        const copy = "Organize active Codex threads into manual groups, keep ownership visible, and jump into the right thread surface quickly.";
        return '<div class="board-todo-shell">' +
          '<section class="board-todo-hero">' +
            '<div class="board-todo-kicker">Board</div>' +
            '<div class="board-todo-title">' + esc(title) + '</div>' +
            '<div class="board-todo-copy">' + esc(copy) + '</div>' +
          '</section>' +
          '<div class="board-todo-grid">' +
            '<article>' +
              '<div class="board-todo-section-title">Live Board State</div>' +
              '<div class="board-todo-list">' +
                '<div class="board-todo-item"><span class="meta-pill">Now</span><span>Tab equals manual group. It is not automatic routing and it does not change the underlying Codex thread.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Now</span><span>Cards in one tab can still have different Card Names and different loop behaviors.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Live</span><span>' + esc(String(boardThreads.length || 0)) + ' board cards are currently visible across ' + esc(String(tabNames.length || 0)) + ' custom tab group' + (tabNames.length === 1 ? '' : 's') + '.</span></div>' +
              '</div>' +
            '</article>' +
            '<article>' +
              '<div class="board-todo-section-title">Card Workflow</div>' +
              '<div class="board-todo-list">' +
                '<div class="board-todo-item"><span class="meta-pill">Select</span><span>Select visible cards or a whole group before batch actions.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Route</span><span>Use tabs to group cards by project, owner, or release lane.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Inspect</span><span>Open Inspector, Chat, or Trace directly from each card row.</span></div>' +
              '</div>' +
            '</article>' +
            '<article>' +
              '<div class="board-todo-section-title">Signals</div>' +
              '<div class="board-todo-list">' +
                '<div class="board-todo-item"><span class="meta-pill">Lifecycle</span><span>Cards show runtime evidence when the backend can infer it from session events.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Account</span><span>Blocking token or quota states appear on cards only when they affect work.</span></div>' +
                '<div class="board-todo-item"><span class="meta-pill">Trace</span><span>Trace keeps command, file, and handoff evidence close to the thread.</span></div>' +
              '</div>' +
            '</article>' +
          '</div>' +
        '</div>';
      }

      function renderBoardPlayPane(boardThreads) {
        const visibleCards = (boardThreads || []).filter((thread) => thread && thread.id);
        const seedCards = visibleCards.slice(0, 3);
        const idLines = seedCards.map((thread, index) => String(index + 1) + ". " + thread.id);
        const idText = idLines.join("\\n");
        const titleLines = seedCards.map((thread, index) => {
          const label = thread.title || thread.db_title || thread.preview || thread.id;
          return String(index + 1) + ". " + short(label, 72) + " [" + thread.id + "]";
        });
        const forkPrompt = seedCards.length
          ? [
              "I want to fork working memory from these CMA/Codex board cards into this new session.",
              "",
              "Source card/session IDs:",
              idText,
              "",
              "Please treat them as prior working contexts, ask me before destructive changes, and first produce a compact synthesis:",
              "- shared goal",
              "- what each source session likely owns",
              "- conflicts or duplicated work",
              "- recommended next action for this new session",
            ].join("\\n")
          : "Add cards to the Board first, then return here to copy a multi-session fork prompt.";
        const disabled = seedCards.length ? "" : " disabled";
        const seedSummary = seedCards.length
          ? titleLines.map((line) => '<div class="board-play-item"><span class="meta-pill">ID</span><span>' + esc(line) + '</span></div>').join("")
          : '<div class="board-play-item"><span class="meta-pill">Empty</span><span>No visible board cards yet. Add or switch to a tab with cards, then use this play.</span></div>';
        return '<div class="board-play-shell">' +
          '<section class="board-play-hero">' +
            '<div class="board-play-kicker">New Play</div>' +
            '<div class="board-play-title">Tri-Fork Memory Handoff</div>' +
            '<div class="board-play-copy">A board play is a repeatable workflow. This one copies up to three visible card/session IDs and a ready prompt, then you paste it into a fresh Codex session so the new agent can inherit the shape of multiple prior threads.</div>' +
            '<div class="board-play-actions">' +
              '<button class="chip" data-copy-text="' + esc(idText) + '" data-copy-label="Board card IDs" type="button"' + disabled + '>Copy 3 Card IDs</button>' +
              '<button class="chip primary" data-copy-text="' + esc(forkPrompt) + '" data-copy-label="Tri-fork prompt" type="button"' + disabled + '>Copy Fork Prompt</button>' +
              '<button class="chip" data-create-thread-from-play="true" type="button">New Session</button>' +
            '</div>' +
          '</section>' +
          '<div class="board-play-grid">' +
            '<article class="board-play-card">' +
              '<div class="board-play-section-title">How To Run It</div>' +
              '<div class="board-play-list">' +
                '<div class="board-play-item"><span class="meta-pill">1</span><span>Put the source cards in the same Board tab, or stay on All if you want the first three visible cards.</span></div>' +
                '<div class="board-play-item"><span class="meta-pill">2</span><span>Click <strong>Copy Fork Prompt</strong>. It includes the card IDs and the instruction for the next session to synthesize them.</span></div>' +
                '<div class="board-play-item"><span class="meta-pill">3</span><span>Click <strong>New Session</strong>, paste the prompt into Codex, and let the new thread become the coordinator/fork.</span></div>' +
              '</div>' +
            '</article>' +
            '<article class="board-play-card">' +
              '<div class="board-play-section-title">Current Seeds</div>' +
              '<div class="board-play-list">' + seedSummary + '</div>' +
            '</article>' +
            '<article class="board-play-card">' +
              '<div class="board-play-section-title">Why It Works</div>' +
              '<div class="board-play-list">' +
                '<div class="board-play-item"><span class="meta-pill">Memory</span><span>The new session does not magically merge hidden state; it receives explicit session IDs and a clear instruction to reconstruct context.</span></div>' +
                '<div class="board-play-item"><span class="meta-pill">Safe</span><span>It starts with synthesis before edits, so the new agent can ask for confirmation if the three source threads disagree.</span></div>' +
              '</div>' +
            '</article>' +
          '</div>' +
          '<section class="board-play-prompt">' +
            '<div class="board-play-kicker">Prompt Preview</div>' +
            '<code>' + esc(forkPrompt) + '</code>' +
          '</section>' +
        '</div>';
      }

      function getRunningCardSize(threadId) {
        const size = state.ui.runningCardSizes[threadId];
        return size === "m" || size === "l" ? "l" : "s";
      }

      function getRunningCardLayout(threadId, size = getRunningCardSize(threadId)) {
        const defaultCols = size === "tiny" ? 2 : size === "l" ? 15 : 4;
        const defaultHeight = size === "tiny" ? 116 : size === "l" ? 330 : 300;
        return {
          cols: defaultCols,
          height: defaultHeight,
        };
      }

      function getRunningCardPosition(threadId) {
        const saved = state.ui.runningCardPositions[threadId] || {};
        const col = Math.round(Number(saved.col) || 0);
        const row = Math.round(Number(saved.row) || 0);
        if (col < 1 || row < 1) return undefined;
        return { col, row };
      }

      function setRunningCardLayout(threadId, cols, height) {
        if (state.ui.layoutLocked || !threadId) return;
      }

      function setRunningCardPosition(threadId, col, row) {
        if (state.ui.layoutLocked || !threadId) return;
        state.ui.runningCardPositions[threadId] = {
          col: Math.max(1, Math.min(15, Math.round(Number(col) || 1))),
          row: Math.max(1, Math.min(999, Math.round(Number(row) || 1))),
        };
        persistUi();
      }

      function pruneRunningCardState(boardThreads) {
        const activeIds = new Set((boardThreads || []).map((thread) => thread.id));
        state.ui.runningCardOrder = state.ui.runningCardOrder.filter((threadId) => activeIds.has(threadId));
        Object.keys(state.ui.runningCardSizes).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardSizes[threadId];
          }
        });
        Object.keys(state.ui.runningCardLayout).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardLayout[threadId];
          }
        });
        Object.keys(state.ui.runningCardPositions).forEach((threadId) => {
          if (!activeIds.has(threadId)) {
            delete state.ui.runningCardPositions[threadId];
          }
        });
        Object.keys(state.ui.boardAttached).forEach((threadId) => {
          if (!activeIds.has(threadId) && !(((state.payload && state.payload.dashboard && state.payload.dashboard.threads) || []).some((thread) => thread.id === threadId))) {
            delete state.ui.boardAttached[threadId];
          }
        });
      }

      function orderRunningThreads(runningThreads) {
        const orderMap = new Map(state.ui.runningCardOrder.map((threadId, index) => [threadId, index]));
        return [...(runningThreads || [])].sort((a, b) => {
          const aOrder = orderMap.has(a.id) ? orderMap.get(a.id) : Number.POSITIVE_INFINITY;
          const bOrder = orderMap.has(b.id) ? orderMap.get(b.id) : Number.POSITIVE_INFINITY;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aPinned = isPinned(a.id) ? 1 : 0;
          const bPinned = isPinned(b.id) ? 1 : 0;
          if (aPinned !== bPinned) return bPinned - aPinned;
          return Number(b.updated_at || 0) - Number(a.updated_at || 0);
        });
      }

      function moveRunningCard(threadId, anchorThreadId, position = "before") {
        if (state.ui.layoutLocked) return;
        if (!threadId || threadId === anchorThreadId) return;
        const ordered = orderRunningThreads(getBoardThreads(state.payload && state.payload.dashboard)).map((thread) => thread.id);
        const withoutDragged = ordered.filter((id) => id !== threadId);
        const insertIndex = anchorThreadId ? withoutDragged.indexOf(anchorThreadId) : -1;
        if (insertIndex >= 0) {
          withoutDragged.splice(position === "after" ? insertIndex + 1 : insertIndex, 0, threadId);
        } else {
          withoutDragged.push(threadId);
        }
        state.ui.runningCardOrder = withoutDragged;
        persistUi();
        render(state.payload);
      }

      function boardGridMetrics(board) {
        if (!board) {
          return { columns: 15, gap: 12, width: 72, rowHeight: 18, paddingLeft: 4, paddingTop: 4 };
        }
        const styles = getComputedStyle(board);
        const columns = 15;
        const gap = parseFloat(styles.columnGap || styles.gap || "12") || 12;
        const rowHeight = parseFloat(styles.gridAutoRows || "18") || 18;
        const paddingLeft = parseFloat(styles.paddingLeft || "0") || 0;
        const paddingRight = parseFloat(styles.paddingRight || "0") || 0;
        const paddingTop = parseFloat(styles.paddingTop || "0") || 0;
        const innerWidth = Math.max(1, board.clientWidth - paddingLeft - paddingRight - gap * (columns - 1));
        return {
          columns,
          gap,
          width: innerWidth / columns,
          rowHeight,
          paddingLeft,
          paddingTop,
        };
      }

      function boardMetricSnapshot(board) {
        const fallbackRect = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
        return {
          metrics: boardGridMetrics(board),
          rect: board ? board.getBoundingClientRect() : fallbackRect,
        };
      }

      function cacheDragBoardMetrics() {
        state.dragMetricCache = {};
        dragBoards().forEach((board) => {
          if (!board || !board.id) return;
          state.dragMetricCache[board.id] = boardMetricSnapshot(board);
        });
      }

      function cachedBoardMetricSnapshot(board) {
        if (!board || !board.id) return boardMetricSnapshot(board);
        const cached = state.dragMetricCache && state.dragMetricCache[board.id];
        return cached || boardMetricSnapshot(board);
      }

      function layoutHeightToRows(height, metrics) {
        const gap = metrics && metrics.gap ? metrics.gap : 12;
        const rowHeight = metrics && metrics.rowHeight ? metrics.rowHeight : 18;
        return Math.max(4, Math.ceil((Math.max(88, height) + gap) / (rowHeight + gap)));
      }

      function layoutRowsToHeight(rows, metrics) {
        const gap = metrics && metrics.gap ? metrics.gap : 12;
        const rowHeight = metrics && metrics.rowHeight ? metrics.rowHeight : 18;
        return Math.max(88, rows * (rowHeight + gap) - gap);
      }

      function buildBoardPlacements(boardThreads, options = {}) {
        const ordered = orderRunningThreads(boardThreads);
        if (options.compact || options.stacked) {
          return { ordered, placements: new Map(), maxRow: 1 };
        }
        const columns = 15;
        const placements = new Map();
        const occupancy = new Map();
        function isBlocked(col, row) {
          return occupancy.get(String(row) + ":" + String(col)) === true;
        }
        function markOccupied(col, row, cols, rows) {
          for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
            for (let colOffset = 0; colOffset < cols; colOffset += 1) {
              occupancy.set(String(row + rowOffset) + ":" + String(col + colOffset), true);
            }
          }
        }
        function canFit(col, row, cols, rows) {
          if (col < 1 || row < 1 || col + cols - 1 > columns) return false;
          for (let rowOffset = 0; rowOffset < rows; rowOffset += 1) {
            for (let colOffset = 0; colOffset < cols; colOffset += 1) {
              if (isBlocked(col + colOffset, row + rowOffset)) return false;
            }
          }
          return true;
        }
        function placeThread(thread, preferred) {
          const layout = getRunningCardLayout(thread.id, getRunningCardSize(thread.id));
          const rows = layoutHeightToRows(layout.height, { gap: 12, rowHeight: 18 });
          const cols = layout.cols;
          let col = preferred && preferred.col ? Math.max(1, Math.min(columns - cols + 1, preferred.col)) : 1;
          let row = preferred && preferred.row ? Math.max(1, preferred.row) : 1;
          let placed = false;
          for (let searchRow = row; searchRow < row + 180 && !placed; searchRow += 1) {
            for (let searchCol = searchRow === row ? col : 1; searchCol <= columns - cols + 1; searchCol += 1) {
              if (!canFit(searchCol, searchRow, cols, rows)) continue;
              col = searchCol;
              row = searchRow;
              placed = true;
              break;
            }
          }
          if (!placed) {
            let searchRow = 1;
            while (!placed && searchRow < 400) {
              for (let searchCol = 1; searchCol <= columns - cols + 1; searchCol += 1) {
                if (!canFit(searchCol, searchRow, cols, rows)) continue;
                col = searchCol;
                row = searchRow;
                placed = true;
                break;
              }
              searchRow += 1;
            }
          }
          markOccupied(col, row, cols, rows);
`;
