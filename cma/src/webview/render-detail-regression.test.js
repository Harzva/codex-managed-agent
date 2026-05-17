const assert = require("node:assert/strict");
const Module = require("node:module");
const test = require("node:test");
const vm = require("node:vm");

function withMockedVscode(fn) {
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (request === "vscode") {
      return {
        Uri: {
          joinPath(base, ...parts) {
            const root = typeof base === "string"
              ? base
              : (base && (base.path || base.fsPath || base.toString())) || "";
            const value = [root, ...parts].join("/").replace(/\/+/g, "/");
            return { path: value, fsPath: value, toString: () => value };
          },
        },
      };
    }
    return originalLoad.apply(this, arguments);
  };
  try {
    return fn();
  } finally {
    Module._load = originalLoad;
  }
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    names.filter(Boolean).forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) {
      this.values.add(name);
      return true;
    }
    this.values.delete(name);
    return false;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.dataset = {};
    this.listeners = {};
    this.classList = new FakeClassList();
    this._className = "";
    this.disabled = false;
    this.hidden = false;
    this.value = "";
    this.checked = false;
    this.parentNode = null;
    this.style = {};
    this._innerHTML = "";
    this._textContent = "";
  }

  set innerHTML(value) {
    this._innerHTML = String(value || "");
  }

  set className(value) {
    this._className = String(value || "");
    this.classList = new FakeClassList();
    this._className.split(/\s+/).filter(Boolean).forEach((name) => this.classList.add(name));
  }

  get className() {
    return this._className;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set textContent(value) {
    this._textContent = String(value || "");
  }

  get textContent() {
    return this._textContent;
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  dispatch(type = "click") {
    const event = {
      target: this,
      currentTarget: this,
      preventDefault() {},
      stopPropagation() {},
    };
    if (typeof this.listeners[type] === "function") {
      this.listeners[type](event);
    } else if (this.ownerDocument && Array.isArray(this.ownerDocument.listeners[type])) {
      this.ownerDocument.listeners[type].forEach((handler) => handler(event));
    }
  }

  querySelectorAll() {
    return [];
  }

  closest(selector) {
    const parts = String(selector || "").split(",").map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return this;
    for (const part of parts) {
      if (part === "button" && this.tagName === "BUTTON") return this;
      const dataMatch = part.match(/^\[([a-z0-9-]+)\]$/i);
      if (dataMatch && Object.prototype.hasOwnProperty.call(this.dataset, dataNameToDatasetKey(dataMatch[1]))) {
        return this;
      }
      if (part.startsWith("#") && this.id === part.slice(1)) return this;
    }
    return null;
  }

  remove() {}
}

function dataNameToDatasetKey(name) {
  return name.replace(/^data-/, "").replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function parseDataElementsFromHtml(html, selector, ownerDocument) {
  const attrMatch = selector.match(/^\[([a-z0-9-]+)\]$/i);
  if (!attrMatch) return [];
  const wantedAttr = attrMatch[1];
  const tagRe = /<button\b[^>]*>|<span\b[^>]*>|<div\b[^>]*>/gi;
  const attrRe = /\s(data-[a-z0-9-]+)(?:="([^"]*)")?/gi;
  const nodes = [];
  for (const tagMatch of html.matchAll(tagRe)) {
    const tag = tagMatch[0];
    const dataset = {};
    let hasWanted = false;
    for (const attr of tag.matchAll(attrRe)) {
      const attrName = attr[1];
      dataset[dataNameToDatasetKey(attrName)] = attr[2] || "";
      if (attrName === wantedAttr) hasWanted = true;
    }
    if (hasWanted) {
      const tagName = tag.match(/^<([a-z0-9]+)/i)?.[1] || "";
      const node = new FakeElement();
      node.tagName = tagName.toUpperCase();
      node.ownerDocument = ownerDocument;
      node.dataset = dataset;
      node.disabled = /\sdisabled(?:\s|>|=)/i.test(tag);
      nodes.push(node);
    }
  }
  return nodes;
}

function createFakeDocument() {
  const elements = new Map();
  const listeners = {};
  const ids = [
    "threadDrawer",
    "drawerBackdrop",
    "drawerTitle",
    "drawerMeta",
    "drawerSummary",
    "drawerActions",
    "drawerBody",
  ];
  ids.forEach((id) => elements.set(id, new FakeElement(id)));
  const documentElement = new FakeElement("html");
  const body = new FakeElement("body");
  return {
    listeners,
    documentElement,
    body,
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new FakeElement(id));
      return elements.get(id);
    },
    querySelectorAll(selector) {
      return [...elements.values()].flatMap((element) => parseDataElementsFromHtml(element.innerHTML, selector, this));
    },
    querySelector() {
      return null;
    },
    addEventListener(type, handler) {
      if (!Array.isArray(listeners[type])) listeners[type] = [];
      listeners[type].push(handler);
    },
    createElement(tagName) {
      const element = new FakeElement();
      element.tagName = String(tagName || "").toUpperCase();
      return element;
    },
  };
}

