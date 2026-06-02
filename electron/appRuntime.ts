import {
  app,
  BrowserWindow,
  ipcMain,
  nativeImage,
  session,
  Menu,
} from "electron";
import { existsSync } from "node:fs";
import path from "node:path";
import { registerCaseIpc } from "./ipc/caseIpc.js";
import { registerCaseHandoverIpc } from "./ipc/caseHandoverIpc.js";
import { registerCaseMeasureIpc } from "./ipc/caseMeasureIpc.js";
import { registerContactIpc } from "./ipc/contactIpc.js";
import { registerDeadlineIpc } from "./ipc/deadlineIpc.js";
import { registerSecurityIpc } from "./ipc/securityIpc.js";
import { registerReportIpc } from "./ipc/reportIpc.js";
import { registerBackupIpc } from "./ipc/backupIpc.js";
import { registerRetentionIpc } from "./ipc/retentionIpc.js";
import { registerPreventionIpc } from "./ipc/preventionIpc.js";
import { registerParticipationIpc } from "./ipc/participationIpc.js";
import { registerWorkplaceAccommodationIpc } from "./ipc/workplaceAccommodationIpc.js";
import { registerBemIpc } from "./ipc/bemIpc.js";
import { registerEqualizationIpc } from "./ipc/equalizationIpc.js";
import { registerTerminationIpc } from "./ipc/terminationIpc.js";
import { registerKnowledgeIpc } from "./ipc/knowledgeIpc.js";
import { registerTemplateIpc } from "./ipc/templateIpc.js";
import { registerProtectedPersonIpc } from "./ipc/protectedPersonIpc.js";
import { registerComplianceIpc } from "./ipc/complianceIpc.js";
import { registerSbvResourceIpc } from "./ipc/sbvResourceIpc.js";
import { registerSbvControlProtocolIpc } from "./ipc/sbvControlProtocolIpc.js";
import type { SecurityResult, SecurityStatus } from "../src/app/core/models/security.model.js";
import { SecurityService } from "../services/securityService.js";
import {
  isDemoMode,
  prepareDemoVault,
  resetDemoDataDirectory,
  resolveDemoDataDirectory,
} from "../services/demoMode.js";
import {
  registerRendererSecurityPolicy,
  registerSessionSecurityPolicy,
} from "./security/electronSecurity.js";
import {
  buildStartupSplashHtml,
  buildStartupStatusScript,
  type StartupPhaseId,
} from "./startupStatus.js";
import { logStartupTimeline, markStartupPhase } from "./startupPerformance.js";

app.setName("Gremia.SBV");
app.setAppUserModelId("de.gremia.sbv");

let security: SecurityService;
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let demoVaultPreparing = false;
let demoVaultReady = false;

function focusStartupWindow(): void {
  const target = mainWindow ?? splashWindow;
  if (!target || target.isDestroyed()) return;
  if (target.isMinimized()) target.restore();
  target.show();
  target.focus();
}

async function showStartupSplash(initialPhase: StartupPhaseId = "app"): Promise<void> {
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

async function updateStartupSplash(phase: StartupPhaseId): Promise<void> {
  const splash = splashWindow;
  if (!splash || splash.isDestroyed()) return;
  try {
    await splash.webContents.executeJavaScript(buildStartupStatusScript(phase), true);
  } catch (error) {
    console.warn("Gremia.SBV splash status update failed", error);
  }
}

function closeStartupSplash(): void {
  const splash = splashWindow;
  if (!splash || splash.isDestroyed()) return;
  splash.close();
}

function resolveRuntimeDataDir(): string {
  if (isDemoMode()) {
    return resolveDemoDataDirectory();
  }

  if (process.env.GREMIA_SBV_DATA_DIR) {
    return process.env.GREMIA_SBV_DATA_DIR;
  }

  if (app.isPackaged) {
    return path.join(app.getPath("userData"), "data");
  }

  return path.join(process.cwd(), "data");
}

function resolvePreloadPath(): string {
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

function resolveAppIconPath(): string {
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
    console.warn(
      "Gremia.SBV app icon not found. Checked:",
      candidates.join(", "),
    );
  }
  return match ?? candidates[0];
}

function resolveAppIcon() {
  const iconPath = resolveAppIconPath();
  const image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    console.warn("Gremia.SBV app icon could not be loaded:", iconPath);
    return iconPath;
  }
  return image;
}

function resolvePackagedIndexHtml(): string {
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

function registerDiagnostics(win: BrowserWindow): void {
  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("Gremia.SBV preload error", preloadPath, error);
  });

  win.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription, validatedURL) => {
      console.error("Gremia.SBV renderer load failed", {
        errorCode,
        errorDescription,
        validatedURL,
      });
    },
  );

  win.webContents.on("did-finish-load", () => {
    console.info("Gremia.SBV renderer loaded:", win.webContents.getURL());
  });

  win.webContents.on(
    "console-message",
    (_event, level, message, line, sourceId) => {
      const prefix =
        level >= 2
          ? "Gremia.SBV renderer console error"
          : "Gremia.SBV renderer console";
      console.log(prefix, { level, message, line, sourceId });
    },
  );

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("Gremia.SBV renderer process gone", details);
  });

  win.webContents.on("unresponsive", () => {
    console.error("Gremia.SBV renderer is unresponsive");
  });
}

