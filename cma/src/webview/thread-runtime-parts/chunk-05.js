module.exports = `          placements.set(thread.id, { col, row, cols, rows, height: layout.height });
        }
        ordered.forEach((thread) => {
          const preferred = getRunningCardPosition(thread.id);
          if (preferred) placeThread(thread, preferred);
        });
        ordered.forEach((thread) => {
          if (!placements.has(thread.id)) placeThread(thread);
        });
        let maxRow = 1;
        placements.forEach((placement) => {
          maxRow = Math.max(maxRow, placement.row + placement.rows - 1);
        });
        return { ordered, placements, maxRow };
      }

      function pointerToBoardCell(board, clientX, clientY, draggedId, snapshot) {
        const boardSnapshot = snapshot || cachedBoardMetricSnapshot(board);
        const metrics = boardSnapshot.metrics;
        const rect = boardSnapshot.rect;
        const layout = getRunningCardLayout(draggedId, getRunningCardSize(draggedId));
        const rows = layoutHeightToRows(layout.height, metrics);
        const fullCellWidth = metrics.width + metrics.gap;
        const fullCellHeight = metrics.rowHeight + metrics.gap;
        const localX = clientX - rect.left - metrics.paddingLeft;
        const localY = clientY - rect.top - metrics.paddingTop;
        const col = Math.max(1, Math.min(metrics.columns - layout.cols + 1, Math.round(localX / fullCellWidth) + 1));
        const row = Math.max(1, Math.round(localY / fullCellHeight) + 1);
        return { col, row, cols: layout.cols, rows, height: layout.height };
      }

      function boardContainsPointer(board, clientX, clientY) {
        if (!board) return false;
        const rect = board.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
      }

      function cleanupDragPreview() {
        if (state.dragPreviewEl && state.dragPreviewEl.parentNode) {
          state.dragPreviewEl.parentNode.removeChild(state.dragPreviewEl);
        }
        state.dragPreviewEl = undefined;
      }

      function cleanupBoardDragGhost() {
        if (state.boardDragGhostEl && state.boardDragGhostEl.parentNode) {
          state.boardDragGhostEl.parentNode.removeChild(state.boardDragGhostEl);
        }
        state.boardDragGhostEl = undefined;
      }

      function clearRunningDragPresentation() {
        cleanupDragPreview();
        cleanupBoardDragGhost();
        document.querySelectorAll("[data-running-card]").forEach((card) => {
          card.classList.remove("dragging", "pointer-dragging");
        });
        document.querySelectorAll(".running-board-grid").forEach((board) => {
          board.classList.remove("drag-over", "drag-end", "drag-active");
        });
        state.dragMetricCache = undefined;
        state.lastDropOverlayKey = "";
      }

      function createDragPreview(card, threadId) {
        cleanupDragPreview();
        const preview = document.createElement("div");
        preview.className = "drag-preview-card";
        const title = short(
          card.querySelector(".running-card-title")?.textContent || threadId || "Agent",
          48,
        );
        preview.innerHTML =
          '<div class="drag-preview-head"><span class="drag-preview-dot"></span><span class="drag-preview-label">Board Move</span></div>' +
          '<div class="drag-preview-title">' + esc(title) + '</div>';
        document.body.appendChild(preview);
        state.dragPreviewEl = preview;
        return preview;
      }

      function createBoardDragGhost(card, threadId, session) {
        cleanupBoardDragGhost();
        const ghost = document.createElement("div");
        ghost.className = "board-drag-ghost";
        const rect = card.getBoundingClientRect();
        const title = short(
          card.querySelector(".running-card-title")?.textContent || threadId || "Agent",
          56,
        );
        ghost.style.width = Math.max(128, Math.round(rect.width)) + "px";
        ghost.style.height = Math.max(88, Math.round(rect.height)) + "px";
        ghost.innerHTML =
          '<div class="drag-preview-head"><span class="drag-preview-dot"></span><span class="drag-preview-label">Board Move</span></div>' +
          '<div class="drag-preview-title">' + esc(title) + '</div>';
        document.body.appendChild(ghost);
        state.boardDragGhostEl = ghost;
        positionBoardDragGhost(session, session.lastClientX, session.lastClientY);
        return ghost;
      }

      function positionBoardDragGhost(session, clientX, clientY) {
        if (!state.boardDragGhostEl || !session) return;
        const nextX = Math.round(clientX - session.offsetX);
        const nextY = Math.round(clientY - session.offsetY);
        state.boardDragGhostEl.style.transform = "translate3d(" + nextX + "px, " + nextY + "px, 0)";
      }

      function isBoardPointerDragBlockedTarget(target) {
        return Boolean(target && target.closest(
          "button, input, textarea, select, a, [contenteditable='true'], [data-resize-card], [data-edit-card-name], [data-open-composer], [data-codex-thread], [data-running-loop-card], .inline-card-label-input"
        ));
      }

      function dragBoards() {
        if (state.activeBoardId) {
          const active = document.getElementById(state.activeBoardId);
          return active ? [active] : [];
        }
        return Array.from(document.querySelectorAll(".running-board-grid"));
      }

      function syncDragBoardState() {
        document.querySelectorAll(".running-board-grid").forEach((board) => {
          const active = !state.activeBoardId || board.id === state.activeBoardId;
          board.classList.toggle("drag-active", Boolean(state.draggedRunningThreadId && active));
        });
      }

      function markDragBoardActive(boardId) {
        document.querySelectorAll(".running-board-grid").forEach((board) => {
          board.classList.toggle("drag-active", Boolean(boardId && board.id === boardId));
        });
      }

      function scheduleDragFrame() {
        if (state.dragRaf) return;
        state.dragRaf = window.requestAnimationFrame(() => {
          state.dragRaf = 0;
          if (state.pendingDragPointer) {
            const pointer = state.pendingDragPointer;
            const board = pointer.boardId ? document.getElementById(pointer.boardId) : undefined;
            state.activeBoardId = pointer.boardId || state.activeBoardId;
            state.runningDropIndicator = pointerToBoardCell(
              board,
              pointer.clientX,
              pointer.clientY,
              pointer.draggedId,
              board ? cachedBoardMetricSnapshot(board) : undefined,
            );
          } else {
            state.runningDropIndicator = state.pendingDragIndicator;
          }
          state.pendingDragPointer = undefined;
          state.pendingDragIndicator = undefined;
          syncRunningDropIndicatorDom();
        });
      }

      function scheduleDragIndicator(indicator, boardId) {
        state.pendingDragIndicator = indicator;
        state.pendingDragPointer = undefined;
        state.activeBoardId = boardId || state.activeBoardId;
        scheduleDragFrame();
      }

      function scheduleDragPointer(board, clientX, clientY, draggedId) {
        if (!board || !draggedId) return;
        state.pendingDragPointer = {
          boardId: board.id,
          clientX,
          clientY,
          draggedId,
        };
        state.pendingDragIndicator = undefined;
        state.activeBoardId = board.id || state.activeBoardId;
        scheduleDragFrame();
      }

      function cancelScheduledDragIndicator() {
        if (state.dragRaf) {
          window.cancelAnimationFrame(state.dragRaf);
          state.dragRaf = 0;
        }
        state.pendingDragIndicator = undefined;
        state.pendingDragPointer = undefined;
      }

      function beginBoardPointerDrag(threadId, event) {
        if (!threadId || state.ui.layoutLocked || event.button !== 0 || isBoardPointerDragBlockedTarget(event.target)) return;
        const card = event.currentTarget && event.currentTarget.closest("[data-running-card]");
        const board = card && card.closest(".running-board-grid");
        if (!card || !board || card.classList.contains("compact-card")) return;
        const rect = card.getBoundingClientRect();
        state.pointerBoardDrag = {
          threadId,
          boardId: board.id,
          card,
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastClientX: event.clientX,
          lastClientY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          started: false,
        };
        state.draggedRunningThreadId = threadId;
        state.activeBoardId = board.id;
        if (card.setPointerCapture) {
          try {
            card.setPointerCapture(event.pointerId);
          } catch (_) {}
        }
        event.preventDefault();
        event.stopPropagation();
      }

      function startBoardPointerDrag(session) {
        if (!session || session.started) return;
        session.started = true;
        cacheDragBoardMetrics();
        session.card.classList.add("dragging", "pointer-dragging");
        markDragBoardActive(session.boardId);
        createBoardDragGhost(session.card, session.threadId, session);
      }

      function updateBoardDragFrame() {
        state.boardDragRaf = 0;
        const session = state.pointerBoardDrag;
        const pointer = state.pendingBoardDragPointer;
        state.pendingBoardDragPointer = undefined;
        if (!session || !pointer) return;
        session.lastClientX = pointer.clientX;
        session.lastClientY = pointer.clientY;
        if (!session.started) {
          const distance = Math.hypot(pointer.clientX - session.startX, pointer.clientY - session.startY);
          if (distance < 5) return;
          startBoardPointerDrag(session);
        }
        positionBoardDragGhost(session, pointer.clientX, pointer.clientY);
        const board = document.getElementById(session.boardId);
        if (!board) return;
        state.activeBoardId = session.boardId;
        state.runningDropIndicator = pointerToBoardCell(
          board,
          pointer.clientX,
          pointer.clientY,
          session.threadId,
          cachedBoardMetricSnapshot(board),
        );
        syncRunningDropIndicatorDom();
      }

      function scheduleBoardPointerDragMove(event) {
        const session = state.pointerBoardDrag;
        if (!session || event.pointerId !== session.pointerId) return;
        state.pendingBoardDragPointer = {
          clientX: event.clientX,
          clientY: event.clientY,
        };
        if (state.boardDragRaf) return;
        state.boardDragRaf = window.requestAnimationFrame(updateBoardDragFrame);
      }

      function moveBoardPointerDrag(event) {
        const session = state.pointerBoardDrag;
        if (!session || event.pointerId !== session.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        scheduleBoardPointerDragMove(event);
      }

      function finishBoardPointerDrag(event) {
        const session = state.pointerBoardDrag;
        if (!session || event.pointerId !== session.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        if (state.boardDragRaf) {
          window.cancelAnimationFrame(state.boardDragRaf);
          state.boardDragRaf = 0;
        }
        const board = document.getElementById(session.boardId);
        const target = session.started && board
          ? pointerToBoardCell(board, event.clientX, event.clientY, session.threadId, cachedBoardMetricSnapshot(board))
          : undefined;
        if (session.card && session.card.releasePointerCapture) {
          try {
            session.card.releasePointerCapture(event.pointerId);
          } catch (_) {}
        }
        cancelScheduledDragIndicator();
        clearRunningDragPresentation();
        clearRunningDragState();
        if (target && target.col && target.row) {
          setRunningCardPosition(session.threadId, target.col, target.row);
          render(state.payload);
        }
      }

      function cancelBoardPointerDrag(event) {
        const session = state.pointerBoardDrag;
        if (!session) return;
        if (event && event.pointerId !== undefined && event.pointerId !== session.pointerId) return;
        const pointerId = event && event.pointerId !== undefined ? event.pointerId : session.pointerId;
        if (session.card && session.card.releasePointerCapture && pointerId !== undefined) {
          try {
            session.card.releasePointerCapture(pointerId);
          } catch (_) {}
        }
        if (state.boardDragRaf) {
          window.cancelAnimationFrame(state.boardDragRaf);
          state.boardDragRaf = 0;
        }
        cancelScheduledDragIndicator();
        clearRunningDragPresentation();
        clearRunningDragState();
      }

      function scheduleResizeUpdate(event) {
        state.pendingResizeEvent = {
          clientX: event.clientX,
          clientY: event.clientY,
        };
        if (state.resizeRaf) return;
        state.resizeRaf = window.requestAnimationFrame(() => {
          state.resizeRaf = 0;
          const nextEvent = state.pendingResizeEvent;
          state.pendingResizeEvent = undefined;
          if (nextEvent) updateRunningCardResize(nextEvent);
        });
      }

      function dropPreviewMetrics(board, draggedId = state.draggedRunningThreadId, metricsOverride) {
        if (!draggedId) {
          return { width: 120, height: 132 };
        }
        const size = getRunningCardSize(draggedId);
        const layout = getRunningCardLayout(draggedId, size);
        const metrics = metricsOverride || boardGridMetrics(board);
        return {
          width: Math.round(Math.max(96, layout.cols * metrics.width + Math.max(0, layout.cols - 1) * metrics.gap)),
          height: Math.max(92, layout.height),
        };
      }

      function nearestRunningDropTarget(board, draggedId, clientX, clientY, fallbackCard) {
        if (!board || !draggedId) return undefined;
        const cards = Array.from(board.querySelectorAll("[data-running-card]")).filter((card) => card.dataset.runningCard !== draggedId);
        const directCard = fallbackCard && fallbackCard.dataset && fallbackCard.dataset.runningCard !== draggedId ? fallbackCard : undefined;
        if (directCard) {
          const rect = directCard.getBoundingClientRect();
          return {
            threadId: directCard.dataset.runningCard,
            position: clientX > rect.left + (rect.width / 2) ? "after" : "before",
          };
        }
        let best = undefined;
        cards.forEach((card) => {
          const rect = card.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const distance = Math.hypot(clientX - centerX, clientY - centerY);
          if (!best || distance < best.distance) {
            best = { card, rect, distance };
          }
        });
        if (!best) return undefined;
        const threshold = Math.max(140, Math.min(320, Math.max(best.rect.width, best.rect.height) * 0.9));
        if (best.distance > threshold) return undefined;
        return {
          threadId: best.card.dataset.runningCard,
          position: clientX > best.rect.left + (best.rect.width / 2) ? "after" : "before",
        };
      }

      function beginRunningCardResize(threadId, corner, event) {
        if (state.ui.layoutLocked || !threadId) return;
        const card = event.currentTarget && event.currentTarget.closest("[data-running-card]");
        if (!card) return;
        const board = card.closest(".running-board-grid");
        const metrics = boardGridMetrics(board);
        const size = getRunningCardSize(threadId);
        const layout = getRunningCardLayout(threadId, size);
        const placement = getRunningCardPosition(threadId) || {
          col: Math.max(1, Number(card.dataset.gridCol) || 1),
          row: Math.max(1, Number(card.dataset.gridRow) || 1),
        };
        state.resizingRunningCard = {
          threadId,
          corner,
          startX: event.clientX,
          startY: event.clientY,
          startCols: layout.cols,
          startHeight: layout.height,
          startCol: placement.col,
          startRow: placement.row,
          startRows: layoutHeightToRows(layout.height, metrics),
          currentCols: layout.cols,
          currentHeight: layout.height,
          currentCol: placement.col,
          currentRow: placement.row,
        };
        card.classList.add("resizing");
        event.preventDefault();
        event.stopPropagation();
      }

      function updateRunningCardResize(event) {
        const session = state.resizingRunningCard;
        if (!session) return;
        const card = document.querySelector('[data-running-card="' + CSS.escape(session.threadId) + '"]');
        if (!card) return;
        const board = card.closest(".running-board-grid");
        const metrics = boardGridMetrics(board);
        const dx = event.clientX - session.startX;
        const dy = event.clientY - session.startY;
        const horizontalDirection = session.corner.includes("w") ? -1 : (session.corner.includes("e") ? 1 : 0);
        const verticalDirection = session.corner.includes("n") ? -1 : (session.corner.includes("s") ? 1 : 0);
        const colStep = Math.max(48, Math.round(metrics.width * 0.82));
        const horizontalDelta = horizontalDirection === 0 ? 0 : Math.round((dx * horizontalDirection) / colStep);
        const verticalDelta = verticalDirection === 0 ? 0 : Math.round((dy * verticalDirection) / 18);
        const startRightEdge = session.startCol + session.startCols - 1;
        const desiredCols = session.startCols + horizontalDelta;
        let nextCols;
        let nextCol = session.startCol;
        if (horizontalDirection < 0) {
          const maxCols = Math.max(1, Math.min(metrics.columns || 15, startRightEdge));
          nextCols = Math.max(1, Math.min(maxCols, desiredCols));
          nextCol = Math.max(1, startRightEdge - nextCols + 1);
        } else if (horizontalDirection > 0) {
          const maxCols = Math.max(1, (metrics.columns || 15) - session.startCol + 1);
          nextCols = Math.max(1, Math.min(maxCols, desiredCols));
        } else {
          nextCols = session.startCols;
        }
        let nextHeight = Math.max(88, Math.min(520, session.startHeight + verticalDelta * 18));
        let nextRows = layoutHeightToRows(nextHeight, metrics);
        let nextRow = session.startRow;
        if (verticalDirection < 0) {
          const startBottomEdge = session.startRow + session.startRows - 1;
          nextRow = Math.max(1, startBottomEdge - nextRows + 1);
          if (nextRow === 1) {
            nextRows = Math.max(session.startRows, startBottomEdge);
            nextHeight = Math.min(520, layoutRowsToHeight(nextRows, metrics));
          }
        }
        session.currentCols = nextCols;
        session.currentHeight = nextHeight;
        session.currentCol = nextCol;
        session.currentRow = nextRow;
        card.style.gridColumn = String(nextCol) + " / span " + nextCols;
        card.style.gridRow = String(nextRow) + " / span " + nextRows;
        card.style.minHeight = nextHeight + "px";
        card.style.height = nextHeight + "px";
      }

      function finishRunningCardResize(event) {
        const session = state.resizingRunningCard;
        if (!session) return;
        if (state.resizeRaf) {
          window.cancelAnimationFrame(state.resizeRaf);
          state.resizeRaf = 0;
        }
        const card = document.querySelector('[data-running-card="' + CSS.escape(session.threadId) + '"]');
        if (card) {
          card.classList.remove("resizing");
          setRunningCardLayout(session.threadId, session.currentCols || session.startCols, session.currentHeight || session.startHeight);
          setRunningCardPosition(session.threadId, session.currentCol || session.startCol, session.currentRow || session.startRow);
        }
        state.resizingRunningCard = undefined;
        state.pendingResizeEvent = undefined;
        render(state.payload);
      }

      function setRunningDropIndicator(indicatorOrThreadId, position) {
        if (typeof indicatorOrThreadId === "object" && indicatorOrThreadId) {
          state.runningDropIndicator = indicatorOrThreadId;
          return;
        }
        state.runningDropIndicator = indicatorOrThreadId && position ? { threadId: indicatorOrThreadId, position } : undefined;
`;
