function normalizeBackendMode(service) {
  const mode = service && typeof service === "object" ? service.backendMode : "";
  return String(mode || "").trim() || "configured";
}

function backendLabel(backendMode) {
  if (backendMode === "node" || backendMode === "node-backend" || backendMode === "node-fallback") return "Node";
  if (backendMode === "remote") return "Remote";
  if (backendMode === "configured") return "Configured";
  return backendMode || "Service";
}

function getServiceCapabilityBlockReason(service, capability, actionLabel) {
  if (!service || typeof service !== "object" || service.ok !== true) return "";
  const backendMode = normalizeBackendMode(service);
  const capabilities = service.capabilities && typeof service.capabilities === "object"
    ? service.capabilities
    : {};
  const label = actionLabel || capability || "request";
  if (service.readOnly === true) {
    return `${backendLabel(backendMode)} backend is read-only; ${label} is unavailable.`;
  }
  if (capability && capabilities[capability] === false) {
    return `${backendLabel(backendMode)} backend does not allow ${label}.`;
  }
  return "";
}

module.exports = {
  getServiceCapabilityBlockReason,
};
