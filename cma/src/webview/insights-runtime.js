function getInsightsRuntimeScript() {
  return `
      function renderKeywordChip(item) {
        const keyword = item.keyword || "";
        return '<button class="keyword-chip" type="button" data-topic-node="true" data-topic-group="keyword" data-topic-label="' + esc(keyword) + '" data-topic-focus="' + esc(keyword) + '"><span>' + esc(keyword) + '</span><span class="count">×' + esc(String(item.count || 0)) + '</span></button>';
      }

      const USAGE_RANGE_OPTIONS = [
        { key: "all", label: "All" },
        { key: "24h", label: "24h" },
        { key: "7d", label: "7d" },
        { key: "30d", label: "30d" },
        { key: "90d", label: "90d" },
        { key: "custom", label: "Custom" },
      ];

      function usageRangeKey() {
        return USAGE_RANGE_OPTIONS.some((item) => item.key === state.ui.usageRange) ? state.ui.usageRange : "all";
      }

      function usageRangeLabel(key = usageRangeKey()) {
        if (key === "custom") {
          const start = String(state.ui.usageCustomStart || "").trim();
          const end = String(state.ui.usageCustomEnd || "").trim();
          if (start && end) return start + " to " + end;
          if (start) return "Since " + start;
          if (end) return "Until " + end;
          return "Custom";
        }
        const item = USAGE_RANGE_OPTIONS.find((option) => option.key === key);
        return item ? item.label : "All";
      }

      function usageRangeStartMs(key = usageRangeKey(), nowMs = Date.now()) {
        if (key === "custom") {
          const start = Date.parse(String(state.ui.usageCustomStart || "").trim());
          return Number.isFinite(start) ? start : 0;
        }
        const dayMs = 24 * 60 * 60 * 1000;
        if (key === "24h") return nowMs - dayMs;
        if (key === "7d") return nowMs - 7 * dayMs;
        if (key === "30d") return nowMs - 30 * dayMs;
        if (key === "90d") return nowMs - 90 * dayMs;
        return 0;
      }

      function usageRangeEndMs(key = usageRangeKey()) {
        if (key !== "custom") return Infinity;
        const endText = String(state.ui.usageCustomEnd || "").trim();
        if (!endText) return Infinity;
        const end = Date.parse(endText + "T23:59:59.999Z");
        return Number.isFinite(end) ? end : Infinity;
      }

      function threadUsageTimeMs(thread) {
        const raw = (thread && (thread.updated_at_iso || thread.updated_at || thread.created_at_iso || thread.created_at)) || "";
        if (typeof raw === "number" || /^\\d+$/.test(String(raw))) {
          const num = Number(raw);
          if (Number.isFinite(num) && num > 0) return num > 1000000000000 ? num : num * 1000;
        }
        const parsed = Date.parse(String(raw || ""));
        return Number.isFinite(parsed) ? parsed : 0;
      }

      function filterThreadsByUsageRange(threads, key = usageRangeKey()) {
        const source = Array.isArray(threads) ? threads : [];
        const start = usageRangeStartMs(key);
        const end = usageRangeEndMs(key);
        if (!start && end === Infinity) return source;
        return source.filter((thread) => {
          const timeMs = threadUsageTimeMs(thread);
          return Number.isFinite(timeMs) && timeMs >= start && timeMs <= end;
        });
      }

      function filterDayBucketsByUsageRange(days, key = usageRangeKey()) {
        const source = Array.isArray(days) ? days : [];
        const start = usageRangeStartMs(key);
        const end = usageRangeEndMs(key);
        if (!start && end === Infinity) return source;
        const startDay = start ? formatIsoDayUtc(start) : "";
        const endDay = end !== Infinity ? formatIsoDayUtc(end) : "";
        return source.filter((item) => {
          const day = String(item && item.day || "").slice(0, 10);
          return (!startDay || day >= startDay) && (!endDay || day <= endDay);
        });
      }

      function filterTokenRankingByUsageRange(rows, key = usageRangeKey()) {
        const source = Array.isArray(rows) ? rows : [];
        const start = usageRangeStartMs(key);
        const end = usageRangeEndMs(key);
        if (!start && end === Infinity) return source;
        return source.filter((item) => {
          const parsed = Date.parse(String((item && item.latest_at) || ""));
          return Number.isFinite(parsed) && parsed >= start && parsed <= end;
        });
      }

      function rangeFilteredInsights(insights, key = usageRangeKey()) {
        if (!insights || key === "all") return insights;
        const recentTokenDays = filterDayBucketsByUsageRange(insights && insights.activity && insights.activity.recent_token_days, key);
        const tokenTotal = recentTokenDays.reduce((sum, item) => sum + Number(item && item.total_tokens || 0), 0);
        const eventTotal = recentTokenDays.reduce((sum, item) => sum + Number(item && item.events || 0), 0);
        const cachedInputTotal = recentTokenDays.reduce((sum, item) => sum + Number(item && item.cached_input_tokens || 0), 0);
        const uncachedInputTotal = recentTokenDays.reduce((sum, item) => sum + Number(item && item.uncached_input_tokens || 0), 0);
        const cacheKnownInputTotal = recentTokenDays.reduce((sum, item) => sum + Number(item && item.cache_known_input_tokens || 0), 0);
        const reasoningOutputTotal = recentTokenDays.reduce((sum, item) => sum + Number(item && item.reasoning_output_tokens || 0), 0);
        const cacheKnownEvents = recentTokenDays.reduce((sum, item) => sum + Number(item && item.cache_known_events || 0), 0);
        const cacheUnknownEvents = recentTokenDays.reduce((sum, item) => sum + Number(item && item.cache_unknown_events || 0), 0);
        const tokenTopThreads = filterTokenRankingByUsageRange(insights && insights.token_top_threads, key);
        const latest = recentTokenDays.length ? recentTokenDays[recentTokenDays.length - 1].day : "";
        return {
          ...insights,
          summary: {
            ...(insights.summary || {}),
            total_tokens: tokenTotal,
            manual_cli_tokens: 0,
            loop_tokens: 0,
            auto_continue_tokens: 0,
            total_inputs: eventTotal,
            total_cached_input_tokens: cachedInputTotal,
            total_uncached_input_tokens: uncachedInputTotal,
            cache_known_input_tokens: cacheKnownInputTotal,
            cache_known_events: cacheKnownEvents,
            cache_unknown_events: cacheUnknownEvents,
            cache_hit_rate: cacheKnownInputTotal > 0 ? cachedInputTotal / cacheKnownInputTotal : null,
            total_reasoning_output_tokens: reasoningOutputTotal,
            last_token_event_at: latest,
          },
          activity: {
            ...(insights.activity || {}),
            recent_token_days: recentTokenDays,
          },
          token_top_threads: tokenTopThreads,
        };
      }

      function buildUsageSummaryForRange(insights, threads, key = usageRangeKey()) {
        const scopedInsights = rangeFilteredInsights(insights, key);
        const scopedThreads = filterThreadsByUsageRange(threads, key);
        const threadTokens = scopedThreads.reduce((sum, thread) => sum + Number(thread && thread.tokens_used || 0), 0);
        const summary = scopedInsights && scopedInsights.summary ? scopedInsights.summary : {};
        const reportTokens = Number(summary.total_tokens || 0);
        const totalTokens = key === "all" ? (reportTokens || threadTokens) : (threadTokens || reportTokens);
        const latestThreadMs = Math.max(0, ...scopedThreads.map((thread) => threadUsageTimeMs(thread)).filter((value) => Number.isFinite(value)));
        const latestReport = summary.last_token_event_at;
        const cacheHitRate = summary.cache_hit_rate === null || summary.cache_hit_rate === undefined
          ? null
          : Number(summary.cache_hit_rate);
        return {
          insights: scopedInsights,
          threads: scopedThreads,
          totalTokens,
          totalInputs: Number(summary.total_inputs || 0),
          cachedInputTokens: Number(summary.total_cached_input_tokens || 0),
          uncachedInputTokens: Number(summary.total_uncached_input_tokens || 0),
          cacheKnownInputTokens: Number(summary.cache_known_input_tokens || 0),
          cacheKnownEvents: Number(summary.cache_known_events || 0),
          cacheUnknownEvents: Number(summary.cache_unknown_events || 0),
          cacheHitRate: Number.isFinite(cacheHitRate) ? cacheHitRate : null,
          reasoningOutputTokens: Number(summary.total_reasoning_output_tokens || 0),
          lastTokenEventAt: latestReport || (latestThreadMs ? new Date(latestThreadMs).toISOString() : ""),
          rangeLabel: usageRangeLabel(key),
          basis: key === "all" ? "All available local history" : ("Filtered to " + usageRangeLabel(key) + " by thread/update or token-day timestamps"),
        };
      }

      function renderUsageRangeControl() {
        const active = usageRangeKey();
        return '<div class="usage-range-group" aria-label="Usage statistics range">' +
          '<span class="usage-range-label">Range</span>' +
          USAGE_RANGE_OPTIONS.map((item) =>
            '<button class="chip usage-range-chip' + (item.key === active ? ' active' : '') + '" data-usage-range="' + esc(item.key) + '" type="button">' + esc(item.label) + '</button>'
          ).join("") +
          (active === "custom"
            ? '<span class="usage-custom-range"><input class="usage-date-input" data-usage-custom-start="true" type="date" value="' + esc(state.ui.usageCustomStart || "") + '" /><span class="usage-range-separator">to</span><input class="usage-date-input" data-usage-custom-end="true" type="date" value="' + esc(state.ui.usageCustomEnd || "") + '" /></span>'
            : '') +
        '</div>';
      }

      function renderWordCloud(items, insights) {
        const sourceItems = Array.isArray(items) && items.length
          ? items
          : (Array.isArray(insights && insights.keywords) ? insights.keywords : []);
        if (!sourceItems.length) {
          return '<div class="sub">暂无关键词数据</div>';
        }
        const maxCount = Math.max(...sourceItems.map((item) => Number(item.count || 0)), 1);
        return sourceItems.slice(0, 18).map((item) => {
          const ratio = Number(item.count || 0) / maxCount;
          const bucket = ratio >= 0.85 ? 5 : ratio >= 0.65 ? 4 : ratio >= 0.45 ? 3 : ratio >= 0.25 ? 2 : 1;
          const keyword = item.keyword || "";
          return '<button class="word-cloud-token weight-' + bucket + '" type="button" data-topic-node="true" data-topic-group="keyword" data-topic-label="' + esc(keyword) + '" data-topic-focus="' + esc(keyword) + '">' + esc(keyword) + '</button>';
        }).join("");
      }

      function renderInteractionHeatmap(insights) {
        const heatmap = insights && insights.interaction_heatmap;
        const days = Array.isArray(heatmap && heatmap.days) ? heatmap.days : [];
        if (!days.length) {
          return renderCuteEmpty("Interaction heatmap unavailable", "Once local user-input history accumulates, this panel will show a vibe-style contribution grid based only on direct prompts.", MEDIA.rest);
        }
        const monthLabels = Array.isArray(heatmap.month_labels) ? heatmap.month_labels : [];
        const weekdays = Array.isArray(heatmap.weekday_labels) ? heatmap.weekday_labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
        const maxCount = Number(heatmap.max_count || 0);
        const monthTrack = monthLabels.map((item) => {
          const left = Math.max(0, Number(item.week_index || 0)) * 17;
          return '<span class="interaction-heatmap-month-label" style="left:' + esc(String(left)) + 'px">' + esc(item.label || "") + '</span>';
        }).join("");
        const grid = days.map((item) => {
          const count = Number(item.count || 0);
          const level = Math.max(0, Math.min(4, Number(item.level || 0)));
          const title = (item.date || "") + " · " + String(count) + " user input" + (count === 1 ? "" : "s");
          return '<span class="interaction-cell level-' + esc(String(level)) + '" title="' + esc(title) + '"></span>';
        }).join("");
        let activeStreak = 0;
        let longestStreak = 0;
        let currentRun = 0;
        days.forEach((item) => {
          const count = Number(item.count || 0);
          if (count > 0) {
            currentRun += 1;
            longestStreak = Math.max(longestStreak, currentRun);
          } else {
            currentRun = 0;
          }
        });
        for (let index = days.length - 1; index >= 0; index -= 1) {
          if (Number(days[index].count || 0) > 0) activeStreak += 1;
          else break;
        }
        const weekdayLabels = weekdays.map((label, index) => '<span>' + esc(index % 2 === 0 ? label : "") + '</span>').join("");
        return '<div class="interaction-heatmap-shell">' +
          '<div class="interaction-heatmap-meta">' +
            '<span class="meta-pill">' + esc(String((heatmap.window_label) || "Recent weeks")) + '</span>' +
            '<span class="meta-pill">' + esc(String(heatmap.total_inputs || 0)) + ' inputs</span>' +
            '<span class="meta-pill">' + esc(String(heatmap.active_days || 0)) + ' active days</span>' +
            '<span class="meta-pill">active streak ' + esc(String(activeStreak)) + '</span>' +
            '<span class="meta-pill">longest ' + esc(String(longestStreak)) + '</span>' +
            (maxCount ? '<span class="meta-pill">peak ' + esc(String(maxCount)) + '/day</span>' : '') +
          '</div>' +
          '<div class="interaction-heatmap-board">' +
            '<div class="interaction-heatmap-months"><span></span><div class="interaction-heatmap-month-track">' + monthTrack + '</div></div>' +
            '<div class="interaction-heatmap-grid-wrap">' +
              '<div class="interaction-heatmap-weekdays">' + weekdayLabels + '</div>' +
              '<div class="interaction-heatmap-grid">' + grid + '</div>' +
            '</div>' +
            '<div class="interaction-heatmap-legend">' +
              '<span class="sub">' + esc((heatmap.basis) || "Only direct user inputs are counted here.") + '</span>' +
              '<span class="interaction-heatmap-legend-scale">Less <span class="interaction-cell level-0"></span><span class="interaction-cell level-1"></span><span class="interaction-cell level-2"></span><span class="interaction-cell level-3"></span><span class="interaction-cell level-4"></span> More</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }

      function parseIsoDayUtc(day) {
        const match = String(day || "").match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
        if (!match) return null;
        return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      }

      function formatIsoDayUtc(timeMs) {
        return new Date(timeMs).toISOString().slice(0, 10);
      }

      function normalizeDailyTokenBuckets(days, maxDays = 28) {
        const buckets = new Map();
        (Array.isArray(days) ? days : []).forEach((item) => {
          const day = String(item && item.day || "").slice(0, 10);
          if (!parseIsoDayUtc(day)) return;
          const current = buckets.get(day) || { day, total_tokens: 0, events: 0, thread_count: 0 };
          current.total_tokens += Number(item.total_tokens || 0);
          current.events += Number(item.events || 0);
          current.thread_count += Number(item.thread_count || 0);
          buckets.set(day, current);
        });
        const sortedDays = [...buckets.keys()].sort();
        if (!sortedDays.length) return [];
        const oneDayMs = 24 * 60 * 60 * 1000;
        const lastMs = parseIsoDayUtc(sortedDays[sortedDays.length - 1]);
        const firstRecordedMs = parseIsoDayUtc(sortedDays[0]);
        const startMs = Math.max(firstRecordedMs, lastMs - (Math.max(1, Number(maxDays || 28)) - 1) * oneDayMs);
        const normalized = [];
        for (let cursor = startMs; cursor <= lastMs; cursor += oneDayMs) {
          const day = formatIsoDayUtc(cursor);
          normalized.push(buckets.get(day) || { day, total_tokens: 0, events: 0 });
        }
        return normalized;
      }

      function tokenDayFromThread(thread) {
        const raw = (thread && (thread.updated_at_iso || thread.updated_at || thread.created_at_iso || thread.created_at)) || "";
        if (typeof raw === "number" || /^\\d+$/.test(String(raw))) {
          const num = Number(raw);
          if (Number.isFinite(num) && num > 0) {
            const ms = num > 1000000000000 ? num : num * 1000;
            return new Date(ms).toISOString().slice(0, 10);
          }
        }
        const parsed = Date.parse(String(raw || ""));
        if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
        const textDay = String(raw || "").slice(0, 10);
        return parseIsoDayUtc(textDay) ? textDay : "";
      }

      function buildThreadTokenDays(threads) {
        const buckets = new Map();
        (Array.isArray(threads) ? threads : []).forEach((thread) => {
          const totalTokens = Number(thread && thread.tokens_used || 0);
          const day = tokenDayFromThread(thread);
          if (!day || !parseIsoDayUtc(day) || !Number.isFinite(totalTokens) || totalTokens <= 0) return;
          const current = buckets.get(day) || { day, total_tokens: 0, events: 0, thread_count: 0 };
          current.total_tokens += totalTokens;
          current.thread_count += 1;
          buckets.set(day, current);
        });
        return [...buckets.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
      }

      function renderTokenTrend(insights, threads = [], rangeKey = usageRangeKey()) {
        const scopedInsights = rangeFilteredInsights(insights, rangeKey);
        const scopedThreads = filterThreadsByUsageRange(threads, rangeKey);
        const threadDays = buildThreadTokenDays(scopedThreads);
        const ledgerDays = Array.isArray(scopedInsights && scopedInsights.activity && scopedInsights.activity.recent_token_days)
          ? scopedInsights.activity.recent_token_days.filter((item) => item && item.day)
          : [];
        const useThreadDays = threadDays.length > 0;
        const days = useThreadDays ? threadDays : ledgerDays;
        if (!days.length && scopedInsights && scopedInsights.summary && Number(scopedInsights.summary.total_tokens || 0) > 0) {
          const day = String(scopedInsights.summary.last_token_event_at || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
          days.push({ day, total_tokens: Number(scopedInsights.summary.total_tokens || 0), events: 1 });
        }
        if (!days.length) {
          return renderCuteEmpty("No token trend yet", "No thread token totals are available yet. Scan Codex sessions or generate token insights after CLI runs.", MEDIA.waiting);
        }
        const recent = normalizeDailyTokenBuckets(days, useThreadDays ? 84 : 28);
        if (!recent.length) {
          return renderCuteEmpty("No token trend yet", "Token data exists, but timestamps could not be grouped by day. Scan sessions or regenerate token insights after the next CLI run.", MEDIA.waiting);
        }
        const width = 720;
        const height = 170;
        const padX = 18;
        const padY = 18;
        const baseline = height - padY;
        const maxTokens = Math.max(...recent.map((item) => Number(item.total_tokens || 0)), 1);
        const slot = (width - padX * 2) / Math.max(recent.length, 1);
        const barWidth = Math.min(22, Math.max(4, slot * 0.52));
        const points = recent.map((item, index) => {
          const x = padX + (slot * index) + slot / 2;
          const y = baseline - ((Number(item.total_tokens || 0) / maxTokens) * (height - padY * 2));
          return { x, y, item };
        });
        const line = points.map((point) => point.x.toFixed(1) + "," + point.y.toFixed(1)).join(" ");
        const area = points.length
          ? (points[0].x.toFixed(1) + "," + baseline + " " + line + " " + (points[points.length - 1].x.toFixed(1)) + "," + baseline)
          : "";
        const total = recent.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0);
        const barMarkup = points.map((point) => {
          const value = Number(point.item.total_tokens || 0);
          const barHeight = Math.max(value > 0 ? 2 : 0, baseline - point.y);
          const y = baseline - barHeight;
          const count = Number((useThreadDays ? point.item.thread_count : point.item.events) || 0);
          const unit = useThreadDays ? "thread" : "event";
          return '<rect class="token-chart-bar" x="' + esc((point.x - barWidth / 2).toFixed(1)) + '" y="' + esc(y.toFixed(1)) + '" width="' + esc(barWidth.toFixed(1)) + '" height="' + esc(barHeight.toFixed(1)) + '" rx="4"><title>' +
            esc(String(point.item.day) + " · " + compactTokenCount(value) + " tokens · " + String(count) + " " + unit + (count === 1 ? "" : "s")) +
          '</title></rect>';
        }).join("");
        const pointMarkup = points.map((point) =>
          '<circle class="token-chart-point" cx="' + esc(point.x.toFixed(1)) + '" cy="' + esc(point.y.toFixed(1)) + '" r="3"><title>' +
            esc(String(point.item.day) + " · " + compactTokenCount(point.item.total_tokens) + " tokens") +
          '</title></circle>'
        ).join("");
        const basis = useThreadDays
          ? "All loaded threads · grouped by last updated day"
          : "Known CLI token events · missing days filled as 0";
        return '<div class="token-trend-card">' +
          '<div class="token-trend-head"><div><strong>Token Trend</strong><div class="sub">Daily token usage · ' + esc(usageRangeLabel(rangeKey)) + ' · ' + esc(basis) + ' · ' + esc(String(recent.length)) + ' day' + (recent.length === 1 ? "" : "s") + '</div></div><span class="meta-pill">' + esc(compactTokenCount(total)) + ' tokens</span></div>' +
          '<svg class="token-chart" viewBox="0 0 ' + esc(String(width)) + ' ' + esc(String(height)) + '" role="img" aria-label="Token trend chart">' +
            '<defs><linearGradient id="tokenBarGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#7ee7ff"></stop><stop offset="100%" stop-color="#ffd66b"></stop></linearGradient></defs>' +
            '<line class="token-chart-grid" x1="' + esc(String(padX)) + '" y1="' + esc(String(height - padY)) + '" x2="' + esc(String(width - padX)) + '" y2="' + esc(String(height - padY)) + '"></line>' +
            '<line class="token-chart-grid" x1="' + esc(String(padX)) + '" y1="' + esc(String(padY)) + '" x2="' + esc(String(width - padX)) + '" y2="' + esc(String(padY)) + '"></line>' +
            (area ? '<polygon class="token-chart-area" points="' + esc(area) + '"></polygon>' : '') +
            barMarkup +
            '<polyline class="token-chart-line" points="' + esc(line) + '"></polyline>' +
            pointMarkup +
            '<text class="token-axis" x="' + esc(String(padX)) + '" y="' + esc(String(height - 4)) + '">' + esc(recent[0].day || "") + '</text>' +
            '<text class="token-axis" text-anchor="end" x="' + esc(String(width - padX)) + '" y="' + esc(String(height - 4)) + '">' + esc(recent[recent.length - 1].day || "") + '</text>' +
          '</svg>' +
        '</div>';
      }

      function renderHorizontalBarChart({ title, subtitle, rows, emptyTitle, emptyCopy, valueFormatter, limit = 8 }) {
        const safeRows = (Array.isArray(rows) ? rows : [])
          .map((row) => ({
            label: String(row && row.label || "").trim(),
            value: Number(row && row.value || 0),
            meta: String(row && row.meta || "").trim(),
            title: String(row && row.title || row && row.label || "").trim(),
            filterValue: String(row && row.filterValue || "").trim(),
            active: Boolean(row && row.active),
          }))
          .filter((row) => row.label && Number.isFinite(row.value) && row.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, Math.max(1, Number(limit || 8)));
        if (!safeRows.length) {
          return renderCuteEmpty(emptyTitle || "No chart data yet", emptyCopy || "This chart appears after matching local thread metadata is available.", MEDIA.rest);
        }
        const maxValue = Math.max(...safeRows.map((row) => row.value), 1);
        const total = safeRows.reduce((sum, row) => sum + row.value, 0);
        const formatValue = typeof valueFormatter === "function" ? valueFormatter : ((value) => String(value));
        return '<div class="insight-horizontal-bar-card">' +
          '<div class="insight-horizontal-bar-head"><div><strong>' + esc(title || "Insight Ranking") + '</strong><div class="sub">' + esc(subtitle || "Read-only local ranking") + '</div></div><span class="meta-pill">' + esc(formatValue(total)) + '</span></div>' +
          '<div class="insight-horizontal-bar-list">' +
            safeRows.map((row) => {
              const pct = Math.max(2, Math.min(100, (row.value / maxValue) * 100));
              const valueLabel = formatValue(row.value);
              const meta = row.meta ? " · " + row.meta : "";
              const rowClass = "insight-horizontal-bar-row" + (row.active ? " active" : "");
              const rowTitle = (row.title || row.label) + " · " + valueLabel + meta;
              const rowInner = '<div class="insight-horizontal-bar-label">' + esc(short(row.label, 34)) + '</div>' +
                '<div class="insight-horizontal-bar-track"><span class="insight-horizontal-bar-fill" style="width:' + esc(pct.toFixed(1)) + '%"></span></div>' +
                '<div class="insight-horizontal-bar-value">' + esc(valueLabel) + (row.meta ? '<span class="sub"> · ' + esc(row.meta) + '</span>' : '') + '</div>';
              if (row.filterValue) {
                return '<button class="' + esc(rowClass) + '" title="' + esc(rowTitle) + '" type="button" data-model-filter="' + esc(row.filterValue) + '" aria-pressed="' + esc(row.active ? "true" : "false") + '">' + rowInner + '</button>';
              }
              return '<div class="' + esc(rowClass) + '" title="' + esc(rowTitle) + '">' +
                rowInner +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';
      }

      function threadModelChartLabel(thread) {
        return threadModelDisplayLabel(thread);
      }

      function buildTokensByModelRows(threads) {
        const buckets = new Map();
        (Array.isArray(threads) ? threads : []).forEach((thread) => {
          const tokens = Number(thread && thread.tokens_used || 0);
          if (!Number.isFinite(tokens) || tokens <= 0) return;
          const label = threadModelChartLabel(thread);
          const bucket = buckets.get(label) || { label, value: 0, sessions: 0 };
          bucket.value += tokens;
          bucket.sessions += 1;
          buckets.set(label, bucket);
        });
        return [...buckets.values()].map((bucket) => ({
          label: bucket.label,
          value: bucket.value,
          meta: String(bucket.sessions) + " session" + (bucket.sessions === 1 ? "" : "s"),
          title: bucket.label,
          filterValue: bucket.label,
          active: state.ui.modelFilter === bucket.label,
        }));
      }

      function renderTokensByModelChart(threads = [], rangeKey = usageRangeKey()) {
        const scopedThreads = filterThreadsByUsageRange(threads, rangeKey);
        return renderHorizontalBarChart({
          title: "Tokens by Model",
          subtitle: usageRangeLabel(rangeKey) + " · loaded threads grouped by verified model metadata",
          rows: buildTokensByModelRows(scopedThreads),
          emptyTitle: "No model token chart yet",
          emptyCopy: "This chart needs loaded threads with local token totals. Unknown model labels are kept explicit when model metadata is missing.",
          valueFormatter: compactTokenCount,
          limit: 8,
        });
      }

      function formatToolCallCount(value) {
        const count = Math.max(0, Math.round(Number(value || 0)));
        return compactTokenCount(count) + " call" + (count === 1 ? "" : "s");
      }

      function toolCallEntriesForThread(thread) {
        const structured = Array.isArray(thread && thread.tool_call_counts) ? thread.tool_call_counts : [];
        const structuredPositive = structured.filter((entry) => Number(entry && entry.count || 0) > 0);
        if (structuredPositive.length) return structuredPositive;
        const legacyCounts = thread && thread.tool_counts && typeof thread.tool_counts === "object" && !Array.isArray(thread.tool_counts)
          ? thread.tool_counts
          : null;
        if (!legacyCounts) return [];
        return Object.keys(legacyCounts).map((name) => ({
          name,
          count: Number(legacyCounts[name] || 0),
        })).filter((entry) => Number.isFinite(entry.count) && entry.count > 0);
      }

      function buildToolsUsedRows(threads) {
        const buckets = new Map();
        (Array.isArray(threads) ? threads : []).forEach((thread) => {
          const entries = toolCallEntriesForThread(thread);
          const seenInThread = new Set();
          entries.forEach((entry) => {
            const label = String((entry && entry.name) || "unknown_tool").trim() || "unknown_tool";
            const count = Number(entry && entry.count || 0);
            if (!Number.isFinite(count) || count <= 0) return;
            const bucket = buckets.get(label) || { label, value: 0, threads: 0 };
            bucket.value += count;
            if (!seenInThread.has(label)) {
              bucket.threads += 1;
              seenInThread.add(label);
            }
            buckets.set(label, bucket);
          });
        });
        return [...buckets.values()].map((bucket) => ({
          label: bucket.label,
          value: bucket.value,
          meta: String(bucket.threads) + " thread" + (bucket.threads === 1 ? "" : "s"),
          title: bucket.label,
        }));
      }

      function renderToolsUsedChart(threads = [], rangeKey = usageRangeKey()) {
        const scopedThreads = filterThreadsByUsageRange(threads, rangeKey);
        return renderHorizontalBarChart({
          title: "Tools Used",
          subtitle: usageRangeLabel(rangeKey) + " · loaded threads grouped by verified structured tool-call counts",
          rows: buildToolsUsedRows(scopedThreads),
          emptyTitle: "No tool-call chart yet",
          emptyCopy: "This chart appears after loaded threads expose structured tool-call counts. Preview logs and rendered history are not parsed for this view.",
          valueFormatter: formatToolCallCount,
          limit: 8,
        });
      }

      function fallbackTokenRankingFromThreads(threads) {
        return (Array.isArray(threads) ? threads : [])
          .map((thread) => ({
            thread_id: thread.id,
            title: displayThreadTitle(thread, thread.id || "Thread"),
            total_tokens: Number(thread.tokens_used || 0),
            input_tokens: 0,
            output_tokens: 0,
            event_count: 0,
          }))
          .filter((item) => item.thread_id && item.total_tokens > 0)
          .sort((a, b) => b.total_tokens - a.total_tokens)
          .slice(0, 12)
          .map((item, index) => ({ ...item, rank: index + 1 }));
      }

      function looksLikeThreadId(value) {
        const text = String(value || "").trim();
        return /^0[0-9a-f]{2,}[-_][0-9a-f-]{10,}$/i.test(text) || /^[0-9a-f]{8,}-[0-9a-f-]{12,}$/i.test(text);
      }

      function resolveTokenThreadTitle(item, threadMap) {
        const threadId = String((item && item.thread_id) || "").trim();
        const thread = threadMap.get(threadId);
        if (thread) return displayThreadTitle(thread, "Thread");
        const candidate = String((item && item.title) || "").trim();
        if (candidate && candidate !== threadId && !looksLikeThreadId(candidate)) return candidate;
        return "Untitled Codex thread";
      }

      function renderTokenThreadRanking(insights, threads = [], rangeKey = usageRangeKey()) {
        const scopedInsights = rangeFilteredInsights(insights, rangeKey);
        const scopedThreads = filterThreadsByUsageRange(threads, rangeKey);
        const rawRows = Array.isArray(scopedInsights && scopedInsights.token_top_threads) && scopedInsights.token_top_threads.length
          ? scopedInsights.token_top_threads
          : fallbackTokenRankingFromThreads(scopedThreads);
        const rows = [...rawRows]
          .map((item) => ({
            ...(item || {}),
            total_tokens: Number(item && item.total_tokens || 0),
          }))
          .filter((item) => item.thread_id && item.total_tokens > 0)
          .sort((a, b) => b.total_tokens - a.total_tokens);
        if (!rows.length) {
          return renderCuteEmpty("No thread token ranking yet", "This ranking is pure local counting. It appears after token usage is present in the usage ledger or thread metadata.", MEDIA.rest);
        }
        const threadMap = new Map((Array.isArray(threads) ? threads : []).filter((thread) => thread && thread.id).map((thread) => [String(thread.id), thread]));
        const maxTokens = Math.max(...rows.map((item) => Number(item.total_tokens || 0)), 1);
        return '<div class="token-ranking-card">' +
          '<div class="token-ranking-head"><div><strong>Thread Token Ranking</strong><div class="sub">' + esc(usageRangeLabel(rangeKey)) + ' · ranked by known Codex CLI usage events or loaded thread metadata</div></div><span class="meta-pill">Top ' + esc(String(Math.min(rows.length, 12))) + '</span></div>' +
          '<div class="token-ranking-list">' +
            rows.slice(0, 12).map((item, index) => {
              const total = Number(item.total_tokens || 0);
              const pct = Math.max(2, Math.min(100, (total / maxTokens) * 100));
              const title = resolveTokenThreadTitle(item, threadMap);
              return '<div class="token-ranking-row" title="' + esc(item.thread_id || "") + '">' +
                '<div class="token-ranking-rank">#' + esc(String(index + 1)) + '</div>' +
                '<div><div class="token-ranking-title">' + esc(short(title, 54)) + '</div><div class="token-ranking-bar"><span class="token-ranking-fill" style="width:' + esc(pct.toFixed(1)) + '%"></span></div></div>' +
                '<div class="token-ranking-value">' + esc(compactTokenCount(total)) + '</div>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';
      }
  `.trim();
}

module.exports = {
  getInsightsRuntimeScript,
};
