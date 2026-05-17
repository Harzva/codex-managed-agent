const chunk01 = require("./overview-renderers-parts/chunk-01");
const chunk02 = require("./overview-renderers-parts/chunk-02");
const chunk03 = require("./overview-renderers-parts/chunk-03");
const chunk04 = require("./overview-renderers-parts/chunk-04");
const chunk05 = require("./overview-renderers-parts/chunk-05");

function getOverviewRenderersScript() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
    chunk05,
  ].join("");
}

module.exports = {
  getOverviewRenderersScript,
};
