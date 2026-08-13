import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseAdapter } from "../databaseService.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";
import { ActivityReportProjectionService } from "../activityReportProjectionService.js";
import { TempFileService } from "../tempFileService.js";
import { normalizeReportType } from "../../src/app/core/models/report.model.js";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from "../../src/app/core/models/report.model.js";
import { REPORT_DESCRIPTORS, formatDate, rows, slug } from './reportSupport.js';
import type { ReportExportHistoryRow } from './reportSupport.js';

export class ReportServiceCore {
  constructor(
      protected readonly dbProvider: () => DatabaseAdapter,
      protected readonly dataDirProvider: () => string,
    ) {}

  ensureSchema(): void {
      this.dbProvider().exec(`
        CREATE TABLE IF NOT EXISTS report_exports (
          id TEXT PRIMARY KEY,
          report_type TEXT NOT NULL,
          title TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_path TEXT NOT NULL,
          period_start TEXT,
          period_end TEXT,
          warning_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_report_exports_created_at ON report_exports(created_at DESC);
      `);
    }

  descriptors(): ReportDescriptor[] {
      return REPORT_DESCRIPTORS;
    }

  listHistory(limit = 25): ReportExportHistoryItem[] {
      const db = this.dbProvider();
      return rows<ReportExportHistoryRow>(
        db,
        `
        SELECT id, report_type, title, file_name, file_path, period_start, period_end, warning_count, created_at
        FROM report_exports
        ORDER BY created_at DESC
        LIMIT ?
      `,
        [Math.min(Math.max(limit, 1), 100)],
      ).map((row) => ({
        id: row.id,
        reportType: normalizeReportType(row.report_type),
        title: row.title,
        fileName: row.file_name,
        filePath: row.file_path,
        generatedAt: row.created_at,
        periodStart: row.period_start ?? undefined,
        periodEnd: row.period_end ?? undefined,
        warningCount: Number(row.warning_count ?? 0),
      }));
    }

  createExportTarget(title: string): { filePath: string; fileName: string } {
      const exportsDir = path.join(this.dataDirProvider(), "exports");
      fs.mkdirSync(exportsDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileName = `${slug(title)}-${stamp}.pdf`;
      const archiveName = `${fileName}.gsbvpdf`;
      return { fileName, filePath: path.join(exportsDir, archiveName) };
    }

  recordExport(
      input: GenerateReportInput,
      result: Omit<ReportGenerationResult, "ok">,
    ): void {
      const db = this.dbProvider();
      db.prepare(
        `
        INSERT INTO report_exports (id, report_type, title, file_name, file_path, period_start, period_end, warning_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        randomUUID(),
        input.type,
        result.title,
        result.fileName,
        result.filePath,
        input.periodStart ?? null,
        input.periodEnd ?? null,
        result.warnings.length,
        result.generatedAt,
      );
      try {
        new PersonalDataAuditLogService(db).append({
          action: "export",
          subjectType: "report",
          subjectId: input.type,
          purpose: "PDF-Report als verschlüsselter .gsbvpdf-Container erzeugt",
          metadata: {
            reportType: input.type,
            title: result.title,
            warningCount: result.warnings.length,
            fileName: result.fileName,
            complianceDocumentType: input.complianceDocumentType ?? null,
          },
        });
      } catch (error) {
        console.warn("Gremia.SBV audit log write failed", error instanceof Error ? error.name : 'UnknownError');
      }
    }

  protected periodLabel(input: GenerateReportInput): string {
      if (!input.periodStart && !input.periodEnd) return "Gesamter Datenbestand";
      return `Zeitraum: ${formatDate(input.periodStart)} bis ${formatDate(input.periodEnd)}`;
    }
}
