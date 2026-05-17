const chunk01 = require("./thread-runtime-parts/chunk-01");
const chunk02 = require("./thread-runtime-parts/chunk-02");
const chunk03 = require("./thread-runtime-parts/chunk-03");
const chunk04 = require("./thread-runtime-parts/chunk-04");
const chunk05 = require("./thread-runtime-parts/chunk-05");
const chunk06 = require("./thread-runtime-parts/chunk-06");
const chunk07 = require("./thread-runtime-parts/chunk-07");

function getThreadRuntimeScript() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
    chunk05,
    chunk06,
    chunk07,
  ].join("");
}

module.exports = {
  getThreadRuntimeScript,
};
