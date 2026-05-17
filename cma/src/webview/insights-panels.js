function getInsightsPanelsScript() {
  return `      function renderVibeAdviceEvidence(insights) {
        if (!insights) {
          return "Suggestions grounded in simple stack, plan-first, stepwise verification, and modular context control.";
        }
        const persona = ((insights.guidance && insights.guidance.usage_persona) || ["均衡型"]).join(" · ");
        const shortPromptRatio = Math.round(Number(((insights.summary && insights.summary.short_prompt_ratio) || 0)) * 100);
        const compactions = Number((insights.summary && insights.summary.total_compactions) || 0);
        return "Grounded in current signals: persona " + persona + " · short prompts " + shortPromptRatio + "% · compactions " + compactions + ".";
      }

      function renderWeeklyHero(title, copy, metaLabel, stats, highlights) {
        const statItems = Array.isArray(stats) ? stats.filter(Boolean) : [];
        const highlightItems = Array.isArray(highlights) ? highlights.filter(Boolean) : [];
        return '<div class="weekly-report-shell">' +
          '<div class="weekly-hero">' +
            '<div class="weekly-hero-top">' +
              '<div><div class="weekly-kicker">Weekly Brief</div><div class="weekly-hero-title">' + esc(title) + '</div></div>' +
              (metaLabel ? '<span class="meta-pill">' + esc(metaLabel) + '</span>' : '') +
            '</div>' +
            '<div class="weekly-hero-copy">' + esc(copy) + '</div>' +
            (statItems.length ? '<div class="weekly-stat-row">' + statItems.map((item) =>
              '<div class="weekly-stat"><div class="weekly-stat-label">' + esc(item.label || '') + '</div><div class="weekly-stat-value">' + esc(item.value || '-') + '</div></div>'
            ).join('') + '</div>' : '') +
          '</div>' +
          (highlightItems.length ? '<div class="weekly-highlight-list">' + highlightItems.map((item) => '<div class="weekly-highlight">' + esc(item) + '</div>').join('') + '</div>' : '') +
        '</div>';
      }

      function renderWeeklyShift(insights) {
        const report = insights && insights.weekly_report;
        if (!report) {
          const style = insights && insights.style ? insights.style : {};
          const summary = insights && insights.summary ? insights.summary : {};
          const activity = insights && insights.activity ? insights.activity : {};
          const dominant = Array.isArray(style.dominant) ? style.dominant : [];
          const persona = dominant.length ? dominant.slice(0, 2).map((item) => item.label).join(" · ") : "均衡型";
          const topHour = Array.isArray(activity.top_hours) && activity.top_hours.length ? activity.top_hours[0] : null;
          const hourLabel = topHour ? (String(topHour.hour).padStart(2, "0") + ":00") : "Unknown";
          const inputCount = Number(summary.total_inputs || 0);
          const compactions = Number(summary.total_compactions || 0);
          const shortPrompts = Math.round(Number(summary.short_prompt_ratio || 0) * 100) + "%";
          return renderWeeklyHero(
            "Live Snapshot",
            "We do not have enough two-window history yet, so this snapshot summarizes the current working style and activity rhythm.",
            "Fallback",
            [
              { label: "Persona", value: persona },
              { label: "Peak Hour", value: hourLabel },
              { label: "Inputs", value: String(inputCount) },
            ],
            [
              "Context pressure is currently tracked at " + compactions + " compactions.",
              "Short prompt ratio sits around " + shortPrompts + ", which is a useful proxy for context switching pressure.",
              "As more local history accumulates, this panel will upgrade into a real week-on-week report automatically.",
            ]
          );
        }
        const highlights = Array.isArray(report.highlights) ? report.highlights : [];
        const shifts = Array.isArray(report.shifts) ? report.shifts : [];
        const leadShift = shifts.slice().sort((left, right) => Math.abs(Number(right.delta || 0)) - Math.abs(Number(left.delta || 0)))[0];
        const leadShiftLabel = (leadShift && leadShift.label) ? leadShift.label : "weekly rhythm";
        const leadShiftDelta = Math.round(Math.abs(Number((leadShift && leadShift.delta) || 0)) * 100);
        const headline = leadShift
          ? (leadShift.direction === "up"
              ? (leadShiftLabel + " is climbing this week")
              : leadShift.direction === "down"
                ? (leadShiftLabel + " is cooling this week")
                : (leadShiftLabel + " is staying stable"))
          : "Weekly rhythm is settling";
        const copy = leadShift
          ? (leadShift.direction === "up"
              ? ("Compared with the previous window, " + leadShiftLabel + " increased by about " + leadShiftDelta + "%, so the current workflow is leaning further in that direction.")
              : leadShift.direction === "down"
                ? ("Compared with the previous window, " + leadShiftLabel + " decreased by about " + leadShiftDelta + "%, which may be a signal to rebalance next week.")
                : ("Compared with the previous window, the strongest workflow signal stayed broadly flat."))
          : ((highlights[0]) || "We have enough data to compare windows, but no single behavior dominates the shift.");
        return renderWeeklyHero(
          headline,
          copy,
          (report.current_window || "Weekly"),
          [
            { label: "Current Persona", value: ((report.current_persona || ["均衡型"]).join(" · ")) },
            { label: "Previous", value: ((report.previous_persona || ["基线不足"]).join(" · ")) },
            { label: "Inputs", value: String(report.current_inputs || 0) },
          ],
          [
            ...highlights.slice(0, 2),
            ...(shifts.slice(0, 3).map((item) => {
              const deltaPct = Math.round(Math.abs(Number(item.delta || 0)) * 100);
              const arrow = item.direction === "up" ? "↑" : item.direction === "down" ? "↓" : "•";
              return arrow + " " + String(item.label || "Signal") + " " + deltaPct + "%";
            }))
          ]
        );
      }
`;
}

module.exports = {
  getInsightsPanelsScript,
};
