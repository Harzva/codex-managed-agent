const chunk01 = require("./render-runtime-parts/chunk-01");
const chunk02 = require("./render-runtime-parts/chunk-02");
const chunk03 = require("./render-runtime-parts/chunk-03");
const chunk04 = require("./render-runtime-parts/chunk-04");

const USAGE_CACHE_SUMMARY_ANCHOR = `              rangedUsage.lastTokenEventAt ? "Observed" : "Pending"
            ),
            renderSummaryCard(
              "Usage Persona",`;

const USAGE_CACHE_SUMMARY_INSERT = `              rangedUsage.lastTokenEventAt ? "Observed" : "Pending"
            ),
            renderSummaryCard(
              "Cached Input",
              rangedUsage.cacheKnownEvents ? compactTokenCount(rangedUsage.cachedInputTokens || 0) : "Unknown",
              rangedUsage.cacheKnownEvents
                ? ("Hit rate " + Math.round(Number(rangedUsage.cacheHitRate || 0) * 100) + "%; known events " + String(rangedUsage.cacheKnownEvents))
                : "Cached token details were not present in the ingested usage events.",
              rangedUsage.cacheKnownEvents ? "Tooling" : "Waiting",
              MEDIA.tooling,
              "",
              "",
              rangedUsage.cacheKnownEvents ? "Known" : "Unknown"
            ),
            renderSummaryCard(
              "Reasoning Tokens",
              rangedUsage.reasoningOutputTokens ? compactTokenCount(rangedUsage.reasoningOutputTokens) : "Unknown",
              rangedUsage.reasoningOutputTokens
                ? "Subset of output tokens; not added again to totals."
                : "Reasoning token details were not present in the ingested usage events.",
              rangedUsage.reasoningOutputTokens ? "Planning" : "Waiting",
              MEDIA.board,
              "",
              "",
              rangedUsage.reasoningOutputTokens ? "Observed" : "Unknown"
            ),
            renderSummaryCard(
              "Usage Persona",`;

const SESSION_DIFF_BIND_ANCHOR = `        renderDetail(payload);
        applyPanelLanguageChrome();`;

const SESSION_DIFF_BIND_INSERT = `        renderDetail(payload);
        document.querySelectorAll("[data-open-session-diff]").forEach((node) => {
          node.addEventListener("click", () => {
            const eventIndex = String(node.dataset.openSessionDiff || "");
            const replay = state && state.payload && state.payload.traceDashboard && state.payload.traceDashboard.session_replay
              ? state.payload.traceDashboard.session_replay
              : {};
            const changes = Array.isArray(replay.code_changes) ? replay.code_changes : [];
            const fallbackIndex = Number.parseInt(eventIndex, 10);
            const change = changes.find((item) => String(item && item.event_index) === eventIndex)
              || (Number.isInteger(fallbackIndex) ? changes[fallbackIndex] : undefined);
            const diff = change && change.diff && typeof change.diff === "object" ? change.diff : {};
            if (!diff.preview) return;
            vscode.postMessage({
              type: "openSessionToolDiff",
              threadId: node.dataset.openSessionDiffThread || state.selectedThreadId || "",
              title: (change && (change.summary || change.title)) || diff.summary || "Session tool diff",
              timestamp: (change && change.timestamp) || "",
              toolName: (change && change.tool_name) || "",
              diff,
            });
          });
        });
        document.querySelectorAll("[data-generate-thread-evidence-review]").forEach((node) => {
          node.addEventListener("click", () => {
            const threadId = node.dataset.generateThreadEvidenceReview || "";
            if (!threadId || node.disabled) return;
            vscode.postMessage({
              type: "generateThreadEvidenceReview",
              threadId,
              force: true,
            });
          });
        });
        applyPanelLanguageChrome();`;

function injectUsageCacheSummaryCards(script) {
  if (!String(script || "").includes(USAGE_CACHE_SUMMARY_ANCHOR)) return script;
  if (String(script || "").includes('"Cached Input"')) return script;
  return script.replace(USAGE_CACHE_SUMMARY_ANCHOR, USAGE_CACHE_SUMMARY_INSERT);
}

function injectSessionDiffBinder(script) {
  if (!String(script || "").includes(SESSION_DIFF_BIND_ANCHOR)) return script;
  if (String(script || "").includes("openSessionToolDiff")) return script;
  return script.replace(SESSION_DIFF_BIND_ANCHOR, SESSION_DIFF_BIND_INSERT);
}

function getRenderRuntimeScript() {
  return injectSessionDiffBinder(injectUsageCacheSummaryCards([
    chunk01,
    chunk02,
    chunk03,
    chunk04,
  ].join("")));
}

module.exports = {
  getRenderRuntimeScript,
};
