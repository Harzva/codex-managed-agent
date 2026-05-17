const chunk01 = require("./team-runtime-parts/chunk-01");
const chunk02 = require("./team-runtime-parts/chunk-02");
const chunk03 = require("./team-runtime-parts/chunk-03");
const chunk04 = require("./team-runtime-parts/chunk-04");
const chunk05 = require("./team-runtime-parts/chunk-05");

function getTeamRuntimeScript() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
    chunk05,
  ].join("");
}

module.exports = {
  getTeamRuntimeScript,
};
