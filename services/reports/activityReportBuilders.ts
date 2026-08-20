import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseAdapter } from "../databaseService.js";
import { PersonalDataAuditLogService } from "../auditLogService.js";
import { ActivityReportProjectionService } from "../activityReportProjectionService.js";
import { TempFileService } from "../tempFileService.js";
import { normalizeReportType } from "../../src/domain/models/report.model.js";
import type {
  GenerateReportInput,
  ReportDescriptor,
  ReportExportHistoryItem,
  ReportGenerationResult,
  ReportType,
} from "../../src/domain/models/report.model.js";
import { ReportServiceCore } from './reportServiceCore.js';
import { count, formatDate, formatDateTime, metricCards, normalizeStatus, nowIso, paragraph, periodWhere, reportShell, reportText, rows, section, table } from './reportSupport.js';
import type { ReportBuildResult } from './reportSupport.js';

export class ActivityReportBuilders extends ReportServiceCore {
  protected buildActivityReport(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const projection = new ActivityReportProjectionService(db).build({
        start: input.periodStart,
        end: input.periodEnd,
      });
      const created = projection.counters.created;
      const completed = projection.counters.completed;
      const reopened = projection.counters.reopened;
      const cancelled = projection.counters.cancelled;
      const deleted = projection.counters.deleted;
      const createdSubjects = projection.activities.createdBySubject;
      const newCases = createdSubjects.case ?? 0;
      const journalCount = createdSubjects.activity_journal ?? 0;
      const violationCount = createdSubjects.sbv_participation_violation ?? 0;
      const createdTotal = Object.values(created).reduce((sum, value) => sum + value, 0);
      const completedTotal = Object.values(completed).reduce((sum, value) => sum + value, 0);
      const coverageLabel = projection.coverage.status === 'complete'
        ? 'vollständig protokollierter Zeitraum'
        : projection.coverage.status === 'partial'
          ? 'teilweise protokollierter Zeitraum'
          : 'keine Lifecycle-Daten vorhanden';
      const metrics = {
        "Neue Fälle": newCases,
        "Neue Maßnahmen": createdTotal,
        "Abgeschlossene Maßnahmen": completedTotal,
        "SBV-Beteiligungen": created.sbv_participation,
        "Stellenbesetzungen": created.recruiting,
        "BEM/Prävention": created.bem + created.prevention,
        "Kündigungsanhörungen": created.termination_hearing,
        "Journal-Einträge": journalCount,
        "Beteiligungsverstöße": violationCount,
        "Sitzungen": createdSubjects.sbv_meeting ?? 0,
        "Schwerbehindertenversammlungen": createdSubjects.sbv_assembly ?? 0,
        "Datenabdeckung Maßnahmen": coverageLabel,
      };
      const measureLabels: Record<string, string> = {
        bem: 'BEM-Verfahren', prevention: 'Präventionsverfahren', sbv_participation: 'SBV-Beteiligungen',
        termination_hearing: 'Kündigungsanhörungen', equalization_gdb: 'Gleichstellung/GdB',
        workplace_accommodation: 'Arbeitsplatzgestaltung', recruiting: 'Stellenbesetzungen', other: 'Sonstige Maßnahmen',
      };
      const measureRows = Object.keys(measureLabels).map((type) => [
        measureLabels[type], created[type as keyof typeof created], completed[type as keyof typeof completed],
        reopened[type as keyof typeof reopened], cancelled[type as keyof typeof cancelled], deleted[type as keyof typeof deleted],
      ]);
      const processRows = [
        ["Fallnotizen/Protokolle", createdSubjects.case_note ?? 0],
        ["Tätigkeitsjournal", journalCount],
        ["Beteiligungsverstoß-Protokolle", violationCount],
        ["Sitzungen", createdSubjects.sbv_meeting ?? 0],
        ["Schwerbehindertenversammlungen", createdSubjects.sbv_assembly ?? 0],
        ["Beschwerdevorgänge", createdSubjects.complaint_workflow ?? 0],
        ["Prüfungen von Arbeitgeberpflichten", createdSubjects.employer_obligation_review ?? 0],
      ];
      const warnings: string[] = [...projection.warnings];
      const categoryRows = Object.entries(projection.activities.caseCategories).sort((left, right) => right[1] - left[1]);
      const rareCategories = categoryRows.filter(([, value]) => value > 0 && value < 3);
      if (rareCategories.length) warnings.push("Einzelne Fallkategorien enthalten weniger als 3 Fälle. Für externe Tätigkeitsberichte sollten diese zusammengefasst oder ausgelassen werden.");
      if (newCases + createdTotal + journalCount + violationCount < 3) warnings.push("Der Berichtszeitraum enthält sehr wenige Vorgänge. Vor externer Weitergabe ist die Rückrechenbarkeit besonders zu prüfen.");
  
      const hashPreview = projection.chain.latestHash.slice(0, 12);
      const content = [
        metricCards(metrics),
        section('Maßnahmen im Berichtszeitraum', [
          table(['Maßnahmentyp', 'Angelegt', 'Abgeschlossen', 'Wiedereröffnet', 'Abgebrochen', 'Gelöscht'], measureRows),
          paragraph('Die Maßnahmenzähler wurden aus strukturierten Lifecycle-Ereignissen der verifizierten Audit-HashChain gebildet. Gelöschte Fachdaten bleiben dadurch in der Zählung des Berichtszeitraums berücksichtigt.'),
        ]),
        section('Weitere Arbeitsfelder', [table(['Arbeitsfeld', 'Anzahl'], processRows)]),
        section('Fallkategorien im Berichtszeitraum', [table(['Kategorie', 'Anzahl'], categoryRows.map(([category, value]) => [normalizeStatus(category), value]))]),
        section('Tätigkeitsjournal', [
          table(['Kategorie', 'Einträge'], Object.entries(projection.activities.journalCategories).map(([category, value]) => [normalizeStatus(category), value])),
          paragraph(`${projection.activities.timedJournalEntries} Journaleinträge enthalten eine Zeitangabe. Die Audit-Chain speichert aus Datenschutzgründen keine Dauer oder vertraulichen Tätigkeitsinhalte.`),
        ]),
        section('Beteiligungsverstöße nach Status bei Anlage', [table(['Status', 'Anzahl'], Object.entries(projection.activities.violationStatuses).map(([status, value]) => [normalizeStatus(status), value]))]),
        section('Beteiligungsverstöße nach Eskalationsstufe bei Anlage', [table(['Eskalationsstufe', 'Anzahl'], Object.entries(projection.activities.violationStages).map(([stage, value]) => [normalizeStatus(stage), value]))]),
        section('Datenqualität und Integritätsnachweis', [
          paragraph(`Datenabdeckung: ${coverageLabel}${projection.coverage.lifecycleStartedAt ? ` · Lifecycle-Protokoll seit ${formatDate(projection.coverage.lifecycleStartedAt)}` : ''}.`),
          paragraph(`Einzige Datenquelle: verifizierte Audit-HashChain · geprüfte Einträge: ${projection.chain.checkedEntries} · letzte Sequenz: ${projection.chain.lastSequence ?? '—'} · letzter Hash: ${hashPreview}… · Chain-Version: ${projection.chain.chainVersion}.`),
          ...(projection.ignoredBaselineEvents ? [paragraph(`${projection.ignoredBaselineEvents} technische Baseline-Ereignisse wurden nicht als Tätigkeit gezählt.`)] : []),
        ]),
        section('Datenschutz und Anonymisierung', [paragraph('Dieser Tätigkeitsbericht enthält keine Namen, Aktenzeichen, Diagnosen, Dokumenttitel, Fall-IDs oder vertraulichen Freitexte. Bei kleinen Fallzahlen ist vor Weitergabe dennoch eine Rückrechenbarkeitsprüfung erforderlich.')]),
      ];
      return {
        title: "Tätigkeitsbericht der SBV",
        warnings,
        metrics,
        document: reportShell("Tätigkeitsbericht der SBV", this.periodLabel(input), "Anonymisiert", content, warnings),
      };
    }