async function createWindow(): Promise<void> {
  const preload = resolvePreloadPath();
  console.info("Gremia.SBV app icon:", resolveAppIconPath());

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
    console.info("Gremia.SBV renderer index:", indexHtml);
    await win.loadFile(indexHtml);
    revealMainWindow("load-complete");
    if (process.env.GREMIA_SBV_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  }
}

function scheduleDemoVaultPreparation(dataDirectory: string): void {
  markStartupPhase("runtime:demo-vault-background-scheduled");
  setTimeout(() => {
    void prepareDemoVaultInBackground(dataDirectory);
  }, 500);
}

async function prepareDemoVaultInBackground(dataDirectory: string): Promise<void> {
  try {
    markStartupPhase("runtime:demo-vault-background-start");
    await prepareDemoVault(security);
    demoVaultReady = true;
    demoVaultPreparing = false;
    markStartupPhase("runtime:demo-vault-ready");
    console.info(
      `Gremia.SBV demo vault ready. Data directory: ${dataDirectory}. Demo password hint available in onboarding.`,
    );
    logStartupTimeline("demo-vault-ready");
  } catch (error) {
    demoVaultPreparing = false;
    demoVaultReady = false;
    console.error("Gremia.SBV demo vault preparation failed", error);
  }
}

export async function startApplication(existingSplashWindow?: BrowserWindow): Promise<void> {
  if (existingSplashWindow && !existingSplashWindow.isDestroyed()) {
    splashWindow = existingSplashWindow;
  }

  app.on("second-instance", () => {
    void updateStartupSplash("already-running");
    focusStartupWindow();
  });

  if (process.env.GREMIA_SBV_SHOW_MENU !== "1") {
    Menu.setApplicationMenu(null);
  }

  registerSessionSecurityPolicy();
  await showStartupSplash("app");
  markStartupPhase("runtime:session-policy");
  await updateStartupSplash("policy");

  const demoMode = isDemoMode();
  const dataDirectory = resolveRuntimeDataDir();
  markStartupPhase("runtime:data-directory-resolved");
  await updateStartupSplash("storage");
  if (demoMode) {
    await updateStartupSplash("demo");
    resetDemoDataDirectory(dataDirectory);
    demoVaultPreparing = true;
    demoVaultReady = false;
    markStartupPhase("runtime:demo-reset-complete");
  }

  await updateStartupSplash("security");
  security = new SecurityService(dataDirectory);
  markStartupPhase("runtime:security-service-ready");
  if (demoMode) {
    console.info(
      `Gremia.SBV demo mode active. Data directory: ${dataDirectory}. Demo vault is prepared in the background.`,
    );
  } else {
    console.info("Gremia.SBV data directory:", dataDirectory);
  }
  await updateStartupSplash("ipc");
  registerSecurityIpc(ipcMain, security, demoMode ? {
    status: async (): Promise<SecurityStatus> => {
      if (!demoVaultPreparing || demoVaultReady) return security.status();
      return {
        initialized: true,
        unlocked: false,
        dataProtectionState: "locked",
        recoveryRequired: false,
      };
    },
    unlock: async (): Promise<SecurityResult | null> => {
      if (!demoVaultPreparing || demoVaultReady) return null;
      return {
        ok: false,
        initialized: true,
        unlocked: false,
        error: "Die Demoumgebung wird noch vorbereitet. Bitte kurz warten und erneut entsperren.",
      };
    },
  } : undefined);
  registerCaseIpc(ipcMain, security);
  registerCaseHandoverIpc(ipcMain, security);
  registerCaseMeasureIpc(ipcMain, security);
  registerContactIpc(ipcMain, security);
  registerDeadlineIpc(ipcMain, security);
  registerPreventionIpc(ipcMain, security);
  registerParticipationIpc(ipcMain, security);
  registerWorkplaceAccommodationIpc(ipcMain, security);
  registerBemIpc(ipcMain, security);
  registerEqualizationIpc(ipcMain, security);
  registerTerminationIpc(ipcMain, security);
  registerKnowledgeIpc(ipcMain, security);
  registerTemplateIpc(ipcMain, security);
  registerProtectedPersonIpc(ipcMain, security);
  registerReportIpc(ipcMain, security);
  registerComplianceIpc(ipcMain, security);
  registerBackupIpc(ipcMain, security);
  registerRetentionIpc(ipcMain, security);
  registerSbvResourceIpc(ipcMain, security);
  registerSbvControlProtocolIpc(ipcMain, security);
  markStartupPhase("runtime:ipc-registered");
  await updateStartupSplash("ui");
  await createWindow();
  markStartupPhase("runtime:create-window-complete");

  if (demoMode) {
    scheduleDemoVaultPreparation(dataDirectory);
  }
}

app.on("before-quit", () => {
  security?.lock("app-quit");
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (splashWindow && !splashWindow.isDestroyed()) {
    focusStartupWindow();
    return;
  }
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
