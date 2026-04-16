const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { fetchThreadDetail } = require("./server");

const THREAD_INSIGHT_CACHE_KEY = "codexAgent.threadInsightCache";
const MAX_ADVICE_USER_INPUTS = 30;
const MAX_ADVICE_CLEAN_INPUTS = 12;

function shortText(value, max = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function cleanList(items, max = 3) {
  const seen = new Set();
  return items
    .map((item) => shortText(item, 220))
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function sanitizeUserInputText(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]+`/g, " ")
    .replace(/\b(?:\/[\w.\-]+)+/g, " ")
    .replace(/\b[A-Za-z]:\\[^\s]+/g, " ")
    .replace(/\$ [^\n]+/g, " ")
    .replace(/\b(?:npm|pnpm|yarn|python|python3|node|git|cargo|go|uv|pytest|make|cmake|docker|bash|sh|npx)\b[^\n]{0,200}/gi, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHighSignalIntent(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (value.length < 8) return false;
  if (/^[\W\d_]+$/.test(value)) return false;
  if (/^(yes|ok|好的|行|继续|continue|go on)$/i.test(value)) return false;
  return true;
}

function preprocessRecentUserInputs(history) {
  const seen = new Set();
  return (Array.isArray(history) ? history : [])
    .filter((item) => String(item?.role || "").toLowerCase() === "user")
    .slice(-MAX_ADVICE_USER_INPUTS)
    .map((item) => ({
      raw: String(item?.text || ""),
      ts: item?.ts || "",
      cleaned: shortText(sanitizeUserInputText(item?.text || ""), 220),
    }))
    .filter((item) => looksLikeHighSignalIntent(item.cleaned))
    .filter((item) => {
      const key = item.cleaned.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-MAX_ADVICE_CLEAN_INPUTS);
}

function getThreadInsightCache(panel) {
  return Object.assign({}, panel.storage.get(THREAD_INSIGHT_CACHE_KEY, {}));
}

async function saveThreadInsightCache(panel, cache) {
  await panel.storage.update(THREAD_INSIGHT_CACHE_KEY, cache);
}

function threadFingerprint(detail) {
  const thread = detail?.thread || {};
  const logs = Array.isArray(detail?.logs) ? detail.logs : [];
  const history = Array.isArray(thread.history) ? thread.history : [];
  return JSON.stringify({
    updated_at_iso: thread.updated_at_iso || "",
    user_command_count: Number(thread.user_command_count || 0),
    compaction_count: Number(thread.compaction_count || 0),
    log_count: logs.length,
    history_count: history.length,
  });
}

function normalizeLogText(log) {
  return shortText(log?.message || log?.target || "", 220);
}

function extractCommandSnippet(text) {
  const source = String(text || "");
  const patterns = [
    /`([^`\n]{3,160})`/,
    /\$ ([^\n]{3,160})/,
    /\b(?:npm|pnpm|yarn|python|python3|node|git|cargo|go|uv|pytest|make|cmake|docker|bash|sh|npx)\b[^\n]{0,150}/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return shortText(match[1] || match[0], 160);
    }
  }
  return "";
}

function deriveResultText(detail) {
  const thread = detail?.thread || {};
  const logs = Array.isArray(detail?.logs) ? detail.logs : [];
  const recentLogs = logs.slice(0, 8);
  const errorLog = recentLogs.find((log) => /error|failed|panic|exception|blocked/i.test(String(log?.message || "")));
  if (errorLog) {
    return {
      tone: "risk",
      title: "Observed result",
      summary: normalizeLogText(errorLog) || "Recent activity shows an error or block that likely needs follow-up.",
      meta: errorLog.ts_iso || errorLog.age || "",
    };
  }
  const successLog = recentLogs.find((log) => /done|completed|applied|finished|success/i.test(String(log?.message || "")));
  if (successLog) {
    return {
      tone: "success",
      title: "Observed result",
      summary: normalizeLogText(successLog) || "Recent activity suggests the last step completed successfully.",
      meta: successLog.ts_iso || successLog.age || "",
    };
  }
  const status = String(thread.status || "").trim() || "idle";
  return {
    tone: status === "running" ? "live" : "neutral",
    title: "Observed result",
    summary: shortText((thread.process && thread.process.summary) || `Thread is currently ${status}.`, 180),
    meta: thread.updated_at_iso || "",
  };
}

function buildFlowSteps(detail) {
  const thread = detail?.thread || {};
  const logs = Array.isArray(detail?.logs) ? detail.logs : [];
  const history = Array.isArray(thread.history) ? thread.history : [];
  const userMessages = history.filter((item) => String(item?.role || "").toLowerCase() === "user");
  const assistantMessages = history.filter((item) => String(item?.role || "").toLowerCase() === "assistant");
  const commandCandidates = cleanList(
    logs.map((log) => extractCommandSnippet(log?.message || log?.target || ""))
      .concat(assistantMessages.map((item) => extractCommandSnippet(item?.text || ""))),
    2,
  );
  const steps = [];

  if (userMessages.length) {
    const recentIntent = userMessages[userMessages.length - 1];
    steps.push({
      kind: "intent",
      tone: "live",
      title: "User intent",
      summary: shortText(recentIntent.text || "Recent user input captured.", 200),
      meta: recentIntent.ts || "",
    });
  }

  if (commandCandidates.length) {
    steps.push({
      kind: "command",
      tone: "command",
      title: "Key command move",
      summary: commandCandidates.join("  ->  "),
      meta: `${commandCandidates.length} notable execution cue${commandCandidates.length > 1 ? "s" : ""}`,
    });
  } else if (logs.length) {
    const notableLog = logs.find((log) => normalizeLogText(log)) || logs[0];
    steps.push({
      kind: "command",
      tone: "command",
      title: "Execution trace",
      summary: normalizeLogText(notableLog) || "Recent execution activity is available in logs.",
      meta: notableLog?.ts_iso || notableLog?.age || "",
    });
  }

  steps.push(deriveResultText(detail));

  if (!steps.length) {
    steps.push({
      kind: "summary",
      tone: "neutral",
      title: "Flow summary",
      summary: "This thread has not accumulated enough history yet. Once commands and logs appear, the flow card will map the main interaction path here.",
      meta: "",
    });
  }

  return steps.slice(0, 3);
}

function buildThreadInsight(panel, detail) {
  if (!detail?.thread?.id) return null;
  const threadId = String(detail.thread.id);
  const cache = getThreadInsightCache(panel)[threadId];
  const jobState = panel.threadInsightJobs?.[threadId];
  const flowSteps = buildFlowSteps(detail);
  const next = {
    flowSteps,
    vibeAdvice: Array.isArray(cache?.advice) ? cache.advice : [],
    vibeAdviceState: cache?.advice?.length ? "ready" : "idle",
    generatedAt: cache?.generatedAt || "",
    isCached: Boolean(cache?.advice?.length),
    stale: Boolean(cache?.sourceFingerprint && cache.sourceFingerprint !== threadFingerprint(detail)),
    sourceFingerprint: cache?.sourceFingerprint || "",
    error: "",
  };
  if (jobState?.state === "loading") {
    next.vibeAdviceState = "loading";
  } else if (jobState?.state === "error") {
    next.vibeAdviceState = "error";
    next.error = String(jobState.error || "Could not generate vibe advice.");
  }
  return next;
}

function patchThreadInsight(panel, threadId, threadInsight) {
  if (!threadId || !panel.lastPayload?.detail?.thread || panel.lastPayload.detail.thread.id !== threadId) return;
  panel.lastPayload = {
    ...panel.lastPayload,
    detail: {
      ...panel.lastPayload.detail,
      threadInsight,
    },
  };
  panel.postMessage({
    type: "threadInsightPatched",
    threadId,
    threadInsight,
  });
}

async function resolveThreadDetail(panel, threadId) {
  const current = panel.lastPayload?.detail;
  if (current?.thread?.id === threadId) return current;
  const service = await panel.ensureServer({ forceStart: false });
  if (!service?.ok) {
    throw new Error(service?.message || "Codex service is not reachable");
  }
  return fetchThreadDetail(service.baseUrl, threadId);
}

function buildAdvicePrompt(detail, flowSteps) {
  const thread = detail?.thread || {};
  const history = Array.isArray(thread.history) ? thread.history : [];
  const recentUser = preprocessRecentUserInputs(history);
  const intentSummary = recentUser.length
    ? recentUser.map((item, index) => `${index + 1}. ${item.cleaned}`).join("\n")
    : "- None";
  const lightFlowSummary = (flowSteps || [])
    .filter((step) => step && step.kind === "intent")
    .slice(0, 1)
    .map((step) => `${step.title}: ${step.summary}`)
    .join("\n");
  return [
    "You are generating thread-level vibe advice for Codex-Managed-Agent.",
    "Return only valid JSON with this shape:",
    '{"advice":[{"title":"short title","advice":"specific actionable suggestion","tag":"1-3 words"}]}',
    "Rules:",
    "- Return exactly 3 advice items.",
    "- Keep each advice short, concrete, and specific to this user's prompting style in this thread.",
    "- Focus on request clarity, pacing, decomposition, and collaboration rhythm.",
    "- Avoid generic productivity advice.",
    "- Only analyze the user's inputs. Ignore assistant/model outputs, execution logs, and tool traces.",
    `- Only use the most recent ${MAX_ADVICE_USER_INPUTS} user inputs at most.`,
    `- Those inputs have already been preprocessed down to at most ${MAX_ADVICE_CLEAN_INPUTS} clean, high-signal intent snippets.`,
    "",
    `Thread title: ${thread.title || thread.id || "Untitled thread"}`,
    `Thread id: ${thread.id || ""}`,
    `User command count: ${thread.user_command_count || 0}`,
    "",
    "Recent user inputs:",
    intentSummary,
    "",
    "Optional intent summary:",
    lightFlowSummary || "- No extra summary",
  ].join("\n");
}

function extractFinalTextFromJsonLines(stdout) {
  const lines = String(stdout || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const textParts = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed === "string") {
        textParts.push(parsed);
        continue;
      }
      if (typeof parsed?.final_response === "string") textParts.push(parsed.final_response);
      if (typeof parsed?.last_message === "string") textParts.push(parsed.last_message);
      if (typeof parsed?.text === "string") textParts.push(parsed.text);
      if (typeof parsed?.message === "string") textParts.push(parsed.message);
      if (typeof parsed?.content === "string") textParts.push(parsed.content);
      if (Array.isArray(parsed?.content)) {
        parsed.content.forEach((item) => {
          if (typeof item === "string") textParts.push(item);
          if (typeof item?.text === "string") textParts.push(item.text);
        });
      }
      if (Array.isArray(parsed?.messages)) {
        parsed.messages.forEach((message) => {
          if (String(message?.role || "").toLowerCase() === "assistant" && typeof message?.content === "string") {
            textParts.push(message.content);
          }
        });
      }
    } catch {
      textParts.push(line);
    }
  }
  return textParts.join("\n").trim();
}

