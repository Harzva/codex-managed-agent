const state = {
  bootstrap: null,
  health: null,
  activeCodex: null,
  inventory: null,
  threads: [],
  detail: null,
  insights: null,
  selectedThreadId: "",
  filter: "all",
  query: "",
  currentView: "overview",
  loading: false,
};

const titles = {
  overview: ["Overview", "Local runtime state and session health."],
  threads: ["Threads", "Scan, filter, and inspect local Codex sessions."],
  insights: ["Insights", "Usage evidence from the local Codex ledger."],
  settings: ["Settings", "Desktop host configuration and isolated state paths."],
};

const el = {
  notice: document.getElementById("notice"),
  backendPill: document.getElementById("backendPill"),
  viewTitle: document.getElementById("viewTitle"),
  viewKicker: document.getElementById("viewKicker"),
  refreshButton: document.getElementById("refreshButton"),
  openBackendButton: document.getElementById("openBackendButton"),
  serviceStatus: document.getElementById("serviceStatus"),
  serviceNote: document.getElementById("serviceNote"),
  codexStatus: document.getElementById("codexStatus"),
  codexNote: document.getElementById("codexNote"),
  sessionCount: document.getElementById("sessionCount"),
  sessionNote: document.getElementById("sessionNote"),
  runningCount: document.getElementById("runningCount"),
  recentThreads: document.getElementById("recentThreads"),
  runtimeList: document.getElementById("runtimeList"),
  threadSearch: document.getElementById("threadSearch"),
  threadList: document.getElementById("threadList"),
  detailPanel: document.getElementById("detailPanel"),
  insightsSummary: document.getElementById("insightsSummary"),
  heatmap: document.getElementById("heatmap"),
  hostInput: document.getElementById("hostInput"),
  portInput: document.getElementById("portInput"),
  codexHomeInput: document.getElementById("codexHomeInput"),
  refreshSecondsInput: document.getElementById("refreshSecondsInput"),
  chooseCodexHomeButton: document.getElementById("chooseCodexHomeButton"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
  settingsFoot: document.getElementById("settingsFoot"),
};

function text(value, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function short(value, max = 72) {
  const next = text(value);
  return next.length > max ? `${next.slice(0, max - 1).trimEnd()}...` : next;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatTime(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function setNotice(message, kind = "") {
  el.notice.textContent = message || "";
  el.notice.className = `notice${message ? " visible" : ""}${kind ? ` ${kind}` : ""}`;
}

function setLoading(loading) {
  state.loading = loading;
  el.refreshButton.disabled = loading;
  el.refreshButton.setAttribute("aria-busy", loading ? "true" : "false");
}

async function api(path, options = {}) {
  const response = await window.cma.api({
    method: options.method || "GET",
    path,
    body: options.body,
  });
  if (!response.ok) {
    const detail = response.payload && (response.payload.detail || response.payload.error);
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return response.payload;
}

function threadStatus(thread) {
  if (thread.soft_deleted) return "soft_deleted";
  return text(thread.status || (thread.archived ? "archived" : ""), "idle");
}

function filteredThreads() {
  const query = state.query.toLowerCase();
  return state.threads.filter((thread) => {
    const status = threadStatus(thread);
    if (state.filter !== "all") {
      if (state.filter === "recent" && !["recent", "active"].includes(status)) return false;
      if (state.filter !== "recent" && status !== state.filter) return false;
    }
    if (!query) return true;
    const haystack = [
      thread.id,
      thread.title,
      thread.cwd,
      thread.model,
      thread.model_provider,
      thread.rollout_path,
      thread.git_branch,
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function renderView() {
  const [title, kicker] = titles[state.currentView] || titles.overview;
  el.viewTitle.textContent = title;
  el.viewKicker.textContent = kicker;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${state.currentView}View`);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.currentView);
  });
}

function renderBackend() {
  const backend = state.bootstrap && state.bootstrap.backend;
  const healthOk = Boolean(state.health && state.health.ok);
  el.backendPill.textContent = backend ? `${backend.baseUrl.replace(/^http:\/\//, "")}` : "Unavailable";
  el.backendPill.className = `backend-pill ${healthOk ? "ok" : "bad"}`;
  el.serviceStatus.textContent = healthOk ? "Online" : "Offline";
  el.serviceStatus.className = `metric-value ${healthOk ? "ok" : "bad"}`;
  el.serviceNote.textContent = backend
    ? `${state.health?.backendMode || "node"} backend at ${backend.baseUrl}`
    : "Backend has not started";
}

function renderCodex() {
  const active = state.activeCodex || {};
  const ok = Boolean(active.ok);
  el.codexStatus.textContent = ok ? text(active.version, "Detected") : "Missing";
  el.codexStatus.className = `metric-value ${ok ? "ok" : "warn"}`;
  el.codexNote.textContent = ok
    ? short(active.path || active.command || "codex", 84)
    : short(active.error || "Install or expose Codex CLI on PATH", 84);
}

function renderMetrics() {
  const running = state.threads.filter((thread) => threadStatus(thread) === "running").length;
  el.sessionCount.textContent = String(state.threads.length);
  el.sessionNote.textContent = state.threads.length
    ? `${filteredThreads().length} visible with current filter`
    : "No local sessions found";
  el.runningCount.textContent = String(running);
}

function renderRuntime() {
  const bootstrap = state.bootstrap || {};
  const backend = bootstrap.backend || {};
  const settings = bootstrap.settings || {};
  const items = [
    ["Backend URL", backend.baseUrl || "Not started"],
    ["State root", backend.stateRoot || ""],
    ["Codex home", settings.codexHome || ""],
    ["Settings", bootstrap.paths?.settings || ""],
    ["Platform", `${bootstrap.platform || ""} / Electron ${bootstrap.versions?.electron || ""}`],
    ["Started", formatTime(backend.startedAt)],
  ];
  el.runtimeList.innerHTML = items.map(([key, value]) => {
    return `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`;
  }).join("");
}

function renderRecentThreads() {
  const items = state.threads.slice(0, 8);
  if (!items.length) {
    el.recentThreads.innerHTML = '<div class="empty-state">No Codex sessions were found in the configured Codex home.</div>';
    return;
  }
  el.recentThreads.innerHTML = items.map((thread) => {
    return `
      <button class="compact-row" type="button" data-thread-id="${escapeHtml(thread.id)}">
        <div class="compact-title">${escapeHtml(thread.title || thread.id)}</div>
        <div class="compact-meta">${escapeHtml(threadStatus(thread))} · ${escapeHtml(formatTime(thread.updated_at_iso || thread.updated_at))} · ${escapeHtml(short(thread.cwd || thread.rollout_path, 90))}</div>
      </button>
    `;
  }).join("");
  el.recentThreads.querySelectorAll("[data-thread-id]").forEach((node) => {
    node.addEventListener("click", () => {
      state.currentView = "threads";
      state.selectedThreadId = node.dataset.threadId || "";
      renderView();
      void selectThread(state.selectedThreadId);
    });
  });
}

function renderThreadList() {
  const items = filteredThreads();
  if (!items.length) {
    el.threadList.innerHTML = '<div class="empty-state">No threads match the current filter.</div>';
    return;
  }
  el.threadList.innerHTML = items.map((thread) => {
    const status = threadStatus(thread);
    const selected = state.selectedThreadId === thread.id ? " selected" : "";
    const meta = [
      thread.model || thread.model_provider || "",
      formatTime(thread.updated_at_iso || thread.updated_at),
      thread.cwd || "",
      thread.git_branch ? `git ${thread.git_branch}` : "",
      thread.rollout_path || "",
    ].filter(Boolean);
    return `
      <article class="thread-card${selected}" role="listitem" tabindex="0" data-thread-id="${escapeHtml(thread.id)}">
        <div class="thread-title-row">
          <div class="thread-title" title="${escapeHtml(thread.title || thread.id)}">${escapeHtml(thread.title || thread.id)}</div>
          <span class="status-badge ${escapeHtml(status)}">${escapeHtml(status.replace("_", " "))}</span>
        </div>
        <div class="thread-meta">
          ${meta.slice(0, 5).map((item) => `<span class="meta-pill" title="${escapeHtml(item)}">${escapeHtml(short(item, 58))}</span>`).join("")}
        </div>
      </article>
    `;
  }).join("");
  el.threadList.querySelectorAll("[data-thread-id]").forEach((node) => {
    const open = () => {
      state.selectedThreadId = node.dataset.threadId || "";
      void selectThread(state.selectedThreadId);
    };
    node.addEventListener("click", open);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });
}

function renderDetail() {
  const detail = state.detail;
  if (!detail || !detail.thread) {
    el.detailPanel.innerHTML = '<div class="empty-detail">Select a thread to inspect the evidence.</div>';
    return;
  }
  const thread = detail.thread;
  const status = threadStatus(thread);
  const history = Array.isArray(thread.history) ? thread.history.slice(-8) : [];
  const rolloutPath = thread.rollout_path || "";
  const actions = status === "archived"
    ? [["unarchive", "Unarchive"], ["soft_delete", "Soft Delete"]]
    : status === "soft_deleted"
      ? [["restore", "Restore"]]
      : [["archive", "Archive"], ["soft_delete", "Soft Delete"]];
  el.detailPanel.innerHTML = `
    <div class="detail-scroll">
      <div class="detail-title">${escapeHtml(thread.title || thread.id)}</div>
      <div class="thread-meta">
        <span class="status-badge ${escapeHtml(status)}">${escapeHtml(status.replace("_", " "))}</span>
        <span class="meta-pill">${escapeHtml(thread.model || thread.model_provider || "model unknown")}</span>
        <span class="meta-pill">${escapeHtml(formatTime(thread.updated_at_iso || thread.updated_at))}</span>
      </div>
      <dl class="runtime-list" style="margin-top:14px">
        <dt>Thread ID</dt><dd>${escapeHtml(thread.id || "")}</dd>
        <dt>Workspace</dt><dd>${escapeHtml(thread.cwd || "")}</dd>
        <dt>Rollout</dt><dd>${escapeHtml(rolloutPath)}</dd>
        <dt>Tokens</dt><dd>${escapeHtml(String(thread.tokens_used || thread.total_tokens || 0))}</dd>
      </dl>
      <div class="detail-actions">
        ${actions.map(([action, label]) => `<button class="text-button" type="button" data-lifecycle="${escapeHtml(action)}">${escapeHtml(label)}</button>`).join("")}
        ${rolloutPath ? '<button class="text-button" type="button" data-show-rollout>Reveal Rollout</button>' : ""}
      </div>
      <div class="history-stack">
        ${history.length ? history.map((item) => `
          <div class="history-item">
            <div class="history-role">${escapeHtml(item.role || item.type || "event")}</div>
            <div class="history-text">${escapeHtml(item.text || item.content || item.message || "")}</div>
          </div>
        `).join("") : '<div class="empty-state">No compact history preview available for this thread.</div>'}
      </div>
    </div>
  `;
  el.detailPanel.querySelectorAll("[data-lifecycle]").forEach((button) => {
    button.addEventListener("click", () => {
      void runLifecycle(button.dataset.lifecycle, thread.id);
    });
  });
  const reveal = el.detailPanel.querySelector("[data-show-rollout]");
  if (reveal && rolloutPath) {
    reveal.addEventListener("click", () => {
      void window.cma.showItem(rolloutPath);
    });
  }
}

function renderInsights() {
  const report = state.insights || {};
  const summary = report.summary || {};
  const items = [
    ["Total inputs", summary.total_inputs ?? report.total_inputs ?? "0"],
    ["Active days", summary.active_days ?? report.active_days ?? "0"],
    ["Generated", formatTime(report.generated_at || report.report_persisted_at)],
    ["Source", report.report_source || "local"],
  ];
  el.insightsSummary.innerHTML = items.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(value)}</dd>`).join("");

  const days = report.interaction_heatmap && Array.isArray(report.interaction_heatmap.days)
    ? report.interaction_heatmap.days.slice(-98)
    : [];
  if (!days.length) {
    el.heatmap.innerHTML = '<div class="empty-state">No persisted usage heatmap is available yet.</div>';
    return;
  }
  el.heatmap.innerHTML = days.map((day) => {
    const level = Math.max(0, Math.min(4, Number(day.level || 0)));
    const title = `${day.date || ""}: ${day.count || 0} inputs`;
    return `<span class="heat-cell l${level}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></span>`;
  }).join("");
}

function renderSettings() {
  const bootstrap = state.bootstrap || {};
  const settings = bootstrap.settings || {};
  el.hostInput.value = settings.host || "127.0.0.1";
  el.portInput.value = String(settings.basePort || 18787);
  el.codexHomeInput.value = settings.codexHome || "";
  el.refreshSecondsInput.value = String(settings.refreshSeconds || 8);
  el.settingsFoot.textContent = `Desktop state is isolated at ${bootstrap.backend?.stateRoot || ""}`;
}

function renderAll() {
  renderView();
  renderBackend();
  renderCodex();
  renderMetrics();
  renderRuntime();
  renderRecentThreads();
  renderThreadList();
  renderDetail();
  renderInsights();
  renderSettings();
}

async function selectThread(threadId) {
  if (!threadId) return;
  renderThreadList();
  el.detailPanel.innerHTML = '<div class="empty-detail">Loading thread detail...</div>';
  try {
    state.detail = await api(`/api/thread/${encodeURIComponent(threadId)}?history_limit=18&log_limit=30`);
    renderDetail();
    renderThreadList();
  } catch (error) {
    setNotice(error.message || String(error), "error");
    state.detail = null;
    renderDetail();
  }
}

async function runLifecycle(action, threadId) {
  if (!action || !threadId) return;
  try {
    await api("/api/threads/lifecycle", {
      method: "POST",
      body: { action, ids: [threadId] },
    });
    setNotice(`Lifecycle action completed: ${action}`, "success");
    await refreshAll({ keepNotice: true });
    await selectThread(threadId);
  } catch (error) {
    setNotice(error.message || String(error), "error");
  }
}

async function refreshAll(options = {}) {
  setLoading(true);
  if (!options.keepNotice) setNotice("Refreshing local runtime...");
  try {
    state.bootstrap = await window.cma.getBootstrap();
    const [health, activeCodex, inventory, threads, insights] = await Promise.allSettled([
      api("/api/health"),
      api("/api/codex/active"),
      api("/api/codex/inventory"),
      api("/api/threads?scope=all&limit=300&include_logs=false&include_history=false&include_git=true&sort=updated_desc"),
      api("/api/insights/report"),
    ]);
    state.health = health.status === "fulfilled" ? health.value : null;
    state.activeCodex = activeCodex.status === "fulfilled" ? activeCodex.value : null;
    state.inventory = inventory.status === "fulfilled" ? inventory.value : null;
    state.threads = threads.status === "fulfilled" && Array.isArray(threads.value.items) ? threads.value.items : [];
    state.insights = insights.status === "fulfilled" ? insights.value : null;
    if (state.selectedThreadId) {
      const stillExists = state.threads.some((thread) => thread.id === state.selectedThreadId);
      if (!stillExists) {
        state.selectedThreadId = "";
        state.detail = null;
      }
    }
    renderAll();
    if (!options.keepNotice) setNotice(`Refreshed ${state.threads.length} sessions`, "success");
  } catch (error) {
    setNotice(error.message || String(error), "error");
    renderAll();
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.view || "overview";
      renderView();
    });
  });
  document.querySelectorAll("[data-view-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.viewJump || "overview";
      renderView();
    });
  });
  el.refreshButton.addEventListener("click", () => {
    void refreshAll();
  });
  el.openBackendButton.addEventListener("click", () => {
    const url = state.bootstrap?.backend?.baseUrl;
    if (url) void window.cma.openExternal(url);
  });
  el.backendPill.addEventListener("click", () => {
    state.currentView = "settings";
    renderView();
  });
  el.threadSearch.addEventListener("input", () => {
    state.query = el.threadSearch.value;
    renderMetrics();
    renderThreadList();
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter || "all";
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderMetrics();
      renderThreadList();
    });
  });
  el.chooseCodexHomeButton.addEventListener("click", async () => {
    const selected = await window.cma.chooseDirectory("Choose Codex home");
    if (selected) el.codexHomeInput.value = selected;
  });
  el.saveSettingsButton.addEventListener("click", async () => {
    el.saveSettingsButton.disabled = true;
    setNotice("Saving settings and restarting backend...");
    try {
      await window.cma.updateSettings({
        host: el.hostInput.value,
        basePort: Number(el.portInput.value),
        codexHome: el.codexHomeInput.value,
        refreshSeconds: Number(el.refreshSecondsInput.value),
      });
      await window.cma.restartBackend();
      await refreshAll({ keepNotice: true });
      setNotice("Settings saved and backend restarted", "success");
    } catch (error) {
      setNotice(error.message || String(error), "error");
    } finally {
      el.saveSettingsButton.disabled = false;
    }
  });
  window.cma.onBackendChanged((backend) => {
    if (state.bootstrap) {
      state.bootstrap.backend = backend;
      renderBackend();
      renderRuntime();
    }
  });
}

async function boot() {
  bindEvents();
  await refreshAll();
}

void boot();