function loadWebviewContext(initialPersistedState = {}) {
  const { getWebviewHtml } = withMockedVscode(() => require("../webview-template"));
  const webview = {
    cspSource: "vscode-resource:",
    asWebviewUri: (uri) => ({ toString: () => String(uri) }),
  };
  const extensionUri = {
    path: process.cwd(),
    fsPath: process.cwd(),
    toString: () => process.cwd(),
  };
  const html = getWebviewHtml(webview, extensionUri, initialPersistedState);
  const script = html.match(/<script nonce="[^"]+">([\s\S]*)<\/script>/);
  assert.ok(script, "generated webview should contain one inline script");

  const posted = [];
  const document = createFakeDocument();
  const context = {
    console,
    Element: FakeElement,
    document,
    window: {
      addEventListener() {},
      removeEventListener() {},
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    cancelAnimationFrame: clearTimeout,
    acquireVsCodeApi() {
      return {
        getState: () => ({}),
        setState: () => {},
        postMessage: (message) => posted.push(message),
      };
    },
  };
  context.window = Object.assign(context.window, context);
  vm.createContext(context);
  vm.runInContext(script[1], context, { filename: "webview-inline-script.js" });
  return { context, document, posted };
}

function samplePayload(overrides = {}) {
  const thread = {
    id: "thread-1",
    title: "Implement drawer regression",
    cwd: "/workspace/project",
    created_at_iso: "2026-04-24T01:00:00Z",
    updated_at_iso: "2026-04-24T02:00:00Z",
    model: "gpt-test",
    model_provider: "openai",
    reasoning_effort: "medium",
    cli_version: "1.0.0",
    approval_mode: "never",
    tokens_used: 1234,
    history: [
      { role: "user", ts: "10:00", text: "Please split renderDetail carefully." },
      { role: "assistant", ts: "10:01", text: "I will keep event wiring in place." },
    ],
  };
  return {
    service: { ok: true, capabilities: { lifecycleWrite: true, hardDelete: true } },
    dashboard: {
      threads: [
        Object.assign({}, thread, {
          updated_age: "just now",
          log_age: "1m",
          process: { summary: "No live process" },
          commands: [{ kind: "shell" }],
        }, overrides.summary || {}),
      ],
      runningThreads: [],
      threadsMeta: { counts: {} },
    },
    detail: {
      thread: Object.assign({}, thread, overrides.thread || {}),
      logs: [
        { level: "INFO", ts_iso: "2026-04-24T02:00:00Z", age: "1m", message: "Drawer detail rendered." },
      ],
      hint_commands: {
        resume: "codex resume thread-1",
        fork: "codex fork thread-1",
      },
      threadInsight: {
        flowSteps: [{ title: "User Prompt", kind: "prompt", meta: "1 message", summary: "Asked for a careful split." }],
        vibeAdviceState: "ready",
        vibeAdvice: ["Keep renderDetail as the last orchestrator move."],
        evidenceReviewState: "ready",
        evidenceReview: [{ title: "Patch evidence", summary: "Trace and diff evidence point to drawer-runtime changes.", tag: "Diff" }],
      },
    },
    actionNotice: "",
  };
}

test("Overview owns Skills and Memory as local configuration subpages", () => {
  const { getWebviewHtml } = withMockedVscode(() => require("../webview-template"));
  const webview = { cspSource: "vscode-resource:", asWebviewUri: (uri) => ({ toString: () => String(uri) }) };
  const extensionUri = { path: process.cwd(), fsPath: process.cwd(), toString: () => process.cwd() };
  const html = getWebviewHtml(webview, extensionUri);

  assert.doesNotMatch(html, /data-view="skills"/);
  assert.doesNotMatch(html, /data-view="memory"/);
  assert.doesNotMatch(html, /data-workspace-pane="skills"/);
  assert.doesNotMatch(html, /data-workspace-pane="memory"/);
  assert.match(html, /data-overview-subview="skills"/);
  assert.match(html, /data-overview-subview="memory"/);
  assert.match(html, /data-overview-pane="skills"/);
  assert.match(html, /data-overview-pane="memory"/);
  assert.doesNotMatch(html, /data-view="trace"/);
  assert.doesNotMatch(html, /data-workspace-pane="trace"/);
  assert.doesNotMatch(html, /id="traceDashboardPage"/);
  assert.match(html, /data-open-thread-trace/);
});

test("Overview Network shell exposes proxy refresh control", () => {
  const { getWebviewHtml } = withMockedVscode(() => require("../webview-template"));
  const webview = { cspSource: "vscode-resource:", asWebviewUri: (uri) => ({ toString: () => String(uri) }) };
  const extensionUri = { path: process.cwd(), fsPath: process.cwd(), toString: () => process.cwd() };
  const html = getWebviewHtml(webview, extensionUri);

  assert.match(html, /data-overview-pane="network"/);
  assert.match(html, /data-refresh-clash-proxies="true" type="button">Refresh Proxies/);
  assert.doesNotMatch(html, /data-network-probe="google" type="button">Google Connectivity/);
  assert.doesNotMatch(html, /data-network-probe="baidu" type="button">Baidu Connectivity/);
  assert.doesNotMatch(html, /data-network-probe="ipinfo" type="button">Public IP Info/);
});

test("legacy persisted Skills and Memory views migrate under Overview", () => {
  const skills = loadWebviewContext({ currentView: "skills" });
  vm.runInContext("__view = state.ui.currentView; __subview = state.ui.overviewSubView;", skills.context);
  assert.equal(skills.context.__view, "overview");
  assert.equal(skills.context.__subview, "skills");

  const memory = loadWebviewContext({ currentView: "memory" });
  vm.runInContext("__view = state.ui.currentView; __subview = state.ui.overviewSubView;", memory.context);
  assert.equal(memory.context.__view, "overview");
  assert.equal(memory.context.__subview, "memory");
});

test("thread groups keep archived visibility ahead of pinned state", () => {
  const { context } = loadWebviewContext();
  vm.runInContext(`
    state.ui.pinned = { "archived-pinned": true };
    state.ui.sort = "updated_desc";
    __groups = buildGroups([
      { id: "archived-pinned", title: "Archived pinned", status: "archived", archived: 1, updated_at: 20 },
      { id: "plain-stopped", title: "Plain stopped", status: "idle", updated_at: 10 }
    ]);
  `, context);

  assert.deepEqual([...context.__groups.archived.map((thread) => thread.id)], ["archived-pinned"]);
  assert.deepEqual([...context.__groups.pinned.map((thread) => thread.id)], []);
  assert.deepEqual([...context.__groups.stopped.map((thread) => thread.id)], ["plain-stopped"]);
});

test("thread groups keep running process ahead of archived visibility", () => {
  const { context } = loadWebviewContext();
  vm.runInContext(`
    state.ui.sort = "updated_desc";
    __groups = buildGroups([
      { id: "archived-running", title: "Archived running", status: "running", archived: 1, updated_at: 30 },
      { id: "archived-stopped", title: "Archived stopped", status: "archived", archived: 1, updated_at: 20 }
    ]);
    __badge = renderThreadFactBadges({ id: "archived-running", status: "running", archived: 1 });
  `, context);

  assert.deepEqual([...context.__groups.running.map((thread) => thread.id)], ["archived-running"]);
  assert.deepEqual([...context.__groups.archived.map((thread) => thread.id)], ["archived-stopped"]);
  assert.match(context.__badge, /Running/);
  assert.match(context.__badge, /Archived/);
});

test("thread groups treat active sessions as running for the Running filter", () => {
  const { context } = loadWebviewContext();
  vm.runInContext(`
    state.ui.sort = "updated_desc";
    state.ui.filter = "running";
    const activeThread = { id: "active-thread", title: "Active Codex tab", status: "active", updated_at: 40 };
    const idleThread = { id: "idle-thread", title: "Idle thread", status: "idle", updated_at: 10 };
    __groups = buildGroups([activeThread, idleThread]);
    __filtered = [activeThread, idleThread].filter(threadMatches).map((thread) => thread.id);
    __badge = renderThreadFactBadges(activeThread);
  `, context);

  assert.deepEqual([...context.__groups.running.map((thread) => thread.id)], ["active-thread"]);
  assert.deepEqual([...context.__filtered], ["active-thread"]);
  assert.match(context.__badge, /Running/);
});

test("Thread Explorer search matches loaded tool and file evidence", () => {
  const { context } = loadWebviewContext();
  vm.runInContext(`
    state.ui.sort = "updated_desc";
    state.ui.filter = "all";
    const targetThread = {
      id: "evidence-thread",
      title: "Plain thread title",
      cwd: "/workspace/project",
      status: "idle",
      updated_at: 20,
      lifecycle: {
        state: "stopped",
        reason: "Recent tool evidence is available.",
        recent_tools: ["apply_patch"]
      },
      commands: [{ kind: "shell", command: "npm test" }],
      process: { summary: "No live process" }
    };
    const otherThread = { id: "other-thread", title: "Other", cwd: "/workspace/project", status: "idle", updated_at: 10 };
    state.payload = {
      detail: {
        thread: { id: "evidence-thread" },
        thread_trace_preview: {
          file_events: [{ path: "src/loaded-trace-file.js", summary: "File observed in thread activity: src/loaded-trace-file.js" }],
          command_events: [{ label: "exec_command", command: "git diff -- src/loaded-trace-file.js", summary: "Command activity observed: exec_command x1" }]
        }
      },
      traceDashboard: {
        selected_thread_id: "evidence-thread",
        session_replay: {
          tool_counts: [{ name: "exec_command", count: 1 }],
          code_changes: [{
            summary: "Patch · 1 file · +2 -1",
            tool_name: "apply_patch",
            diff: { files: ["src/session-diff.js"] }
          }]
        }
      }
    };
    state.ui.search = "apply_patch";
    __plainTool = [targetThread, otherThread].filter(threadMatches).map((thread) => thread.id);
    state.ui.search = "tool:exec_command";
    __toolGrammar = [targetThread, otherThread].filter(threadMatches).map((thread) => thread.id);
    state.ui.search = "file:src/session-diff.js";
    __fileGrammar = [targetThread, otherThread].filter(threadMatches).map((thread) => thread.id);
    state.ui.search = "loaded-trace-file";
    __plainFile = [targetThread, otherThread].filter(threadMatches).map((thread) => thread.id);
  `, context);

  assert.deepEqual([...context.__plainTool], ["evidence-thread"]);
  assert.deepEqual([...context.__toolGrammar], ["evidence-thread"]);
  assert.deepEqual([...context.__fileGrammar], ["evidence-thread"]);
  assert.deepEqual([...context.__plainFile], ["evidence-thread"]);
});

test("thread groups render archived and soft-deleted buckets even when empty", () => {
  const { context } = loadWebviewContext();
  vm.runInContext(`
    state.ui.sort = "updated_desc";
    __markup = renderThreadGroups([
      { id: "plain-stopped", title: "Plain stopped", status: "idle", updated_at: 10 }
    ], 1);
  `, context);

  assert.match(context.__markup, /data-group="stopped"/);
  assert.match(context.__markup, /data-group="archived"/);
  assert.match(context.__markup, /data-group="soft_deleted"/);
  assert.match(context.__markup, /Archived/);
  assert.match(context.__markup, /Soft Deleted/);
});

test("renderDetail opens populated drawer and keeps key controls wired", () => {
  const { context, document } = loadWebviewContext();
  vm.runInContext("state.ui.drawerOpen = true; renderDetail(__payload);", Object.assign(context, { __payload: samplePayload() }));

  assert.equal(document.getElementById("threadDrawer").classList.contains("open"), true);
  assert.equal(document.getElementById("drawerBackdrop").classList.contains("open"), true);
  assert.match(document.getElementById("drawerTitle").textContent, /Implement drawer regression/);
  assert.match(document.getElementById("drawerSummary").innerHTML, /Inferred activity/);
  const actionsHtml = document.getElementById("drawerActions").innerHTML;
  assert.match(actionsHtml, /Soft Delete/);
  assert.match(actionsHtml, /data-lifecycle-action="soft_delete"/);
  assert.match(actionsHtml, /data-lifecycle-action="archive"/);
  assert.match(actionsHtml, /data-quick-action="show_in_codex"/);
  assert.match(actionsHtml, /data-quick-action="thread_trace"/);
  assert.match(actionsHtml, /data-quick-action="sidebar"/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Thread Vibe Advice/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Thread Evidence Review/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Summarize Thread Evidence/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace and diff evidence point to drawer-runtime changes/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Drawer detail rendered/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Please split renderDetail carefully/);
  assert.ok(document.querySelectorAll("[data-lifecycle-action]").length >= 1);
  assert.ok(document.querySelectorAll("[data-generate-thread-advice]").length >= 1);
  assert.ok(document.querySelectorAll("[data-generate-thread-evidence-review]").length >= 1);
});

test("board cards render lifecycle status language from thread summaries", () => {
  const { context } = loadWebviewContext();
  const blockedPayload = Object.assign({}, samplePayload(), {
    autoContinueConfigs: {
      "thread-board-1": { prompt: "continue", remaining: 5, total: 10 },
      "thread-board-2": { prompt: "continue", remaining: 5, total: 10 },
    },
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["acct-primary"],
      currentIndex: 0,
      currentAccount: "acct-primary",
      preferredAccountName: "acct-primary",
      activeProfileName: "acct-primary",
      retryAvailabilityByAccount: {
        "acct-primary": {
          code: "status_429",
          signal: "rate_limit_or_quota",
          message: "Rate limited (HTTP 429)",
          displayText: "Retry in 60 seconds",
        },
      },
    },
  });
  const baseThread = {
    id: "thread-board-1",
    title: "Review lifecycle card language",
    cwd: "/workspace/project",
    updated_at_iso: "2026-05-07T08:30:00Z",
    status: "running",
    process: { summary: "Waiting for confirmation before continuing." },
    lifecycle: {
      state: "needs_attention",
      reason: "Latest assistant output appears to request human input or confirmation because the generated patch appears to touch a safety boundary and the operator should inspect context and ownership before continuing.",
      recent_tools: ["exec_command", "apply_patch", "web_search_call"]
    },
    compaction_count: 7,
    rollout_user_message_count: 2,
    git_branch: "main",
    git_branch_status: "known",
  };
  vm.runInContext(`
    state.payload = __payload;
    __compactBoardHtml = renderRunningBoard([${JSON.stringify(baseThread)}], { compact: true });
    __standardBoardHtml = renderRunningBoard([${JSON.stringify(Object.assign({}, baseThread, { id: "thread-board-2" }))}], {});
  `, Object.assign(context, { __payload: blockedPayload }));

  assert.match(context.__compactBoardHtml, /board-lifecycle-strip/);
  assert.match(context.__compactBoardHtml, /Needs Human/);
  assert.match(context.__compactBoardHtml, /request human input or confirmation/i);
  assert.match(context.__compactBoardHtml, /board-lifecycle-tools/);
  assert.match(context.__compactBoardHtml, /exec_command/);
  assert.match(context.__compactBoardHtml, /apply_patch/);
  assert.doesNotMatch(context.__compactBoardHtml, /web_search_call/);
  assert.match(context.__compactBoardHtml, /<div class=\"compact-card-actions\">[\s\S]*data-open-conversation="thread-board-1"/);
  assert.match(context.__compactBoardHtml, /Cmd 2/);
  assert.match(context.__compactBoardHtml, /Cmp 7/);
  assert.match(context.__compactBoardHtml, /git-action/);
  assert.match(context.__compactBoardHtml, /data-auto-loop="thread-board-1"/);
  assert.match(context.__compactBoardHtml, /Auto 5/);
  assert.match(context.__compactBoardHtml, /needs-attention-card/);
  assert.match(context.__compactBoardHtml, /board-lifecycle-reason\">[^<]*\.\.\.<\/span>/);

  assert.match(context.__standardBoardHtml, /board-lifecycle-strip/);
  assert.match(context.__standardBoardHtml, /Needs Human/);
  assert.match(context.__standardBoardHtml, /request human input or confirmation/i);
  assert.match(context.__standardBoardHtml, /board-lifecycle-tools/);
  assert.match(context.__standardBoardHtml, /exec_command/);
  assert.match(context.__standardBoardHtml, /apply_patch/);
  assert.match(context.__standardBoardHtml, /web_search_call/);
  assert.match(context.__standardBoardHtml, /<div class=\"board-card-size-actions\">[\s\S]*data-open-conversation="thread-board-2"/);
  assert.match(context.__standardBoardHtml, /Cmd 2/);
  assert.match(context.__standardBoardHtml, /Cmp 7/);
  assert.match(context.__standardBoardHtml, /git-action/);
  assert.match(context.__standardBoardHtml, /<div class=\"board-card-size-actions\">[\s\S]*data-auto-loop="thread-board-2"/);
  assert.match(context.__standardBoardHtml, /Auto 5/);
  assert.match(context.__standardBoardHtml, /needs-attention-card/);
  assert.match(context.__standardBoardHtml, /board-lifecycle-reason\">[^<]*\.\.\.<\/span>/);
  assert.match(context.__compactBoardHtml, /Quota blocked/);
  assert.match(context.__compactBoardHtml, /Retry in 60 seconds/);
  assert.match(context.__standardBoardHtml, /Quota blocked/);
  assert.match(context.__standardBoardHtml, /Retry in 60 seconds/);
});

test("board cards hide unknown lifecycle noise while keeping useful quick actions", () => {
  const { context } = loadWebviewContext();
  const thread = {
    id: "thread-board-unknown",
    title: "Hide noisy lifecycle",
    cwd: "/workspace/project",
    updated_at_iso: "2026-05-07T08:45:00Z",
    status: "stopped",
    process: { summary: "Stopped without lifecycle evidence." },
    lifecycle: {
      state: "unknown",
      reason: "No lifecycle evidence available.",
      recent_tools: [],
    },
    compaction_count: 0,
    rollout_user_message_count: 1,
  };

  vm.runInContext(`
    state.payload = __payload;
    __standardBoardHtml = renderRunningBoard([${JSON.stringify(thread)}], {});
  `, Object.assign(context, { __payload: samplePayload() }));

  assert.doesNotMatch(context.__standardBoardHtml, /No lifecycle/i);
  assert.doesNotMatch(context.__standardBoardHtml, /No lifecycle evidence available/i);
  assert.doesNotMatch(context.__standardBoardHtml, /board-lifecycle-strip lifecycle-unknown/);
  assert.match(context.__standardBoardHtml, /data-auto-loop="thread-board-unknown"/);
  assert.match(context.__standardBoardHtml, />Auto<\/span>/);
});

test("panel language can switch board chrome to Chinese without translating user titles", () => {
  const { context, document } = loadWebviewContext({ panelLanguage: "zh" });
  const thread = {
    id: "thread-board-zh",
    title: "Keep this English task title",
    cwd: "/workspace/project",
    updated_at_iso: "2026-05-07T09:00:00Z",
    status: "running",
    process: { summary: "Runtime summary should stay as data." },
    lifecycle: {
      state: "needs_attention",
      reason: "User-authored reason remains intact.",
      recent_tools: ["exec_command"],
    },
    compaction_count: 3,
    rollout_user_message_count: 2,
  };

  vm.runInContext(`
    state.payload = Object.assign({}, __payload, { autoContinueConfigs: { "thread-board-zh": { prompt: "continue", remaining: 4, total: 8 } } });
    __standardBoardHtml = renderRunningBoard([${JSON.stringify(thread)}], {});
    setNodeHtml("statusBoardPrimary", __standardBoardHtml);
    applyPanelLanguageChrome();
  `, Object.assign(context, { __payload: samplePayload() }));

  const html = document.getElementById("statusBoardPrimary").innerHTML;
  assert.match(context.__standardBoardHtml, /命令 2/);
  assert.match(context.__standardBoardHtml, /压缩 3/);
  assert.match(context.__standardBoardHtml, /自动续跑 4/);
  assert.match(html, /需要人工/);
  assert.match(html, /Keep this English task title/);
  assert.match(document.getElementById("panelLanguageToggle").textContent, /EN Panel/);
});

test("panel language translates status chips and hides explorer unknown lifecycle", () => {
  const { context, document } = loadWebviewContext({ panelLanguage: "zh" });
  const thread = {
    id: "thread-board-chip-zh",
    title: "Keep chip title",
    cwd: "/workspace/2practice-projects",
    rootLabel: "2practice-projects",
    rootKey: "/workspace/2practice-projects",
    updated_at_iso: "2026-05-07T09:10:00Z",
    status: "stopped",
    board_source: "attached",
    lifecycle: {
      state: "unknown",
      reason: "No lifecycle evidence available.",
      recent_tools: [],
    },
    compaction_count: 0,
    rollout_user_message_count: 3,
  };

  vm.runInContext(`
    state.payload = __payload;
    state.ui.boardAttached = { "thread-board-chip-zh": true };
    __boardHtml = renderRunningBoard([${JSON.stringify(thread)}], {});
    setNodeHtml("statusBoardPrimary", __boardHtml);
    __explorerHtml = renderThreadGroups([${JSON.stringify(thread)}], 1);
    setNodeHtml("threadListMirror", __explorerHtml);
    applyPanelLanguageChrome();
  `, Object.assign(context, { __payload: samplePayload() }));

  const boardHtml = document.getElementById("statusBoardPrimary").innerHTML;
  const explorerHtml = document.getElementById("threadListMirror").innerHTML;
  assert.match(boardHtml, /已停止/);
  assert.match(boardHtml, /已加入看板组/);
  assert.match(boardHtml, /根目录 2practice-projects/);
  assert.match(boardHtml, /卡片名/);
  assert.doesNotMatch(boardHtml, /STOPPED/);
  assert.doesNotMatch(boardHtml, /BOARD GROUP ATTACHED/);
  assert.doesNotMatch(explorerHtml, /No lifecycle evidence available/);
  assert.doesNotMatch(explorerHtml, /No lifecycle/i);
});

test("bottom panel language toggle flips the persisted language", () => {
  const { context, document } = loadWebviewContext();
  const toggle = document.getElementById("panelLanguageToggle");
  toggle.ownerDocument = document;
  toggle.dataset.panelLanguageToggle = "true";

  vm.runInContext("render(__payload);", Object.assign(context, { __payload: samplePayload() }));
  assert.equal(document.getElementById("panelLanguageToggle").textContent, "中文面板");

  toggle.dispatch("click");
  vm.runInContext("__lang = state.ui.panelLanguage;", context);
  assert.equal(context.__lang, "zh");
  assert.equal(document.getElementById("panelLanguageToggle").textContent, "EN Panel");
});

test("board cards recommend switch when active account token is invalid", () => {
  const { context } = loadWebviewContext();
  const blockedTokenPayload = Object.assign({}, samplePayload(), {
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["acct-good", "acct-bad"],
      currentIndex: 1,
      currentAccount: "acct-bad",
      preferredAccountName: "acct-good",
      lastSuccessfulAccount: "acct-good",
      lastSessionId: "session-switch",
      retryAvailabilityByAccount: {},
      accountDetails: {
        "acct-good": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-good/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-good/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-good/auth.json",
          fingerprint: "good-fingerprint",
          credentialId: "email:good@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "ok",
        },
        "acct-bad": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-bad/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-bad/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-bad/auth.json",
          fingerprint: "bad-fingerprint",
          credentialId: "email:bad@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "invalid",
        },
      },
      activeProfileName: "acct-bad",
    },
  });

  const blockedTokenThread = {
    id: "thread-board-invalid",
    title: "Switch recommendation blocked-thread",
    cwd: "/workspace/project",
    updated_at_iso: "2026-05-07T08:40:00Z",
    status: "running",
    process: { summary: "Blocked by token state." },
    lifecycle: {
      state: "needs_attention",
      reason: "Active account appears to have expired credentials.",
      recent_tools: ["exec_command"]
    },
    compaction_count: 2,
    rollout_user_message_count: 1,
    git_branch: "main",
    git_branch_status: "known",
  };

  vm.runInContext(
    `state.payload = __payload; __blockedTokenBoardHtml = renderRunningBoard([${JSON.stringify(blockedTokenThread)}], {});`,
    Object.assign(context, { __payload: blockedTokenPayload })
  );

  assert.match(context.__blockedTokenBoardHtml, /Auth blocked/);
  assert.match(context.__blockedTokenBoardHtml, /invalid/);
  assert.match(context.__blockedTokenBoardHtml, /Switch recommended to acct-good/);
});

test("board keeps archived running threads on the Running lane", () => {
  const { context } = loadWebviewContext();
  const thread = {
    id: "archived-running-board",
    title: "Archived running board",
    cwd: "/workspace/project",
    status: "running",
    archived: 1,
    process: { alive: true, summary: "Codex CLI resume process detected." },
    updated_at: 40,
  };
  const payload = Object.assign({}, samplePayload(), {
    dashboard: {
      threads: [thread],
      runningThreads: [thread],
      threadsMeta: { counts: {} },
    },
    effectiveRunningThreadIds: [],
  });
  vm.runInContext(`
    state.payload = __payload;
    __boardThreads = getBoardThreads(__payload.dashboard, __payload);
    __statusGroups = buildBoardStatusGroups(__boardThreads);
    __boardHtml = renderRunningBoard(__boardThreads, {});
  `, Object.assign(context, { __payload: payload }));

  const runningGroup = context.__statusGroups.find((group) => group.label === "Running");
  assert.ok(runningGroup, "expected a Running board group");
  assert.equal(runningGroup.threads.length, 1);
  assert.equal(runningGroup.threads[0].id, "archived-running-board");
  assert.match(context.__boardHtml, /Running/);
  assert.match(context.__boardHtml, /Archived/);
});

test("renderDetail can switch the thread drawer into a Trace design view", () => {
  const { context, document } = loadWebviewContext();
  const payload = samplePayload();
  payload.detail.thread_trace_preview = {
    events: [
      {
        title: "User message observed",
        timestamp: "2026-04-24T01:58:00Z",
        copy: "Please split renderDetail carefully.",
        tone: "live",
      },
      {
        title: "INFO log observed",
        timestamp: "2026-04-24T02:00:00Z",
        copy: "Drawer detail rendered.",
        tone: "live",
      },
      {
        title: "Command activity observed",
        timestamp: "2026-04-24T02:00:30Z",
        copy: "2 structured command signals visible from the current thread trace.",
        tone: "live",
      },
    ],
    counts: {
      timeline: 3,
      files: 2,
      commands: 2,
      checks: 1,
      errors: 1,
      raw_jsonl: 3,
      messages: 2,
      logs: 1,
    },
    file_events: [
      {
        path: "src/webview/drawer-runtime.js",
        timestamp: "2026-04-24T02:00:10Z",
        summary: "File observed in thread activity: src/webview/drawer-runtime.js",
        source: "log",
      },
      {
        path: "src/host/state-sync.js",
        timestamp: "2026-04-24T02:00:12Z",
        summary: "File observed in thread activity: src/host/state-sync.js",
        source: "log",
      },
    ],
    command_events: [
      {
        label: "exec_command",
        command: "",
        timestamp: "2026-04-24T02:00:20Z",
        summary: "Command activity observed: exec_command x2",
        source: "tool_call_counts",
        count: 2,
      },
      {
        label: "Resume",
        command: "codex resume thread-1",
        timestamp: "2026-04-24T02:00:30Z",
        summary: "Resume command available: codex resume thread-1",
        source: "hint_command",
        count: 0,
      },
    ],
    check_events: [
      {
        summary: "Check observed in thread activity: Verification check passed for the host trace suite.",
        timestamp: "2026-04-24T02:00:40Z",
        source: "log",
        level: "INFO",
      },
    ],
    error_events: [
      {
        summary: "Error observed in thread activity: Error: build failed during trace sync.",
        timestamp: "2026-04-24T02:00:50Z",
        source: "log",
        level: "ERROR",
      },
    ],
    source_summary: {
      process: "No live process",
      updated: "just now",
      thread_id: "thread-1",
      trace_lane: "/workspace/project/.codex-team/traces/threads/thread-1.jsonl",
    },
  };
  payload.traceDashboard = {
    selected_thread_id: "thread-1",
    selected: { id: "thread-1" },
    session_replay: {
      code_changes: [
        {
          event_index: 42,
          timestamp: "2026-04-24T02:01:00Z",
          summary: "Patch · 1 file · +2 -1",
          tool_name: "apply_patch",
          diff: {
            kind: "apply_patch",
            files: ["src/webview/drawer-runtime.js"],
            additions: 2,
            deletions: 1,
            preview: [
              "*** Begin Patch",
              "*** Update File: src/webview/drawer-runtime.js",
              "@@",
              "-old",
              "+new",
              "+extra",
              "*** End Patch",
            ].join("\n"),
          },
        },
      ],
    },
  };
  vm.runInContext(`
    state.ui.drawerOpen = true;
    state.ui.threadDrawerMode = "trace";
    renderDetail(__payload);
  `, Object.assign(context, { __payload: payload }));

  assert.match(document.getElementById("drawerActions").innerHTML, /data-quick-action="thread_overview"/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Thread Trace/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace Tabs/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Timeline 3/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Files 2/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Raw JSONL/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Export Markdown Report/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Open Raw JSONL/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Observable Sources/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace-backed Files/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Code Changes/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Patch · 1 file · \+2 -1/);
  assert.match(document.getElementById("drawerBody").innerHTML, /apply_patch/);
  assert.match(document.getElementById("drawerBody").innerHTML, /data-open-session-diff="42"/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Open VS Code Diff/);
  assert.match(document.getElementById("drawerBody").innerHTML, /\*\*\* Begin Patch/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace-backed Commands/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace-backed Checks/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace-backed Errors/);
  assert.match(document.getElementById("drawerBody").innerHTML, /src\/webview\/drawer-runtime\.js/);
  assert.match(document.getElementById("drawerBody").innerHTML, /exec_command/);
  assert.match(document.getElementById("drawerBody").innerHTML, /codex resume thread-1/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Verification check passed for the host trace suite/);
  assert.match(document.getElementById("drawerBody").innerHTML, /build failed during trace sync/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Messages/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Commands Seen/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Please split renderDetail carefully/);
  assert.match(document.getElementById("drawerBody").innerHTML, /product-level trace report/);
});

test("Trace opens as a thread drawer mode instead of a workspace page", () => {
  const { context, document, posted } = loadWebviewContext();
  const payload = samplePayload();
  payload.detail.thread_trace_preview = {
    events: [{ title: "User message observed", copy: "Please split renderDetail carefully.", tone: "live" }],
    counts: { timeline: 1, files: 0, commands: 1, checks: 0, errors: 0, raw_jsonl: 1 },
    command_events: [{ label: "Resume", command: "codex resume thread-1", summary: "Resume command available" }],
    source_summary: { process: "No live process", trace_lane: "/workspace/project/.codex-team/traces/threads/thread-1.jsonl" },
  };

  vm.runInContext("state.ui.currentView = 'threads'; render(__payload);", Object.assign(context, { __payload: payload }));
  assert.match(document.getElementById("threadList").innerHTML, /data-open-thread-trace="thread-1"/);

  vm.runInContext(`
    openThreadTrace('thread-1');
    __traceDrawerState = {
      currentView: state.ui.currentView,
      drawerOpen: state.ui.drawerOpen,
      threadDrawerMode: state.ui.threadDrawerMode
    };
  `, context);
  assert.equal(context.__traceDrawerState.currentView, "threads");
  assert.equal(context.__traceDrawerState.drawerOpen, true);
  assert.equal(context.__traceDrawerState.threadDrawerMode, "trace");
  assert.match(document.getElementById("drawerBody").innerHTML, /Thread Trace/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Raw JSONL/);
  assert.ok(posted.some((message) => message.type === "selectThread" && message.threadId === "thread-1"));
});

test("renderDetail renders confirm rail when a drawer action is pending", () => {
  const { context, document } = loadWebviewContext();
  vm.runInContext(`
    state.ui.drawerOpen = true;
    state.ui.pendingDrawerAction = { threadId: "thread-1", action: "soft_delete" };
    renderDetail(__payload);
  `, Object.assign(context, { __payload: samplePayload() }));

  assert.equal(document.getElementById("drawerActions").classList.contains("confirm"), true);
  assert.match(document.getElementById("drawerActions").innerHTML, /Cancel/);
  assert.match(document.getElementById("drawerActions").innerHTML, /data-drawer-confirm="soft_delete"/);
});

test("renderDetail keeps archived and soft-deleted action hooks distinct", () => {
  const archived = loadWebviewContext();
  vm.runInContext(
    "state.ui.drawerOpen = true; renderDetail(__payload);",
    Object.assign(archived.context, { __payload: samplePayload({ summary: { archived: true } }) })
  );
  assert.match(archived.document.getElementById("drawerActions").innerHTML, /data-lifecycle-action="unarchive"/);

  const deleted = loadWebviewContext();
  vm.runInContext(
    "state.ui.drawerOpen = true; renderDetail(__payload);",
    Object.assign(deleted.context, { __payload: samplePayload({ summary: { soft_deleted: true } }) })
  );
  const deletedActions = deleted.document.getElementById("drawerActions").innerHTML;
  assert.match(deletedActions, /Restore/);
  assert.match(deletedActions, /data-lifecycle-action="restore"/);
  assert.doesNotMatch(deletedActions, /data-lifecycle-action="soft_delete"/);
});

test("renderDetail closes and resets drawer when no thread is selected", () => {
  const { context, document } = loadWebviewContext();
  vm.runInContext("state.ui.drawerOpen = false; renderDetail(__payload);", Object.assign(context, { __payload: samplePayload() }));

  assert.equal(document.getElementById("threadDrawer").classList.contains("open"), false);
  assert.equal(document.getElementById("drawerBackdrop").classList.contains("open"), false);
  assert.equal(document.getElementById("drawerTitle").textContent, "Thread detail");
  assert.match(document.getElementById("drawerBody").innerHTML, /Select a thread to inspect details/);
});

test("renderDetail shows Team trace evidence and Open Trace actions in the task drawer", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      tasks: [
        {
          task_id: "task-trace-1",
          title: "Trace-backed Team task",
          owner: "thread-1",
          status: "running",
          goal: "Make the new Team trace visible from the drawer.",
          lease_until: "2026-04-24T02:30:00Z",
          updated_at: "2026-04-24T02:10:00Z",
          inputs: [
            { type: "prompt", value: "continue" },
            { type: "compiled_prompt", value: "compiled continue" },
          ],
          runtime: {
            state: "running",
            run_id: "run-abc123",
            thread_id: "thread-1",
            pid: 1234,
            log_path: "/workspace/project/.codex-managed-agent/logs/team.log",
          },
          trace_files: {
            task: {
              path: "/workspace/project/.codex-team/traces/tasks/task-trace-1.jsonl",
              exists: true,
              event_count: 4,
            },
            run: {
              path: "/workspace/project/.codex-team/runs/run-abc123/trace.jsonl",
              exists: true,
              event_count: 6,
            },
            thread: {
              path: "/workspace/project/.codex-team/traces/threads/thread-1.jsonl",
              exists: true,
              event_count: 5,
            },
          },
          trace_preview: {
            lane: "task",
            events: [
              {
                kind: "run.dispatch_started",
                timestamp: "2026-04-24T02:01:00Z",
                summary: "Dispatch started for trace-backed worker.",
                status: "dispatched",
              },
              {
                kind: "thread.resolved",
                timestamp: "2026-04-24T02:02:00Z",
                summary: "Worker thread resolved to thread-1.",
                status: "running",
              },
            ],
          },
        },
      ],
      taskLogs: {
        "task-trace-1": [
          { type: "task.created", timestamp: "2026-04-24T02:00:00Z", summary: "Task created." },
          { type: "task.dispatch_started", timestamp: "2026-04-24T02:01:00Z", summary: "Legacy dispatch event should be suppressed by trace." },
        ],
      },
    },
  });

  vm.runInContext(`
    state.ui.drawerOpen = true;
    state.ui.teamTaskDrawerId = "task-trace-1";
    renderDetail(__payload);
  `, Object.assign(context, { __payload: payload }));

  assert.match(document.getElementById("drawerTitle").textContent, /Trace-backed Team task/);
  assert.match(document.getElementById("drawerActions").innerHTML, /Open Run Log/);
  assert.match(document.getElementById("drawerActions").innerHTML, /Open Task Trace/);
  assert.match(document.getElementById("drawerActions").innerHTML, /Open Run Trace/);
  assert.match(document.getElementById("drawerActions").innerHTML, /Open Thread Trace/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Task Trace/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Trace-backed/);
  assert.match(document.getElementById("drawerBody").innerHTML, /Dispatch started for trace-backed worker/);
  assert.match(document.getElementById("drawerBody").innerHTML, /4 events/);
  assert.match(document.getElementById("drawerBody").innerHTML, /6 events/);
  assert.match(document.getElementById("drawerBody").innerHTML, /5 events/);
});

