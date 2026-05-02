import type { IpcMain } from 'electron';
import { BrowserWindow, shell } from 'electron';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { ReportService } from '../../services/reportService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { GenerateReportInput, ReportGenerationResult } from '../../src/app/core/models/report.model.js';

async function htmlToPdf(html: string, filePath: string): Promise<Buffer> {
  const tempHtmlPath = path.join(path.dirname(filePath), `.tmp-${path.basename(filePath, '.pdf')}.html`);
  writeFileSync(tempHtmlPath, html, 'utf8');

  const win = new BrowserWindow({
    show: false,
    width: 1240,
    height: 1754,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  try {
    await win.loadURL(pathToFileURL(tempHtmlPath).toString());
    return await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
      pageSize: 'A4'
    });
  } finally {
    win.destroy();
    try {
      // Temp-Datei enthält Berichtsinhalte und wird deshalb sofort wieder entfernt.
      await import('node:fs/promises').then((fs) => fs.unlink(tempHtmlPath).catch(() => undefined));
    } catch {
      // no-op
    }
  }
}


interface EncryptedReportEnvelope {
  version: 1;
  type: 'gremia-sbv-encrypted-report-pdf';
  algorithm: 'aes-256-gcm';
  originalFileName: string;
  createdAt: string;
  iv: string;
  tag: string;
  ciphertext: string;
}

function deriveReportArchiveKey(databaseKey: Buffer): Buffer {
  return createHash('sha256')
    .update('gremia-sbv-report-archive-v1')
    .update(databaseKey)
    .digest();
}

function encryptReportPdf(pdf: Buffer, originalFileName: string, databaseKey: Buffer): EncryptedReportEnvelope {
  const key = deriveReportArchiveKey(databaseKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(originalFileName, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(pdf), cipher.final()]);
  return {
    version: 1,
    type: 'gremia-sbv-encrypted-report-pdf',
    algorithm: 'aes-256-gcm',
    originalFileName,
    createdAt: new Date().toISOString(),
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decryptReportPdf(encryptedPath: string, databaseKey: Buffer): { pdf: Buffer; originalFileName: string } {
  const envelope = JSON.parse(readFileSync(encryptedPath, 'utf8')) as EncryptedReportEnvelope;
  if (envelope.type !== 'gremia-sbv-encrypted-report-pdf' || envelope.algorithm !== 'aes-256-gcm') {
    throw new Error('Der Berichtsexport hat kein unterstütztes verschlüsseltes Gremia.SBV-Format.');
  }
  const key = deriveReportArchiveKey(databaseKey);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(envelope.iv, 'hex'));
  decipher.setAAD(Buffer.from(envelope.originalFileName, 'utf8'));
  decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
  return {
    pdf: Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]),
    originalFileName: envelope.originalFileName
  };
}

function writeTemporaryPlainPdf(security: SecurityService, encryptedPath: string): string {
  const { pdf, originalFileName } = decryptReportPdf(encryptedPath, security.getActiveDatabaseKey());
  const tmpDir = path.join(security.getDataDirectory(), 'tmp', 'report-preview');
  const safeName = path.basename(originalFileName).replace(/[^a-zA-Z0-9._-]/g, '_');
  const tempPath = path.join(tmpDir, `${Date.now()}-${safeName}`);
  // Der temporäre Ordner enthält nur bewusst geöffnete Arbeitskopien. Vor jedem Öffnen werden alte Arbeitskopien entfernt.
  mkdirSync(tmpDir, { recursive: true });
  for (const entry of readdirSync(tmpDir)) {
    if (entry.toLowerCase().endsWith('.pdf')) {
      try { unlinkSync(path.join(tmpDir, entry)); } catch { /* Viewer kann eine Datei noch geöffnet halten. */ }
    }
  }
  writeFileSync(tempPath, pdf);
  return tempPath;
}

export function registerReportIpc(ipcMain: IpcMain, security: SecurityService): void {
  const reports = new ReportService(
    () => security.getActiveDatabase(),
    () => security.getDataDirectory()
  );

  ipcMain.handle('reports:descriptors', async () => reports.descriptors());
  ipcMain.handle('reports:history', async (_event, limit?: number) => reports.listHistory(limit));
  ipcMain.handle('reports:generate', async (_event, input: GenerateReportInput): Promise<ReportGenerationResult> => {
    try {
      const built = reports.build(input);
      const target = reports.createExportTarget(built.title);
      const pdf = await htmlToPdf(built.html, target.filePath);
      const encryptedEnvelope = encryptReportPdf(pdf, target.fileName, security.getActiveDatabaseKey());
      writeFileSync(target.filePath, JSON.stringify(encryptedEnvelope, null, 2), 'utf8');
      const result: ReportGenerationResult = {
        ok: true,
        reportType: input.type,
        title: built.title,
        fileName: target.fileName,
        filePath: target.filePath,
        generatedAt: new Date().toISOString(),
        warnings: built.warnings,
        metrics: built.metrics
      };
      reports.recordExport(input, result);
      return result;
    } catch (error) {
      return {
        ok: false,
        reportType: input.type,
        title: 'Bericht konnte nicht erzeugt werden',
        fileName: '',
        filePath: '',
        generatedAt: new Date().toISOString(),
        warnings: [],
        metrics: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
  ipcMain.handle('reports:open-export-folder', async (_event, filePath?: string) => {
    if (filePath) {
      const pathToOpen = filePath.endsWith('.gsbvpdf') ? writeTemporaryPlainPdf(security, filePath) : filePath;
      await shell.openPath(pathToOpen);
      return { opened: true };
    }
    await shell.openPath(path.join(security.getDataDirectory(), 'exports'));
    return { opened: true };
  });
}
