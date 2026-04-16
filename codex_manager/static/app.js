const state = {
  view: localStorage.getItem("codex-thread-view") || "list",
  pins: new Set(JSON.parse(localStorage.getItem("codex-thread-pins") || "[]")),
  pinOnly: localStorage.getItem("codex-thread-pin-only") === "true",
  cardSize: parseInt(localStorage.getItem("codex-thread-card-size") || "340", 10),
  selected: new Set(),
  threads: [],
  visibleThreads: [],
  autoTimer: null,
  liveSource: null,
  liveThreads: [],
  liveLogIds: new Set(),
  liveBuffers: {},
  liveHistory: {},
  liveActiveThreadId: "all",
  livePaused: false,
};

function qs(sel) {
  return document.querySelector(sel);
}

function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function normalizeHintCommand(command) {
  return String(command || "")
    .replace(/\bcodex\s+resume\s+--id\s+/g, "codex resume ")
    .replace(/\bcodex\s+fork\s+--id\s+/g, "codex fork ")
    .replace(/\bcodex\s+resume\s+--id=/g, "codex resume ")
    .replace(/\bcodex\s+fork\s+--id=/g, "codex fork ")
    .trim();
}

function esc(value) {
  return (value ?? "").toString().replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch]));
}

function shortText(value, len = 110) {
  if (!value) return "";
  return value.length > len ? `${value.slice(0, len)}...` : value;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

function formatRole(role) {
  return role === "user" ? "USER" : "ASSIST";
}

function statusBadge(status) {
  return `<span class="badge badge-${esc(status)}">${esc(status)}</span>`;
}

function processBadge(thread) {
  const process = thread.process || {};
  if (process.alive) {
    return `<span class="process-pill is-live">${esc(process.summary || `pid ${process.pid}`)}</span>`;
  }
  if (process.pid) {
    return `<span class="process-pill">${esc(process.summary || `pid ${process.pid}`)}</span>`;
  }
  return `<span class="process-pill is-muted">no live pid</span>`;
}

function logPreview(log) {
  return `
    <div class="log-preview-item">
      <span class="log-level log-level-${esc(log.level || "INFO")}">${esc(log.level || "INFO")}</span>
      <div class="log-preview-main">
        <div class="log-preview-message">${esc(shortText(log.message || log.target || "log event", 150))}</div>
        <div class="log-preview-meta mono">${esc(log.ts_iso || "")} · ${esc(log.age || "")}</div>
      </div>
    </div>
  `;
}

function historyBubble(message) {
  return `
    <div class="chat-bubble chat-bubble-${esc(message.role || "assistant")}">
      <div class="chat-bubble-head">
        <span class="chat-role">${esc(formatRole(message.role))}</span>
        <span class="mono">${esc(message.ts || "")}</span>
      </div>
      <div class="chat-bubble-body">${esc(shortText(message.text || "", 220))}</div>
    </div>
  `;
}

function threadTitle(thread) {
  return thread.title || "(no title)";
}

function threadLifecycle(thread) {
  if (thread.soft_deleted) return "soft_deleted";
  if (thread.archived) return "archived";
  return "live";
}

function isPinned(threadId) {
  return state.pins.has(threadId);
}

function savePins() {
  localStorage.setItem("codex-thread-pins", JSON.stringify(Array.from(state.pins)));
}

function togglePin(threadId) {
  if (state.pins.has(threadId)) state.pins.delete(threadId);
  else state.pins.add(threadId);
  savePins();
}

function applyCardSize() {
  document.documentElement.style.setProperty("--thread-card-min", `${state.cardSize}px`);
  const input = qs("#card_size");
  if (input) input.value = String(state.cardSize);
}

function sortThreads(threads) {
  return [...threads].sort((a, b) => {
    const pinDelta = Number(isPinned(b.id)) - Number(isPinned(a.id));
    if (pinDelta !== 0) return pinDelta;
    return 0;
  });
}

function deriveVisibleThreads() {
  let threads = sortThreads(state.threads);
  if (state.pinOnly) {
    threads = threads.filter((thread) => isPinned(thread.id));
  }
  return threads;
}

function selectedCount() {
  return state.selected.size;
}

function syncSelectionStatus() {
  const count = selectedCount();
  const statusEl = qs("#selection_status");
  if (statusEl) statusEl.textContent = `${count} selected`;
  ["#delete_selected", "#archive_selected", "#soft_delete_selected", "#restore_selected"].forEach((sel) => {
    const button = qs(sel);
    if (button) button.disabled = count === 0;
  });
}

function syncViewState() {
  const listView = qs("#list_view");
  const gridView = qs("#grid_view");
  if (!listView || !gridView) return;
  listView.classList.toggle("hidden", state.view !== "list");
  gridView.classList.toggle("hidden", state.view !== "grid");
  qsa(".segmented-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === state.view);
  });
}

