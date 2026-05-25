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
import { SecurityService } from "../services/securityService.js";
import {
  DEMO_PASSWORD,
  isDemoMode,
  prepareDemoVault,
  resetDemoDataDirectory,
  resolveDemoDataDirectory,
} from "../services/demoMode.js";
import {
  registerRendererSecurityPolicy,
  registerSessionSecurityPolicy,
} from "./security/electronSecurity.js";

app.setName("Gremia.SBV");
app.setAppUserModelId("de.gremia.sbv");

let security: SecurityService;
let mainWindow: BrowserWindow | null = null;

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

  win.once("ready-to-show", () => {
    win.show();
  });

  // Falls ready-to-show bei einem Renderer-Fehler nie feuert, soll das Fenster trotzdem sichtbar sein.
  setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) {
      console.warn(
        "Gremia.SBV window shown by fallback timer because ready-to-show did not fire.",
      );
      win.show();
    }
  }, 3000);

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  if (!app.isPackaged) {
    await win.loadURL("http://127.0.0.1:5173");
    if (process.env.GREMIA_SBV_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  } else {
    const indexHtml = resolvePackagedIndexHtml();
    console.info("Gremia.SBV renderer index:", indexHtml);
    await win.loadFile(indexHtml);
    if (process.env.GREMIA_SBV_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
  }
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app
    .whenReady()
    .then(async () => {
      if (process.env.GREMIA_SBV_SHOW_MENU !== "1") {
        Menu.setApplicationMenu(null);
      }

      registerSessionSecurityPolicy();

      const demoMode = isDemoMode();
      const dataDirectory = resolveRuntimeDataDir();
      if (demoMode) {
        resetDemoDataDirectory(dataDirectory);
      }

      security = new SecurityService(dataDirectory);
      if (demoMode) {
        await prepareDemoVault(security);
        console.info(
          `Gremia.SBV demo mode active. Data directory: ${dataDirectory}. Demo password: ${DEMO_PASSWORD}`,
        );
      } else {
        console.info("Gremia.SBV data directory:", dataDirectory);
      }
      registerSecurityIpc(ipcMain, security);
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
      return createWindow();
    })
    .catch((error) => {
      console.error("Gremia.SBV startup failed", error);
      app.quit();
    });
}

app.on("before-quit", () => {
  security?.lock("app-quit");
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