  protected buildPrivacyAudit(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const warnings: string[] = [];
      const closedWithOpenDeadlines = count(
        db,
        `
        SELECT COUNT(*) AS value FROM deadlines d
        JOIN cases c ON c.id = d.case_id
        WHERE c.status = 'abgeschlossen' AND d.status IN ('open', 'overdue')
      `,
      );
      const notesWithHealth = count(
        db,
        `SELECT COUNT(*) AS value FROM case_notes WHERE contains_health_data = 1`,
      );
      const docsWithHealth = count(
        db,
        `SELECT COUNT(*) AS value FROM case_documents WHERE contains_health_data = 1`,
      );
      const freeSensitiveDeadlines = count(
        db,
        `
        SELECT COUNT(*) AS value FROM deadlines
        WHERE case_id IS NULL AND (is_legal_deadline = 1 OR process_type NOT IN ('custom', 'sbv_control_protocol') OR severity IN ('critical', 'fatal'))
      `,
      );
      const unanonymizedRefs = count(
        db,
        `SELECT COUNT(*) AS value FROM contact_text_references WHERE anonymized_at IS NULL`,
      );
      const orphanDocs = count(
        db,
        `SELECT COUNT(*) AS value FROM case_documents WHERE case_id IS NULL`,
      );
      if (closedWithOpenDeadlines)
        warnings.push(
          `${closedWithOpenDeadlines} abgeschlossene Fälle enthalten noch offene Fristen.`,
        );
      if (freeSensitiveDeadlines)
        warnings.push(
          `${freeSensitiveDeadlines} freie Fristen wirken sensibel oder rechtlich relevant. Diese sollten einem Fall zugeordnet werden.`,
        );
      if (orphanDocs)
        warnings.push(`${orphanDocs} Dokumente ohne Fallbezug gefunden.`);
      if (unanonymizedRefs)
        warnings.push(
          `${unanonymizedRefs} erkannte Kontaktbezüge sind noch nicht anonymisiert.`,
        );
  
      const metrics = {
        Gesundheitsnotizen: notesWithHealth,
        Gesundheitsdokumente: docsWithHealth,
        "Offene Fristen in abgeschl. Fällen": closedWithOpenDeadlines,
        "Freie sensible Fristen": freeSensitiveDeadlines,
      };
      const checks = [
        [
          "SQLCipher-Tresor",
          "aktiv, da Bericht nur nach Entsperrung erzeugt wird",
          "GRÜN",
        ],
        [
          "Kontakt-Anonymisierung",
          unanonymizedRefs
            ? `${unanonymizedRefs} aktive Kontaktbezüge`
            : "keine offenen Kontaktbezüge",
          unanonymizedRefs ? "GELB" : "GRÜN",
        ],
        [
          "Fallbindung Dokumente",
          orphanDocs
            ? `${orphanDocs} Dokumente ohne Fall`
            : "alle Dokumente fallgebunden",
          orphanDocs ? "ROT" : "GRÜN",
        ],
        [
          "Fristenkonsistenz",
          closedWithOpenDeadlines
            ? `${closedWithOpenDeadlines} offene Fristen in abgeschlossenen Fällen`
            : "keine Auffälligkeit",
          closedWithOpenDeadlines ? "GELB" : "GRÜN",
        ],
      ];
      const content = [metricCards(metrics), section('Prüfpunkte', [table(['Prüfpunkt', 'Befund', 'Ampel'], checks)])];
      return {
        title: "Datenschutz-Audit",
        warnings,
        metrics,
        document: reportShell(
          "Datenschutz-Audit",
          this.periodLabel(input),
          "Intern vertraulich",
          content,
          warnings,
        ),
      };
    }

