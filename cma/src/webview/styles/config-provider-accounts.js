const chunk01 = require("./config-provider-accounts-parts/chunk-01");
const chunk02 = require("./config-provider-accounts-parts/chunk-02");
const chunk03 = require("./config-provider-accounts-parts/chunk-03");
const chunk04 = require("./config-provider-accounts-parts/chunk-04");
const chunk05 = require("./config-provider-accounts-parts/chunk-05");

function getConfigProviderAccountsStyles() {
  return [
    chunk01,
    chunk02,
    chunk03,
    chunk04,
    chunk05,
  ].join("");
}

module.exports = {
  getConfigProviderAccountsStyles,
};
