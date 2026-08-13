import { IPC_CHANNELS, registerIpcHandler } from './ipcHandler.js';
import type { IpcMain } from "electron";
import { BrowserWindow, shell } from "electron";
import { pathToFileURL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { registerRendererSecurityPolicy } from "../security/electronSecurity.js";
import type { SecurityService } from "../../services/securityService.js";
import type { ApplicationServices } from '../applicationServices.js';
import { normalizeReportType } from "../../src/app/core/models/report.model.js";
import { decryptReportArchive, encryptReportArchive } from "../../services/reports/reportArchiveCrypto.js";
import type {
  GenerateReportInput,
  ReportGenerationResult,
} from "../../src/app/core/models/report.model.js";
import {
  assertExtension,
  assertOptionalPositiveInteger,
  assertOptionalString,
  assertRecordInput,
  ensurePathInside,
  sanitizeDialogFileName,
} from "./ipcValidation.js";

async function htmlToPdf(
  html: string,
  filePath: string,
  security: SecurityService,
): Promise<Buffer> {
  const htmlBuffer = Buffer.from(html, "utf8");
  let tempHtmlPath: string;
  try {
    tempHtmlPath = security.writeTemporaryFile(
      "report-render",
      `${path.basename(filePath, ".gsbvpdf")}.html`,
      htmlBuffer,
      "render",
    );
  } finally {
    destroyBuffer(htmlBuffer);
  }

  const win = new BrowserWindow({
    show: false,
    width: 1240,
    height: 1754,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  registerRendererSecurityPolicy(win);

  try {
    await win.loadURL(pathToFileURL(tempHtmlPath).toString());
    return await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      pageSize: "A4",
    });
  } finally {
    win.destroy();
    try {
      // Temp-Datei enthält Berichtsinhalte und wird deshalb sofort wieder entfernt.
      await import("node:fs/promises").then((fs) =>
        fs.unlink(tempHtmlPath).catch(() => undefined),
      );
    } catch {
      // no-op
    }
  }
}

function destroyBuffer(buffer?: Buffer): void {
  try { buffer?.fill(0); } catch { /* Best-Effort-Speicherhygiene. */ }
}

function writeTemporaryPlainPdf(
  security: SecurityService,
  exportedFileName: string,
): string {
  const safePdfName = sanitizeDialogFileName(
    exportedFileName,
    "reports:open-export-folder",
    "Berichtsdateiname",
  );
  if (!safePdfName || path.extname(safePdfName).toLowerCase() !== ".pdf") {
    throw new Error("Der Berichtsdateiname muss auf .pdf enden.");
  }
  const safeEncryptedPath = assertExtension(
    ensurePathInside(
      path.join(security.getDataDirectory(), "exports", `${safePdfName}.gsbvpdf`),
      path.join(security.getDataDirectory(), "exports"),
      "reports:open-export-folder",
      "Berichtspfad",
    ),
    "reports:open-export-folder",
    ["gsbvpdf"] as const,
  );
  const databaseKey = security.getActiveDatabaseKey();
  let decrypted: { pdf: Buffer; originalFileName: string };
  try {
    decrypted = decryptReportArchive(readFileSync(safeEncryptedPath, "utf8"), databaseKey);
  } finally {
    destroyBuffer(databaseKey);
  }
  const { pdf, originalFileName } = decrypted;
  security.cleanupTemporaryFiles();
  try {
    return security.writeTemporaryFile(
      "report-preview",
      path.basename(originalFileName),
      pdf,
      "preview",
    );
  } finally {
    destroyBuffer(pdf);
  }
}

export function registerReportIpc(
  ipcMain: IpcMain,
  security: SecurityService,
  services: ApplicationServices,
): void {
  const reports = services.reports;

  registerIpcHandler(ipcMain, IPC_CHANNELS.reportsDescriptors, async () => reports.descriptors());
  registerIpcHandler(ipcMain, IPC_CHANNELS.reportsHistory, async (_event, limit?: unknown) =>
    reports.listHistory(
      assertOptionalPositiveInteger(limit, "reports:history", "Limit", { max: 500 }),
    ),
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.reportsGenerate,
    async (
      _event,
      input: unknown,
    ): Promise<ReportGenerationResult> => {
      try {
        const reportInput = assertRecordInput<GenerateReportInput>(input, "reports:generate");
        const built = reports.build(reportInput);
        const target = reports.createExportTarget(built.title);
        const pdf = await htmlToPdf(built.html, target.filePath, security);
        const databaseKey = security.getActiveDatabaseKey();
        try {
          const encryptedEnvelope = encryptReportArchive(pdf, target.fileName, databaseKey);
          writeFileSync(target.filePath, JSON.stringify(encryptedEnvelope, null, 2), "utf8");
        } finally {
          destroyBuffer(databaseKey);
          destroyBuffer(pdf);
        }
        const result: ReportGenerationResult = {
          ok: true,
          reportType: reportInput.type,
          title: built.title,
          fileName: target.fileName,
          filePath: target.filePath,
          generatedAt: new Date().toISOString(),
          warnings: built.warnings,
          metrics: built.metrics,
        };
        reports.recordExport(reportInput, result);
        return result;
      } catch (error) {
        return {
          ok: false,
          reportType: normalizeReportType(
            typeof input === "object" && input && "type" in input
              ? (input as { type?: unknown }).type
              : undefined,
          ),
          title: "Bericht konnte nicht erzeugt werden",
          fileName: "",
          filePath: "",
          generatedAt: new Date().toISOString(),
          warnings: [],
          metrics: {},
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  );
  registerIpcHandler(ipcMain, IPC_CHANNELS.reportsOpenExportFolder,
    async (_event, fileName?: unknown) => {
      const requestedFileName = assertOptionalString(
        fileName,
        "reports:open-export-folder",
        "Berichtspfad",
        { maxLength: 2_000 },
      );
      if (requestedFileName) {
        const pathToOpen = writeTemporaryPlainPdf(security, requestedFileName);
        await shell.openPath(pathToOpen);
        return { opened: true };
      }
      await shell.openPath(path.join(security.getDataDirectory(), "exports"));
      return { opened: true };
    },
  );
}
