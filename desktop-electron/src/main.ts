import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";

type DesktopSettings = {
  host: string;
  basePort: number;
  codexHome: string;
  refreshSeconds: number;
};

type BackendState = {
  server: http.Server;
  host: string;
  port: number;
  baseUrl: string;
  startedAt: string;
  stateRoot: string;
};

type NodeBackendModule = {
  createNodeBackendServer: (options?: Record<string, unknown>) => http.Server;
};

const APP_NAME = "CodexManager";
const DEFAULT_PORT = 18787;
const PORT_SCAN_COUNT = 80;

let mainWindow: BrowserWindow | undefined;
let backendState: BackendState | undefined;

app.setName(APP_NAME);
if (process.platform === "win32") {
  app.setAppUserModelId("dev.harzva.codex-managed-agent.desktop");
}

function appRoot(): string {
  return path.resolve(__dirname, "..");
}

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

function backendStateRoot(): string {
  return path.join(app.getPath("userData"), "backend-state");
}

function defaultCodexHome(): string {
  return process.env.CODEX_HOME
    ? path.resolve(process.env.CODEX_HOME)
    : path.join(os.homedir(), ".codex");
}

function defaultSettings(): DesktopSettings {
  return {
    host: "127.0.0.1",
    basePort: DEFAULT_PORT,
    codexHome: defaultCodexHome(),
    refreshSeconds: 8,
  };
}

function normalizeSettings(input: Partial<DesktopSettings> = {}): DesktopSettings {
  const defaults = defaultSettings();
  const host = String(input.host || defaults.host).trim() || defaults.host;
  const basePort = Number(input.basePort || defaults.basePort);
  const refreshSeconds = Number(input.refreshSeconds || defaults.refreshSeconds);
  const codexHome = String(input.codexHome || defaults.codexHome).trim() || defaults.codexHome;
  return {
    host,
    basePort: Number.isInteger(basePort) && basePort > 0 && basePort <= 65535 ? basePort : defaults.basePort,
    codexHome: path.resolve(codexHome),
    refreshSeconds: Number.isInteger(refreshSeconds) && refreshSeconds >= 3 ? refreshSeconds : defaults.refreshSeconds,
  };
}

function readSettings(): DesktopSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), "utf8");
    return normalizeSettings(JSON.parse(raw) as Partial<DesktopSettings>);
  } catch {
    return defaultSettings();
  }
}

