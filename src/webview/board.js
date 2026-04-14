function renderBoardPane(media) {
  return `<section class="workspace-pane" data-workspace-pane="board">
        <section class="single-grid">
          <div class="panel board-stage">
            <div class="board-view-shell">
              <div class="running-board-toolbar">
                <div class="running-board-title">
                  <div class="board-icon"><img class="board-icon-vivid theme-is-optional" src="${media.board}" alt="" /><span class="theme-bar board-icon-clean variant-hero phase-tooling" aria-hidden="true"></span></div>
                  <div>
                    <div class="section-title">Running Agent Board</div>
                    <div class="running-board-copy" id="runningBoardMetaPrimary">Pinned and attached agents stay here even when they stop running.</div>
                  </div>
                </div>
              <div class="chip-row">
                  <button class="chip" data-view="threads" type="button">Back to Threads</button>
                  <button class="chip" id="toggleLayoutLockPrimary" type="button">Lock Layout</button>
                  <button class="chip" id="resetRunningLayoutPrimary" type="button">Reset Layout</button>
                </div>
              </div>
              <div id="interventionDockPrimary" class="intervention-dock"></div>
              <div class="board-surface">
                <div id="runningBoardPrimary" class="running-board-grid"></div>
                <div id="boardDropOverlayPrimary" class="board-drop-overlay"></div>
              </div>
            </div>
          </div>
        </section>
      </section>`;
}

module.exports = {
  renderBoardPane,
};
