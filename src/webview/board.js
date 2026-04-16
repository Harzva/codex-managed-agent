function renderBoardPane(media) {
  return `<section class="workspace-pane" data-workspace-pane="board">
        <section class="single-grid">
          <div class="panel board-stage">
            <div class="board-view-shell">
              <div class="board-page-titlebar">
                <div class="section-title">Agent Board</div>
              </div>
              <div class="page-summary-card board-page-summary-card">
                <div class="section-title">Board Summary</div>
                <div class="section-note" id="boardPageSummaryHeadline">No cards yet.</div>
                <div id="boardPageSummaryStats" class="drawer-summary"></div>
              </div>
              <div class="board-control-stack">
                <div class="board-action-row">
                  <div class="board-local-actions">
                    <button class="chip" data-view="threads" type="button">Back to Threads</button>
                    <button class="chip" id="toggleLayoutLockPrimary" type="button">Lock Layout</button>
                    <button class="chip" id="resetRunningLayoutPrimary" type="button">Reset Layout</button>
                  </div>
                  <div class="board-action-status" id="runningBoardMetaPrimary">Pinned and attached agents stay here even when they stop running.</div>
                </div>
                <div class="board-subview-row">
                  <div class="board-subtabs" id="boardSubtabs">
                    <button class="board-subtab" data-board-subview="canvas" type="button">Board Canvas</button>
                    <button class="board-subtab" data-board-subview="coordination" type="button">Needs Human</button>
                    <button class="board-subtab" data-board-subview="todo" type="button">TODO</button>
                    <button class="board-subtab" data-board-subview="play" type="button">New Play</button>
                  </div>
                </div>
                <div class="board-tab-group-row">
                  <div class="board-tab-group-kicker">Board Tab Groups</div>
                  <div id="boardTabRailPrimary"></div>
                </div>
              </div>
              <section class="board-subpane" data-board-pane="canvas">
                <div class="board-surface">
                  <div id="runningBoardPrimary" class="running-board-grid"></div>
                  <div id="boardDropOverlayPrimary" class="board-drop-overlay"></div>
                </div>
              </section>
              <section class="board-subpane board-human-pane" data-board-pane="coordination">
                <div id="interventionDockPrimary" class="intervention-dock"></div>
              </section>
              <section class="board-subpane board-todo-pane" data-board-pane="todo">
                <div id="boardTodoPrimary" class="board-todo-shell"></div>
              </section>
              <section class="board-subpane board-play-pane" data-board-pane="play">
                <div id="boardPlayPrimary" class="board-play-shell"></div>
              </section>
            </div>
          </div>
        </section>
      </section>`;
}

module.exports = {
  renderBoardPane,
};
