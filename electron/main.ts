import { app, BrowserWindow, Menu } from "electron";
import { markStartupPhase } from "./startupPerformance.js";
import {
  buildStartupSplashHtml,
  buildStartupStatusScript,
  type StartupPhaseId,
} from "./startupStatus.js";

markStartupPhase("bootstrap:module-loaded");

app.setName("Gremia.SBV");
app.setAppUserModelId("de.gremia.sbv");

let splashWindow: BrowserWindow | null = null;

function focusStartupWindow(): void {
  const target = splashWindow;
  if (!target || target.isDestroyed()) return;
  if (target.isMinimized()) target.restore();
  target.show();
  target.focus();
}

async function updateStartupSplash(phase: StartupPhaseId): Promise<void> {
  const splash = splashWindow;
  if (!splash || splash.isDestroyed()) return;
  try {
    await splash.webContents.executeJavaScript(buildStartupStatusScript(phase), true);
  } catch (error) {
    console.warn("Gremia.SBV bootstrap splash status update failed", error);
  }
}

async function showStartupSplash(initialPhase: StartupPhaseId = "app"): Promise<BrowserWindow> {
  if (splashWindow && !splashWindow.isDestroyed()) {
    await updateStartupSplash(initialPhase);
    focusStartupWindow();
    return splashWindow;
  }

  markStartupPhase("splash:create-window");
  const splash = new BrowserWindow({
    width: 760,
    height: 460,
    minWidth: 640,
    minHeight: 420,
    title: "Gremia.SBV wird gestartet",
    show: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: "#050505",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splashWindow = splash;
  splash.once("ready-to-show", () => {
    markStartupPhase("splash:ready-to-show");
    if (!splash.isDestroyed()) {
      splash.show();
      markStartupPhase("splash:visible");
    }
  });
  splash.on("closed", () => {
    if (splashWindow === splash) splashWindow = null;
  });

  await splash.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(buildStartupSplashHtml(initialPhase))}`,
  );

  markStartupPhase("splash:html-loaded");

  if (!splash.isDestroyed() && !splash.isVisible()) {
    splash.show();
    markStartupPhase("splash:visible-fallback");
  }

  return splash;
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    void updateStartupSplash("already-running");
    focusStartupWindow();
  });

  app.whenReady().then(async () => {
    markStartupPhase("electron:app-ready");
    if (process.env.GREMIA_SBV_SHOW_MENU !== "1") {
      Menu.setApplicationMenu(null);
    }

    const splash = await showStartupSplash("app");
    markStartupPhase("runtime:import-start");
    const runtime = await import("./appRuntime.js");
    markStartupPhase("runtime:import-complete");
    await runtime.startApplication(splash);
  }).catch((error) => {
    console.error("Gremia.SBV bootstrap startup failed", error);
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    app.quit();
  });
}
