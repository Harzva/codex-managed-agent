function createTeamRecordValidation(deps = {}) {
  const {
    TASK_STATES,
    parseIsoTime,
    safeName,
  } = deps;

  function taskStatus(task, fallback = TASK_STATES.QUEUED) {
    return String((task && task.status) || fallback);
  }

  function taskHasStatus(task, states) {
    return states.has(taskStatus(task, ""));
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function pushValidation(collection, condition, message) {
    if (!condition) collection.push(message);
  }

  function validateTeamTaskRecord(task, options = {}) {
    const errors = [];
    const warnings = [];
    const fileTaskId = String(options.fileTaskId || "").trim();
    if (!isPlainObject(task)) {
      return { ok: false, errors: ["task record is not an object"], warnings };
    }
    const taskId = String(task.task_id || "").trim();
    const status = taskStatus(task, "");
    pushValidation(errors, Boolean(taskId), "task_id is required");
    pushValidation(errors, !taskId || safeName(taskId, "") === taskId, "task_id must be filesystem-safe");
    pushValidation(errors, !fileTaskId || taskId === fileTaskId, "task_id must match filename");
    pushValidation(errors, Boolean(String(task.title || "").trim()), "title is required");
    pushValidation(errors, Boolean(String(task.owner || "").trim()), "owner is required");
    pushValidation(errors, Boolean(String(task.goal || "").trim()), "goal is required");
    pushValidation(errors, Object.values(TASK_STATES).includes(status), `status is invalid: ${status || "(empty)"}`);
    ["dependencies", "inputs", "acceptance_criteria", "artifacts"].forEach((field) => {
      pushValidation(errors, Array.isArray(task[field]), `${field} must be an array`);
    });
    pushValidation(errors, Boolean(String(task.created_at || "").trim()), "created_at is required");
    pushValidation(errors, Boolean(String(task.updated_at || "").trim()), "updated_at is required");
    if (status === TASK_STATES.RUNNING && !parseIsoTime(task.lease_until)) {
      warnings.push("running task should have a valid lease_until");
    }
    return { ok: errors.length === 0, errors, warnings };
  }

  function validateTeamAgentRecord(agent, options = {}) {
    const errors = [];
    const warnings = [];
    const fileAgentId = String(options.fileAgentId || "").trim();
    if (!isPlainObject(agent)) {
      return { ok: false, errors: ["agent record is not an object"], warnings };
    }
    const agentId = String(agent.agent_id || "").trim();
    pushValidation(errors, Boolean(agentId), "agent_id is required");
    pushValidation(errors, !agentId || safeName(agentId, "") === agentId, "agent_id must be filesystem-safe");
    pushValidation(errors, !fileAgentId || agentId === fileAgentId, "agent_id must match filename");
    pushValidation(errors, Boolean(String(agent.state || "").trim()), "state is required");
    if (agent.current_task_id !== undefined) {
      pushValidation(errors, typeof agent.current_task_id === "string", "current_task_id must be a string");
    }
    return { ok: errors.length === 0, errors, warnings };
  }

  function isEventEnvelope(event) {
    return Boolean(
      event
      && String(event.event_id || "").trim()
      && String(event.type || "").trim()
      && String(event.timestamp || "").trim()
    );
  }

  function validateTeamEventRecord(event) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(event)) {
      return { ok: false, errors: ["event record is not an object"], warnings };
    }
    pushValidation(errors, Boolean(String(event.event_id || "").trim()), "event_id is required");
    pushValidation(errors, Boolean(String(event.type || "").trim()), "type is required");
    pushValidation(errors, Boolean(String(event.timestamp || "").trim()), "timestamp is required");
    if (event.payload !== undefined) {
      pushValidation(errors, isPlainObject(event.payload), "payload must be an object");
    }
    return { ok: errors.length === 0, errors, warnings };
  }

  function isInboxEnvelope(message) {
    return Boolean(
      message
      && String(message.message_id || "").trim()
      && String(message.target_agent_id || "").trim()
      && String(message.created_at || "").trim()
    );
  }

  function validateTeamInboxRecord(message) {
    const errors = [];
    const warnings = [];
    if (!isPlainObject(message)) {
      return { ok: false, errors: ["inbox message is not an object"], warnings };
    }
    pushValidation(errors, Boolean(String(message.message_id || "").trim()), "message_id is required");
    pushValidation(errors, Boolean(String(message.target_agent_id || "").trim()), "target_agent_id is required");
    pushValidation(errors, Boolean(String(message.created_at || "").trim()), "created_at is required");
    pushValidation(errors, Boolean(String(message.type || "").trim()), "type is required");
    if (message.payload !== undefined) {
      pushValidation(errors, isPlainObject(message.payload), "payload must be an object");
    }
    return { ok: errors.length === 0, errors, warnings };
  }

  return {
    taskStatus,
    taskHasStatus,
    isPlainObject,
    validateTeamTaskRecord,
    validateTeamAgentRecord,
    isEventEnvelope,
    validateTeamEventRecord,
    isInboxEnvelope,
    validateTeamInboxRecord,
  };
}

module.exports = {
  createTeamRecordValidation,
};
