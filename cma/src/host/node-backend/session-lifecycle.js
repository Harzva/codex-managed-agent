const TOOL_CALL_COUNTS_LIMIT = 16;
const TOOL_NAME_MAX_LENGTH = 48;
const LIFECYCLE_MARKER_LIMIT = 8;
const LIFECYCLE_TOOL_LIMIT = 4;

function toUnixSeconds(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 100000000000 ? Math.floor(value / 1000) : Math.floor(value);
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return toUnixSeconds(numeric);
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
}

function toIsoLocal(seconds) {
  if (!seconds) return null;
  const date = new Date(Number(seconds) * 1000);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanText(value, max = 500) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}

function cleanTextBlock(value, max = 8000) {
  const text = String(value || "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trimEnd() : text;
}

function messageTextFromContent(content) {
  return safeArray(content)
    .map((item) => safeObject(item).text)
    .filter((text) => typeof text === "string" && text.trim())
    .map((text) => text.trim())
    .join("\n")
    .trim();
}

function isEnvironmentContextMessage(text) {
  return String(text || "").trim().startsWith("<environment_context>");
}

function isCompactionEvent(obj, payload) {
  const haystack = [
    obj && obj.type,
    payload && payload.type,
    payload && payload.event,
    payload && payload.kind,
    payload && payload.reason,
    payload && payload.message,
    payload && payload.text,
  ].map((item) => String(item || "")).join(" ");
  return /\b(compact(?:ion|ed|ing)?|context[_ -]?compact|summariz(?:e|ed|ing)\s+context)\b/i.test(haystack);
}

function collectConversationHistoryFromEvents(events, options = {}) {
  const limit = Math.min(240, Math.max(1, Number(options.limit || 96)));
  const history = [];
  safeArray(events).forEach((event, index) => {
    const obj = safeObject(event);
    const payload = safeObject(obj.payload);
    const timestamp = toUnixSeconds(obj.timestamp);
    const base = {
      ts: toIsoLocal(timestamp) || "",
      ts_iso: toIsoLocal(timestamp) || "",
      source_index: index,
    };
    if (obj.type === "response_item" && payload.type === "message") {
      const role = String(payload.role || "assistant").trim() || "assistant";
      const text = messageTextFromContent(payload.content);
      if (!text || (role === "user" && isEnvironmentContextMessage(text))) return;
      history.push({
        ...base,
        role,
        text: cleanTextBlock(text),
      });
      return;
    }
    if (obj.type === "event_msg" && payload.type === "user_message") {
      const text = cleanTextBlock(payload.message);
      if (!text || isEnvironmentContextMessage(text)) return;
      history.push({
        ...base,
        role: "user",
        text,
      });
    }
  });
  return history.slice(-limit);
}

function sanitizeToolName(value) {
  const text = String(value || "").trim();
  if (!text) return "unknown_tool";
  const sanitized = text.replace(/[^A-Za-z0-9_.:-]+/g, "_").slice(0, TOOL_NAME_MAX_LENGTH).replace(/^[._:-]+|[._:-]+$/g, "");
  return sanitized || "unknown_tool";
}

function toolNameFromResponsePayload(payload) {
  const data = safeObject(payload);
  const payloadType = data.type;
  if (typeof payloadType !== "string" || !payloadType.endsWith("_call")) return null;
  return sanitizeToolName(data.name || data.tool_name || data.server_tool_name || payloadType);
}

function appendUniqueText(items, text) {
  const value = cleanTextBlock(text, 1200);
  if (!value) return;
  if (items[items.length - 1] === value) return;
  items.push(value);
}

function recentUnique(items, limit) {
  const out = [];
  const seen = new Set();
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const value = String(items[index] || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.unshift(value);
    if (out.length >= limit) break;
  }
  return out;
}

function taskTurnIsOpen(markers) {
  let lastStarted = -1;
  let lastSettled = -1;
  safeArray(markers).forEach((marker, index) => {
    if (String(marker || "").startsWith("event:task_started")) lastStarted = index;
    if (String(marker || "").startsWith("event:task_complete") || String(marker || "").startsWith("event:turn_aborted")) {
      lastSettled = index;
    }
  });
  return lastStarted > lastSettled;
}

function containsAny(text, needles) {
  const lowered = String(text || "").toLowerCase();
  return safeArray(needles).some((needle) => lowered.includes(String(needle || "").toLowerCase()));
}

function lifecycleStateFromSignals(markers, assistantPhase, assistantText) {
  const list = safeArray(markers);
  if (!list.length) return { state: "unknown", attention: "unknown", reason: "Recent tail has no recognized lifecycle markers." };
  const last = String(list[list.length - 1] || "");
  const turnOpen = taskTurnIsOpen(list);
  if (last.startsWith("event:task_complete")) {
    return { state: "completed", attention: "completed", reason: "Recent tail contains an explicit task_complete marker." };
  }
  if (last.startsWith("event:turn_aborted")) {
    return { state: "aborted", attention: "needs_attention", reason: "Recent tail contains a turn_aborted marker." };
  }
  if (last === "event:user_message:" || last === "response:message:user") {
    return { state: "queued", attention: "active", reason: "Latest user input is recorded and awaits agent processing." };
  }
  if (last.startsWith("response:function_call_output") || last.startsWith("response:custom_tool_call_output")) {
    return { state: "running", attention: "active", reason: "Recent tail just observed tool output; current turn has not reached task_complete." };
  }
  if (last.startsWith("response:function_call") || last.startsWith("response:custom_tool_call")) {
    return { state: "running", attention: "active", reason: "Recent tail shows a tool call in progress." };
  }
  if (last === "turn_context" || last === "response:reasoning:" || last.startsWith("event:task_started")) {
    return { state: "running", attention: "active", reason: "Recent tail shows reasoning, turn setup, or task_started without task_complete." };
  }
  if (last.startsWith("response:message:assistant") || last.startsWith("event:agent_message:")) {
    if (turnOpen) {
      return { state: "running", attention: "active", reason: "Assistant output is present, but the current task turn is still open." };
    }
    const phase = String(assistantPhase || "").toLowerCase();
    const asksForHuman = phase === "commentary" || containsAny(assistantText, [
      "need your",
      "please provide",
      "please confirm",
      "cannot continue",
      "can't continue",
      "blocked",
      "manual",
      "需要你",
      "请确认",
      "请提供",
      "无法继续",
      "卡住",
      "受阻",
      "失败",
    ]) || /[?？]/.test(String(assistantText || ""));
    if (asksForHuman) {
      return { state: "needs_attention", attention: "needs_attention", reason: "Latest assistant output appears to request human input or confirmation." };
    }
    if (phase === "final_answer") {
      return { state: "completed", attention: "completed", reason: "Latest assistant output is marked as final_answer." };
    }
    return { state: "waiting", attention: "check", reason: "Assistant output ended without an explicit task_complete marker." };
  }
  if (turnOpen) {
    return { state: "running", attention: "active", reason: "A task turn is open and has not reached task_complete." };
  }
  return { state: "unknown", attention: "unknown", reason: `Latest lifecycle marker is ${last || "unknown"}.` };
}

function inferThreadLifecycleFromEvents(events) {
  const markers = [];
  const tools = [];
  const assistantSegments = [];
  let lastUser = "";
  let lastAssistant = "";
  let lastAssistantPhase = "";
  let lastEventAt = "";
  safeArray(events).forEach((event) => {
    const obj = safeObject(event);
    const payload = safeObject(obj.payload);
    const timestamp = toIsoLocal(toUnixSeconds(obj.timestamp)) || "";
    if (timestamp) lastEventAt = timestamp;
    let marker = "";
    if (obj.type === "turn_context") {
      marker = "turn_context";
    } else if (obj.type === "response_item") {
      const payloadType = String(payload.type || "").trim();
      const role = String(payload.role || "").trim();
      marker = `response:${payloadType}:${role}`;
      if (payloadType === "message") {
        const text = messageTextFromContent(payload.content);
        if (role === "assistant" && text) {
          lastAssistant = cleanTextBlock(text, 1200);
          lastAssistantPhase = String(payload.phase || "").trim();
          appendUniqueText(assistantSegments, text);
        } else if (role === "user" && text && !isEnvironmentContextMessage(text)) {
          lastUser = cleanTextBlock(text, 800);
          assistantSegments.length = 0;
          lastAssistant = "";
          lastAssistantPhase = "";
        }
      } else if (payloadType.endsWith("_call")) {
        const tool = toolNameFromResponsePayload(payload);
        if (tool) tools.push(tool);
      }
    } else if (obj.type === "event_msg") {
      const payloadType = String(payload.type || "").trim();
      const phase = String(payload.phase || "").trim();
      marker = isCompactionEvent(obj, payload) ? "" : `event:${payloadType}:${phase}`;
      if (payloadType === "user_message") {
        const text = String(payload.message || "").trim();
        if (text && !isEnvironmentContextMessage(text)) {
          lastUser = cleanTextBlock(text, 800);
          assistantSegments.length = 0;
          lastAssistant = "";
          lastAssistantPhase = "";
        }
      } else if (payloadType === "agent_message") {
        const text = String(payload.message || "").trim();
        if (text) {
          lastAssistant = cleanTextBlock(text, 1200);
          lastAssistantPhase = phase;
          appendUniqueText(assistantSegments, text);
        }
      }
    }
    if (marker && !marker.startsWith("event:token_count")) markers.push(marker);
  });
  const assistantText = assistantSegments.length ? assistantSegments.slice(-3).reverse().join("\n\n") : lastAssistant;
  const state = lifecycleStateFromSignals(markers, lastAssistantPhase, assistantText);
  return {
    ...state,
    last_marker: markers[markers.length - 1] || "",
    recent_markers: markers.slice(-LIFECYCLE_MARKER_LIMIT),
    recent_tools: recentUnique(tools, LIFECYCLE_TOOL_LIMIT),
    last_assistant_preview: cleanText(assistantText, 220),
    last_user_preview: cleanText(lastUser, 220),
    last_event_at: lastEventAt,
  };
}

function normalizeThreadLifecycle(value) {
  const data = safeObject(value);
  const state = String(data.state || "unknown").trim() || "unknown";
  return {
    state,
    attention: String(data.attention || "unknown").trim() || "unknown",
    reason: cleanText(data.reason || "No lifecycle evidence available.", 260),
    last_marker: String(data.last_marker || "").trim(),
    recent_markers: safeArray(data.recent_markers).map((item) => String(item || "")).filter(Boolean).slice(-LIFECYCLE_MARKER_LIMIT),
    recent_tools: safeArray(data.recent_tools).map((item) => sanitizeToolName(item)).filter(Boolean).slice(-LIFECYCLE_TOOL_LIMIT),
    last_assistant_preview: cleanText(data.last_assistant_preview || "", 220),
    last_user_preview: cleanText(data.last_user_preview || "", 220),
    last_event_at: String(data.last_event_at || "").trim(),
  };
}

function normalizeToolCallCounts(entries) {
  return safeArray(entries)
    .map((entry) => {
      const data = safeObject(entry);
      return {
        name: sanitizeToolName(data.name || "unknown_tool"),
        count: Math.max(0, Math.round(Number(data.count || 0))),
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
    .slice(0, TOOL_CALL_COUNTS_LIMIT);
}

module.exports = {
  collectConversationHistoryFromEvents,
  inferThreadLifecycleFromEvents,
  isCompactionEvent,
  isEnvironmentContextMessage,
  messageTextFromContent,
  normalizeThreadLifecycle,
  normalizeToolCallCounts,
  toolNameFromResponsePayload,
};