test("collectTeamTaskEvidence prefers trace preview before runtime evidence", () => {
  const { context } = loadWebviewContext();
  const task = {
    task_id: "task-trace-evidence",
    title: "Trace-first Team evidence",
    owner: "pending-team-worker-1",
    status: "running",
    created_at: "2026-04-24T02:00:00Z",
    runtime: {
      log_path: "/workspace/project/.codex-managed-agent/logs/team.log",
    },
    trace_preview: {
      lane: "run",
      events: [
        {
          kind: "run.dispatch_started",
          timestamp: "2026-04-24T02:01:00Z",
          summary: "Dispatch started for trace-backed worker.",
          status: "dispatched",
        },
        {
          kind: "run.pid_recorded",
          timestamp: "2026-04-24T02:01:10Z",
          summary: "Worker PID recorded from trace.",
          status: "dispatched",
        },
        {
          kind: "thread.resolved",
          timestamp: "2026-04-24T02:02:00Z",
          summary: "Worker thread resolved to thread-1.",
          status: "running",
        },
        {
          kind: "run.result_captured",
          timestamp: "2026-04-24T02:03:00Z",
          summary: "Worker result captured from trace.",
          status: "completed",
        },
      ],
    },
  };

  const evidence = JSON.parse(vm.runInContext(
    "JSON.stringify(collectTeamTaskEvidence(__task, []))",
    Object.assign(context, { __task: task }),
  ));
  const html = vm.runInContext(
    "renderTeamEvidenceChecklist(__task, [])",
    Object.assign(context, { __task: task }),
  );

  assert.equal(evidence.traceBacked, true);
  assert.equal(evidence.traceLane, "run");
  assert.equal(evidence.doneCount, 6);
  assert.deepEqual(evidence.items.map((item) => item.detail), ["recorded", "trace", "trace", "completed", "trace", "trace"]);
  assert.match(html, /Trace-first evidence/);
  assert.match(html, /Trace-backed · run/);
});

