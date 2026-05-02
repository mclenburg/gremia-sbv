import type { IpcMain } from 'electron';
import { BrowserWindow, shell } from 'electron';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ReportService } from '../../services/reportService.js';
import type { SecurityService } from '../../services/securityService.js';
import type { GenerateReportInput, ReportGenerationResult } from '../../src/app/core/models/report.model.js';

async function htmlToPdf(html: string, filePath: string): Promise<void> {
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
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      preferCSSPageSize: true,
      margins: { marginType: 'none' },
      pageSize: 'A4'
    });
    writeFileSync(filePath, pdf);
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
      await htmlToPdf(built.html, target.filePath);
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
      shell.showItemInFolder(filePath);
      return { opened: true };
    }
    await shell.openPath(path.join(security.getDataDirectory(), 'exports'));
    return { opened: true };
  });
}