function writeSettings(settings: DesktopSettings): DesktopSettings {
  const normalized = normalizeSettings(settings);
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

function getNodeBackendModule(): NodeBackendModule {
  const modulePath = path.join(appRoot(), "vendor", "cma-node-backend", "server.js");
  // The vendored backend is CommonJS from the VS Code extension package.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(modulePath) as NodeBackendModule;
}

function listen(server: http.Server, host: string, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

async function closeBackend(): Promise<void> {
  const current = backendState;
  backendState = undefined;
  if (!current) return;
  await new Promise<void>((resolve) => {
    current.server.close(() => resolve());
  }).catch(() => undefined);
}

async function startBackend(): Promise<BackendState> {
  await closeBackend();
  const settings = readSettings();
  const stateRoot = backendStateRoot();
  fs.mkdirSync(stateRoot, { recursive: true });

  const backendModule = getNodeBackendModule();
  const options = {
    codexHome: settings.codexHome,
    homeDir: stateRoot,
    indexPath: path.join(stateRoot, "session-index.json"),
    sessionIndexPath: path.join(stateRoot, "session-index.json"),
    threadStatePath: path.join(stateRoot, "thread-state.json"),
    cacheTtlMs: 1000,
  };

  for (let offset = 0; offset < PORT_SCAN_COUNT; offset += 1) {
    const port = settings.basePort + offset;
    if (port > 65535) break;
    const server = backendModule.createNodeBackendServer(options);
    try {
      await listen(server, settings.host, port);
      backendState = {
        server,
        host: settings.host,
        port,
        baseUrl: `http://${settings.host}:${port}/`,
        startedAt: new Date().toISOString(),
        stateRoot,
      };
      mainWindow?.webContents.send("cma:backend-changed", safeBackendInfo());
      return backendState;
    } catch (error) {
      try {
        server.close();
      } catch {
        // continue scanning candidate ports
      }
      const code = (error as NodeJS.ErrnoException).code || "";
      if (code !== "EADDRINUSE" && code !== "EACCES") {
        throw error;
      }
    }
  }
  throw new Error(`No local backend port available from ${settings.basePort}`);
}

function safeBackendInfo() {
  return backendState
    ? {
        baseUrl: backendState.baseUrl,
        host: backendState.host,
        port: backendState.port,
        startedAt: backendState.startedAt,
        stateRoot: backendState.stateRoot,
      }
    : null;
}

async function ensureBackend(): Promise<BackendState> {
  if (backendState) return backendState;
  return startBackend();
}

async function callBackendApi(input: {
  method?: string;
  path: string;
  body?: unknown;
}) {
  const backend = await ensureBackend();
  const method = String(input.method || "GET").toUpperCase();
  const cleanPath = input.path.startsWith("/") ? input.path.slice(1) : input.path;
  const url = new URL(cleanPath, backend.baseUrl);
  const response = await fetch(url, {
    method,
    headers: input.body === undefined ? undefined : { "content-type": "application/json" },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) as unknown : null;
  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

function createWindow(): BrowserWindow {
  const root = appRoot();
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    title: APP_NAME,
    backgroundColor: "#eef6ff",
    show: false,
    icon: path.join(root, "assets", "codex-agent.png"),
    webPreferences: {
      preload: path.join(root, "dist", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });
  win.loadFile(path.join(root, "renderer", "index.html"));
  return win;
}

function registerIpc(): void {
  ipcMain.handle("cma:get-bootstrap", async () => {
    const backend = await ensureBackend();
    return {
      appName: APP_NAME,
      platform: process.platform,
      versions: process.versions,
      settings: readSettings(),
      backend: {
        baseUrl: backend.baseUrl,
        port: backend.port,
        stateRoot: backend.stateRoot,
        startedAt: backend.startedAt,
      },
      paths: {
        userData: app.getPath("userData"),
        settings: settingsPath(),
      },
    };
  });

  ipcMain.handle("cma:api", async (_event, request: { method?: string; path: string; body?: unknown }) => {
    try {
      return await callBackendApi(request);
    } catch (error) {
      return {
        ok: false,
        status: 0,
        payload: {
          detail: error instanceof Error ? error.message : String(error),
        },
      };
    }
  });

  ipcMain.handle("cma:get-settings", async () => readSettings());

  ipcMain.handle("cma:update-settings", async (_event, settings: Partial<DesktopSettings>) => {
    const next = writeSettings({ ...readSettings(), ...settings });
    return next;
  });

  ipcMain.handle("cma:restart-backend", async () => {
    const backend = await startBackend();
    return {
      baseUrl: backend.baseUrl,
      port: backend.port,
      stateRoot: backend.stateRoot,
      startedAt: backend.startedAt,
    };
  });

  ipcMain.handle("cma:choose-directory", async (_event, title?: string) => {
    const options = {
      title: title || "Choose folder",
      properties: ["openDirectory"],
    } as Electron.OpenDialogOptions;
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options);
    return result.canceled ? null : result.filePaths[0] || null;
  });

  ipcMain.handle("cma:open-external", async (_event, url: string) => {
    await shell.openExternal(String(url || ""));
    return true;
  });

  ipcMain.handle("cma:open-path", async (_event, filePath: string) => {
    const target = String(filePath || "").trim();
    if (!target) return { ok: false, error: "Missing path" };
    const result = await shell.openPath(target);
    return result ? { ok: false, error: result } : { ok: true };
  });

  ipcMain.handle("cma:show-item", async (_event, filePath: string) => {
    const target = String(filePath || "").trim();
    if (!target) return { ok: false, error: "Missing path" };
    shell.showItemInFolder(target);
    return { ok: true };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    registerIpc();
    await startBackend();
    mainWindow = createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  }).catch((error) => {
    dialog.showErrorBox(APP_NAME, error instanceof Error ? error.message : String(error));
    app.quit();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    void closeBackend();
  });
}