test("renderTeamAgentRow opens resolved thread actions from agent cards", () => {
  const { context } = loadWebviewContext();
  const html = vm.runInContext(
    "renderTeamAgentRow(__agent, __dashboard, __options)",
    Object.assign(context, {
      __agent: {
        agent_id: "worker-alias",
        thread_id: "thread-1",
        state: "running",
        current_task_id: "task-123",
        heartbeat_at: "2026-04-24T02:00:00Z",
        role_prompt: "Worker role prompt",
      },
      __dashboard: {
        threads: [{ id: "thread-1", title: "Worker thread" }],
      },
      __options: { agentLogs: {} },
    }),
  );

  assert.match(html, /Agent Detail/);
  assert.match(html, /data-focus-thread="thread-1"/);
  assert.match(html, /data-codex-thread="thread-1"/);
  assert.match(html, /data-open-codex-editor="thread-1"/);
  assert.match(html, /Agent worker-alias/);
});

test("Team view renders workspace-first home and one-workspace page", () => {
  const { context, document } = loadWebviewContext();
  const task = {
    task_id: "task-workspace-1",
    workspace_id: "task-workspace-1",
    title: "Workspace-first task",
    owner: "thread-1",
    status: "running",
    goal: "Keep all Team task context inside one workspace.",
    acceptance_criteria: [
      "Keep runtime, trace, prompt, and result in this workspace.",
      "Show enough evidence for a reviewer to trust the run.",
    ],
    inputs: [
      { type: "prompt", value: "Do workspace work" },
      { type: "compiled_prompt", value: "Compiled worker instructions" },
    ],
    runtime: {
      state: "running",
      run_id: "run-current",
      thread_id: "thread-1",
      pid: 4321,
      pid_running: true,
      file_change_count: 3,
      command_completed_count: 5,
      started_at: "2026-04-24T02:01:00Z",
      updated_at: "2026-04-24T02:02:00Z",
      model: "gpt-test",
      log_path: "/workspace/project/.codex-managed-agent/logs/current.log",
      previous_runtime: {
        state: "failed",
        run_id: "run-previous",
        thread_id: "thread-retry-0",
        pid: 1234,
        pid_running: false,
        started_at: "2026-04-24T01:00:00Z",
        updated_at: "2026-04-24T01:10:00Z",
        model_explicit: false,
        error: "Previous run failed",
        log_path: "/workspace/project/.codex-managed-agent/logs/previous.log",
      },
    },
    result: {
      summary: "Workspace result summary",
      outputs: ["docs/team-workspace.md", "src/webview-template.js"],
      checks_run: ["node --check src/webview-template.js", "node --test src/webview/render-detail-regression.test.js"],
      open_risks: ["Needs screenshot coverage before release"],
      next_request: "Review the result envelope UI.",
    },
    orchestration: {
      goal: "Keep all Team task context inside one workspace.",
      supervisor: {
        model: "gpt-5.4",
        instructions: "Plan, assign, and review bounded workers.",
      },
      worker_model: "gpt-5.3-codex",
      dag_run_id: "dag-workspace-1",
      dagRun: {
        run_id: "dag-workspace-1",
        status: "running",
        nodes: [
          {
            node_id: "node-host",
            title: "Host worker",
            status: "running",
            model: "gpt-5.3-codex",
            runtime: {
              thread_id: "thread-host",
              pid: 111,
              log_path: "/workspace/project/.codex-team/dag-runs/dag-workspace-1/host.log",
            },
            ownership: {
              write_paths: ["src/host"],
              expected_outputs: ["host tests"],
            },
          },
          {
            node_id: "node-ui",
            title: "UI worker",
            status: "blocked",
            model: "gpt-5.3-codex",
            ownership: {
              write_paths: ["src/webview-template.js"],
              expected_outputs: ["webview tests"],
            },
          },
          {
            node_id: "node-review",
            title: "Review worker",
            status: "completed",
            model: "gpt-5.4",
            ownership: {
              write_paths: ["task-plans"],
              expected_outputs: ["review notes"],
            },
          },
        ],
        blackboard: [
          { kind: "decision", source_node_id: "node-host", summary: "Host runtime metadata is persisted." },
          { kind: "risk", source_node_id: "node-ui", summary: "UI worker is blocked by ownership conflict." },
        ],
      },
      schedule_explanation: {
        node_explanations: [
          { node_id: "node-host", decision: "selected", reason: "dependencies_complete_and_ownership_available" },
          {
            node_id: "node-ui",
            decision: "blocked",
            reason: "ownership_conflict",
            conflict: {
              kind: "write_conflict",
              path: "src/webview-template.js",
              other_path: "src/webview",
            },
          },
          { node_id: "node-review", decision: "done", reason: "status_completed" },
        ],
      },
      workers: [
        {
          node_id: "node-host",
          title: "Host worker",
          role: "Persist orchestration state.",
          model: "gpt-5.3-codex",
          write_paths: ["src/host"],
          expected_outputs: ["host tests"],
        },
        {
          node_id: "node-ui",
          title: "UI worker",
          role: "Render orchestration controls.",
          model: "gpt-5.3-codex",
          write_paths: ["src/webview-template.js"],
          expected_outputs: ["webview tests"],
        },
        {
          node_id: "node-review",
          title: "Review worker",
          role: "Review DAG evidence.",
          model: "gpt-5.4",
          write_paths: ["task-plans"],
          expected_outputs: ["review notes"],
        },
      ],
    },
    trace_preview: { lane: "task", events: [{ kind: "task.created", summary: "Created", timestamp: "2026-04-24T02:00:00Z" }] },
  };
  const failedTask = {
    task_id: "task-failed-1",
    workspace_id: "task-failed-1",
    title: "Failed recovery task",
    owner: "thread-failed",
    status: "failed",
    goal: "Make the failure state visible from Team home.",
    inputs: [{ type: "prompt", value: "Recover the failed work" }],
    runtime: {
      state: "failed",
      run_id: "run-failed",
      thread_id: "thread-failed",
      error: "Process exited",
      preflight_kind: "codex_cli_missing",
      preflight_detail: "spawn codex ENOENT",
      preflight_action: "Install or authenticate Codex CLI, then retry with a new worker.",
      log_path: "/workspace/project/.codex-managed-agent/logs/failed.log",
      log_tail: "Process exited while running verification.",
    },
    trace_files: {
      run: {
        path: "/workspace/project/.codex-team/runs/run-failed/trace.jsonl",
        exists: true,
        event_count: 4,
      },
    },
  };
  const demoTask = {
    task_id: "task-snake-demo",
    workspace_id: "task-snake-demo",
    title: "Snake game demo",
    owner: "thread-demo",
    status: "running",
    priority: "demo",
    goal: "Build a small playable Snake game demo.",
    inputs: [{ type: "prompt", value: "Build the demo" }],
    runtime: { state: "running", run_id: "run-demo", thread_id: "thread-demo", pid_running: true },
  };
  const reviewTask = {
    task_id: "task-review-1",
    workspace_id: "task-review-1",
    title: "Review queue task",
    owner: "thread-review",
    status: "review",
    goal: "Hold completed output for review.",
    inputs: [{ type: "prompt", value: "Prepare review package" }],
    runtime: { state: "completed", run_id: "run-review", thread_id: "thread-review", pid_running: false },
    result: { summary: "Ready for reviewer sign-off." },
  };
  const draftTask = {
    task_id: "task-draft-1",
    workspace_id: "task-draft-1",
    title: "Draft scoped task",
    owner: "supervisor",
    status: "queued",
    goal: "Draft task waiting for dispatch.",
    inputs: [{ type: "prompt", value: "Queue this task" }],
    runtime: {},
  };
  const archivedTask = {
    task_id: "task-archived-1",
    workspace_id: "task-archived-1",
    title: "Archived evidence task",
    owner: "thread-archived",
    status: "archived",
    goal: "Retain archived evidence.",
    inputs: [{ type: "prompt", value: "Archive this task" }],
    runtime: { state: "completed", run_id: "run-archived", thread_id: "thread-archived", pid_running: false },
  };
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [task, failedTask, demoTask, reviewTask, draftTask, archivedTask],
      agents: [
        { agent_id: "supervisor", state: "idle", heartbeat_at: "2026-04-24T02:00:00Z" },
        { agent_id: "thread-1", state: "running", current_task_id: "task-workspace-1", heartbeat_at: "2026-04-24T02:01:00Z" },
      ],
      workspaces: [
        {
          workspace_id: "task-workspace-1",
          task_id: "task-workspace-1",
          title: "Workspace-first task",
          status: "running",
          owner: "thread-1",
          task,
          runtime: task.runtime,
          logs: [{ source: "event", type: "task.created", timestamp: "2026-04-24T02:00:00Z", summary: "Created" }],
        },
        {
          workspace_id: "task-failed-1",
          task_id: "task-failed-1",
          title: "Failed recovery task",
          status: "failed",
          owner: "thread-failed",
          task: failedTask,
          runtime: failedTask.runtime,
          logs: [{ source: "event", type: "task.failed", timestamp: "2026-04-24T02:03:00Z", summary: "Process exited" }],
        },
        {
          workspace_id: "task-snake-demo",
          task_id: "task-snake-demo",
          title: "Snake game demo",
          status: "running",
          owner: "thread-demo",
          migrated_from: "tasks",
          task: demoTask,
          runtime: demoTask.runtime,
          logs: [{ source: "event", type: "task.created", timestamp: "2026-04-24T02:04:00Z", summary: "Demo created" }],
        },
        {
          workspace_id: "task-review-1",
          task_id: "task-review-1",
          title: "Review queue task",
          status: "review",
          owner: "thread-review",
          task: reviewTask,
          runtime: reviewTask.runtime,
          logs: [{ source: "event", type: "task.completed", timestamp: "2026-04-24T02:05:00Z", summary: "Ready for review" }],
        },
        {
          workspace_id: "task-draft-1",
          task_id: "task-draft-1",
          title: "Draft scoped task",
          status: "queued",
          owner: "supervisor",
          task: draftTask,
          runtime: draftTask.runtime,
          logs: [{ source: "event", type: "task.created", timestamp: "2026-04-24T02:06:00Z", summary: "Draft created" }],
        },
        {
          workspace_id: "task-archived-1",
          task_id: "task-archived-1",
          title: "Archived evidence task",
          status: "archived",
          archived: true,
          archived_at: "2026-04-24T02:07:00Z",
          owner: "thread-archived",
          task: archivedTask,
          runtime: archivedTask.runtime,
          logs: [{ source: "event", type: "task.archived", timestamp: "2026-04-24T02:07:00Z", summary: "Archived for audit" }],
        },
      ],
      recentEvents: [],
      taskLogs: { "task-workspace-1": [{ source: "event", type: "task.created", timestamp: "2026-04-24T02:00:00Z", summary: "Created" }] },
      agentLogs: {},
      summary: { workspaceCount: 6, runningCount: 2, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));
  const homeHtml = document.getElementById("teamPanel").innerHTML;
  assert.match(homeHtml, /Team Workspaces/);
  assert.match(homeHtml, /Plan Team Run/);
  assert.match(homeHtml, /Generate Orchestration Draft/);
  assert.match(homeHtml, /Save Draft as Team Space/);
  assert.match(homeHtml, /gpt-5\.4/);
  assert.match(homeHtml, /gpt-5\.3-codex/);
  assert.match(homeHtml, /New Team Workspace/);
  assert.match(homeHtml, /data-team-template="feature"/);
  assert.match(homeHtml, /data-team-template="bugfix"/);
  assert.match(homeHtml, /data-team-template="review"/);
  assert.match(homeHtml, /data-team-template="demo"/);
  assert.match(homeHtml, /data-team-workspace-group="running"/);
  assert.match(homeHtml, /data-team-workspace-group="review"/);
  assert.match(homeHtml, /data-team-workspace-group="failed"/);
  assert.match(homeHtml, /data-team-workspace-group="draft"/);
  assert.match(homeHtml, /data-team-workspace-group="archived"/);
  assert.match(homeHtml, /data-team-legacy-demo/);
  assert.match(homeHtml, /Legacy \/ Demo Spaces/);
  assert.match(homeHtml, /Workspace-first task/);
  assert.match(homeHtml, /team-phase-badge tone-complete/);
  assert.match(homeHtml, /REVIEW &amp; RESULT/);
  assert.match(homeHtml, /team-phase-badge tone-warn/);
  assert.match(homeHtml, /FAILED/);
  assert.match(homeHtml, /Failed recovery task/);
  assert.match(homeHtml, /Review queue task/);
  assert.match(homeHtml, /Draft scoped task/);
  assert.match(homeHtml, /Archived evidence task/);
  assert.match(homeHtml, /Actionable Runtime Error/);
  assert.match(homeHtml, /Preflight: Codex CLI missing/);
  assert.match(homeHtml, /spawn codex ENOENT/);
  assert.match(homeHtml, /Install or authenticate Codex CLI/);
  assert.match(homeHtml, /Latest Log/);
  assert.match(homeHtml, /Process exited while running verification/);
  assert.match(homeHtml, /Retry Same Thread/);
  assert.match(homeHtml, /Retry New Worker/);
  assert.match(homeHtml, /Edit Task Definition/);
  assert.match(homeHtml, /Open Run Log/);
  assert.match(homeHtml, /Open Trace/);
  assert.match(homeHtml, /Copy Failure Prompt/);
  assert.match(homeHtml, /Snake game demo/);
  assert.match(homeHtml, />Archive<\/button>/);
  assert.match(homeHtml, /data-team-workspace-page="task-workspace-1"/);
  assert.match(homeHtml, /Activity \/ Diagnostics/);

  vm.runInContext("state.ui.teamWorkspacePageId = 'task-workspace-1'; render(__payload);", Object.assign(context, { __payload: payload }));
  const pageHtml = document.getElementById("teamPanel").innerHTML;
  assert.match(pageHtml, /Back to Workspaces/);
  assert.match(pageHtml, /Archive Workspace/);
  assert.doesNotMatch(pageHtml, /Delete Workspace/);
  assert.match(pageHtml, /Agents & Threads/);
  assert.match(pageHtml, /Supervisor Agent/);
  assert.match(pageHtml, /Primary Worker Agent/);
  assert.match(pageHtml, /Primary Thread/);
  assert.match(pageHtml, /Run History/);
  assert.match(pageHtml, /team-run-history-row running/);
  assert.match(pageHtml, /team-run-history-row warn/);
  assert.match(pageHtml, /Latest Run/);
  assert.match(pageHtml, /Previous Run 1/);
  assert.match(pageHtml, /run-current/);
  assert.match(pageHtml, /run-previous/);
  assert.match(pageHtml, /Started/);
  assert.match(pageHtml, /2026-04-24T02:01:00Z/);
  assert.match(pageHtml, /Updated/);
  assert.match(pageHtml, /2026-04-24T01:10:00Z/);
  assert.match(pageHtml, /Process/);
  assert.match(pageHtml, /alive/);
  assert.match(pageHtml, /exited/);
  assert.match(pageHtml, /gpt-test/);
  assert.match(pageHtml, /CLI default model/);
  assert.match(pageHtml, /Previous run failed/);
  assert.match(pageHtml, /aria-label="Team Space status chain"/);
  assert.match(pageHtml, /team-status-label">Task/);
  assert.match(pageHtml, /team-status-label">Worker/);
  assert.match(pageHtml, /team-status-label">Thread/);
  assert.match(pageHtml, /team-status-label">Run/);
  assert.match(pageHtml, /team-status-label">Trace/);
  assert.match(pageHtml, /team-status-label">Result/);
  assert.match(pageHtml, /Visible in thread board/);
  assert.match(pageHtml, /Workspace result summary/);
  assert.match(pageHtml, /Run Evidence/);
  assert.match(pageHtml, /team-phase-badge tone-complete/);
  assert.match(pageHtml, /REVIEW &amp; RESULT/);
  assert.match(pageHtml, /timeline-event-icon/);
  assert.match(pageHtml, /team-log-icon/);
  assert.match(pageHtml, /team-agent-status-bar/);
  assert.match(pageHtml, /agent-status-pill tone-idle/);
  assert.match(pageHtml, /agent-status-pill tone-running/);
  assert.match(pageHtml, /data-agent-pill="thread-1"/);
  assert.match(pageHtml, /RUNNING/);
  assert.match(pageHtml, /Runtime Signals/);
  assert.match(pageHtml, /Files/);
  assert.match(pageHtml, /Commands/);
  assert.match(pageHtml, /Checks/);
  assert.match(pageHtml, /Last Error/);
  assert.match(pageHtml, /Previous run failed/);
  assert.match(pageHtml, /Task Definition/);
  assert.match(pageHtml, /Orchestration/);
  assert.match(pageHtml, /dag-workspace-1/);
  assert.match(pageHtml, /Running/);
  assert.match(pageHtml, /Blocked/);
  assert.match(pageHtml, /Completed/);
  assert.match(pageHtml, /Blackboard/);
  assert.match(pageHtml, /Host worker/);
  assert.match(pageHtml, /UI worker/);
  assert.match(pageHtml, /Review worker/);
  assert.match(pageHtml, /thread-host/);
  assert.match(pageHtml, /ownership_conflict/);
  assert.match(pageHtml, /write_conflict/);
  assert.match(pageHtml, /Blackboard Highlights/);
  assert.match(pageHtml, /Host runtime metadata is persisted/);
  assert.match(pageHtml, /UI worker is blocked by ownership conflict/);
  assert.match(pageHtml, /src\/webview-template\.js/);
  assert.match(pageHtml, /Acceptance Criteria/);
  assert.match(pageHtml, /data-team-definition-save="task-workspace-1"/);
  assert.match(pageHtml, /Save Definition/);
  assert.match(pageHtml, /Keep runtime, trace, prompt, and result in this workspace/);
  assert.match(pageHtml, /<div class="section-title">Result<\/div>/);
  assert.match(pageHtml, /Summary/);
  assert.match(pageHtml, /Outputs/);
  assert.match(pageHtml, /docs\/team-workspace\.md/);
  assert.match(pageHtml, /Checks run/);
  assert.match(pageHtml, /node --check src\/webview-template\.js/);
  assert.match(pageHtml, /Open risks/);
  assert.match(pageHtml, /Needs screenshot coverage before release/);
  assert.match(pageHtml, /Next request/);
  assert.match(pageHtml, /Review the result envelope UI/);
  assert.doesNotMatch(pageHtml, /<pre class="team-drawer-pre">\\{\\n  &quot;summary&quot;/);
  assert.doesNotMatch(pageHtml, /Result \/ Runtime/);
  assert.match(pageHtml, /<summary>Advanced<\/summary>/);
  assert.match(pageHtml, /Runtime JSON/);
  assert.match(pageHtml, /Raw Result JSON/);
  assert.match(pageHtml, /Compiled Prompt/);
  assert.match(pageHtml, /Compiled worker instructions/);
  assert.match(pageHtml, /Do workspace work/);
});

test("Team view renders empty workspace onboarding", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));
  const homeHtml = document.getElementById("teamPanel").innerHTML;
  assert.match(homeHtml, /Create your first Team Space/);
  assert.match(homeHtml, /Plan Team Run/);
  assert.match(homeHtml, /Generate Orchestration Draft/);
  assert.match(homeHtml, /one task, one Codex worker, one thread\/run\/result chain/);
  assert.match(homeHtml, />Create Team Space<\/button>/);
  assert.match(homeHtml, /data-team-template="feature"/);
  assert.match(homeHtml, /data-team-template="bugfix"/);
  assert.match(homeHtml, /data-team-template="review"/);
  assert.match(homeHtml, /data-team-template="demo"/);
  assert.match(homeHtml, /docs\/team-workspace\.md/);
});

test("Team orchestration role picker renders built-in options and round-trips role_id from DOM", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      rolePlugins: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          { role_id: "planner", role_name: "Planner" },
          { role_id: "implementer", role_name: "Implementer" },
          { role_id: "reviewer", role_name: "Reviewer" },
        ],
      },
      organizationTemplates: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          { template_id: "fast-build-team", display_name: "Fast Build Team" },
          { template_id: "bugfix-team", display_name: "Bugfix Team" },
        ],
      },
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));
  const homeHtml = document.getElementById("teamPanel").innerHTML;
  assert.match(homeHtml, /data-team-orchestration-worker-field="role_id"/);
  assert.match(homeHtml, /data-team-orchestration-field="organization_template_id"/);
  assert.match(homeHtml, /<option value="fast-build-team">Fast Build Team<\/option>/);
  assert.match(homeHtml, /<option value="bugfix-team">Bugfix Team<\/option>/);
  assert.match(homeHtml, /<option value="planner">Planner<\/option>/);
  assert.match(homeHtml, /<option value="implementer">Implementer<\/option>/);
  assert.match(homeHtml, /<option value="reviewer">Reviewer<\/option>/);

  const rootFields = new Map([
    ["goal", "Plan one bounded role-plugin slice"],
    ["supervisor_model", "gpt-5.4"],
    ["supervisor_instructions", "Coordinate role templates and bounded workers."],
    ["organization_template_id", "bugfix-team"],
    ["worker_model", "gpt-5.3-codex"],
    ["worker_count", "1"],
  ]);
  const workerFields = new Map([
    ["title", "Role picker worker"],
    ["role_id", "reviewer"],
    ["role", "Audit one bounded role-picker change."],
    ["model", "gpt-5.3-codex"],
    ["write_paths", "src/webview-template.js"],
    ["expected_outputs", "role-picker regression test"],
  ]);
  const workerNode = {
    querySelector(selector) {
      const match = String(selector || "").match(/data-team-orchestration-worker-field="([^"]+)"/);
      if (!match) return null;
      const value = workerFields.get(match[1]);
      return value === undefined ? null : { value };
    },
  };
  context.document.querySelector = (selector) => {
    const match = String(selector || "").match(/data-team-orchestration-field="([^"]+)"/);
    if (!match) return null;
    const value = rootFields.get(match[1]);
    return value === undefined ? null : { value };
  };
  context.document.querySelectorAll = (selector) => (
    String(selector || "") === "[data-team-orchestration-worker]" ? [workerNode] : []
  );

  const draft = JSON.parse(vm.runInContext(
    "JSON.stringify(readTeamOrchestrationDraftFromDom())",
    context,
  ));
  assert.equal(draft.workerCount, 1);
  assert.equal(Array.isArray(draft.workers), true);
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.organizationTemplateId, "bugfix-team");
  assert.equal(draft.workers[0].role_id, "reviewer");
  assert.equal(draft.workers[0].role, "Audit one bounded role-picker change.");
});

