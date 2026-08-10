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
import { ReportServiceCore } from './reportServiceCore.js';
import { count, formatDate, formatDateTime, metricCards, normalizeStatus, nowIso, periodWhere, reportShell, reportText, rows, table } from './reportSupport.js';
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
  
      const opened = periodWhere("opened_at", input);
      const closed = periodWhere("closed_at", input);
      const notes = periodWhere("note_date", input);
      const journalPeriod = periodWhere("entry_date", input);
      const violationPeriod = periodWhere("created_at", input);
      const recruitingPeriod = periodWhere("created_at", input);
  
      const newCases = count(db, `SELECT COUNT(*) AS value FROM cases ${opened.sql}`, opened.params);
      const closedCases = count(db, `SELECT COUNT(*) AS value FROM cases ${closed.sql}`, closed.params);
      const noteCount = count(db, `SELECT COUNT(*) AS value FROM case_notes ${notes.sql}`, notes.params);
      const journalCount = count(db, `SELECT COUNT(*) AS value FROM activity_journal_entries ${journalPeriod.sql}`, journalPeriod.params);
      const journalMinutes = count(db, `SELECT COALESCE(SUM(duration_minutes), 0) AS value FROM activity_journal_entries ${journalPeriod.sql}`, journalPeriod.params);
      const journalOutsideEntries = count(db, `SELECT COUNT(*) AS value FROM activity_journal_entries ${journalPeriod.sql}${journalPeriod.sql ? ' AND' : ' WHERE'} performed_outside_contract_work_time = 1`, journalPeriod.params);
      const journalOutsideMinutes = count(db, `SELECT COALESCE(SUM(duration_minutes), 0) AS value FROM activity_journal_entries ${journalPeriod.sql}${journalPeriod.sql ? ' AND' : ' WHERE'} performed_outside_contract_work_time = 1`, journalPeriod.params);
      const journalOpenFollowUps = count(db, `SELECT COUNT(*) AS value FROM activity_journal_entries WHERE status = 'follow_up_open'`);
      const violationCount = count(db, `SELECT COUNT(*) AS value FROM sbv_participation_violations ${violationPeriod.sql}`, violationPeriod.params);
      const violationOpen = count(db, `SELECT COUNT(*) AS value FROM sbv_participation_violations WHERE status IN ('draft','open','sent','escalated')`);
      const recruitingInterviews = count(db, `SELECT COUNT(*) AS value FROM recruiting_interview_events ${recruitingPeriod.sql}`, recruitingPeriod.params);
      const recruitingOpenHearings = count(db, `SELECT COUNT(*) AS value FROM recruiting_participations WHERE has_severely_disabled_applicants = 1 AND statement_submitted_date IS NULL AND decision_known_date IS NULL`);
      const recruitingMissingDocuments = count(db, `SELECT COUNT(*) AS value FROM recruiting_participations WHERE has_severely_disabled_applicants = 1 AND documents_complete = 0`);
      const violationStatuses = rows(db, `SELECT status, COUNT(*) AS value FROM sbv_participation_violations ${violationPeriod.sql} GROUP BY status ORDER BY value DESC`, violationPeriod.params);
      const violationStages = rows(db, `SELECT stage, COUNT(*) AS value FROM sbv_participation_violations ${violationPeriod.sql} GROUP BY stage ORDER BY value DESC`, violationPeriod.params);
      const journalCategories = rows(db, `SELECT category, COUNT(*) AS count, COALESCE(SUM(duration_minutes), 0) AS minutes FROM activity_journal_entries ${journalPeriod.sql} GROUP BY category ORDER BY minutes DESC, count DESC`, journalPeriod.params);
  
      const createdTotal = Object.values(created).reduce((sum, value) => sum + value, 0);
      const completedTotal = Object.values(completed).reduce((sum, value) => sum + value, 0);
      const coverageLabel = projection.coverage.status === 'complete'
        ? 'vollständig protokollierter Zeitraum'
        : projection.coverage.status === 'partial'
          ? 'teilweise protokollierter Zeitraum'
          : 'keine Lifecycle-Daten vorhanden';
      const metrics = {
        "Neue Fälle": newCases,
        "Abgeschlossene Fälle": closedCases,
        "Offen gesamt": count(db, `SELECT COUNT(*) AS value FROM cases WHERE status <> 'abgeschlossen'`),
        "Neue Maßnahmen": createdTotal,
        "Abgeschlossene Maßnahmen": completedTotal,
        "SBV-Beteiligungen": created.sbv_participation,
        "Stellenbesetzungen": created.recruiting,
        "Vorstellungsgespräche SBV": recruitingInterviews,
        "BEM/Prävention": created.bem + created.prevention,
        "Kündigungsanhörungen": created.termination_hearing,
        "Journal-Einträge": journalCount,
        "Beteiligungsverstöße": violationCount,
        "offene Verstoßvorgänge": violationOpen,
        "dokumentierte SBV-Zeit (Min.)": journalMinutes,
        "SBV-Zeit außerhalb Regelarbeitszeit (Min.)": journalOutsideMinutes,
        "Datenabdeckung Maßnahmen": coverageLabel,
      };
      const categories = rows(db, `SELECT category, COUNT(*) AS value FROM cases ${opened.sql} GROUP BY category ORDER BY value DESC`, opened.params);
      const statuses = rows(db, `SELECT status, COUNT(*) AS value FROM cases GROUP BY status ORDER BY value DESC`);
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
        ["Fallnotizen/Protokolle", noteCount],
        ["Vorstellungsgespräche als Beteiligungsereignisse", recruitingInterviews],
        ["Anhörung vor Auswahlentscheidung offen (Stichtag)", recruitingOpenHearings],
        ["Stellenbesetzungsunterlagen offen (Stichtag)", recruitingMissingDocuments],
        ["Tätigkeitsjournal", journalCount],
        ["Journal-Wiedervorlagen offen (Stichtag)", journalOpenFollowUps],
        ["Journal außerhalb Regelarbeitszeit", journalOutsideEntries],
        ["Beteiligungsverstoß-Protokolle", violationCount],
        ["offene Beteiligungsverstoß-Vorgänge (Stichtag)", violationOpen],
      ];
      const warnings: string[] = [...projection.warnings];
      const rareCategories = categories.filter((row) => Number(row.value) > 0 && Number(row.value) < 3);
      if (rareCategories.length) warnings.push("Einzelne Fallkategorien enthalten weniger als 3 Fälle. Für externe Tätigkeitsberichte sollten diese zusammengefasst oder ausgelassen werden.");
      if (newCases + createdTotal + journalCount + violationCount < 3) warnings.push("Der Berichtszeitraum enthält sehr wenige Vorgänge. Vor externer Weitergabe ist die Rückrechenbarkeit besonders zu prüfen.");
  
      const hashPreview = projection.chain.latestHash.slice(0, 12);
      const content = `
        ${metricCards(metrics)}
        <section class="box"><h2>Maßnahmen im Berichtszeitraum</h2>${table(["Maßnahmentyp", "Angelegt", "Abgeschlossen", "Wiedereröffnet", "Abgebrochen", "Gelöscht"], measureRows)}<p>Die Maßnahmenzähler wurden aus strukturierten Lifecycle-Ereignissen der verifizierten Audit-HashChain gebildet. Gelöschte Fachdaten bleiben dadurch in der historischen Zählung erhalten.</p></section>
        <section class="box"><h2>Weitere Arbeitsfelder</h2>${table(["Arbeitsfeld", "Anzahl"], processRows)}</section>
        <section class="box"><h2>Fallkategorien im Berichtszeitraum</h2>${table(["Kategorie", "Anzahl"], categories.map((row) => [normalizeStatus(reportText(row.category)), row.value]))}</section>
        <section class="box"><h2>Fallstatus zum Stichtag</h2>${table(["Status", "Anzahl"], statuses.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]))}</section>
        <section class="box"><h2>Tätigkeitsjournal / SBV-Zeit</h2>${table(["Kategorie", "Einträge", "Minuten"], journalCategories.map((row) => [normalizeStatus(reportText(row.category)), row.count, row.minutes]))}<p>Die Werte sind Eigenaufzeichnungen der SBV und keine Arbeitgeber-Arbeitszeitabrechnung. Außerhalb der Regelarbeitszeit dokumentierte Einträge werden nur aggregiert ausgewiesen.</p></section>
        <section class="box"><h2>Beteiligungsverstöße nach Status</h2>${table(["Status", "Anzahl"], violationStatuses.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]))}</section>
        <section class="box"><h2>Beteiligungsverstöße nach Eskalationsstufe</h2>${table(["Eskalationsstufe", "Anzahl"], violationStages.map((row) => [normalizeStatus(reportText(row.stage)), row.value]))}</section>
        <section class="box"><h2>Datenqualität und Integritätsnachweis</h2><p><strong>Datenabdeckung:</strong> ${coverageLabel}${projection.coverage.lifecycleStartedAt ? ` · Lifecycle-Protokoll seit ${formatDate(projection.coverage.lifecycleStartedAt)}` : ''}.</p><p>HashChain vollständig geprüft: ja · geprüfte Einträge: ${projection.chain.checkedEntries} · letzte Sequenz: ${projection.chain.lastSequence ?? '—'} · letzter Hash: ${hashPreview}… · Chain-Version: ${projection.chain.chainVersion}.</p>${projection.ignoredBaselineEvents ? `<p>${projection.ignoredBaselineEvents} technische Baseline-Ereignisse wurden nicht als historische Tätigkeit gezählt.</p>` : ''}</section>
        <section class="box"><h2>Datenschutz und Anonymisierung</h2><p>Dieser Tätigkeitsbericht enthält keine Namen, Aktenzeichen, Diagnosen, Dokumenttitel, Fall-IDs oder vertraulichen Freitexte. Bei kleinen Fallzahlen ist vor Weitergabe dennoch eine Rückrechenbarkeitsprüfung erforderlich.</p></section>`;
      return {
        title: "Tätigkeitsbericht der SBV",
        warnings,
        metrics,
        html: reportShell("Tätigkeitsbericht der SBV", this.periodLabel(input), "Anonymisiert", content, warnings),
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
      const content = `${metricCards(metrics)}<section class="box"><h2>Prüfpunkte</h2>${table(["Prüfpunkt", "Befund", "Ampel"], checks)}</section>`;
      return {
        title: "Datenschutz-Audit",
        warnings,
        metrics,
        html: reportShell(
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
      const content = `
        ${metricCards(metrics)}
        <section class="box"><h2>Fallstatus</h2>${table(
          ["Status", "Anzahl"],
          openByStatus.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]),
        )}</section>
        <section class="box"><h2>Kritische Fristen</h2>${table(
          ["Titel", "Fall", "Fällig", "Stufe", "Status"],
          criticalDeadlines.map((row) => [
            row.title,
            row.case_number ?? "Freie Wiedervorlage",
            formatDateTime(reportText(row.due_at)),
            normalizeStatus(reportText(row.severity)),
            normalizeStatus(typeof row.status === 'string' ? row.status : undefined),
          ]),
        )}</section>
        <section class="box"><h2>Offene Fälle ohne Wiedervorlage</h2>${table(
          ["Aktenzeichen", "Person/Pseudonym", "Status"],
          casesWithoutFollowup.map((row) => [
            row.case_number,
            row.display_name,
            row.status,
          ]),
        )}</section>`;
      return {
        title: "Fall- und Fristen-Controlling",
        warnings,
        metrics,
        html: reportShell(
          "Fall- und Fristen-Controlling",
          this.periodLabel(input),
          "Intern vertraulich",
          content,
          warnings,
        ),
      };
    }
}
