function getActionRenderersScript() {
  return `
      function commandFeedbackKey(threadId, commandLabel) {
        return (threadId || "thread") + ":" + (commandLabel || "command");
      }

      function setCommandFeedback(threadId, commandLabel, message, tone = "default") {
        state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)] = { message, tone };
      }

      function renderActionButton(action, label, tone, code, threadId) {
        const badgeTone = tone === "warn" || tone === "danger" ? tone : "default";
        return '<button class="action-btn ' + esc(tone) + ' with-icon" data-lifecycle-action="' + esc(action) + '" data-lifecycle-thread="' + esc(threadId) + '" type="button">' +
          renderIconBadge(code, badgeTone) +
          '<span>' + esc(label) + '</span>' +
        '</button>';
      }

      function terminalResumeCommand(thread) {
        const threadId = String((thread && thread.id) || "").trim();
        return threadId ? "codex resume " + shellQuote(threadId) : "";
      }

      function renderTerminalResumeButton(thread, options = {}) {
        const command = terminalResumeCommand(thread);
        const threadId = String((thread && thread.id) || "").trim();
        const cwd = String((thread && thread.cwd) || "").trim();
        const label = options.label || "Terminal";
        const className = options.className || "mini-action-btn terminal-resume";
        const icon = options.icon ? renderToolIcon("terminal") : "";
        const disabled = command ? "" : " disabled";
        return '<button class="' + esc(className) + '" data-run-command="' + esc(command) + '" data-command-label="Resume" data-command-thread="' + esc(threadId) + '" data-command-cwd="' + esc(cwd) + '" title="Resume this thread in a terminal" type="button"' + disabled + '>' + icon + '<span>' + esc(label) + '</span></button>';
      }

      function renderGitActionButton(thread, action) {
        const threadId = String((thread && thread.id) || "").trim();
        const cwd = String((thread && thread.cwd) || "").trim();
        const className = action.className || "mini-action-btn git-action";
        const icon = action.icon ? renderToolIcon("git") : "";
        const disabled = cwd && action.command ? "" : " disabled";
        const title = cwd ? action.title : "No working directory recorded for this thread";
        return '<button class="' + esc(className) + '" data-run-command="' + esc(action.command || "") + '" data-command-label="' + esc(action.commandLabel || action.label || "Git") + '" data-command-thread="' + esc(threadId) + '" data-command-cwd="' + esc(cwd) + '" title="' + esc(title) + '" type="button"' + disabled + '>' + icon + '<span>' + esc(action.label) + '</span></button>';
      }

      function renderGitActionMenu(thread, options = {}) {
        const git = threadGitMetadata(thread);
        const baseClassName = options.className || "mini-action-btn git-action";
        const pushClassName = options.pushClassName || baseClassName + " git-push";
        const icon = Boolean(options.icon);
        if (git.status === "not_git_repo") {
          return renderGitActionButton(thread, {
            label: "Git Init",
            commandLabel: "Git Init",
            command: "git init",
            title: "Initialize a git repository in this thread directory",
            className: baseClassName,
            icon,
          });
        }
        if (!git.branch && git.status !== "known" && git.status !== "detached") {
          return renderGitActionButton(thread, {
            label: "Git Status",
            commandLabel: "Git Status",
            command: "git status --short",
            title: "Check git status in this thread directory",
            className: baseClassName,
            icon,
          });
        }
        const actions = [
          renderGitActionButton(thread, {
            label: "Commit",
            commandLabel: "Git Commit",
            command: 'git add -A && git commit -m "cma checkpoint"',
            title: "Stage all changes and create a cma checkpoint commit",
            className: baseClassName,
            icon,
          }),
        ];
        if (git.hasRemote) {
          actions.push(renderGitActionButton(thread, {
            label: "Push",
            commandLabel: "Git Push",
            command: "git push -u origin HEAD",
            title: "Push this branch to origin and set upstream",
            className: pushClassName,
            icon,
          }));
        }
        return actions.join("");
      }

      function renderQuickActionButton(action, label, tone, threadId, currentTitle) {
        return '<button class="action-btn ' + esc(tone) + '" data-quick-action="' + esc(action) + '" data-quick-thread="' + esc(threadId) + '" data-quick-title="' + esc(currentTitle || "") + '" type="button">' + esc(label) + '</button>';
      }

      function normalizeHintCommand(command) {
        if (!command) return "";
        return String(command)
          .replace(/\\bcodex\\s+resume\\s+--id\\s+/g, "codex resume ")
          .replace(/\\bcodex\\s+fork\\s+--id\\s+/g, "codex fork ")
          .replace(/\\bcodex\\s+resume\\s+--id=/g, "codex resume ")
          .replace(/\\bcodex\\s+fork\\s+--id=/g, "codex fork ")
          .trim();
      }

      function renderCommandCard(label, command, commandLabel, threadId, cwd = "") {
        const normalizedCommand = normalizeHintCommand(command);
        const available = Boolean(normalizedCommand);
        const feedback = state.ui.commandFeedback[commandFeedbackKey(threadId, commandLabel)];
        return '<div class="cmd-card' + (available ? '' : ' unavailable') + '">' +
          '<div class="cmd-head"><span class="cmd-headline">' + renderIconBadge(commandLabel === "Resume" ? "RS" : "FK") + '<span class="cmd-name">' + esc(label) + '</span></span><span class="meta-pill mono">' + esc(commandLabel) + '</span></div>' +
          '<div class="cmd-subhead"><span class="cmd-hint">' + esc(available ? 'Ready for terminal or clipboard' : 'Unavailable for this thread') + '</span>' +
            (feedback ? '<span class="cmd-feedback' + (feedback.tone === "success" ? ' success' : '') + '">' + esc(feedback.message) + '</span>' : '') +
          '</div>' +
          '<div class="code-line' + (available ? '' : ' empty') + '">' + esc(normalizedCommand || "No command available.") + '</div>' +
          '<div class="cmd-actions">' +
            '<button class="action-btn secondary" data-run-command="' + esc(normalizedCommand || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" data-command-cwd="' + esc(cwd || "") + '" type="button"' + (available ? '' : ' disabled') + '>Run in Terminal</button>' +
            '<button class="action-btn secondary" data-copy-command="' + esc(normalizedCommand || "") + '" data-command-label="' + esc(commandLabel) + '" data-command-thread="' + esc(threadId || "") + '" type="button"' + (available ? '' : ' disabled') + '>Copy Command</button>' +
          '</div>' +
        '</div>';
      }
  `.trim();
}

module.exports = {
  getActionRenderersScript,
};
