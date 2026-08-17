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
import { ProcessReportBuilders } from './processReportBuilders.js';
import { buildSystemIntegrityContent, buildSystemIntegrityWarnings, collectSystemIntegrityState, count, formatBytes, markdownToReportBlocks, metricCards, normalizeStatus, paragraph, periodWhere, reportShell, reportText, rows, section, table } from './reportSupport.js';
import type { ReportBuildResult } from './reportSupport.js';

export class ComplianceReportBuilders extends ProcessReportBuilders {
  protected buildRetentionCleanupReport(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const actionPeriod = periodWhere("created_at", input);
      const byAction = rows(db, `SELECT action_type, COUNT(*) AS value, SUM(affected_rows) AS affected_rows, SUM(affected_files) AS affected_files FROM retention_actions ${actionPeriod.sql} GROUP BY action_type ORDER BY value DESC`, actionPeriod.params);
      const closedWithOpenDeadlines = count(db, `SELECT COUNT(*) AS value FROM deadlines d JOIN cases c ON c.id = d.case_id WHERE c.status = 'abgeschlossen' AND d.status IN ('open', 'overdue')`);
      const retentionActions = count(db, `SELECT COUNT(*) AS value FROM retention_actions ${actionPeriod.sql}`, actionPeriod.params);
      const oldClosedCases = count(db, `SELECT COUNT(*) AS value FROM cases WHERE status = 'abgeschlossen' AND closed_at IS NOT NULL AND closed_at < datetime('now', '-3 years')`);
      const warnings: string[] = [];
      if (!retentionActions) warnings.push("Im gewählten Zeitraum wurden keine Lösch-/Aufbewahrungsaktionen protokolliert.");
      if (closedWithOpenDeadlines) warnings.push(`${closedWithOpenDeadlines} abgeschlossene Fälle enthalten noch offene Fristen.`);
      if (oldClosedCases) warnings.push(`${oldClosedCases} abgeschlossene Fälle sind älter als drei Jahre. Aufbewahrungsentscheidung prüfen.`);
      const metrics = {
        "Retention-Aktionen": retentionActions,
        "Betroffene Datensätze": count(db, `SELECT COALESCE(SUM(affected_rows), 0) AS value FROM retention_actions`),
        "Betroffene Dateien": count(db, `SELECT COALESCE(SUM(affected_files), 0) AS value FROM retention_actions`),
        "Alte abgeschl. Fälle": oldClosedCases,
        "Offene Fristen in abgeschl. Fällen": closedWithOpenDeadlines,
      };
      const content = [metricCards(metrics), section('Lösch-/Aufbewahrungsaktionen', [table(
        ["Aktion", "Anzahl", "Datensätze", "Dateien"],
        byAction.map((row) => [normalizeStatus(reportText(row.action_type)), row.value, row.affected_rows ?? 0, row.affected_files ?? 0]),
      )]), section('Prüfhinweis', [paragraph('Der Bericht zeigt technische und fachliche Aufbewahrungsrisiken. Eine Löschung ist vor Ausführung rechtlich und fachlich zu prüfen; besonders SBV-Vertraulichkeit, laufende Ansprüche und Nachweispflichten sind zu berücksichtigen.')])];
      return {
        title: "Lösch- und Aufbewahrungsbericht",
        warnings,
        metrics,
        document: reportShell("Lösch- und Aufbewahrungsbericht", this.periodLabel(input), "Technisch vertraulich", content, warnings),
      };
    }

