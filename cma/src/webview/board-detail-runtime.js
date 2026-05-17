const chunk01 = require("./board-detail-runtime-parts/chunk-01");
const chunk02 = require("./board-detail-runtime-parts/chunk-02");
const chunk03 = require("./board-detail-runtime-parts/chunk-03");
const chunk04 = require("./board-detail-runtime-parts/chunk-04");

function getBoardDetailRuntimeScript() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
  ].join("");
}

module.exports = {
  getBoardDetailRuntimeScript,
};
