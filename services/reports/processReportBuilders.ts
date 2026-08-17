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
import { ActivityReportBuilders } from './activityReportBuilders.js';
import { count, metricCards, normalizeStatus, nowIso, paragraph, periodWhere, reportShell, reportText, rows, section, table } from './reportSupport.js';
import type { ReportBuildResult } from './reportSupport.js';

export class ProcessReportBuilders extends ActivityReportBuilders {
  protected buildBemPreventionReport(
      input: GenerateReportInput,
    ): ReportBuildResult {
      const db = this.dbProvider();
      const opened = periodWhere("created_at", input);
      const bemStatuses = rows(
        db,
        `SELECT status, COUNT(*) AS value FROM bem_processes ${opened.sql} GROUP BY status ORDER BY value DESC`,
        opened.params,
      );
      const preventionStatuses = rows(
        db,
        `SELECT status, COUNT(*) AS value FROM prevention_processes GROUP BY status ORDER BY value DESC`,
      );
      const openBem = count(
        db,
        `SELECT COUNT(*) AS value FROM bem_processes WHERE status NOT IN ('abgeschlossen', 'abgelehnt', 'abgebrochen')`,
      );
      const missingPrivacyNotice = count(
        db,
        `SELECT COUNT(*) AS value FROM bem_processes WHERE employee_response = 'angenommen' AND (privacy_notice_at IS NULL OR privacy_notice_at = '')`,
      );
      const missingConsentScope = count(
        db,
        `SELECT COUNT(*) AS value FROM bem_processes WHERE employee_response = 'angenommen' AND (consent_scope IS NULL OR consent_scope = '')`,
      );
      const confidentialBemNotes = count(
        db,
        `SELECT COUNT(*) AS value FROM bem_processes WHERE confidential_notes IS NOT NULL AND TRIM(confidential_notes) <> ''`,
      );
      const warnings: string[] = [];
      if (openBem)
        warnings.push(`${openBem} BEM-Verfahren sind noch nicht abgeschlossen.`);
      if (missingPrivacyNotice)
        warnings.push(
          `${missingPrivacyNotice} angenommene BEM-Verfahren haben keinen dokumentierten Datenschutzhinweis.`,
        );
      if (missingConsentScope)
        warnings.push(
          `${missingConsentScope} angenommene BEM-Verfahren haben keinen dokumentierten Einwilligungsumfang.`,
        );
      if (confidentialBemNotes)
        warnings.push(
          `${confidentialBemNotes} BEM-Verfahren enthalten vertrauliche SBV-Notizen. Export und Weitergabe besonders prüfen.`,
        );
      const metrics = {
        "BEM-Verfahren": count(db, `SELECT COUNT(*) AS value FROM bem_processes`),
        Präventionsverfahren: count(
          db,
          `SELECT COUNT(*) AS value FROM prevention_processes`,
        ),
        "Offene BEM-Verfahren": openBem,
        "BEM ohne Datenschutzhinweis": missingPrivacyNotice,
        "BEM mit vertraulichen Notizen": confidentialBemNotes,
      };
      const content = [metricCards(metrics), section('BEM-Status', [table(
        ["Status", "Anzahl"],
        bemStatuses.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]),
      )]), section('Präventionsstatus', [table(
        ["Status", "Anzahl"],
        preventionStatuses.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]),
      )]), section('Datenschutz-Hinweis', [paragraph('Dieser Bericht ist aggregiert. Vertrauliche BEM-Notizen, Diagnosen und Freitextinhalte werden nicht ausgegeben.')])];
      return {
        title: "BEM- und Präventionsbericht",
        warnings,
        metrics,
        document: reportShell(
          "BEM- und Präventionsbericht",
          this.periodLabel(input),
          "Anonymisiert",
          content,
          warnings,
        ),
      };
    }

  protected buildTerminationReport(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const received = periodWhere("received_at", input);
      const typeRows = rows(
        db,
        `SELECT termination_type, COUNT(*) AS value FROM termination_hearings ${received.sql} GROUP BY termination_type ORDER BY value DESC`,
        received.params,
      );
      const statusRows = rows(
        db,
        `SELECT status, COUNT(*) AS value FROM termination_hearings GROUP BY status ORDER BY value DESC`,
      );
      const protectionRows = rows(
        db,
        `SELECT protection_status, COUNT(*) AS value FROM termination_hearings GROUP BY protection_status ORDER BY value DESC`,
      );
      const openStatements = count(
        db,
        `SELECT COUNT(*) AS value FROM termination_hearings WHERE status NOT IN ('abgeschlossen', 'zurueckgenommen', 'erledigt')`,
      );
      const overdueStatements = count(
        db,
        `SELECT COUNT(*) AS value FROM termination_hearings WHERE sbv_statement_due_at IS NOT NULL AND sbv_statement_due_at < ? AND status NOT IN ('abgeschlossen', 'zurueckgenommen', 'erledigt')`,
        [nowIso()],
      );
      const missingInfo = count(
        db,
        `SELECT COUNT(*) AS value FROM termination_hearings WHERE missing_information IS NOT NULL AND TRIM(missing_information) <> ''`,
      );
      const unclearProtection = count(
        db,
        `SELECT COUNT(*) AS value FROM termination_hearings WHERE protection_status IN ('unklar', 'unbekannt', '') OR protection_status IS NULL`,
      );
      const warnings: string[] = [];
      if (openStatements) warnings.push(`${openStatements} Kündigungsanhörungen sind noch nicht abgeschlossen.`);
      if (overdueStatements) warnings.push(`${overdueStatements} SBV-Stellungnahmefristen sind überfällig.`);
      if (missingInfo) warnings.push(`${missingInfo} Kündigungsanhörungen enthalten dokumentierte fehlende Unterlagen/Informationen.`);
      if (unclearProtection) warnings.push(`${unclearProtection} Kündigungsanhörungen haben ungeklärten Schutzstatus.`);
      const metrics = {
        "Anhörungen gesamt": count(db, `SELECT COUNT(*) AS value FROM termination_hearings`),
        "Offene Vorgänge": openStatements,
        "Frist überfällig": overdueStatements,
        "Schutzstatus unklar": unclearProtection,
        "Unterlagenmängel": missingInfo,
      };
      const content = [metricCards(metrics), section('Kündigungsarten', [table(
        ["Art", "Anzahl"],
        typeRows.map((row) => [normalizeStatus(reportText(row.termination_type)), row.value]),
      )]), section('Verfahrensstatus', [table(
        ["Status", "Anzahl"],
        statusRows.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]),
      )]), section('Schutzstatus', [table(
        ["Status", "Anzahl"],
        protectionRows.map((row) => [normalizeStatus(reportText(row.protection_status)), row.value]),
      )]), section('Prüfhinweis', [paragraph('Der Bericht nutzt die aktuelle Kündigungsanhörungsstruktur ab Schema 0017/0019. Er gibt keine Begründungsfreitexte oder personenbezogenen Details aus.')])];
      return {
        title: "Kündigungsanhörungsbericht",
        warnings,
        metrics,
        document: reportShell("Kündigungsanhörungsbericht", this.periodLabel(input), "Intern vertraulich", content, warnings),
      };
    }

  protected buildParticipationReport(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const created = periodWhere("cm.created_at", input);
      const periodClause = created.sql ? ` AND ${created.sql.replace(/^ WHERE /, '')}` : '';
      const periodParams = created.params;
      const participationFrom = `case_measures cm JOIN case_measure_participation p ON p.measure_id = cm.id WHERE cm.type = 'sbv_participation'`;
      const byStatus = rows(db, `SELECT p.participation_status AS status, COUNT(*) AS value FROM ${participationFrom}${periodClause} GROUP BY p.participation_status ORDER BY value DESC`, periodParams);
      const byMeasure = rows(db, `SELECT p.employer_measure_type AS measure_type, COUNT(*) AS value FROM ${participationFrom}${periodClause} GROUP BY p.employer_measure_type ORDER BY value DESC`, periodParams);
      const open = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.participation_status NOT IN ('abgeschlossen', 'pflichtverstoss_dokumentiert')`);
      const critical = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND (cm.risk_level IN ('erhoeht', 'kritisch') OR p.violation_summary IS NOT NULL AND TRIM(p.violation_summary) <> '')`);
      const suspensions = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.suspension_requested_at IS NOT NULL AND TRIM(p.suspension_requested_at) <> ''`);
      const violations = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.violation_summary IS NOT NULL AND TRIM(p.violation_summary) <> ''`);
      const due = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.sbv_statement_due_at IS NOT NULL AND p.sbv_statement_due_at < ? AND p.participation_status NOT IN ('abgeschlossen', 'pflichtverstoss_dokumentiert')`, [nowIso()]);
      const missingInformation = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.information_complete = 0`);
      const lateHearing = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.hearing_before_decision = 0`);
      const decisionMissing = count(db, `SELECT COUNT(*) AS value FROM ${participationFrom} AND p.decision_notified = 0`);
      const violationPeriod = periodWhere("created_at", input);
      const violationProtocolCount = count(db, `SELECT COUNT(*) AS value FROM sbv_participation_violations ${violationPeriod.sql}`, violationPeriod.params);
      const violationOpenProtocols = count(db, `SELECT COUNT(*) AS value FROM sbv_participation_violations WHERE status IN ('draft','open','sent','escalated')`);
      const violationByStage = rows(db, `SELECT stage, COUNT(*) AS value FROM sbv_participation_violations ${violationPeriod.sql} GROUP BY stage ORDER BY value DESC`, violationPeriod.params);
      const violationByStatus = rows(db, `SELECT status, COUNT(*) AS value FROM sbv_participation_violations ${violationPeriod.sql} GROUP BY status ORDER BY value DESC`, violationPeriod.params);
      const recruitingPeriod = periodWhere("created_at", input);
      const recruitingCount = count(db, `SELECT COUNT(*) AS value FROM recruiting_participations ${recruitingPeriod.sql}`, recruitingPeriod.params);
      const recruitingOpenHearings = count(db, `SELECT COUNT(*) AS value FROM recruiting_participations WHERE has_severely_disabled_applicants = 1 AND statement_submitted_date IS NULL AND decision_known_date IS NULL`);
      const recruitingMissingInformation = count(db, `SELECT COUNT(*) AS value FROM recruiting_participations WHERE has_severely_disabled_applicants = 1 AND documents_complete = 0`);
      const recruitingInterviews = count(db, `SELECT COUNT(*) AS value FROM recruiting_interview_events ${recruitingPeriod.sql}`, recruitingPeriod.params);
      const recruitingViolations = count(db, `SELECT COUNT(*) AS value FROM sbv_participation_violations WHERE source_context_type = 'recruiting_participation'`);
      const warnings: string[] = [];
      if (due) warnings.push(`${due} Beteiligungsvorgänge haben überfällige Stellungnahmefristen.`);
      if (violations) warnings.push(`${violations} Beteiligungsvorgänge enthalten dokumentierte Pflichtverstöße.`);
      if (missingInformation) warnings.push(`${missingInformation} Beteiligungsvorgänge sind als nicht vollständig unterrichtet markiert.`);
      if (violationOpenProtocols) warnings.push(`${violationOpenProtocols} strukturierte Beteiligungsverstoß-Protokolle sind noch offen oder eskaliert.`);
      if (lateHearing) warnings.push(`${lateHearing} Beteiligungsvorgänge sind nicht als Anhörung vor Entscheidung bestätigt.`);
      if (recruitingOpenHearings) warnings.push(`${recruitingOpenHearings} Stellenbesetzungsverfahren haben eine offene Anhörung vor Auswahlentscheidung.`);
      if (recruitingMissingInformation) warnings.push(`${recruitingMissingInformation} Stellenbesetzungsverfahren haben unvollständige Unterlagen.`);
      const metrics = {
        "Beteiligungen gesamt": count(db, `SELECT COUNT(*) AS value FROM ${participationFrom}`),
        "Offen": open,
        "Kritisch": critical,
        "Aussetzungen": suspensions,
        "Pflichtverstöße": violations,
        "Stellenbesetzungen": recruitingCount,
        "Vorstellungsgespräche": recruitingInterviews,
        "Anhörungen Stellenbesetzung offen": recruitingOpenHearings,
        "Verstoßprotokolle aus Stellenbesetzung": recruitingViolations,
        "strukturierte Verstoßprotokolle": violationProtocolCount,
        "offene Verstoßprotokolle": violationOpenProtocols,
        "Frist überfällig": due,
      };
      const content = [metricCards(metrics),
        section('Status', [table(['Status', 'Anzahl'], byStatus.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value]))]),
        section('Maßnahmearten', [table(['Maßnahme', 'Anzahl'], byMeasure.map((row) => [normalizeStatus(reportText(row.measure_type)), row.value]))]),
        section('§ 178 Abs. 2 SGB IX Prüfpunkte', [table(
          ["Prüffrage", "Befund"],
          [
            ["Unterrichtung unvollständig", missingInformation],
            ["Anhörung vor Entscheidung nicht bestätigt", lateHearing],
            ["Entscheidungsmitteilung nicht bestätigt", decisionMissing],
            ["Aussetzungsverlangen dokumentiert", suspensions],
            ["Pflichtverstoß dokumentiert", violations],
          ],
        )]),
        section('Stellenbesetzungen ohne Fallbezug', [
          table(['Prüffrage', 'Befund'], [['Stellenbesetzungen im Zeitraum', recruitingCount], ['Vorstellungsgespräche als Beteiligungsereignis', recruitingInterviews], ['Anhörung vor Auswahlentscheidung offen', recruitingOpenHearings], ['Unterlagen unvollständig', recruitingMissingInformation], ['Verstoßprotokolle aus Stellenbesetzung', recruitingViolations]]),
          paragraph('Diese Auswertung enthält keine Bewerberreferenzen, Gesprächsnotizen, Diagnosen oder Eignungsbewertungen.'),
        ]),
        section('Strukturierte Beteiligungsverstoß-Protokolle', [
          table(['Eskalationsstufe', 'Anzahl'], violationByStage.map((row) => [normalizeStatus(reportText(row.stage)), row.value])),
          table(['Status', 'Anzahl'], violationByStatus.map((row) => [normalizeStatus(typeof row.status === 'string' ? row.status : undefined), row.value])),
          paragraph('Die Auswertung enthält keine Schreibenstexte, Maßnahmendetails oder Freitexte.'),
        ]),
      ];
      return {
        title: "SBV-Beteiligungsbericht",
        warnings,
        metrics,
        document: reportShell("SBV-Beteiligungsbericht", this.periodLabel(input), "Intern vertraulich", content, warnings),
      };
    }

  protected buildEqualizationReport(input: GenerateReportInput): ReportBuildResult {
      const db = this.dbProvider();
      const created = periodWhere("created_at", input);
      const byStatus = rows(db, `SELECT application_status, COUNT(*) AS value FROM equalization_processes ${created.sql} GROUP BY application_status ORDER BY value DESC`, created.params);
      const openObjections = count(db, `SELECT COUNT(*) AS value FROM equalization_processes WHERE objection_due_at IS NOT NULL AND objection_due_at >= ? AND application_status IN ('abgelehnt', 'widerspruch', 'nachfrage')`, [nowIso()]);
      const overdueObjections = count(db, `SELECT COUNT(*) AS value FROM equalization_processes WHERE objection_due_at IS NOT NULL AND objection_due_at < ? AND application_status NOT IN ('bewilligt', 'abgeschlossen')`, [nowIso()]);
      const missingOutcome = count(db, `SELECT COUNT(*) AS value FROM equalization_processes WHERE application_status IN ('eingereicht', 'nachfrage', 'widerspruch') AND (outcome IS NULL OR TRIM(outcome) = '')`);
      const warnings: string[] = [];
      if (overdueObjections) warnings.push(`${overdueObjections} Gleichstellungs-/GdB-Vorgänge haben überfällige Widerspruchs- oder Nachfassfristen.`);
      if (openObjections) warnings.push(`${openObjections} Vorgänge haben offene Widerspruchsfristen.`);
      if (missingOutcome) warnings.push(`${missingOutcome} laufende Vorgänge haben noch kein dokumentiertes Ergebnis.`);
      const metrics = {
        "Vorgänge gesamt": count(db, `SELECT COUNT(*) AS value FROM equalization_processes`),
        "Offene Widerspruchsfristen": openObjections,
        "Überfällige Fristen": overdueObjections,
        "Ohne Ergebnisnotiz": missingOutcome,
      };
      const content = [metricCards(metrics), section('Antragsstatus', [table(
        ["Status", "Anzahl"],
        byStatus.map((row) => [normalizeStatus(reportText(row.application_status)), row.value]),
      )]), section('Datenschutzhinweis', [paragraph('Dieser Bericht ist intern. Er enthält keine Namen, keine Bescheiddetails und keine Gesundheitsdaten, kann aber aufgrund kleiner Fallzahlen rückrechenbar sein.')])];
      return {
        title: "Gleichstellungs- und GdB-Bericht",
        warnings,
        metrics,
        document: reportShell("Gleichstellungs- und GdB-Bericht", this.periodLabel(input), "Intern vertraulich", content, warnings),
      };
    }
}