  protected buildAuditLogReport(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const occurred = periodWhere("occurred_at", input);
      const auditChain = new PersonalDataAuditLogService(db).integritySummary();
      const byAction = rows(db, `SELECT action, COUNT(*) AS value FROM personal_data_audit_log ${occurred.sql} GROUP BY action ORDER BY value DESC`, occurred.params);
      const bySubject = rows(db, `SELECT subject_type, COUNT(*) AS value FROM personal_data_audit_log ${occurred.sql} GROUP BY subject_type ORDER BY value DESC`, occurred.params);
      const exportEvents = count(db, `SELECT COUNT(*) AS value FROM personal_data_audit_log WHERE action IN ('export', 'backup', 'open')`);
      const warnings: string[] = [];
      if (!auditChain.ok) warnings.push(`Audit-Hash-Chain ist beschädigt oder lückenhaft. Erste auffällige Sequenz: ${auditChain.firstBrokenSequence ?? "unbekannt"}.`);
      if (!auditChain.checked) warnings.push("Es liegen noch keine Audit-Log-Einträge vor.");
      const metrics = {
        "Hash-Chain": auditChain.ok ? "OK" : "Auffällig",
        "Geprüfte Einträge": auditChain.checked,
        "Leseereignisse": auditChain.readEvents,
        "Änderungen": auditChain.changeEvents,
        "Export/Backup": auditChain.exportEvents,
        "Exportnahe Ereignisse": exportEvents,
      };
      const content = [metricCards(metrics), section('Aktionen', [table(
        ["Aktion", "Anzahl"],
        byAction.map((row) => [normalizeStatus(reportText(row.action)), row.value]),
      )]), section('Betroffene Bereiche', [table(
        ["Bereich", "Anzahl"],
        bySubject.map((row) => [normalizeStatus(reportText(row.subject_type)), row.value]),
      )]), section('Hash-Chain', [table(
        ["Kennzahl", "Wert"],
        [
          ["Status", auditChain.ok ? "intakt" : "auffällig / Manipulationsverdacht"],
          ["Algorithmus", auditChain.algorithm],
          ["Chain-Version", auditChain.chainVersion],
          ["Sequenzbereich", auditChain.checked ? `${auditChain.firstSequence ?? "—"} bis ${auditChain.lastSequence ?? "—"}` : "keine Einträge"],
          ["Letzter Hash", auditChain.latestHash],
        ],
      )]), ...(auditChain.issues.length ? [section('Audit-Chain-Befunde', [table(['Sequenz', 'Art', 'Befund'], auditChain.issues.slice(0, 50).map((issue) => [issue.sequence, issue.kind, issue.message]))])] : [])];
      return {
        title: "Audit-Log- und Zugriffsbericht",
        warnings,
        metrics,
        document: reportShell("Audit-Log- und Zugriffsbericht", this.periodLabel(input), "Technisch vertraulich", content, warnings),
      };
    }

  protected buildComplianceDocumentReport(
      input: GenerateReportInput,
    ): ReportBuildResult {
      const title = input.complianceTitle?.trim() || "Compliance-Dokument";
      const subtitle =
        input.complianceSubtitle?.trim() ||
        "Aus Gremia.SBV Compliance Center erzeugt";
      const classification =
        input.complianceClassification?.trim() || "Intern vertraulich";
      const body = input.complianceBody?.trim() || "Keine Inhalte übergeben.";
      const documentType =
        input.complianceDocumentType?.trim() || "compliance_document";
      const warnings = [
        "Compliance-Dokumente vor Weitergabe fachlich prüfen. Sie ersetzen keine abschließende Bewertung durch DSB, IT-Security oder Rechtsberatung.",
        "Beim Abruf als PDF wird temporär eine Klartextkopie für den externen PDF-Viewer erzeugt.",
      ];
      return {
        title,
        warnings,
        metrics: {
          Dokumenttyp: documentType,
          Quelle: "Compliance Center",
          Exportformat: "verschlüsselter PDF-Report",
        },
        document: reportShell(
          title,
          subtitle,
          classification,
          markdownToReportBlocks(body),
          warnings,
        ),
      };
    }

  protected buildSystemIntegrityReport(input: GenerateReportInput): ReportBuildResult {
      const state = collectSystemIntegrityState(this.dbProvider(), this.dataDirProvider());
      const warnings = buildSystemIntegrityWarnings(state);
      const metrics = {
        Integritätsprüfung: state.integrityOk && state.quickOk && state.auditChain.ok ? "OK" : "Auffällig",
        "Audit-Hash-Chain": state.auditChain.ok ? "OK" : "Manipulationsverdacht",
        "Audit-Einträge": state.auditChain.checked,
        "FK-Probleme": state.foreignKeyIssues,
        "Schema-Version": state.schemaVersion,
        "DB-Größe": formatBytes(state.vaultSize),
        "Temporäre Arbeitskopien": state.tempStatus.remaining,
      };
      const content = buildSystemIntegrityContent(state, metrics);
      return {
        title: "System- und Integritätsbericht",
        warnings,
        metrics,
        document: reportShell("System- und Integritätsbericht", this.periodLabel(input), "Technisch vertraulich", content, warnings),
      };
    }
}
