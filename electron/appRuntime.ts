import { app, BrowserWindow, ipcMain, session, Menu } from "electron";
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
import { registerActivityJournalIpc } from "./ipc/activityJournalIpc.js";
import { registerSbvParticipationViolationIpc } from "./ipc/sbvParticipationViolationIpc.js";
import { registerRecruitingParticipationIpc } from "./ipc/recruitingParticipationIpc.js";
import { registerSbvOfficeWorkflowIpc } from "./ipc/sbvOfficeWorkflowIpc.js";
import { registerSbvElectionIpc } from "./ipc/sbvElectionIpc.js";
import { registerGremiaBrIpc } from "./ipc/gremiaBrIpc.js";
import { registerTransferIdentityIpc } from "./ipc/transferIdentityIpc.js";
import type { SecurityResult, SecurityStatus } from "../src/domain/models/security.model.js";
import { SecurityService } from "../services/securityService.js";
import { ApplicationServices } from "./applicationServices.js";
import { isDemoMode, prepareDemoVault, resetDemoDataDirectory, finishPackagedStartupSmoke } from "./runtimePlatformIntegration.js";
import { registerSessionSecurityPolicy } from "./security/electronSecurity.js";
import { logStartupTimeline, markStartupPhase } from "./startupPerformance.js";
import { adoptStartupSplashWindow, createWindow, focusStartupWindow, hasStartupSplashWindow, resolveRuntimeDataDir, showStartupSplash, updateStartupSplash } from './appRuntimeSupport.js';
let security: SecurityService;
let applicationServices: ApplicationServices;
let demoVaultPreparing = false;
let demoVaultReady = false;

function scheduleDemoVaultPreparation(dataDirectory: string): void {
  markStartupPhase("runtime:demo-vault-background-scheduled");
  setTimeout(() => { void prepareDemoVaultInBackground(dataDirectory); }, 500);
}

async function prepareDemoVaultInBackground(dataDirectory: string): Promise<void> {
  try {
    markStartupPhase("runtime:demo-vault-background-start");
    await prepareDemoVault(security);
    demoVaultReady = true;
    demoVaultPreparing = false;
    markStartupPhase("runtime:demo-vault-ready");
    console.info("Gremia.SBV demo vault ready. Demo password hint available in onboarding.");
    logStartupTimeline("demo-vault-ready");
  } catch (error) {
    demoVaultPreparing = false;
    demoVaultReady = false;
    console.error("Gremia.SBV demo vault preparation failed", error instanceof Error ? error.name : "UnknownError");
  }
}

export async function startApplication(existingSplashWindow?: BrowserWindow): Promise<void> {
  adoptStartupSplashWindow(existingSplashWindow);
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
  security = new SecurityService(dataDirectory, undefined, {
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    workingDirectory: process.cwd(),
  });
  applicationServices = new ApplicationServices(security, resolveRuntimeDataDir);
  markStartupPhase("runtime:security-service-ready");
  if (demoMode) {
    console.info("Gremia.SBV demo mode active. Demo vault is prepared in the background.");
  } else {
    console.info("Gremia.SBV data directory resolved.");
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
  registerCaseIpc(ipcMain, security, applicationServices);
  registerCaseHandoverIpc(ipcMain, security, applicationServices);
  registerCaseMeasureIpc(ipcMain, security, applicationServices);
  registerContactIpc(ipcMain, security, applicationServices);
  registerDeadlineIpc(ipcMain, security, applicationServices);
  registerPreventionIpc(ipcMain, security, applicationServices);
  registerParticipationIpc(ipcMain, security, applicationServices);
  registerWorkplaceAccommodationIpc(ipcMain, security, applicationServices);
  registerBemIpc(ipcMain, security, applicationServices);
  registerEqualizationIpc(ipcMain, security, applicationServices);
  registerTerminationIpc(ipcMain, security, applicationServices);
  registerKnowledgeIpc(ipcMain, security, applicationServices);
  registerTemplateIpc(ipcMain, security, applicationServices);
  registerGremiaBrIpc(ipcMain, security, applicationServices);
  registerTransferIdentityIpc(ipcMain, security, applicationServices);
  registerProtectedPersonIpc(ipcMain, security, applicationServices);
  registerReportIpc(ipcMain, security, applicationServices);
  registerComplianceIpc(ipcMain, security, applicationServices);
  registerBackupIpc(ipcMain, security, applicationServices);
  registerRetentionIpc(ipcMain, security, applicationServices);
  registerSbvResourceIpc(ipcMain, security, applicationServices);
  registerSbvControlProtocolIpc(ipcMain, security, applicationServices);
  registerActivityJournalIpc(ipcMain, security, applicationServices);
  registerSbvParticipationViolationIpc(ipcMain, security, resolveRuntimeDataDir, applicationServices);
  registerRecruitingParticipationIpc(ipcMain, security, applicationServices);
  registerSbvOfficeWorkflowIpc(ipcMain, security, applicationServices);
  registerSbvElectionIpc(ipcMain, security, applicationServices);
  markStartupPhase("runtime:ipc-registered");
  await updateStartupSplash("ui");
  await createWindow();
  markStartupPhase("runtime:create-window-complete");
  finishPackagedStartupSmoke(dataDirectory, app);

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
  if (hasStartupSplashWindow()) {
    focusStartupWindow();
    return;
  }
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