function coerceAdviceItems(parsed) {
  const rawItems = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.advice)
      ? parsed.advice
      : [];
  return rawItems.map((item, index) => {
    if (typeof item === "string") {
      return {
        title: `Advice ${index + 1}`,
        advice: shortText(item, 220),
        tag: "Thread",
      };
    }
    return {
      title: shortText(item?.title || `Advice ${index + 1}`, 48),
      advice: shortText(item?.advice || item?.summary || item?.text || "", 220),
      tag: shortText(item?.tag || item?.tone || "Thread", 18),
    };
  }).filter((item) => item.advice);
}

function parseAdviceText(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidates = [fenceMatch?.[1], text].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const items = coerceAdviceItems(parsed);
      if (items.length) return items.slice(0, 4);
    } catch {
      // fallback below
    }
  }
  const bulletItems = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*0-9.]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line, index) => ({
      title: `Advice ${index + 1}`,
      advice: shortText(line, 220),
      tag: "Thread",
    }));
  return bulletItems.length ? bulletItems : [{
    title: "Advice 1",
    advice: shortText(text, 220),
    tag: "Thread",
  }];
}

function runCodexExecForAdvice(prompt, cwd, onLog) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cma-vibe-advice-"));
  const lastMessagePath = path.join(tempDir, "last-message.txt");
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    onLog?.(`Starting codex exec in ${cwd || process.cwd()}`);
    const child = childProcess.spawn(
      "codex",
      ["exec", "--skip-git-repo-check", "--json", "-o", lastMessagePath, prompt],
      {
        cwd: cwd || process.cwd(),
        env: { ...process.env, TERM: process.env.TERM || "xterm-256color" },
      },
    );
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      onLog?.("codex exec timed out");
      reject(new Error("codex exec timed out while generating vibe advice"));
    }, 120000);
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      onLog?.(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      onLog?.(text);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      onLog?.(`codex exec error: ${error instanceof Error ? error.message : String(error)}`);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let lastMessage = "";
      try {
        if (fs.existsSync(lastMessagePath)) {
          lastMessage = fs.readFileSync(lastMessagePath, "utf8");
        }
      } catch {
        lastMessage = "";
      }
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failure
      }
      if (code !== 0) {
        onLog?.(`codex exec exited with code ${code}`);
        reject(new Error(shortText(stderr || stdout || `codex exec exited with code ${code}`, 260)));
        return;
      }
      onLog?.("codex exec completed successfully");
      resolve({
        stdout,
        stderr,
        finalText: extractFinalTextFromJsonLines(stdout) || lastMessage.trim(),
      });
    });
  });
}

