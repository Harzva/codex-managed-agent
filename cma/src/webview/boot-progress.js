function getBootProgressScript() {
  return `
      function notifyReady() {
        vscode.postMessage({ type: "ready", filter: state.ui.filter });
      }

      function setDebugStatus(nextStatus) {
        state.debugStatus = String(nextStatus || "booting");
      }

      function bootProgressMeta(failed = false) {
        if (failed) {
          return {
            percent: 92,
            activeStage: "hydrate",
            title: "Hydration needs attention",
            copy: "The webview is ready, but the host state has not arrived yet. Reload the panel or restart the local backend.",
            note: "The progress bar pauses here because the first dashboard payload did not return.",
          };
        }
        const elapsedMs = Date.now() - bootStartedAt;
        const bridgeBound = Boolean(state.bridgeBoundAt);
        const retryProgress = Math.min(28, bootRetryCount * 6);
        const fastTimeProgress = Math.min(62, Math.floor(elapsedMs / 95));
        const slowTimeProgress = Math.min(12, Math.floor(Math.max(0, elapsedMs - 6000) / 900));
        const timeProgress = fastTimeProgress + slowTimeProgress;
        let percent = 18 + timeProgress + retryProgress;
        let activeStage = "shell";
        let title = "Loading control surface";
        let copy = "Building the dashboard shell inside VS Code.";
        let note = "This progress is estimated until the host returns the first state payload.";
        if (bridgeBound) {
          percent = Math.max(percent, 54);
          activeStage = "bridge";
          title = "Bridge connected";
          copy = "The webview bridge is live. Requesting workspace state from the extension host.";
        }
        if (bootRetryCount > 0) {
          percent = Math.max(percent, 78);
          activeStage = "state";
          title = "Requesting host state";
          copy = "Waiting for thread, board, and service data from Codex-Managed-Agent.";
          note = "Ready signal sent " + String(bootRetryCount) + " time" + (bootRetryCount === 1 ? "" : "s") + ".";
        }
        if (bootRetryCount >= 3) {
          percent = Math.max(percent, 88);
          activeStage = "hydrate";
          title = "Hydrating dashboard";
          copy = "Still waiting for the first state payload. Reload is available if this stalls.";
          note = "Keeping the UI responsive while the host finishes startup.";
        }
        return {
          percent: Math.min(94, percent),
          activeStage,
          title,
          copy,
          note,
        };
      }

      function updateBootProgress(failed = false) {
        const loader = byId("hydrationLoader");
        if (!loader || state.payload) return;
        const meta = bootProgressMeta(failed);
        applyBootProgressMeta(loader, meta, failed);
      }

      function applyBootProgressMeta(loader, meta, failed = false) {
        if (!loader || !meta) return;
        loader.classList.toggle("failed", Boolean(failed));
        loader.dataset.bootStage = meta.activeStage;
        setNodeText("bootTitle", meta.title);
        setNodeText("bootCopy", meta.copy);
        setNodeText("bootPercent", String(meta.percent) + "%");
        setNodeText("bootNote", meta.note);
        const bar = byId("bootProgressBar");
        if (bar) bar.style.width = String(meta.percent) + "%";
        const progress = typeof loader.querySelector === "function" ? loader.querySelector(".boot-progress") : null;
        if (progress) progress.setAttribute("aria-valuenow", String(meta.percent));
        const stages = ["shell", "bridge", "state", "hydrate"];
        const activeIndex = stages.indexOf(meta.activeStage);
        const stageNodes = typeof loader.querySelectorAll === "function" ? loader.querySelectorAll(".boot-stage[data-boot-stage]") : [];
        stageNodes.forEach((node) => {
          const index = stages.indexOf(node.dataset.bootStage || "");
          node.classList.toggle("done", index >= 0 && activeIndex >= 0 && index < activeIndex);
          node.classList.toggle("active", node.dataset.bootStage === meta.activeStage);
        });
      }

      function finishBootProgressBeforeRender() {
        const loader = byId("hydrationLoader");
        if (!loader) return;
        applyBootProgressMeta(loader, {
          percent: 96,
          activeStage: "hydrate",
          title: "Hydration complete",
          copy: "Workspace state received. Opening the dashboard.",
          note: "Rendering the live workspace view now.",
        }, false);
      }

      function startBootProgressLoop() {
        stopBootProgressLoop();
        updateBootProgress(false);
        bootProgressTimer = window.setInterval(() => updateBootProgress(false), 450);
      }

      function stopBootProgressLoop() {
        if (bootProgressTimer) {
          window.clearInterval(bootProgressTimer);
          bootProgressTimer = undefined;
        }
      }

      function showHydrationFailureNotice() {
        setDebugStatus("degraded");
        const bridgeBoundNote = state.bridgeBoundAt
          ? (' Last bridge bind: ' + formatTimestamp(state.bridgeBoundAt) + '.')
          : "";
        stopBootProgressLoop();
        updateBootProgress(true);
        setNodeHtml("serviceMeta",
          '<span class="health-dot bad"></span>' +
          esc("Hydration") +
          ' · ' +
          esc("Timed out"));
        setNodeText("heroSummary", "The webview loaded static HTML, but state hydration did not return." + bridgeBoundNote + " Use Reload or restart the local backend to retry.");
        setNodeClassName("serviceBanner", "service-banner visible");
        setNodeHtml("serviceBanner",
          'Hydration failed: the panel did not receive state after repeated ready signals. ' +
          esc(bridgeBoundNote) +
          '<a class="chip" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.refreshPanel">Reload</a> ' +
          '<a class="chip service-restart" data-close-chrome-menu="serviceMenu" data-command-direct="true" href="command:codexAgent.restartServer">Restart Backend</a>');
      }

      function startBootRetryLoop() {
        stopBootRetryLoop();
        bootRetryCount = 0;
        bootRetryTimer = window.setInterval(() => {
          if (state.payload) {
            stopBootRetryLoop();
            stopBootProgressLoop();
            return;
          }
          if (bootRetryCount >= 6) {
            stopBootRetryLoop();
            showHydrationFailureNotice();
            return;
          }
          bootRetryCount += 1;
          notifyReady();
        }, 900);
      }

      function stopBootRetryLoop() {
        if (bootRetryTimer) {
          window.clearInterval(bootRetryTimer);
          bootRetryTimer = undefined;
        }
      }
  `.trim();
}

module.exports = {
  getBootProgressScript,
};
