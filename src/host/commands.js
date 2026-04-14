const vscode = require("vscode");

function registerCommands(context, provider) {
  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.openPanel", async () => {
      await provider.focus();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.openPanelBeside", async () => {
      await provider.openBeside();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.showSidebar", async () => {
      await provider.showSidebar();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.showBottomPanel", async () => {
      await provider.showBottomPanel();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.maximizeDashboard", async () => {
      await provider.maximizeDashboard();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.movePanelToNewWindow", async () => {
      await provider.moveToNewWindow();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.refreshPanel", async () => {
      await provider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.openExternal", async () => {
      await provider.openExternal();
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("codexAgent.startServer", async () => {
      await provider.ensureServer({ forceStart: true });
      await provider.refresh();
    }),
  );
}

module.exports = {
  registerCommands,
};
