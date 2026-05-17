function getInsightsTopicMapScript() {
  return `
      function synthTopicMap(insights) {

        if (!insights) return null;
        const keywords = Array.isArray(insights.keywords) ? insights.keywords : [];
        const topThreads = Array.isArray(insights.top_threads) ? insights.top_threads : [];
        const dominant = Array.isArray(insights.style && insights.style.dominant) ? insights.style.dominant : [];
        if (!keywords.length && !topThreads.length && !dominant.length) return null;
        const nodes = [{ id: "center", label: "Codex Workbench", group: "center", weight: 1 }];
        const edges = [];
        dominant.slice(0, 3).forEach((item, index) => {
          const nodeId = "style-" + (index + 1);
          nodes.push({
            id: nodeId,
            label: String(item.label || "风格"),
            group: "style",
            weight: 0.7,
            focus_value: String(item.label || "风格"),
          });
          edges.push({ from: "center", to: nodeId });
        });
        keywords.slice(0, 8).forEach((item, index) => {
          const nodeId = "keyword-" + (index + 1);
          nodes.push({
            id: nodeId,
            label: String(item.keyword || ""),
            group: "keyword",
            weight: 0.5,
            focus_value: String(item.keyword || ""),
          });
          edges.push({ from: dominant.length ? ("style-" + ((index % Math.min(dominant.length, 3)) + 1)) : "center", to: nodeId });
        });
        topThreads.slice(0, 4).forEach((item, index) => {
          const nodeId = "thread-" + (index + 1);
          nodes.push({
            id: nodeId,
            label: String(item.title || item.id || "Thread"),
            group: "thread",
            weight: 0.6,
            thread_id: String(item.id || ""),
          });
          edges.push({ from: "center", to: nodeId });
        });
        return { title: "话题地图", nodes, edges };
      }

      function topicNodeMatchesFocus(node, focus) {
        if (!node || !focus) return false;
        if ((focus.group || "") === "thread") {
          return node.group === "thread" && String(node.thread_id || "") === String(focus.threadId || "");
        }
        return node.group === focus.group && String(node.focus_value || node.label || "") === String(focus.value || "");
      }

      function renderTopicMap(map, focus, insights) {
        const resolvedMap = map && Array.isArray(map.nodes) && map.nodes.length ? map : synthTopicMap(insights);
        if (!resolvedMap || !Array.isArray(resolvedMap.nodes) || !resolvedMap.nodes.length) {
          return renderCuteEmpty("Topic map pending", "As more threads and prompts accumulate, we will connect your hot topics here.", MEDIA.board);
        }
        const center = resolvedMap.nodes.find((node) => node.id === "center") || { id: "center", label: "Codex Workbench", group: "center" };
        const styles = resolvedMap.nodes.filter((node) => node.group === "style");
        const keywords = resolvedMap.nodes.filter((node) => node.group === "keyword").slice(0, 7);
        const threads = resolvedMap.nodes.filter((node) => node.group === "thread");
        const positions = {};
        positions[center.id] = { x: 360, y: 178, w: 172, h: 48 };
        const placeRing = (items, radius, startAngle, key) => {
          items.forEach((item, index) => {
            const angle = startAngle + (Math.PI * 2 * index) / Math.max(items.length, 1);
            positions[item.id] = {
              x: 360 + Math.cos(angle) * radius,
              y: 178 + Math.sin(angle) * radius,
              w: key === "thread" ? 176 : (key === "style" ? 136 : 124),
              h: key === "thread" ? 40 : 36,
            };
          });
        };
        placeRing(styles, 104, -Math.PI / 2, "style");
        placeRing(keywords, 194, -Math.PI / 3, "keyword");
        placeRing(threads, 276, Math.PI / 5, "thread");

        const edges = (resolvedMap.edges || []).map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return "";
          return '<line class="topic-edge" x1="' + from.x + '" y1="' + from.y + '" x2="' + to.x + '" y2="' + to.y + '"></line>';
        }).join("");
        const nodes = [center].concat(styles, keywords, threads).map((node) => {
          const pos = positions[node.id];
          if (!pos) return "";
          const x = pos.x - pos.w / 2;
          const y = pos.y - pos.h / 2;
          const isActive = topicNodeMatchesFocus(node, focus);
          const attrs = [
            'class="topic-node interactive ' + esc(node.group || "keyword") + (isActive ? ' active' : '') + '"',
            'data-topic-node="true"',
            'data-topic-group="' + esc(node.group || "") + '"',
            'data-topic-label="' + esc(node.label || "") + '"',
            node.thread_id ? 'data-topic-thread="' + esc(node.thread_id) + '"' : '',
            node.focus_value ? 'data-topic-focus="' + esc(node.focus_value) + '"' : '',
          ].filter(Boolean).join(" ");
          return '<g ' + attrs + '>' +
            '<rect x="' + x + '" y="' + y + '" rx="12" ry="12" width="' + pos.w + '" height="' + pos.h + '"></rect>' +
            '<text x="' + pos.x + '" y="' + pos.y + '" text-anchor="middle" dominant-baseline="middle">' + esc(short(String(node.label || ""), node.group === "thread" ? 24 : 18)) + '</text>' +
          '</g>';
        }).join("");
        return '<svg viewBox="0 0 720 360" role="img" aria-label="topic map">' + edges + nodes + '</svg>';
      }
  `.trim();
}

module.exports = {
  getInsightsTopicMapScript,
};