test("Team orchestration role picker does not render hardcoded fallback options without role plugin templates", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));
  const homeHtml = document.getElementById("teamPanel").innerHTML;
  assert.match(homeHtml, /data-team-orchestration-worker-field="role_id"/);
  assert.match(homeHtml, /data-team-orchestration-field="organization_template_id"/);
  assert.match(homeHtml, /<option value="">Manual \/ none<\/option>/);
  assert.doesNotMatch(homeHtml, /<option value="fast-build-team">Fast Build Team<\/option>/);
  assert.match(homeHtml, /<option value="">Manual \/ custom<\/option>/);
  assert.doesNotMatch(homeHtml, /<option value="supervisor">Supervisor<\/option>/);
  assert.doesNotMatch(homeHtml, /<option value="implementer">Implementer<\/option>/);
});

test("Team orchestration draft reader applies built-in role template defaults when worker fields are blank", () => {
  const { context } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      rolePlugins: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          {
            role_id: "planner",
            role_name: "Planner",
            display_name: "Planner",
            role_template_source: "builtin",
            role_template_version: 1,
            role_prompt: "Refine one bounded implementation plan.",
            default_model: "gpt-5.3-codex",
            can_edit_code: true,
            writes_blackboard: true,
            default_read_paths: ["task-plans", "docs"],
            default_write_paths: ["task-plans"],
            default_expected_outputs: ["updated task plan checklist"],
            prompt_contract: ["Refine one bounded implementation contract."],
            result_envelope: ["summary", "changed_files", "checks_run", "open_risks", "blackboard_updates", "next_request"],
          },
        ],
      },
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));

  const rootFields = new Map([
    ["goal", "Plan one bounded role-plugin slice"],
    ["supervisor_model", "gpt-5.4"],
    ["supervisor_instructions", "Coordinate role templates and bounded workers."],
    ["organization_template_id", "fast-build-team"],
    ["worker_model", "gpt-5.5"],
    ["worker_count", "1"],
  ]);
  const workerFields = new Map([
    ["title", "Planner worker"],
    ["role_id", "planner"],
    ["role", ""],
    ["model", ""],
    ["write_paths", ""],
    ["expected_outputs", ""],
  ]);
  const workerNode = {
    querySelector(selector) {
      const match = String(selector || "").match(/data-team-orchestration-worker-field="([^"]+)"/);
      if (!match) return null;
      const value = workerFields.get(match[1]);
      return value === undefined ? null : { value };
    },
  };
  context.document.querySelector = (selector) => {
    const match = String(selector || "").match(/data-team-orchestration-field="([^"]+)"/);
    if (!match) return null;
    const value = rootFields.get(match[1]);
    return value === undefined ? null : { value };
  };
  context.document.querySelectorAll = (selector) => (
    String(selector || "") === "[data-team-orchestration-worker]" ? [workerNode] : []
  );

  const draft = JSON.parse(vm.runInContext(
    "JSON.stringify(readTeamOrchestrationDraftFromDom())",
    context,
  ));
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.organizationTemplateId, "fast-build-team");
  assert.equal(draft.workers[0].role_id, "planner");
  assert.equal(draft.workers[0].role_name, "Planner");
  assert.equal(draft.workers[0].display_name, "Planner");
  assert.equal(draft.workers[0].role_template_source, "builtin");
  assert.equal(draft.workers[0].role_template_version, 1);
  assert.equal(draft.workers[0].role, "Refine one bounded implementation plan.");
  assert.equal(draft.workers[0].model, "gpt-5.3-codex");
  assert.equal(draft.workers[0].can_edit_code, true);
  assert.equal(draft.workers[0].writes_blackboard, true);
  assert.deepEqual(draft.workers[0].read_paths, ["task-plans", "docs"]);
  assert.deepEqual(draft.workers[0].write_paths, ["task-plans"]);
  assert.deepEqual(draft.workers[0].expected_outputs, ["updated task plan checklist"]);
  assert.deepEqual(draft.workers[0].prompt_contract, ["Refine one bounded implementation contract."]);
  assert.deepEqual(draft.workers[0].result_envelope, [
    "summary",
    "changed_files",
    "checks_run",
    "open_risks",
    "blackboard_updates",
    "next_request",
  ]);
});

