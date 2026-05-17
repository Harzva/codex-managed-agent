function getHtmlUtilityScript() {
  return `
      function renderIconBadge(code, tone = "default") {
        return '<span class="icon-badge' + (tone !== "default" ? ' ' + esc(tone) : '') + '">' + esc(code) + '</span>';
      }

      function renderSectionHeading(label, code) {
        return '<h4><span class="section-heading">' + renderIconBadge(code) + '<span>' + esc(label) + '</span></span></h4>';
      }
  `.trim();
}

module.exports = {
  getHtmlUtilityScript,
};