  protected buildControllingReport(
      input: GenerateReportInput,
    ): ReportBuildResult {
      const db = this.dbProvider();
      const dueSoon = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const openByStatus = rows(
        db,
        `SELECT status, COUNT(*) AS value FROM cases GROUP BY status ORDER BY value DESC`,
      );
      const overdue = count(
        db,
        `SELECT COUNT(*) AS value FROM deadlines WHERE status IN ('open', 'overdue') AND due_at < ?`,
        [nowIso()],
      );
      const next48 = count(
        db,
        `SELECT COUNT(*) AS value FROM deadlines WHERE status IN ('open', 'overdue') AND due_at BETWEEN ? AND ?`,
        [nowIso(), dueSoon],
      );
      const casesWithoutFollowup = rows(
        db,
        `
        SELECT c.case_number, c.display_name, c.status
        FROM cases c
        WHERE c.status <> 'abgeschlossen'
          AND NOT EXISTS (SELECT 1 FROM deadlines d WHERE d.case_id = c.id AND d.status IN ('open', 'overdue'))
        ORDER BY c.opened_at DESC
        LIMIT 50
      `,
      );
      const criticalDeadlines = rows(
        db,
        `
        SELECT d.title, c.case_number, d.due_at, d.severity, d.status
        FROM deadlines d
        LEFT JOIN cases c ON c.id = d.case_id
        WHERE d.status IN ('open', 'overdue') AND (d.due_at <= ? OR d.severity IN ('critical', 'fatal'))
        ORDER BY d.due_at ASC
        LIMIT 50
      `,
        [dueSoon],
      );
      const warnings: string[] = [];
      if (overdue) warnings.push(`${overdue} Fristen sind überfällig.`);
      if (next48)
        warnings.push(`${next48} Fristen laufen innerhalb von 48 Stunden ab.`);
      if (casesWithoutFollowup.length)
        warnings.push(
          `${casesWithoutFollowup.length} offene Fälle haben keine offene Frist/Wiedervorlage.`,
        );
      const metrics = {
        "Überfällige Fristen": overdue,
        "Nächste 48h": next48,
        "Offene Fälle ohne WV": casesWithoutFollowup.length,
        "Offene Fälle": count(
          db,
          `SELECT COUNT(*) AS value FROM cases WHERE status <> 'abgeschlossen'`,
        ),
      };
      const content = [
        metricCards(metrics),
        section('Fallstatus', [table(
          ["Status", "Anzahl"],
          openByStatus.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]),
        )]),
        section('Kritische Fristen', [table(
          ["Titel", "Fall", "Fällig", "Stufe", "Status"],
          criticalDeadlines.map((row) => [
            row.title,
            row.case_number ?? "Freie Wiedervorlage",
            formatDateTime(reportText(row.due_at)),
            normalizeStatus(reportText(row.severity)),
            normalizeStatus(typeof row.status === 'string' ? row.status : undefined),
          ]),
        )]),
        section('Offene Fälle ohne Wiedervorlage', [table(
          ["Aktenzeichen", "Person/Pseudonym", "Status"],
          casesWithoutFollowup.map((row) => [
            row.case_number,
            row.display_name,
            row.status,
          ]),
        )]),
      ];
      return {
        title: "Fall- und Fristen-Controlling",
        warnings,
        metrics,
        document: reportShell(
          "Fall- und Fristen-Controlling",
          this.periodLabel(input),
          "Intern vertraulich",
          content,
          warnings,
        ),
      };
    }
}