test("Team orchestration draft reader applies role-template expected_outputs alias when default_expected_outputs is absent", () => {
  const { context } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      rolePlugins: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          {
            role_id: "planner",
            role_name: "Planner",
            display_name: "Planner",
            role_template_source: "builtin",
            role_template_version: 1,
            role_prompt: "Refine one bounded implementation plan.",
            default_model: "gpt-5.3-codex",
            expected_outputs: ["expected outputs alias contract"],
          },
        ],
      },
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));

  const rootFields = new Map([
    ["goal", "Plan one bounded role-plugin slice"],
    ["supervisor_model", "gpt-5.4"],
    ["supervisor_instructions", "Coordinate role templates and bounded workers."],
    ["organization_template_id", ""],
    ["worker_model", "gpt-5.3-codex"],
    ["worker_count", "1"],
  ]);
  const workerFields = new Map([
    ["title", "Planner worker"],
    ["role_id", "planner"],
    ["role", ""],
    ["model", ""],
    ["write_paths", ""],
    ["expected_outputs", ""],
  ]);
  const workerNode = {
    querySelector(selector) {
      const match = String(selector || "").match(/data-team-orchestration-worker-field="([^"]+)"/);
      if (!match) return null;
      const value = workerFields.get(match[1]);
      return value === undefined ? null : { value };
    },
  };
  context.document.querySelector = (selector) => {
    const match = String(selector || "").match(/data-team-orchestration-field="([^"]+)"/);
    if (!match) return null;
    const value = rootFields.get(match[1]);
    return value === undefined ? null : { value };
  };
  context.document.querySelectorAll = (selector) => (
    String(selector || "") === "[data-team-orchestration-worker]" ? [workerNode] : []
  );

  const draft = JSON.parse(vm.runInContext(
    "JSON.stringify(readTeamOrchestrationDraftFromDom())",
    context,
  ));
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.workers[0].role_id, "planner");
  assert.deepEqual(draft.workers[0].expected_outputs, ["expected outputs alias contract"]);
});

test("Team orchestration draft reader keeps explicit worker fields while inheriting missing role template metadata", () => {
  const { context } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      rolePlugins: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          {
            role_id: "planner",
            role_name: "Planner",
            display_name: "Planner",
            role_prompt: "Refine one bounded implementation plan.",
            default_model: "gpt-5.3-codex",
            can_edit_code: true,
            writes_blackboard: true,
            default_read_paths: ["task-plans", "docs"],
            default_write_paths: ["task-plans"],
            default_expected_outputs: ["updated task plan checklist"],
            prompt_contract: ["Refine one bounded implementation contract."],
            result_envelope: ["summary", "changed_files", "checks_run", "open_risks", "blackboard_updates", "next_request"],
          },
        ],
      },
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));

  const rootFields = new Map([
    ["goal", "Plan one bounded role-plugin slice"],
    ["supervisor_model", "gpt-5.4"],
    ["supervisor_instructions", "Coordinate role templates and bounded workers."],
    ["organization_template_id", "fast-build-team"],
    ["worker_model", "gpt-5.5"],
    ["worker_count", "1"],
  ]);
  const workerFields = new Map([
    ["title", "Planner override worker"],
    ["role_id", "planner"],
    ["role", "Use a custom planning contract for this lane."],
    ["model", "gpt-5.5"],
    ["write_paths", "src/webview-template.js\nsrc/webview"],
    ["expected_outputs", "custom planning summary"],
  ]);
  const workerNode = {
    querySelector(selector) {
      const match = String(selector || "").match(/data-team-orchestration-worker-field="([^"]+)"/);
      if (!match) return null;
      const value = workerFields.get(match[1]);
      return value === undefined ? null : { value };
    },
  };
  context.document.querySelector = (selector) => {
    const match = String(selector || "").match(/data-team-orchestration-field="([^"]+)"/);
    if (!match) return null;
    const value = rootFields.get(match[1]);
    return value === undefined ? null : { value };
  };
  context.document.querySelectorAll = (selector) => (
    String(selector || "") === "[data-team-orchestration-worker]" ? [workerNode] : []
  );

  const draft = JSON.parse(vm.runInContext(
    "JSON.stringify(readTeamOrchestrationDraftFromDom())",
    context,
  ));
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.workers[0].role_id, "planner");
  assert.equal(draft.workers[0].role_name, "Planner");
  assert.equal(draft.workers[0].display_name, "Planner");
  assert.equal(draft.workers[0].role, "Use a custom planning contract for this lane.");
  assert.equal(draft.workers[0].model, "gpt-5.5");
  assert.deepEqual(draft.workers[0].read_paths, ["task-plans", "docs"]);
  assert.deepEqual(draft.workers[0].write_paths, ["src/webview-template.js", "src/webview"]);
  assert.deepEqual(draft.workers[0].expected_outputs, ["custom planning summary"]);
  assert.deepEqual(draft.workers[0].prompt_contract, ["Refine one bounded implementation contract."]);
  assert.deepEqual(draft.workers[0].result_envelope, [
    "summary",
    "changed_files",
    "checks_run",
    "open_risks",
    "blackboard_updates",
    "next_request",
  ]);
  assert.equal(draft.workers[0].can_edit_code, true);
  assert.equal(draft.workers[0].writes_blackboard, true);
});

