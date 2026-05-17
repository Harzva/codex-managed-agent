import { contextBridge, ipcRenderer } from "electron";

type ApiRequest = {
  method?: string;
  path: string;
  body?: unknown;
};

contextBridge.exposeInMainWorld("cma", {
  getBootstrap: () => ipcRenderer.invoke("cma:get-bootstrap"),
  api: (request: ApiRequest) => ipcRenderer.invoke("cma:api", request),
  getSettings: () => ipcRenderer.invoke("cma:get-settings"),
  updateSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke("cma:update-settings", settings),
  restartBackend: () => ipcRenderer.invoke("cma:restart-backend"),
  chooseDirectory: (title?: string) => ipcRenderer.invoke("cma:choose-directory", title),
  openExternal: (url: string) => ipcRenderer.invoke("cma:open-external", url),
  openPath: (filePath: string) => ipcRenderer.invoke("cma:open-path", filePath),
  showItem: (filePath: string) => ipcRenderer.invoke("cma:show-item", filePath),
  onBackendChanged: (callback: (payload: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: unknown) => callback(payload);
    ipcRenderer.on("cma:backend-changed", listener);
    return () => ipcRenderer.off("cma:backend-changed", listener);
  },
});
