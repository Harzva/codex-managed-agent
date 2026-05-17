function getThreadInsightPanelScript() {
  return `
      function renderThreadInsightPanel(threadId, insight) {
        const flowSteps = Array.isArray(insight && insight.flowSteps) ? insight.flowSteps : [];
        const advice = Array.isArray(insight && insight.vibeAdvice) ? insight.vibeAdvice : [];
        const evidenceReview = Array.isArray(insight && insight.evidenceReview) ? insight.evidenceReview : [];
        const stateKey = String((insight && insight.vibeAdviceState) || "idle");
        const evidenceStateKey = String((insight && insight.evidenceReviewState) || "idle");
        const stateLabel = stateKey === "loading"
          ? "Generating"
          : stateKey === "ready"
            ? (insight && insight.stale ? "Cached · stale" : "Cached")
            : stateKey === "error"
              ? "Error"
              : "Idle";
        const evidenceStateLabel = evidenceStateKey === "loading"
          ? "Generating"
          : evidenceStateKey === "ready"
            ? (insight && insight.evidenceReviewStale ? "Cached · stale" : "Cached")
            : evidenceStateKey === "error"
              ? "Error"
              : "Idle";
        const flowMarkup = flowSteps.length
          ? flowSteps.map((step, index) => (
              '<div class="cmd-card">' +
                '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge(String(index + 1).padStart(2, "0")) + '<span class="cmd-name">' + esc(step.title || "Flow step") + '</span></span><span class="meta-pill">' + esc(step.kind || "flow") + '</span></div>' +
                '<div class="cmd-hint">' + esc(step.meta || "") + '</div>' +
                '<div class="kv-value">' + esc(step.summary || "") + '</div>' +
              '</div>'
            )).join("")
          : '<div class="empty">Command flow will appear after this thread has user prompts, tool calls, or log events.</div>';
        const adviceMarkup = advice.length
          ? advice.map((item, index) => renderInsightCard(
              "Vibe Advice " + (index + 1),
              item && typeof item === "object" ? (item.advice || item.summary || item.text || "") : item,
              item && typeof item === "object" ? (item.tag || stateLabel) : stateLabel
            )).join("")
          : renderInsightCard("Vibe Advice", stateKey === "error" ? ((insight && insight.error) || "Could not generate advice.") : "No cached advice yet. Generate uses a compact thread-only prompt so it avoids oversized context.", stateLabel);
        const evidenceMarkup = evidenceReview.length
          ? evidenceReview.map((item, index) => renderInsightCard(
              "Evidence Review " + (index + 1),
              item && typeof item === "object" ? (item.summary || item.evidence || item.text || "") : item,
              item && typeof item === "object" ? (item.tag || evidenceStateLabel) : evidenceStateLabel
            )).join("")
          : renderInsightCard("Evidence Review", evidenceStateKey === "error" ? ((insight && insight.evidenceReviewError) || "Could not generate evidence review.") : "No cached evidence review yet. Generate uses compact message, tool, trace, and diff summaries only.", evidenceStateLabel);
        return '<div class="cmd-grid">' +
          '<div class="cmd-card">' +
            '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge("VF") + '<span class="cmd-name">Command Flow</span></span><span class="meta-pill">' + esc(String(flowSteps.length)) + ' steps</span></div>' +
            '<div class="cmd-grid">' + flowMarkup + '</div>' +
          '</div>' +
          '<div class="cmd-card">' +
            '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge("VA") + '<span class="cmd-name">Thread Vibe Advice</span></span><span class="meta-pill">' + esc(stateLabel) + '</span></div>' +
            '<div class="cmd-actions"><button class="action-btn secondary" data-generate-thread-advice="' + esc(threadId || "") + '" type="button"' + (stateKey === "loading" ? " disabled" : "") + '>' + esc(stateKey === "loading" ? "Generating..." : "Generate Vibe Advice") + '</button></div>' +
            '<div class="insight-list insight-list-dense">' + adviceMarkup + '</div>' +
          '</div>' +
          '<div class="cmd-card">' +
            '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge("ER") + '<span class="cmd-name">Thread Evidence Review</span></span><span class="meta-pill">' + esc(evidenceStateLabel) + '</span></div>' +
            '<div class="cmd-actions"><button class="action-btn secondary" data-generate-thread-evidence-review="' + esc(threadId || "") + '" type="button"' + (evidenceStateKey === "loading" ? " disabled" : "") + '>' + esc(evidenceStateKey === "loading" ? "Generating..." : "Summarize Thread Evidence") + '</button></div>' +
            '<div class="insight-list insight-list-dense">' + evidenceMarkup + '</div>' +
          '</div>' +
        '</div>';
      }
  `.trim();
}

module.exports = {
  getThreadInsightPanelScript,
};
