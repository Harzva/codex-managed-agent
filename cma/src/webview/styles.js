const { getBaseStyles } = require("./styles/base");
const { getChromeStyles } = require("./styles/chrome");
const { getThreadOverviewStyles } = require("./styles/thread-overview");
const { getTeamStyles } = require("./styles/team");
const { getBootBoardBaseStyles } = require("./styles/boot-board-base");
const { getTraceLoopInsightsStyles } = require("./styles/trace-loop-insights");
const { getConfigProviderAccountsStyles } = require("./styles/config-provider-accounts");
const { getThreadDetailStyles } = require("./styles/thread-detail");
const { getBoardRuntimeStyles } = require("./styles/board-runtime");
const { getSkillsMemoryStyles } = require("./styles/skills-memory");

function getWebviewStyles() {
  return [
    getBaseStyles(),
    getChromeStyles(),
    getThreadOverviewStyles(),
    getTeamStyles(),
    getBootBoardBaseStyles(),
    getTraceLoopInsightsStyles(),
    getConfigProviderAccountsStyles(),
    getThreadDetailStyles(),
    getBoardRuntimeStyles(),
    getSkillsMemoryStyles(),
  ].join("\n").trim();
}

module.exports = {
  getWebviewStyles,
};
