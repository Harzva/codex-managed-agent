function renderInsightsSections() {
  return `<section class="overview-digest">
          <div class="panel">
            <div class="section-title">Usage Report</div>
            <div class="section-note" id="usageReportNote">A persisted local reading of your thread habits, pacing, and workflow style.</div>
            <div class="summary-deck" id="usageSummary"></div>
            <div class="insight-chip-list" id="usageKeywords"></div>
          </div>
          <div class="panel">
            <div class="section-title">Vibe Advice</div>
            <div class="section-note" id="vibeAdviceNote">Suggestions grounded in simple stack, plan-first, stepwise verification, and modular context control.</div>
            <div class="insight-list" id="vibeAdvice"></div>
            <div class="insight-list" id="analysisViews"></div>
          </div>
        </section>
        <section class="overview-digest">
          <div class="panel">
            <div class="section-title">Topic Map</div>
            <div class="section-note">A compact visual mind map built from recurring themes, dominant working styles, and top threads.</div>
            <div id="topicMap" class="topic-map"></div>
          </div>
          <div class="panel">
            <div class="section-title">This Week Shift</div>
            <div class="section-note">See whether this week leans more toward planning, automation, execution, or UI vibing than the previous week.</div>
            <div id="weeklyShift" class="insight-list"></div>
            <div class="section-title compact-title">Word Cloud</div>
            <div id="wordCloud" class="word-cloud"></div>
          </div>
        </section>`;
}

module.exports = {
  renderInsightsSections,
};
