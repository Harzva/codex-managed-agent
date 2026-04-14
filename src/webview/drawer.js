function renderDrawerShell() {
  return `      <div id="drawerBackdrop" class="drawer-backdrop"></div>
      <aside id="threadDrawer" class="drawer">
        <div class="drawer-head">
          <div class="drawer-kicker">Inspector</div>
          <div class="drawer-topline">
            <div class="drawer-title" id="drawerTitle">Thread detail</div>
            <button id="drawerClose" class="drawer-close" type="button">Close</button>
          </div>
          <div class="drawer-meta" id="drawerMeta"></div>
          <div class="drawer-summary" id="drawerSummary"></div>
        </div>
        <div class="action-rail" id="drawerActions"></div>
        <div class="drawer-scroll" id="drawerBody"></div>
      </aside>
`;
}

module.exports = {
  renderDrawerShell,
};
