import { contextBridge, ipcRenderer } from "electron";
import { createPreloadApi } from "./preload/index.js";
import { createIpcInvoker } from "./preload/invoke.js";

const api = createPreloadApi(createIpcInvoker(ipcRenderer));

try {
  contextBridge.exposeInMainWorld("gremiaSbv", api);
  contextBridge.exposeInMainWorld("gremiaSbvPreload", Object.freeze({ ready: true, loadedAt: api.diagnostics.preloadLoadedAt }));
} catch (error) {
  console.error("Gremia.SBV preload bridge could not be exposed", error instanceof Error ? error.name : "UnknownError");
}
