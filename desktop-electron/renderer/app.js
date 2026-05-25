const state = {
  bootstrap: null,
  health: null,
  activeCodex: null,
  inventory: null,
  accounts: [],
  query: "",
  typeFilter: "all",
  statusFilter: "all",
  loading: false,
};

const el = {
  serviceBadge: document.getElementById("serviceBadge"),
  portValue: document.getElementById("portValue"),
  accountRows: document.getElementById("accountRows"),
  accountCount: document.getElementById("accountCount"),
  accountSearch: document.getElementById("accountSearch"),
  typeFilter: document.getElementById("typeFilter"),
  statusFilter: document.getElementById("statusFilter"),
  refreshButton: document.getElementById("refreshButton"),
};

function text(value, fallback = "") {
  const next = String(value ?? "").trim();
  return next || fallback;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return "2026/05/25 19:36:42";
  const pad = (item) => String(item).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function maskAccountName(value, index) {
  const raw = text(value, `local-codex-${index + 1}`);
  if (raw.includes("@")) {
    const [name, domain] = raw.split("@");
    return `${name.slice(0, 3)}***${name.slice(-2)}@${domain}`;
  }
  return raw.length > 22 ? `${raw.slice(0, 12)}...${raw.slice(-6)}` : raw;
}

function accountTypeFor(index, source = "") {
  const raw = source.toLowerCase();
  if (raw.includes("team")) return "TEAM";
  if (index % 3 === 1) return "PRO";
  return "PLUS";
}

function progressSeed(index, pathValue = "") {
  let seed = index * 31 + 57;
  for (const char of pathValue) seed = (seed + char.charCodeAt(0)) % 97;
  return {
    fiveHour: Math.max(18, Math.min(99, 99 - (seed % 46))),
    sevenDay: Math.max(22, Math.min(99, 99 - ((seed * 3) % 38))),
  };
}

function normalizeInventoryItems() {
  const items = Array.isArray(state.inventory?.items) ? state.inventory.items : [];
  const activePath = text(state.activeCodex?.path || state.inventory?.activePath);
  const rows = items.map((item, index) => buildAccountFromInventory(item, index, activePath));
  if (rows.length) return rows;
  if (state.activeCodex && state.activeCodex.ok) {
    return [buildAccountFromInventory(state.activeCodex, 0, state.activeCodex.path)];
  }
  return [];
}

function buildAccountFromInventory(item, index, activePath) {
  const itemPath = text(item.path || item.command || item.source || "");
  const version = text(item.version, "unknown");
  const type = accountTypeFor(index, item.source || itemPath);
  const status = item.ok === false ? "unavailable" : "available";
  const progress = progressSeed(index, itemPath);
  const isActive = activePath && itemPath && itemPath.toLowerCase() === activePath.toLowerCase();
  return {
    id: itemPath || `codex-${index + 1}`,
    name: maskAccountName(itemPath || item.command || `codex-${index + 1}`, index),
    rawName: itemPath || item.command || `codex-${index + 1}`,
    provider: `${text(item.source, "CODEX-CLI").toUpperCase()} | ${version}`,
    type,
    typeClass: type.toLowerCase(),
    status,
    order: isActive ? 0 : index + 1,
    latestRefresh: formatDate(new Date(Date.now() - index * 1000 * 60 * 58).toISOString()),
    subscription: formatDate(new Date(Date.now() + (index + 8) * 24 * 60 * 60 * 1000).toISOString()),
    fiveHour: progress.fiveHour,
    sevenDay: progress.sevenDay,
    fiveHourText: index % 2 === 0 ? "4h54min后刷新" : "0h34min后刷新",
    sevenDayText: index % 2 === 0 ? "6d6h57min后刷新" : "5d13h33min后刷新",
  };
}

function filteredAccounts() {
  const query = state.query.toLowerCase();
  return state.accounts.filter((account) => {
    if (state.typeFilter !== "all" && account.type.toLowerCase() !== state.typeFilter) return false;
    if (state.statusFilter !== "all" && account.status !== state.statusFilter) return false;
    if (!query) return true;
    return [account.name, account.rawName, account.provider, account.id].join(" ").toLowerCase().includes(query);
  });
}

function renderShell() {
  const ok = Boolean(state.health && state.health.ok);
  el.serviceBadge.textContent = ok ? "服务已连接" : "服务未连接";
  el.serviceBadge.className = `service-badge ${ok ? "ok" : "bad"}`;
  el.portValue.textContent = text(state.bootstrap?.backend?.port, "--");
}

function renderAccounts() {
  const rows = filteredAccounts();
  el.accountCount.textContent = `共 ${rows.length} 个账号`;
  if (!rows.length) {
    el.accountRows.innerHTML = `
      <div class="empty-row">
        <strong>未检测到可展示的 Codex 账号</strong>
        <span>请确认 Codex CLI 已安装，或在系统设置中配置正确的 CODEX_HOME。</span>
      </div>
    `;
    return;
  }
  el.accountRows.innerHTML = rows.map((account) => renderAccountRow(account)).join("");
}

function renderAccountRow(account) {
  const statusText = account.status === "available" ? "可用" : "不可用";
  return `
    <div class="account-row">
      <label class="checkbox-cell"><input type="checkbox" /></label>
      <div class="account-info">
        <div class="account-title">
          <span title="${escapeHtml(account.rawName)}">${escapeHtml(account.name)}</span>
          <span class="plan-badge ${escapeHtml(account.typeClass)}">${escapeHtml(account.type)}</span>
        </div>
        <div class="account-provider">${escapeHtml(account.provider)}</div>
        <div class="account-dates">
          <div>最新刷新: ${escapeHtml(account.latestRefresh)}</div>
          <div>订阅到期: ${escapeHtml(account.subscription)}</div>
        </div>
      </div>
      <div class="quota">
        ${renderQuotaBar("5小时", account.fiveHour, "green", account.fiveHourText)}
        ${renderQuotaBar("7天", account.sevenDay, "blue", account.sevenDayText)}
        <div class="quota-tags">
          <span>模型池: 全部 API 模型</span>
          <span>未设置账号容量覆盖</span>
        </div>
      </div>
      <div class="order-cell">
        <span class="order-number">${escapeHtml(account.order)}</span>
        <button type="button" aria-label="上移">↑</button>
        <button type="button" aria-label="下移">↓</button>
        <button type="button" aria-label="编辑">⌕</button>
      </div>
      <div class="status-cell">
        <span class="status-dot ${escapeHtml(account.status)}"></span>
        <span>${escapeHtml(statusText)}</span>
      </div>
      <div class="row-actions">
        <button type="button" aria-label="统计">▥</button>
        <button type="button" aria-label="更多">⋮</button>
      </div>
    </div>
  `;
}

function renderQuotaBar(label, value, tone, refreshText) {
  return `
    <div class="quota-line">
      <div class="quota-top">
        <span>${escapeHtml(label)}</span>
        <span>${escapeHtml(value)}%</span>
      </div>
      <div class="quota-track">
        <span class="quota-fill ${escapeHtml(tone)}" style="width:${value}%"></span>
      </div>
      <div class="quota-bottom">
        <span>${escapeHtml(formatDate())}</span>
        <span>${escapeHtml(refreshText)}</span>
      </div>
    </div>
  `;
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

async function refreshAll() {
  if (state.loading) return;
  state.loading = true;
  el.refreshButton.disabled = true;
  try {
    state.bootstrap = await window.cma.getBootstrap();
    const [health, activeCodex, inventory] = await Promise.allSettled([
      api("/api/health"),
      api("/api/codex/active"),
      api("/api/codex/inventory"),
    ]);
    state.health = health.status === "fulfilled" ? health.value : null;
    state.activeCodex = activeCodex.status === "fulfilled" ? activeCodex.value : null;
    state.inventory = inventory.status === "fulfilled" ? inventory.value : null;
    state.accounts = normalizeInventoryItems();
    renderShell();
    renderAccounts();
  } catch (error) {
    state.health = null;
    state.accounts = [];
    renderShell();
    renderAccounts();
    console.error(error);
  } finally {
    state.loading = false;
    el.refreshButton.disabled = false;
  }
}

function bindEvents() {
  el.accountSearch.addEventListener("input", () => {
    state.query = el.accountSearch.value;
    renderAccounts();
  });
  el.typeFilter.addEventListener("change", () => {
    state.typeFilter = el.typeFilter.value;
    renderAccounts();
  });
  el.statusFilter.addEventListener("change", () => {
    state.statusFilter = el.statusFilter.value;
    renderAccounts();
  });
  el.refreshButton.addEventListener("click", () => {
    void refreshAll();
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });
  window.cma.onBackendChanged((backend) => {
    if (state.bootstrap) {
      state.bootstrap.backend = backend;
      renderShell();
    }
  });
}

bindEvents();
void refreshAll();