function renderStats(meta) {
  const counts = meta.counts || {};
  const pinnedVisible = state.visibleThreads.filter((thread) => isPinned(thread.id)).length;
  qs("#stats").innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Visible threads</div>
      <div class="metric-value">${formatCount(state.visibleThreads.length)}</div>
      <div class="metric-note mono">${esc(meta.now_iso || "")}</div>
    </div>
    <div class="metric-card metric-running">
      <div class="metric-label">Running</div>
      <div class="metric-value">${formatCount(counts.running)}</div>
      <div class="metric-note">Live process attached</div>
    </div>
    <div class="metric-card metric-active">
      <div class="metric-label">Soft deleted</div>
      <div class="metric-value">${formatCount(meta.soft_deleted_total || 0)}</div>
      <div class="metric-note">Recoverable hidden threads</div>
    </div>
    <div class="metric-card metric-idle">
      <div class="metric-label">Pinned visible</div>
      <div class="metric-value">${formatCount(pinnedVisible)}</div>
      <div class="metric-note">Priority threads kept on top</div>
    </div>
  `;
}

function renderList(threads) {
  const tbody = qs("#threads");
  tbody.innerHTML = threads.map((thread) => {
    const checked = state.selected.has(thread.id) ? "checked" : "";
    const pinned = isPinned(thread.id);
    const preview = thread.preview_logs?.length
      ? `<div class="row-preview">${thread.preview_logs.slice(0, 1).map(logPreview).join("")}</div>`
      : "";

    return `
      <tr data-thread-id="${esc(thread.id)}">
        <td class="checkbox-col">
          <input class="thread-check" data-thread-id="${esc(thread.id)}" type="checkbox" ${checked} />
        </td>
        <td>
          <button class="pin-btn ${pinned ? "is-pinned" : ""}" data-pin-id="${esc(thread.id)}" type="button">${pinned ? "PINNED" : "PIN"}</button>
        </td>
        <td class="mono compact-id">
          <a href="/thread/${esc(thread.id)}">${esc(thread.id)}</a>
        </td>
        <td>${statusBadge(thread.status)}</td>
        <td>
          <a class="thread-link" href="/thread/${esc(thread.id)}">${esc(shortText(threadTitle(thread), 180))}</a>
          <div class="table-sub mono">${esc(shortText(thread.cwd || "-", 90))}</div>
          <div class="table-sub">${esc(threadLifecycle(thread))}</div>
          ${preview}
        </td>
        <td>${processBadge(thread)}</td>
        <td class="mono">${esc(thread.updated_at_iso || "")}<div class="table-sub">${esc(thread.updated_age || "")}</div></td>
        <td class="mono">${esc(thread.last_log_iso || "-")}<div class="table-sub">${esc(thread.log_age || "")}</div></td>
        <td class="mono">${formatCount(thread.log_count)}</td>
        <td class="mono">${formatCount(thread.tokens_used)}</td>
      </tr>
    `;
  }).join("");

  qsa(".thread-check").forEach((input) => {
    input.addEventListener("change", (event) => {
      const threadId = event.target.dataset.threadId;
      if (event.target.checked) state.selected.add(threadId);
      else state.selected.delete(threadId);
      syncSelectionStatus();
      syncSelectAll();
      syncGridSelection();
    });
  });

  qsa(".pin-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      togglePin(button.dataset.pinId);
      await rerenderCurrentState();
    });
  });
}

function renderGrid(threads) {
  const grid = qs("#grid_view");
  grid.innerHTML = threads.map((thread) => {
    const checked = state.selected.has(thread.id) ? "checked" : "";
    const pinned = isPinned(thread.id);
    const logs = (thread.preview_logs || []).map(logPreview).join("") || `<div class="empty-note">No recent logs</div>`;
    const history = (thread.history || []).map(historyBubble).join("") || `<div class="empty-note">No chat history captured</div>`;

    return `
      <article class="thread-card thread-card-${esc(thread.status)} ${pinned ? "thread-card-pinned" : ""}" data-thread-id="${esc(thread.id)}">
        <div class="thread-card-head">
          <label class="checkline">
            <input class="thread-check-card" data-thread-id="${esc(thread.id)}" type="checkbox" ${checked} />
            <span>Select</span>
          </label>
          <div class="thread-card-actions">
            <button class="pin-btn ${pinned ? "is-pinned" : ""}" data-pin-id="${esc(thread.id)}" type="button">${pinned ? "PINNED" : "PIN"}</button>
            ${statusBadge(thread.status)}
          </div>
        </div>

        <a class="thread-card-title" href="/thread/${esc(thread.id)}">${esc(shortText(threadTitle(thread), 180))}</a>
        <div class="thread-card-id mono">${esc(thread.id)}</div>
        <div class="thread-card-cwd mono">${esc(shortText(thread.cwd || "-", 110))}</div>
        <div class="thread-card-cwd">${esc(threadLifecycle(thread))}</div>

        <div class="thread-card-meta">
          <div class="mini-stat">
            <span class="mini-stat-label">Updated</span>
            <span class="mini-stat-value mono">${esc(thread.updated_age || "-")}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-label">Logs</span>
            <span class="mini-stat-value mono">${formatCount(thread.log_count)}</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat-label">Tokens</span>
            <span class="mini-stat-value mono">${formatCount(thread.tokens_used)}</span>
          </div>
        </div>

        <div class="thread-card-process">${processBadge(thread)}</div>

        <div class="thread-card-trace">
          <div class="trace-head">Runtime trace</div>
          ${logs}
        </div>

        <div class="thread-card-chat">
          <div class="trace-head">Chat history</div>
          <div class="chat-window">${history}</div>
        </div>
      </article>
    `;
  }).join("");

  qsa(".thread-check-card").forEach((input) => {
    input.addEventListener("change", (event) => {
      const threadId = event.target.dataset.threadId;
      if (event.target.checked) state.selected.add(threadId);
      else state.selected.delete(threadId);
      syncSelectionStatus();
      syncSelectAll();
      syncTableSelection();
    });
  });

  qsa(".pin-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      togglePin(button.dataset.pinId);
      await rerenderCurrentState();
    });
  });
}

function syncSelectAll() {
  const selectAll = qs("#select_all");
  if (!selectAll) return;
  const visibleIds = state.visibleThreads.map((thread) => thread.id);
  if (visibleIds.length === 0) {
    selectAll.checked = false;
    selectAll.indeterminate = false;
    return;
  }
  const selectedVisible = visibleIds.filter((id) => state.selected.has(id)).length;
  selectAll.checked = selectedVisible === visibleIds.length;
  selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
}

function syncTableSelection() {
  qsa(".thread-check").forEach((input) => {
    input.checked = state.selected.has(input.dataset.threadId);
  });
}

function syncGridSelection() {
  qsa(".thread-check-card").forEach((input) => {
    input.checked = state.selected.has(input.dataset.threadId);
  });
}

async function loadThreads() {
  const q = qs("#q").value.trim();
  const archived = qs("#archived").value;
  const status = qs("#status").value;
  const scope = qs("#scope").value;
  const sort = qs("#sort").value;
  const limit = parseInt(qs("#limit").value, 10) || 100;
  const offset = parseInt(qs("#offset").value, 10) || 0;

  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (archived !== "") params.set("archived", archived);
  if (status !== "") params.set("status", status);
  if (scope !== "") params.set("scope", scope);
  params.set("sort", sort);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  params.set("include_logs", "true");
  params.set("preview_limit", state.view === "grid" ? "4" : "2");
  params.set("include_history", state.view === "grid" ? "true" : "false");
  params.set("history_limit", "8");

  const response = await fetch(`/api/threads?${params.toString()}`);
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();

  state.threads = data.items || [];
  state.visibleThreads = deriveVisibleThreads();
  const visibleIds = new Set(state.visibleThreads.map((thread) => thread.id));
  state.selected = new Set(Array.from(state.selected).filter((id) => visibleIds.has(id)));

  qs("#meta").textContent = `total=${data.meta.total} visible=${state.visibleThreads.length} sort=${data.meta.sort} status=${data.meta.status || "all"} scope=${data.meta.scope || "live"} now=${data.meta.now_iso}`;
  qs("#dbmeta").textContent = `state_db=${data.meta.state_db} logs_db=${data.meta.logs_db || "-"} session_index=${data.meta.session_index}`;
  renderStats(data.meta);
  renderList(state.visibleThreads);
  renderGrid(state.visibleThreads);
  syncSelectionStatus();
  syncSelectAll();
}

async function rerenderCurrentState() {
  state.visibleThreads = deriveVisibleThreads();
  const visibleIds = new Set(state.visibleThreads.map((thread) => thread.id));
  state.selected = new Set(Array.from(state.selected).filter((id) => visibleIds.has(id)));
  renderList(state.visibleThreads);
  renderGrid(state.visibleThreads);
  syncSelectionStatus();
  syncSelectAll();
}

async function applyLifecycleAction(action) {
  const ids = Array.from(state.selected);
  if (!ids.length) return;

  const actionLabel = {
    archive: "archive",
    soft_delete: "soft delete",
    restore: "restore",
    hard_delete: "hard delete",
  }[action] || action;

  const confirmed = action === "hard_delete"
    ? window.confirm(`Hard delete ${ids.length} thread(s)? This removes records and optional files.`)
    : window.confirm(`Apply ${actionLabel} to ${ids.length} thread(s)?`);
  if (!confirmed) return;

  const response = await fetch("/api/threads/lifecycle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, action, delete_files: qs("#delete_files").checked }),
  });
  if (!response.ok) throw new Error(await response.text());

  const result = await response.json();
  const updatedCount = (result.updated || result.deleted || []).length;
  const skipped = result.skipped || [];
  qs("#err").textContent = skipped.length
    ? `${actionLabel} applied to ${updatedCount} thread(s). Skipped ${skipped.length}.`
    : `${actionLabel} applied to ${updatedCount} thread(s).`;

  state.selected.clear();
  await loadThreads();
}

function mergeLiveSnapshot(snapshot) {
  state.liveThreads = snapshot.threads || [];
  const runningIds = new Set(state.liveThreads.map((thread) => thread.id));

  state.liveThreads.forEach((thread) => {
    state.liveHistory[thread.id] = thread.history || [];
  });

  const incomingLogs = [...(snapshot.logs || [])].sort((a, b) => {
    if ((a.ts || 0) !== (b.ts || 0)) return (a.ts || 0) - (b.ts || 0);
    return (a.id || 0) - (b.id || 0);
  });

  incomingLogs.forEach((log) => {
    if (state.liveLogIds.has(log.id)) return;
    state.liveLogIds.add(log.id);
    const threadId = log.thread_id;
    state.liveBuffers[threadId] = state.liveBuffers[threadId] || [];
    state.liveBuffers[threadId].push(log);
    if (state.liveBuffers[threadId].length > 200) {
      state.liveBuffers[threadId] = state.liveBuffers[threadId].slice(-200);
    }
  });

  Object.keys(state.liveBuffers).forEach((threadId) => {
    if (!runningIds.has(threadId)) return;
    state.liveBuffers[threadId] = state.liveBuffers[threadId].slice(-200);
  });

  if (state.liveActiveThreadId !== "all" && !runningIds.has(state.liveActiveThreadId)) {
    state.liveActiveThreadId = runningIds.size ? state.liveThreads[0].id : "all";
  }
}

function renderLiveTabs() {
  const tabsEl = qs("#live_tabs");
  if (!tabsEl) return;
  const allActive = state.liveActiveThreadId === "all";
  const tabs = [
    `<button class="live-tab ${allActive ? "is-active" : ""}" data-live-thread="all" type="button">All running</button>`,
    ...state.liveThreads.map((thread) => `
      <button class="live-tab ${state.liveActiveThreadId === thread.id ? "is-active" : ""}" data-live-thread="${esc(thread.id)}" type="button">
        <span class="live-tab-title">${esc(shortText(threadTitle(thread), 28))}</span>
        <span class="live-tab-id mono">${esc(thread.id.slice(0, 8))}</span>
      </button>
    `),
  ];
  tabsEl.innerHTML = tabs.join("");

  qsa(".live-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.liveActiveThreadId = button.dataset.liveThread;
      renderLiveConsole();
    });
  });
}

function renderLiveConsole() {
  const metaEl = qs("#live_meta");
  if (metaEl) {
    metaEl.textContent = `running=${state.liveThreads.length} active_tab=${state.liveActiveThreadId} pause=${state.livePaused ? "on" : "off"}`;
  }

  renderLiveTabs();

  const terminal = qs("#live_terminal");
  const history = qs("#live_history");
  if (!terminal || !history) return;

  const threadId = state.liveActiveThreadId;
  let logs = [];
  if (threadId === "all") {
    logs = Object.values(state.liveBuffers).flat().sort((a, b) => {
      if ((a.ts || 0) !== (b.ts || 0)) return (a.ts || 0) - (b.ts || 0);
      return (a.id || 0) - (b.id || 0);
    }).slice(-220);
  } else {
    logs = (state.liveBuffers[threadId] || []).slice(-220);
  }

  terminal.innerHTML = logs.map((log) => {
    const prefix = threadId === "all" ? `[${log.thread_id.slice(0, 8)}] ` : "";
    return `
      <div class="terminal-line">
        <span class="terminal-time mono">${esc(log.ts_iso || "")}</span>
        <span class="terminal-level terminal-level-${esc(log.level || "INFO")}">${esc(log.level || "INFO")}</span>
        <span class="terminal-text">${esc(`${prefix}${log.message || log.target || "log event"}`)}</span>
      </div>
    `;
  }).join("") || `<div class="empty-note">Waiting for terminal output</div>`;

  if (!state.livePaused) {
    terminal.scrollTop = terminal.scrollHeight;
  }

  if (threadId === "all") {
    history.innerHTML = `
      <div class="trace-head">Conversation history</div>
      <div class="empty-note">Select a running thread tab to inspect its user / assistant history.</div>
    `;
    return;
  }

  const selectedThread = state.liveThreads.find((item) => item.id === threadId);
  const messages = state.liveHistory[threadId] || [];
  history.innerHTML = `
    <div class="trace-head">Conversation history</div>
    <div class="live-history-title">${esc(shortText(threadTitle(selectedThread || {}), 72))}</div>
    <div class="chat-window">${messages.map(historyBubble).join("") || `<div class="empty-note">No chat history captured</div>`}</div>
  `;
}

function startLiveStream() {
  if (!qs("#live_terminal")) return;
  if (state.liveSource) state.liveSource.close();

  state.liveLogIds = new Set();
  state.liveBuffers = {};
  state.liveHistory = {};
  state.liveThreads = [];
  state.liveActiveThreadId = "all";

  const source = new EventSource("/api/stream/live?running_limit=8&log_limit=60&interval=1.0");
  state.liveSource = source;
  qs("#live_meta").textContent = "stream connecting";

  source.addEventListener("snapshot", (event) => {
    const payload = JSON.parse(event.data);
    mergeLiveSnapshot(payload);
    renderLiveConsole();
  });

  source.addEventListener("heartbeat", () => {
    const meta = qs("#live_meta");
    if (meta && !meta.textContent.includes("heartbeat")) {
      meta.textContent = `${meta.textContent} · heartbeat`;
    }
  });

  source.onerror = () => {
    qs("#live_meta").textContent = "stream reconnecting";
  };
}

function wireIndex() {
  syncViewState();
  syncSelectionStatus();

  qs("#refresh").addEventListener("click", async () => {
    qs("#err").textContent = "";
    try {
      await loadThreads();
    } catch (error) {
      qs("#err").textContent = String(error);
    }
  });

  qsa(".segmented-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      state.view = btn.dataset.view;
      localStorage.setItem("codex-thread-view", state.view);
      syncViewState();
      try {
        await loadThreads();
      } catch (error) {
        qs("#err").textContent = String(error);
      }
    });
  });

  [qs("#q"), qs("#archived"), qs("#status"), qs("#scope"), qs("#sort"), qs("#limit"), qs("#offset")].forEach((el) => {
    el.addEventListener("change", () => qs("#refresh").click());
  });
  qs("#q").addEventListener("keydown", (event) => {
    if (event.key === "Enter") qs("#refresh").click();
  });

  qs("#select_all").addEventListener("change", (event) => {
    if (event.target.checked) state.visibleThreads.forEach((thread) => state.selected.add(thread.id));
    else state.visibleThreads.forEach((thread) => state.selected.delete(thread.id));
    syncSelectionStatus();
    syncTableSelection();
    syncGridSelection();
    syncSelectAll();
  });

  qs("#select_visible").addEventListener("click", () => {
    state.visibleThreads.forEach((thread) => state.selected.add(thread.id));
    syncSelectionStatus();
    syncTableSelection();
    syncGridSelection();
    syncSelectAll();
  });

  qs("#clear_selected").addEventListener("click", () => {
    state.selected.clear();
    syncSelectionStatus();
    syncTableSelection();
    syncGridSelection();
    syncSelectAll();
  });

  qs("#delete_selected").addEventListener("click", async () => {
    qs("#err").textContent = "";
    try {
      await applyLifecycleAction("hard_delete");
    } catch (error) {
      qs("#err").textContent = String(error);
    }
  });

  qs("#archive_selected").addEventListener("click", async () => {
    qs("#err").textContent = "";
    try {
      await applyLifecycleAction("archive");
    } catch (error) {
      qs("#err").textContent = String(error);
    }
  });

  qs("#soft_delete_selected").addEventListener("click", async () => {
    qs("#err").textContent = "";
    try {
      await applyLifecycleAction("soft_delete");
    } catch (error) {
      qs("#err").textContent = String(error);
    }
  });

  qs("#restore_selected").addEventListener("click", async () => {
    qs("#err").textContent = "";
    try {
      await applyLifecycleAction("restore");
    } catch (error) {
      qs("#err").textContent = String(error);
    }
  });

  qs("#autorefresh").addEventListener("change", (event) => {
    if (state.autoTimer) {
      clearInterval(state.autoTimer);
      state.autoTimer = null;
    }
    if (event.target.checked) state.autoTimer = setInterval(() => qs("#refresh").click(), 3000);
  });

  const pinOnlyInput = qs("#pin_only");
  pinOnlyInput.checked = state.pinOnly;
  pinOnlyInput.addEventListener("change", async (event) => {
    state.pinOnly = event.target.checked;
    localStorage.setItem("codex-thread-pin-only", String(state.pinOnly));
    await rerenderCurrentState();
  });

  const cardSizeInput = qs("#card_size");
  applyCardSize();
  cardSizeInput.addEventListener("input", async (event) => {
    state.cardSize = parseInt(event.target.value, 10) || 340;
    localStorage.setItem("codex-thread-card-size", String(state.cardSize));
    applyCardSize();
    await rerenderCurrentState();
  });

  qs("#live_pause").addEventListener("click", () => {
    state.livePaused = !state.livePaused;
    qs("#live_pause").textContent = state.livePaused ? "Resume" : "Pause";
    renderLiveConsole();
  });

  qs("#live_clear").addEventListener("click", () => {
    state.liveLogIds = new Set();
    state.liveBuffers = {};
    renderLiveConsole();
  });

  qs("#refresh").click();
  startLiveStream();
}

async function loadThreadDetail(threadId) {
  const limit = parseInt(qs("#log_limit").value, 10) || 200;
  const response = await fetch(`/api/thread/${encodeURIComponent(threadId)}?log_limit=${limit}`);
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  const thread = data.thread;

  qs("#thread_title").textContent = thread.title || "(no title)";
  qs("#thread_meta").innerHTML = `
    ${statusBadge(thread.archived ? "archived" : "live")}
    <span class="inline-gap">${processBadge(thread)}</span>
    <span class="inline-gap mono">updated=${esc(thread.updated_at_iso || "")}</span>
  `;
  qs("#commands").innerHTML = `
    <code>${esc(normalizeHintCommand(data.hint_commands.resume))}</code>
    <code>${esc(normalizeHintCommand(data.hint_commands.fork))}</code>
  `;
  qs("#dbmeta").textContent = `state_db=${data.meta.state_db} logs_db=${data.meta.logs_db || "-"}`;

  const fields = [
    ["id", thread.id],
    ["cwd", thread.cwd],
    ["source", thread.source],
    ["model_provider", thread.model_provider],
    ["model", thread.model],
    ["reasoning_effort", thread.reasoning_effort],
    ["approval_mode", thread.approval_mode],
    ["cli_version", thread.cli_version],
    ["tokens_used", thread.tokens_used],
    ["process_uuid", thread.process_uuid],
    ["rollout_path", thread.rollout_path],
    ["sandbox_policy", JSON.stringify(thread.sandbox_policy)],
  ];

  const historyHtml = (thread.history || []).map(historyBubble).join("") || `<div class="empty-note">No chat history captured</div>`;
  qs("#thread_details").innerHTML = `
    ${fields.map(([label, value]) => `
      <div class="detail-row">
        <div class="detail-key">${esc(label)}</div>
        <div class="detail-value mono">${esc(value ?? "-")}</div>
      </div>
    `).join("")}
    <div class="detail-history">
      <div class="trace-head">Conversation history</div>
      <div class="chat-window">${historyHtml}</div>
    </div>
  `;

  qs("#logs").innerHTML = (data.logs || []).map((log) => `
    <div class="detail-log">
      <div class="detail-log-head">
        <span class="log-level log-level-${esc(log.level || "INFO")}">${esc(log.level || "INFO")}</span>
        <span class="mono">${esc(log.ts_iso || "")}</span>
        <span class="mono">${esc(log.file || "")}${log.line ? `:${esc(log.line)}` : ""}</span>
      </div>
      <div class="detail-log-message">${esc(log.message || log.target || "log event")}</div>
      <div class="detail-log-meta mono">${esc(log.target || "")} · ${esc(log.process_uuid || "")}</div>
    </div>
  `).join("") || `<div class="empty-note">No logs found</div>`;
}

function wireThread() {
  const threadId = qs("#thread_id").textContent.trim();
  qs("#refresh").addEventListener("click", async () => {
    qs("#err").textContent = "";
    try {
      await loadThreadDetail(threadId);
    } catch (error) {
      qs("#err").textContent = String(error);
    }
  });
  qs("#log_limit").addEventListener("change", () => qs("#refresh").click());
  qs("#refresh").click();
}

window.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "index") wireIndex();
  if (page === "thread") wireThread();
});
