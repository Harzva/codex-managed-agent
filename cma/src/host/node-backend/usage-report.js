const fs = require("fs");
const os = require("os");
const path = require("path");

function defaultUsageReport(now = Math.floor(Date.now() / 1000)) {
  return {
    summary: {},
    activity: {},
    analysis_views: [],
    recent_token_days: [],
    token_top_threads: [],
    keywords: [],
    guidance: [],
    report_source: "node-backend-empty",
    report_persisted_at: now,
  };
}

function usageReportPath(homeDir = os.homedir()) {
  return path.join(homeDir, ".codex", "codex_managed_agent_usage_report.json");
}

function readPersistedUsageReport(options = {}) {
  const filePath = options.filePath || usageReportPath(options.homeDir);
  try {
    if (!fs.existsSync(filePath)) return defaultUsageReport(options.now);
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : defaultUsageReport(options.now);
  } catch {
    return defaultUsageReport(options.now);
  }
}

module.exports = {
  defaultUsageReport,
  readPersistedUsageReport,
  usageReportPath,
};
