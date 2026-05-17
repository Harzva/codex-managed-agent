function renderBootAnimatedIcon() {
  return `
    <div class="boot-status-icon" aria-hidden="true">
      <svg class="boot-status-svg" viewBox="0 0 80 80" focusable="false">
        <circle class="boot-icon-track" cx="40" cy="40" r="30"></circle>
        <circle class="boot-icon-ring" cx="40" cy="40" r="30" pathLength="100"></circle>
        <circle class="boot-icon-arc" cx="40" cy="40" r="22" pathLength="100"></circle>
        <path class="boot-icon-link" d="M22 58 L40 22 L58 58"></path>
        <g class="boot-icon-orbit">
          <circle class="boot-satellite" cx="40" cy="10" r="3"></circle>
          <circle class="boot-satellite faint" cx="66" cy="40" r="2"></circle>
        </g>
        <circle class="boot-core-halo" cx="40" cy="40" r="14"></circle>
        <circle class="boot-core" cx="40" cy="40" r="7"></circle>
        <g class="boot-node-group">
          <circle class="boot-node node-shell" cx="22" cy="58" r="4"></circle>
          <circle class="boot-node node-bridge" cx="40" cy="22" r="4"></circle>
          <circle class="boot-node node-state" cx="58" cy="58" r="4"></circle>
          <circle class="boot-node node-hydrate" cx="40" cy="66" r="4"></circle>
        </g>
      </svg>
    </div>`;
}

module.exports = {
  renderBootAnimatedIcon,
};
