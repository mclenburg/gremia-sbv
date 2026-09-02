import { app, BrowserWindow, nativeImage } from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveApplicationDataDirectory } from "./runtimePlatformIntegration.js";
import { registerRendererSecurityPolicy } from "./security/electronSecurity.js";
import { buildStartupSplashHtml, buildStartupStatusScript, type StartupPhaseId } from "./startupStatus.js";
import { logStartupTimeline, markStartupPhase } from "./startupPerformance.js";
import {
  emitRendererConsoleDiagnostic,
  shouldForwardRendererConsoleDiagnostics,
} from "./rendererConsoleDiagnostics.js";
app.setName("Gremia.SBV");
app.setAppUserModelId("de.gremia.sbv");

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

export function adoptStartupSplashWindow(window: BrowserWindow | undefined): void {
  if (window && !window.isDestroyed()) splashWindow = window;
}

export function hasStartupSplashWindow(): boolean {
  return Boolean(splashWindow && !splashWindow.isDestroyed());
}

export function focusStartupWindow(): void {
  const target = mainWindow ?? splashWindow;
  if (!target || target.isDestroyed()) return;
  if (target.isMinimized()) target.restore();
  target.show();
  target.focus();
}

export async function showStartupSplash(initialPhase: StartupPhaseId = "app"): Promise<void> {
  if (splashWindow && !splashWindow.isDestroyed()) {
    await updateStartupSplash(initialPhase);
    focusStartupWindow();
    return;
  }

  const splash = new BrowserWindow({
    width: 760,
    height: 460,
    minWidth: 640,
    minHeight: 420,
    title: "Gremia.SBV wird gestartet",
    icon: resolveAppIcon(),
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
    if (!splash.isDestroyed()) splash.show();
  });
  splash.on("closed", () => {
    if (splashWindow === splash) splashWindow = null;
  });

  await splash.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(buildStartupSplashHtml(initialPhase))}`,
  );

  if (!splash.isDestroyed() && !splash.isVisible()) {
    splash.show();
  }
}

export async function updateStartupSplash(phase: StartupPhaseId): Promise<void> {
  const splash = splashWindow;
  if (!splash || splash.isDestroyed()) return;
  try {
    await splash.webContents.executeJavaScript(buildStartupStatusScript(phase), true);
  } catch (error) {
    console.warn("Gremia.SBV splash status update failed", error instanceof Error ? error.name : "UnknownError");
  }
}

export function closeStartupSplash(): void {
  const splash = splashWindow;
  if (!splash || splash.isDestroyed()) return;
  splash.close();
}

export function resolveRuntimeDataDir(): string {
  return resolveApplicationDataDirectory(app);
}

export function resolvePreloadPath(): string {
  const candidates = [
    path.join(__dirname, "preload.js"),
    path.join(process.cwd(), "dist-electron/electron/preload.js"),
  ];

  const preloadPath = candidates.find((candidate) => existsSync(candidate));
  if (!preloadPath) {
    throw new Error(
      `Gremia.SBV preload script not found. Checked: ${candidates.join(", ")}`,
    );
  }

  return preloadPath;
}

export function resolveAppIconPath(): string {
  const electronProcess = process as NodeJS.Process & {
    resourcesPath?: string;
  };
  const candidates = app.isPackaged
    ? [
        path.join(
          electronProcess.resourcesPath ?? "",
          "assets",
          "icons",
          "png",
          "512x512.png",
        ),
        path.join(
          electronProcess.resourcesPath ?? "",
          "assets",
          "icons",
          "png",
          "256x256.png",
        ),
        path.join(
          electronProcess.resourcesPath ?? "",
          "assets",
          "icons",
          "icon.png",
        ),
        path.join(__dirname, "../../assets/icons/png/512x512.png"),
        path.join(__dirname, "../../assets/icons/icon.png"),
      ]
    : [
        path.join(process.cwd(), "assets", "icons", "png", "512x512.png"),
        path.join(process.cwd(), "assets", "icons", "png", "256x256.png"),
        path.join(process.cwd(), "assets", "icons", "icon.png"),
        path.join(process.cwd(), "assets", "icons", "icon.ico"),
      ];

  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    console.warn("Gremia.SBV app icon not found in configured locations.");
  }
  return match ?? candidates[0];
}

export function resolveAppIcon() {
  const iconPath = resolveAppIconPath();
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    console.warn("Gremia.SBV app icon could not be loaded.");
    return iconPath;
  }
  return image;
}

export function resolvePackagedIndexHtml(): string {
  const electronProcess = process as NodeJS.Process & {
    resourcesPath?: string;
  };
  const candidates = [
    path.join(app.getAppPath(), "dist", "index.html"),
    path.join(
      electronProcess.resourcesPath ?? "",
      "app.asar",
      "dist",
      "index.html",
    ),
    path.join(__dirname, "../../dist/index.html"),
    path.join(process.cwd(), "dist/index.html"),
  ];

  const indexHtml = candidates.find((candidate) => existsSync(candidate));
  if (!indexHtml) {
    throw new Error(
      `Gremia.SBV renderer index.html not found. Checked: ${candidates.join(", ")}`,
    );
  }

  return indexHtml;
}

export function registerDiagnostics(win: BrowserWindow): void {
  win.webContents.on("preload-error", (_event, _preloadPath, error) => {
    console.error("Gremia.SBV preload error", { name: error.name });
  });

  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, _validatedURL) => {
      console.error("Gremia.SBV renderer load failed", {
        errorCode,
        errorDescription,
      });
    },
  );

  win.webContents.on("did-finish-load", () => {
    console.info("Gremia.SBV renderer loaded.");
  });

  if (shouldForwardRendererConsoleDiagnostics(app.isPackaged, process.env.GREMIA_SBV_RENDERER_CONSOLE)) {
    win.webContents.on(
      "console-message",
      (_event, level, message, line) => {
        emitRendererConsoleDiagnostic(console, level, message, line);
      },
    );
  }

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("Gremia.SBV renderer process gone", details);
  });

  win.webContents.on("unresponsive", () => {
    console.error("Gremia.SBV renderer is unresponsive");
  });
}

export async function createWindow(): Promise<void> {
  const preload = resolvePreloadPath();
  console.info("Gremia.SBV app icon resolved.");

  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    title: "Gremia.SBV",
    icon: resolveAppIcon(),
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.GREMIA_SBV_SHOW_MENU !== "1") {
    win.setMenuBarVisibility(false);
    win.setAutoHideMenuBar(true);
  }

  mainWindow = win;
  registerDiagnostics(win);
  registerRendererSecurityPolicy(win);

  let mainWindowWasRevealed = false;
  const revealMainWindow = (
    reason: "ready-to-show" | "did-finish-load" | "load-complete" | "fallback",
  ): void => {
    if (mainWindowWasRevealed || win.isDestroyed()) return;
    mainWindowWasRevealed = true;

    if (reason === "ready-to-show") {
      markStartupPhase("main-window:ready-to-show");
    } else if (reason === "did-finish-load") {
      markStartupPhase("main-window:did-finish-load");
    } else if (reason === "load-complete") {
      markStartupPhase("main-window:load-complete");
    } else {
      console.warn(
        "Gremia.SBV window shown by fallback timer because renderer visibility was not confirmed.",
      );
      markStartupPhase("main-window:visible-fallback");
    }

    void updateStartupSplash("ready");
    win.show();
    markStartupPhase("main-window:visible");
    closeStartupSplash();
    logStartupTimeline(`main-window-visible-${reason}`);
  };

  win.once("ready-to-show", () => revealMainWindow("ready-to-show"));
  win.webContents.once("did-finish-load", () => revealMainWindow("did-finish-load"));

  // ready-to-show ist auf einigen Electron-/Linux-/AppImage-Kombinationen unzuverlaessig.
  // Das Hauptfenster soll nach dem Renderer-Load sichtbar werden, bevor Demo-Seeding CPU-Zeit bekommt.
  setTimeout(() => revealMainWindow("fallback"), 900);

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  if (!app.isPackaged) {
    await win.loadURL("http://127.0.0.1:5173");
    revealMainWindow("load-complete");
    if (process.env.GREMIA_SBV_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    const indexHtml = resolvePackagedIndexHtml();
    console.info("Gremia.SBV packaged renderer index resolved.");
    await win.loadFile(indexHtml);
    revealMainWindow("load-complete");
    if (process.env.GREMIA_SBV_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  }
}