test("Team orchestration draft reader preserves explicit worker provider while applying role template defaults", () => {
  const { context } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      rolePlugins: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          {
            role_id: "reviewer",
            role_name: "Reviewer",
            display_name: "Reviewer",
            role_prompt: "Review one bounded implementation slice.",
            default_model: "gpt-5.3-codex",
            can_edit_code: false,
            writes_blackboard: true,
          },
        ],
      },
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));

  const rootFields = new Map([
    ["goal", "Run one bounded auxiliary review lane"],
    ["supervisor_model", "gpt-5.4"],
    ["supervisor_instructions", "Coordinate one bounded reviewer lane."],
    ["organization_template_id", ""],
    ["worker_model", "gpt-5.3-codex"],
    ["worker_count", "1"],
  ]);
  const workerFields = new Map([
    ["title", "Aux review worker"],
    ["role_id", "reviewer"],
    ["role", ""],
    ["provider", "gemini-cli"],
    ["model", ""],
    ["write_paths", ""],
    ["expected_outputs", ""],
  ]);
  const workerNode = {
    querySelector(selector) {
      const match = String(selector || "").match(/data-team-orchestration-worker-field="([^"]+)"/);
      if (!match) return null;
      const value = workerFields.get(match[1]);
      return value === undefined ? null : { value };
    },
  };
  context.document.querySelector = (selector) => {
    const match = String(selector || "").match(/data-team-orchestration-field="([^"]+)"/);
    if (!match) return null;
    const value = rootFields.get(match[1]);
    return value === undefined ? null : { value };
  };
  context.document.querySelectorAll = (selector) => (
    String(selector || "") === "[data-team-orchestration-worker]" ? [workerNode] : []
  );

  const draft = JSON.parse(vm.runInContext(
    "JSON.stringify(readTeamOrchestrationDraftFromDom())",
    context,
  ));
  assert.equal(draft.workers.length, 1);
  assert.equal(draft.workers[0].role_id, "reviewer");
  assert.equal(draft.workers[0].provider, "gemini-cli");
  assert.equal(draft.workers[0].model, "gpt-5.3-codex");
});

test("Team orchestration draft reader preserves organization template worker role_id bindings across multiple lanes", () => {
  const { context } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      tasks: [],
      agents: [],
      workspaces: [],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      rolePlugins: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          { role_id: "debugger", role_name: "Debugger", display_name: "Debugger" },
          { role_id: "implementer", role_name: "Implementer", display_name: "Implementer" },
          { role_id: "tester", role_name: "Tester", display_name: "Tester" },
          { role_id: "reviewer", role_name: "Reviewer", display_name: "Reviewer" },
        ],
      },
      organizationTemplates: {
        source: "local_builtin",
        schema_version: 1,
        templates: [
          { template_id: "bugfix-team", display_name: "Bugfix Team" },
        ],
      },
      summary: { workspaceCount: 0, runningCount: 0, blockedCount: 0, agentCount: 0 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));

  const rootFields = new Map([
    ["goal", "Run one bounded bugfix organization-template pass"],
    ["supervisor_model", "gpt-5.4"],
    ["supervisor_instructions", "Coordinate bounded bugfix lanes."],
    ["organization_template_id", "bugfix-team"],
    ["worker_model", "gpt-5.3-codex"],
    ["worker_count", "2"],
  ]);
  const workerFieldMaps = [
    new Map([
      ["title", "Reproduction lane"],
      ["role_id", "debugger"],
      ["role", "Reproduce one bounded failure path."],
      ["model", "gpt-5.3-codex"],
      ["write_paths", "src"],
      ["expected_outputs", "repro notes"],
    ]),
    new Map([
      ["title", "Verification lane"],
      ["role_id", "tester"],
      ["role", "Verify one bounded fix path."],
      ["model", "gpt-5.3-codex"],
      ["write_paths", "src/host"],
      ["expected_outputs", "verification notes"],
    ]),
  ];
  const workerNodes = workerFieldMaps.map((fields) => ({
    querySelector(selector) {
      const match = String(selector || "").match(/data-team-orchestration-worker-field="([^"]+)"/);
      if (!match) return null;
      const value = fields.get(match[1]);
      return value === undefined ? null : { value };
    },
  }));
  context.document.querySelector = (selector) => {
    const match = String(selector || "").match(/data-team-orchestration-field="([^"]+)"/);
    if (!match) return null;
    const value = rootFields.get(match[1]);
    return value === undefined ? null : { value };
  };
  context.document.querySelectorAll = (selector) => (
    String(selector || "") === "[data-team-orchestration-worker]" ? workerNodes : []
  );

  const draft = JSON.parse(vm.runInContext(
    "JSON.stringify(readTeamOrchestrationDraftFromDom())",
    context,
  ));
  assert.equal(draft.organizationTemplateId, "bugfix-team");
  assert.equal(draft.workers.length, 2);
  assert.deepEqual(draft.workers.map((worker) => worker.role_id), ["debugger", "tester"]);
  assert.equal(draft.workers[0].role, "Reproduce one bounded failure path.");
  assert.equal(draft.workers[1].role, "Verify one bounded fix path.");
});

test("Team role template draft helper keeps snake_case boolean precedence over camelCase", () => {
  const { context } = loadWebviewContext();
  const worker = JSON.parse(vm.runInContext(
    `JSON.stringify(applyRoleTemplateToDraftWorker(
      {
        role_id: "planner",
        can_edit_code: false,
        canEditCode: true,
        writes_blackboard: false,
        writesBlackboard: true
      },
      [{
        role_id: "planner",
        role_name: "Planner",
        default_model: "gpt-5.3-codex",
        can_edit_code: true,
        writes_blackboard: true
      }],
      "gpt-5.3-codex"
    ))`,
    context,
  ));

  assert.equal(worker.role_id, "planner");
  assert.equal(worker.can_edit_code, false);
  assert.equal(worker.writes_blackboard, false);
});

test("Team view renders workspace-missing preflight failures on failed cards", () => {
  const { context, document } = loadWebviewContext();
  const failedTask = {
    task_id: "task-workspace-missing",
    workspace_id: "task-workspace-missing",
    title: "Workspace missing failure",
    owner: "pending-team-worker-missing",
    status: "failed",
    goal: "Show workspace missing preflight.",
    inputs: [{ type: "prompt", value: "Run without a workspace" }],
    runtime: {
      state: "failed",
      run_id: "run-workspace-missing",
      preflight_kind: "workspace_missing",
      preflight_detail: "No workspace path available.",
      preflight_action: "Open a folder or select a Codex thread with a valid cwd, then retry the Team Space.",
    },
  };
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "",
      tasks: [failedTask],
      agents: [],
      workspaces: [{ workspace_id: failedTask.workspace_id, task_id: failedTask.task_id, title: failedTask.title, status: "failed", task: failedTask, runtime: failedTask.runtime, logs: [] }],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      summary: { workspaceCount: 1 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: false, operational: false, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));
  const homeHtml = document.getElementById("teamPanel").innerHTML;
  assert.match(homeHtml, /Workspace missing failure/);
  assert.match(homeHtml, /Preflight: workspace missing/);
  assert.match(homeHtml, /No workspace path available/);
  assert.match(homeHtml, /Open a folder or select a Codex thread/);
});

test("Team view auto-opens a newly created workspace page", () => {
  const { context, document } = loadWebviewContext();
  const task = {
    task_id: "task-auto-open",
    workspace_id: "task-auto-open",
    title: "Auto-open task space",
    owner: "supervisor",
    status: "queued",
    goal: "Open this Team Space immediately after creation.",
    inputs: [{ type: "prompt", value: "Open me" }],
    runtime: {},
  };
  const payload = Object.assign({}, samplePayload(), {
    teamCoordination: {
      available: true,
      workspace: "/workspace/project",
      openWorkspaceId: "task-auto-open",
      tasks: [task],
      agents: [],
      workspaces: [{ workspace_id: "task-auto-open", task_id: "task-auto-open", title: "Auto-open task space", task, logs: [] }],
      recentEvents: [],
      taskLogs: {},
      agentLogs: {},
      summary: { workspaceCount: 1 },
      validation: { ok: true, errors: [], warnings: [] },
      readiness: { ok: true, operational: true, checks: [] },
    },
    bundledSkills: [],
  });

  vm.runInContext("state.ui.currentView = 'team'; render(__payload);", Object.assign(context, { __payload: payload }));
  assert.match(document.getElementById("teamPanel").innerHTML, /Independent Team Space/);
  assert.match(document.getElementById("teamPanel").innerHTML, /Auto-open task space/);
});
test("Overview accounts render separate profiles for same email across different auth paths", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["acct-primary", "acct-secondary"],
      currentIndex: 0,
      currentAccount: "acct-primary",
      preferredAccountName: "acct-primary",
      lastSuccessfulAccount: null,
      lastSessionId: null,
      updatedAt: "2026-05-07T09:00:00Z",
      retryAvailabilityByAccount: {},
      accountDetails: {
        "acct-primary": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          fingerprint: "same-email-fingerprint",
          credentialId: "email:shared-user@example.com",
          hasAuth: true,
          hasConfig: false,
          hasMeta: false,
          type: "official",
          duplicateWarnings: ["Potential duplicate identity: same email appears on 2 accounts."],
        },
        "acct-secondary": {
          sourceAuthPath: "/tmp/codex-auth/user-other/.codex-managed-agent/accounts/acct-secondary/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-other/.codex-managed-agent/accounts/acct-secondary/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-other/.codex-managed-agent/accounts/acct-secondary/auth.json",
          fingerprint: "same-email-fingerprint",
          credentialId: "email:shared-user@example.com",
          hasAuth: true,
          hasConfig: false,
          hasMeta: false,
          type: "official",
          duplicateWarnings: ["Potential duplicate identity: same email appears on 2 accounts."],
        },
      },
      activeProfileName: "acct-primary",
    },
  });

  vm.runInContext("state.ui.currentView = 'overview'; state.ui.overviewSubView = 'accounts'; render(__payload);", Object.assign(context, { __payload: payload }));

  const accountsHtml = document.getElementById("codexAutoAccounts").innerHTML;
  const summaryHtml = document.getElementById("accountSummaryContent").innerHTML;

  assert.match(accountsHtml, /acct-primary/);
  assert.match(accountsHtml, /acct-secondary/);
  assert.match(accountsHtml, /\/tmp\/codex-auth\/user-home\/\.codex-managed-agent\/accounts\/acct-primary\/auth\.json/);
  assert.match(accountsHtml, /\/tmp\/codex-auth\/user-other\/\.codex-managed-agent\/accounts\/acct-secondary\/auth\.json/);
  assert.equal((accountsHtml.match(/Possible Duplicate/g) || []).length, 2);
  assert.equal((accountsHtml.match(/active-profile/g) || []).length, 1);
  assert.match(summaryHtml, /Potential duplicate identity: same email appears on 2 accounts\./);
  assert.match(summaryHtml, /Source auth: <span title="\/tmp\/codex-auth\/user-home/);
  assert.match(summaryHtml, /acct-primary/);
});

test("Overview accounts render retry availability for rate-limited profiles", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["acct-primary", "acct-rate-limited"],
      currentIndex: 0,
      currentAccount: "acct-primary",
      preferredAccountName: "acct-primary",
      lastSuccessfulAccount: "acct-primary",
      lastSessionId: "session-abc",
      updatedAt: "2026-05-07T09:00:00Z",
      retryAvailabilityByAccount: {
        "acct-rate-limited": {
          code: "rate_limit",
          signal: "rate_limit_or_quota",
          message: "Quota exceeded for account. Retry in 60 seconds.",
          availableAt: "2026-05-07T10:30:00.000Z",
          retryAfterSeconds: 3600,
          displayText: "Retry in 60 seconds",
        },
      },
      accountDetails: {
        "acct-primary": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          fingerprint: "rate-limit-primary",
          credentialId: "email:rate-limit-primary@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
        },
        "acct-rate-limited": {
          sourceAuthPath: "/tmp/codex-auth/user-other/.codex-managed-agent/accounts/acct-rate-limited/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-other/.codex-managed-agent/accounts/acct-rate-limited/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-other/.codex-managed-agent/accounts/acct-rate-limited/auth.json",
          fingerprint: "rate-limit-limited",
          credentialId: "email:rate-limit-limited@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
        },
      },
      activeProfileName: "acct-primary",
    },
  });

  vm.runInContext("state.ui.currentView = 'overview'; state.ui.overviewSubView = 'accounts'; render(__payload);", Object.assign(context, { __payload: payload }));

  const accountsHtml = document.getElementById("codexAutoAccounts").innerHTML;

  assert.match(accountsHtml, /acct-rate-limited/);
  assert.match(accountsHtml, /Rate limited/);
  assert.match(accountsHtml, /Retry status:/);
  assert.match(accountsHtml, /Retry in 60 seconds/);
  assert.match(accountsHtml, /Rate-limited accounts/);
});

