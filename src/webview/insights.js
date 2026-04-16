function renderInsightsSections() {
  return `<section class="insights-dashboard-shell">
          <section class="insights-dashboard-grid">
            <div class="panel insights-panel insights-panel-usage">
              <div class="section-title">Usage Report</div>
              <div class="section-note" id="usageReportNote">A persisted local reading of your thread habits, pacing, and workflow style.</div>
              <div class="cmd-actions" id="usageActions"></div>
              <div class="summary-deck summary-deck-insights" id="usageSummary"></div>
              <div id="tokenTrend" class="token-trend-shell"></div>
              <div id="tokenThreadRanking" class="token-thread-ranking-shell"></div>
              <div class="insight-chip-list" id="usageKeywords"></div>
            </div>
            <div class="panel insights-panel insights-panel-topic">
              <div class="section-title">Topic Map</div>
              <div class="section-note">A compact visual mind map built from recurring themes, dominant working styles, and top threads.</div>
              <div id="topicMap" class="topic-map topic-map-board"></div>
            </div>
            <div class="panel insights-panel insights-panel-advice">
              <div class="section-title">Vibe Advice</div>
              <div class="section-note" id="vibeAdviceNote">Suggestions grounded in simple stack, plan-first, stepwise verification, and modular context control.</div>
              <div class="insight-list insight-list-dense" id="vibeAdvice"></div>
            </div>
            <div class="panel insights-panel insights-panel-weekly">
              <div class="section-title">This Week Shift</div>
              <div class="section-note">See whether this week leans more toward planning, automation, execution, or UI vibing than the previous week.</div>
              <div id="weeklyShift" class="insight-list insight-list-dense"></div>
            </div>
            <div class="panel insights-panel insights-panel-patterns">
              <div class="section-title">Behavior Signals</div>
              <div class="section-note">Short pattern readouts extracted from analysis views, usage habits, and thread rhythm.</div>
              <div class="insight-list insight-list-dense" id="analysisViews"></div>
            </div>
            <div class="panel insights-panel insights-panel-heatmap">
              <div class="section-title">Vibe Interaction</div>
              <div class="section-note" id="interactionHeatmapNote">Codex CLI and loop turns count here after a real Codex response. Idle daemon runtime stays excluded.</div>
              <div id="interactionHeatmap" class="interaction-heatmap-shell"></div>
            </div>
            <div class="panel insights-panel insights-panel-wordcloud">
              <div class="section-title">Word Cloud</div>
              <div class="section-note">High-frequency concepts surfaced from prompts, thread titles, and topic-map anchors.</div>
              <div id="wordCloud" class="word-cloud word-cloud-board"></div>
            </div>
          </section>
        </section>`;
}

module.exports = {
  renderInsightsSections,
};
