const chunk01 = require("./board-runtime-parts/chunk-01");
const chunk02 = require("./board-runtime-parts/chunk-02");
const chunk03 = require("./board-runtime-parts/chunk-03");
const chunk04 = require("./board-runtime-parts/chunk-04");
const chunk05 = require("./board-runtime-parts/chunk-05");
const chunk06 = require("./board-runtime-parts/chunk-06");

function getBoardRuntimeStyles() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
    chunk05,
    chunk06,
  ].join("");
}

module.exports = {
  getBoardRuntimeStyles,
};