test("Overview accounts render live quota buckets separately from token health", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["acct-primary"],
      currentIndex: 0,
      currentAccount: "acct-primary",
      preferredAccountName: "acct-primary",
      lastSuccessfulAccount: "acct-primary",
      retryAvailabilityByAccount: {},
      accountDetails: {
        "acct-primary": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-primary/auth.json",
          fingerprint: "quota-primary",
          credentialId: "email:quota-primary@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "unknown",
          rateLimits: [
            { label: "5h", remainingPercent: 83, resetLabel: "12:33 AM" },
            { label: "Weekly", remainingPercent: 81, resetLabel: "May 14" },
          ],
        },
      },
      activeProfileName: "acct-primary",
    },
  });

  vm.runInContext("state.ui.currentView = 'overview'; state.ui.overviewSubView = 'accounts'; render(__payload);", Object.assign(context, { __payload: payload }));

  const accountsHtml = document.getElementById("codexAutoAccounts").innerHTML;

  assert.match(accountsHtml, /Rate limits remaining/);
  assert.match(accountsHtml, /5h/);
  assert.match(accountsHtml, /83%/);
  assert.match(accountsHtml, /12:33 AM/);
  assert.match(accountsHtml, /Weekly/);
  assert.match(accountsHtml, /81%/);
  assert.match(accountsHtml, /May 14/);
  assert.match(accountsHtml, /needs Validate/);
  assert.doesNotMatch(accountsHtml, /42%/);
});

test("Overview accounts renders every monitored account with structured diagnostics", () => {
  const { context, document } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["default", "backup", "backup-account2", "codex-current", "codex-current-2"],
      currentIndex: 1,
      currentAccount: "backup",
      preferredAccountName: "backup",
      lastSuccessfulAccount: "backup",
      lastSessionId: "session-five-accounts",
      updatedAt: "2026-05-08T09:00:00Z",
      retryAvailabilityByAccount: {},
      accountDetails: {
        default: {
          sourceAuthPath: "/home/user/.codex/auth.json",
          normalizedSourceAuthPath: "/home/user/.codex/auth.json",
          hasAuth: true,
          hasConfig: true,
          hasMeta: false,
          type: "relay",
          baseUrl: "https://relay.example.test/v1",
          lastUsageFetchError: { message: "structured quota diagnostic", length: 200 },
        },
        backup: {
          sourceAuthPath: "/home/user/.codex-managed-agent/accounts/backup/auth.json",
          normalizedSourceAuthPath: "/home/user/.codex-managed-agent/accounts/backup/auth.json",
          managedAuthPath: "/home/user/.codex-managed-agent/accounts/backup/auth.json",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "refresh_failed",
          tokenInfo: {
            status: "ok",
            planType: "plus",
            daysUntilExpiry: 14,
            subscriptionActiveUntil: 1770000000000,
          },
        },
        "backup-account2": {
          sourceAuthPath: "/home/user/.codex-managed-agent/accounts/backup-account2/auth.json",
          normalizedSourceAuthPath: "/home/user/.codex-managed-agent/accounts/backup-account2/auth.json",
          managedAuthPath: "/home/user/.codex-managed-agent/accounts/backup-account2/auth.json",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "refresh_failed",
        },
        "codex-current": {
          sourceAuthPath: "/home/user/.codex-managed-agent/accounts/codex-current/auth.json",
          normalizedSourceAuthPath: "/home/user/.codex-managed-agent/accounts/codex-current/auth.json",
          managedAuthPath: "/home/user/.codex-managed-agent/accounts/codex-current/auth.json",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "refresh_failed",
        },
        "codex-current-2": {
          sourceAuthPath: "/home/user/.codex-managed-agent/accounts/codex-current-2/auth.json",
          normalizedSourceAuthPath: "/home/user/.codex-managed-agent/accounts/codex-current-2/auth.json",
          managedAuthPath: "/home/user/.codex-managed-agent/accounts/codex-current-2/auth.json",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "expiring_soon",
          tokenInfo: {
            status: "expiring_soon",
            planType: "pro",
            daysUntilExpiry: 2,
            subscriptionActiveUntil: "2026-05-15T00:00:00Z",
          },
          lastUsageFetchError: { message: "last account usage diagnostic", length: 200 },
        },
      },
      activeProfileName: "codex-current-2",
      activeProfile: {
        method: "symlink",
        authPath: "/home/user/.codex/auth.json",
        authRealPath: "/home/user/.codex-managed-agent/accounts/codex-current-2/auth.json",
        authIsSymlink: true,
      },
    },
  });

  vm.runInContext(
    "state.ui.currentView = 'overview'; state.ui.overviewSubView = 'accounts'; render(__payload);",
    Object.assign(context, { __payload: payload })
  );

  const accountsHtml = document.getElementById("codexAutoAccounts").innerHTML;

  assert.match(accountsHtml, /5 accounts monitored/);
  assert.equal((accountsHtml.match(/<article class="codex-auto-account-card/g) || []).length, 5);
  ["default", "backup", "backup-account2", "codex-current", "codex-current-2"].forEach((name) => {
    assert.match(accountsHtml, new RegExp(name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")));
  });
  assert.match(accountsHtml, /Relay/);
  assert.match(accountsHtml, /structured quota diagnostic/);
  assert.match(accountsHtml, /last account usage diagnostic/);
});

test("Overview accounts show switch recommendation when active token is invalid", () => {
  const { context, document, posted } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    codexAutoState: {
      installed: true,
      stateExists: true,
      codexAutoHome: "/home/user/.codex-managed-agent",
      accounts: ["acct-good", "acct-bad"],
      currentIndex: 1,
      currentAccount: "acct-bad",
      preferredAccountName: "acct-good",
      lastSuccessfulAccount: "acct-good",
      lastSessionId: "session-switch",
      retryAvailabilityByAccount: {},
      accountDetails: {
        "acct-good": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-good/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-good/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-good/auth.json",
          fingerprint: "good-fingerprint",
          credentialId: "email:good@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "ok",
        },
        "acct-bad": {
          sourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-bad/auth.json",
          normalizedSourceAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-bad/auth.json",
          managedAuthPath: "/tmp/codex-auth/user-home/.codex-managed-agent/accounts/acct-bad/auth.json",
          fingerprint: "bad-fingerprint",
          credentialId: "email:bad@example.com",
          hasAuth: true,
          hasConfig: true,
          hasMeta: true,
          type: "official",
          tokenHealth: "invalid",
        },
      },
      activeProfileName: "acct-bad",
    },
  });

  vm.runInContext(
    "state.ui.currentView = 'overview'; state.ui.overviewSubView = 'accounts'; render(__payload);",
    Object.assign(context, { __payload: payload })
  );

  const accountsHtml = document.getElementById("codexAutoAccounts").innerHTML;

  assert.match(accountsHtml, /acct-bad/);
  assert.match(accountsHtml, /Token blocked/);
  assert.match(accountsHtml, /Token health: invalid/);
  assert.match(accountsHtml, /Switch recommended: <strong>acct-good<\/strong>/);
  assert.match(accountsHtml, /data-switch-codex-account="acct-good"/);

  const buttons = document.querySelectorAll('[data-switch-codex-account]');
  assert.equal(buttons.length, 1);
  posted.length = 0;
  buttons[0].dispatch();
  const activation = posted.find((message) => message.type === "activateCodexAccount");
  assert.ok(activation);
  assert.equal(activation.accountName, "acct-good");
});

test("Overview Network renders probes and auto-refreshes Clash when opened", () => {
  const { context, document, posted } = loadWebviewContext();
  const payload = samplePayload();

  vm.runInContext(`
    state.ui.currentView = "overview";
    state.ui.overviewSubView = "dashboard";
    syncNetworkToolsPanel(__payload);
    __hiddenNetworkHtml = document.getElementById("networkToolsPanel").innerHTML;

    state.ui.overviewSubView = "network";
    syncNetworkToolsPanel(__payload);
    __visibleNetworkHtml = document.getElementById("networkToolsPanel").innerHTML;
  `, Object.assign(context, { __payload: payload }));

  assert.match(context.__hiddenNetworkHtml, /Google Connectivity/);
  assert.match(context.__hiddenNetworkHtml, /Baidu Connectivity/);
  assert.match(context.__hiddenNetworkHtml, /Public IP Info/);
  assert.match(context.__hiddenNetworkHtml, /Clash\/Mihomo Proxy Switcher/);
  assert.match(context.__visibleNetworkHtml, /Google Connectivity/);
  assert.match(context.__visibleNetworkHtml, /Baidu Connectivity/);
  assert.match(context.__visibleNetworkHtml, /Public IP Info/);
  assert.match(context.__visibleNetworkHtml, /Status/);
  assert.match(context.__visibleNetworkHtml, /Latency/);
  assert.match(context.__visibleNetworkHtml, /Last run/);
  assert.match(context.__visibleNetworkHtml, /Runner/);
  assert.match(context.__visibleNetworkHtml, /data-network-probe="google"/);
  assert.match(context.__visibleNetworkHtml, /data-network-probe="baidu"/);
  assert.match(context.__visibleNetworkHtml, /data-network-probe="ipinfo"/);
  assert.match(context.__visibleNetworkHtml, /data-refresh-clash-proxies/);
  assert.match(context.__visibleNetworkHtml, /Switches use the Clash\/Mihomo external controller API/);
  assert.match(context.__visibleNetworkHtml, /codexAgent\.clashControllerUrl/);
  assert.match(context.__visibleNetworkHtml, /data-open-network-settings/);
  assert.ok(posted.some((message) => message.type === "refreshClashProxies"));

  const probeButtons = document.querySelectorAll("[data-network-probe]");
  assert.equal(probeButtons.length, 3);
  posted.length = 0;
  probeButtons[0].dispatch();
  const probeMessage = posted.find((message) => message.type === "runNetworkProbe");
  assert.ok(probeMessage);
  assert.equal(probeMessage.probeId, "google");

  const settingsButtons = document.querySelectorAll("[data-open-network-settings]");
  assert.equal(settingsButtons.length, 1);
  posted.length = 0;
  settingsButtons[0].dispatch();
  assert.ok(posted.some((message) => message.type === "openNetworkSettings"));
});

test("Overview Network renders Clash proxy cards and switches from the grid", () => {
  const { context, document, posted } = loadWebviewContext();
  const payload = Object.assign({}, samplePayload(), {
    clashProxyState: {
      ok: true,
      controllerUrl: "http://127.0.0.1:9090",
      groupCount: 1,
      selectedGroup: "VVCloud",
      selectedProxy: "US-7 Residential AI 3x",
      connectionReset: { ok: true },
      ipVerificationOk: true,
      groups: [
        {
          name: "VVCloud",
          type: "Selector",
          now: "US-2 Web Video 1x",
          udp: true,
          delay: 584,
          all: [
            { name: "US-2 Web Video 1x", type: "AnyTLS", udp: true, delay: 584 },
            { name: "US-7 Residential AI 3x", type: "AnyTLS", udp: true, delay: 510 },
            { name: "Fallback", type: "SS", udp: false, delay: 1539 },
          ],
        },
      ],
    },
  });

  vm.runInContext(`
    state.payload = __payload;
    state.ui.currentView = "overview";
    state.ui.overviewSubView = "network";
    syncNetworkToolsPanel(__payload);
    __proxyHtml = document.getElementById("networkToolsPanel").innerHTML;
  `, Object.assign(context, { __payload: payload }));

  assert.match(context.__proxyHtml, /Proxy Groups 1/);
  assert.match(context.__proxyHtml, /No restart/);
  assert.match(context.__proxyHtml, /Old connections closed/);
  assert.match(context.__proxyHtml, /IP verified/);
  assert.match(context.__proxyHtml, /class="clash-proxy-card ok active"/);
  assert.match(context.__proxyHtml, /US-7 Residential AI 3x/);
  assert.match(context.__proxyHtml, /data-clash-switch-group="VVCloud"/);

  const buttons = document.querySelectorAll("[data-clash-switch-group]");
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].disabled, true);
  posted.length = 0;
  buttons[1].dispatch();

  const switchMessage = posted.find((message) => message.type === "switchClashProxy");
  assert.ok(switchMessage);
  assert.equal(switchMessage.groupName, "VVCloud");
  assert.equal(switchMessage.proxyName, "US-7 Residential AI 3x");
});
