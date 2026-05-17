const chunk01 = require("./trace-loop-insights-parts/chunk-01");
const chunk02 = require("./trace-loop-insights-parts/chunk-02");
const chunk03 = require("./trace-loop-insights-parts/chunk-03");
const chunk04 = require("./trace-loop-insights-parts/chunk-04");
const chunk05 = require("./trace-loop-insights-parts/chunk-05");

function getTraceLoopInsightsStyles() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
    chunk05,
  ].join("");
}

module.exports = {
  getTraceLoopInsightsStyles,
};