async function generateThreadVibeAdvice(panel, threadId, force = false) {
  const nextThreadId = String(threadId || "").trim();
  if (!nextThreadId) return;
  const detail = await resolveThreadDetail(panel, nextThreadId);
  if (!detail?.thread?.id) {
    throw new Error("Thread detail is not available for vibe advice");
  }
  const fingerprint = threadFingerprint(detail);
  const cache = getThreadInsightCache(panel);
  const cached = cache[nextThreadId];
  if (!force && cached?.advice?.length) {
    patchThreadInsight(panel, nextThreadId, buildThreadInsight(panel, detail));
    return cached;
  }

  panel.threadInsightJobs = panel.threadInsightJobs || {};
  panel.threadInsightJobs[nextThreadId] = { state: "loading", requestedAt: Date.now() };
  patchThreadInsight(panel, nextThreadId, buildThreadInsight(panel, detail));

  try {
    const flowSteps = buildFlowSteps(detail);
    const prompt = buildAdvicePrompt(detail, flowSteps);
    panel.adviceOutputChannel?.appendLine(`\n[${new Date().toISOString()}] Generate Vibe Advice · ${detail.thread.title || detail.thread.id}`);
    const run = await runCodexExecForAdvice(
      prompt,
      detail.thread.cwd || process.cwd(),
      (line) => {
        String(line || "")
          .split(/\r?\n/)
          .map((item) => item.trimEnd())
          .filter(Boolean)
          .forEach((item) => panel.adviceOutputChannel?.appendLine(item));
      },
    );
    const advice = parseAdviceText(run.finalText);
    panel.adviceOutputChannel?.appendLine(`Parsed ${advice.length} advice item(s).`);
    cache[nextThreadId] = {
      advice,
      generatedAt: new Date().toISOString(),
      sourceFingerprint: fingerprint,
    };
    await saveThreadInsightCache(panel, cache);
    delete panel.threadInsightJobs[nextThreadId];
    const nextInsight = buildThreadInsight(panel, detail);
    patchThreadInsight(panel, nextThreadId, nextInsight);
    panel.lastActionNotice = cached?.advice?.length ? "Vibe advice refreshed" : "Vibe advice generated";
    return cache[nextThreadId];
  } catch (error) {
    panel.threadInsightJobs[nextThreadId] = {
      state: "error",
      error: error instanceof Error ? error.message : String(error),
      requestedAt: Date.now(),
    };
    panel.adviceOutputChannel?.appendLine(`Generation failed: ${error instanceof Error ? error.message : String(error)}`);
    patchThreadInsight(panel, nextThreadId, buildThreadInsight(panel, detail));
    throw error;
  }
}

module.exports = {
  THREAD_INSIGHT_CACHE_KEY,
  buildThreadInsight,
  generateThreadVibeAdvice,
};
