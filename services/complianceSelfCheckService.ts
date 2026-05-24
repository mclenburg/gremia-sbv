import type { ComplianceSelfCheckItem, ComplianceSelfCheckResult, ComplianceSelfCheckStatus } from '../src/app/core/models/compliance.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { evaluateDatabaseIntegrity } from './databaseIntegrityService.js';

interface CountRow { value?: unknown }
interface DateRow { value?: unknown }

function nowIso(): string {
  return new Date().toISOString();
}

function count(db: DatabaseAdapter, sql: string): number {
  const value = db.prepare<CountRow>(sql).get()?.value;
  return Number(value ?? 0);
}

function scalarDate(db: DatabaseAdapter, sql: string): string | undefined {
  const value = db.prepare<DateRow>(sql).get()?.value;
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function item(id: string, label: string, status: ComplianceSelfCheckStatus, summary: string, action?: string): ComplianceSelfCheckItem {
  return { id, label, status, summary, action };
}

function deriveOverall(items: ComplianceSelfCheckItem[]): ComplianceSelfCheckStatus {
  if (items.some((entry) => entry.status === 'problem')) return 'problem';
  if (items.some((entry) => entry.status === 'warning')) return 'warning';
  return 'ok';
}

function score(items: ComplianceSelfCheckItem[]): number {
  if (items.length === 0) return 100;
  const points = items.reduce((sum, entry) => {
    if (entry.status === 'ok') return sum + 2;
    if (entry.status === 'warning') return sum + 1;
    return sum;
  }, 0);
  return Math.round((points / (items.length * 2)) * 100);
}

export class ComplianceSelfCheckService {
  constructor(private readonly db: DatabaseAdapter) {}

  evaluate(): ComplianceSelfCheckResult {
    const database = evaluateDatabaseIntegrity(this.db);
    const audit = new PersonalDataAuditLogService(this.db).verifyChain();
    const openPrivacyReviews = count(this.db, "SELECT COUNT(*) AS value FROM privacy_review_items WHERE status IN ('open', 'scheduled')");
    const overduePrivacyReviews = count(this.db, "SELECT COUNT(*) AS value FROM privacy_review_items WHERE status IN ('open', 'scheduled') AND due_at < date('now')");
    const openIncidents = count(this.db, "SELECT COUNT(*) AS value FROM compliance_incidents WHERE status <> 'closed'");
    const highIncidents = count(this.db, "SELECT COUNT(*) AS value FROM compliance_incidents WHERE status <> 'closed' AND risk_level = 'high'");
    const expiredHandoverCases = count(this.db, "SELECT COUNT(*) AS value FROM cases WHERE handover_valid_until IS NOT NULL AND handover_valid_until < date('now') AND COALESCE(handover_status, '') <> 'continued'");
    const lastAuditExport = scalarDate(this.db, "SELECT MAX(occurred_at) AS value FROM personal_data_audit_log WHERE action IN ('export', 'case_handover_export', 'backup')");

    const items: ComplianceSelfCheckItem[] = [
      item(
        'database-integrity',
        'Datenbankschema',
        database.ok ? 'ok' : database.repairRequired ? 'problem' : 'warning',
        database.ok ? `Schema ${database.appliedSchemaVersion ?? database.schemaVersion} vollständig.` : `${database.issueCount} Schema-Befund(e).`,
        database.ok ? undefined : 'Datenbank-Integritätsbericht prüfen und Migrationen bereinigen.',
      ),
      item(
        'audit-chain',
        'Audit-Hash-Chain',
        audit.ok ? 'ok' : 'problem',
        audit.ok ? `Hash-Kette intakt (${audit.checked} Einträge geprüft).` : `${audit.issues.length} Audit-Befund(e).`,
        audit.ok ? undefined : 'Audit-Integrität prüfen und keine weitere produktive Bearbeitung ohne Klärung vornehmen.',
      ),
      item(
        'privacy-reviews',
        'Datenschutzprüfungen',
        overduePrivacyReviews > 0 ? 'problem' : openPrivacyReviews > 0 ? 'warning' : 'ok',
        overduePrivacyReviews > 0
          ? `${overduePrivacyReviews} überfällige Datenschutzprüfung(en).`
          : openPrivacyReviews > 0
            ? `${openPrivacyReviews} offene Datenschutzprüfung(en).`
            : 'Keine offenen Datenschutzprüfungen.',
        openPrivacyReviews > 0 ? 'Offene Prüfungen im Compliance-/Datenschutzbereich bearbeiten.' : undefined,
      ),
      item(
        'handover-expiry',
        'Vertretungsdaten',
        expiredHandoverCases > 0 ? 'warning' : 'ok',
        expiredHandoverCases > 0
          ? `${expiredHandoverCases} importierte Übergabeakte(n) haben die Vertretungszeit überschritten.`
          : 'Keine abgelaufenen Übergabefälle gefunden.',
        expiredHandoverCases > 0 ? 'Abgelaufene Übergabefälle prüfen und weitere Bearbeitung bewusst bestätigen oder abschließen.' : undefined,
      ),
      item(
        'incidents',
        'Datenschutzvorfälle',
        highIncidents > 0 ? 'problem' : openIncidents > 0 ? 'warning' : 'ok',
        highIncidents > 0
          ? `${highIncidents} offener Vorfall mit hoher Risikostufe.`
          : openIncidents > 0
            ? `${openIncidents} offene Sicherheits-/Datenschutzereignis(se).`
            : 'Keine offenen Datenschutzvorfälle.',
        openIncidents > 0 ? 'Vorfallbewertung, DSB-/IT-Information und Abschluss dokumentieren.' : undefined,
      ),
      item(
        'export-traceability',
        'Exportnachweis',
        lastAuditExport ? 'ok' : 'warning',
        lastAuditExport ? `Letzter auditierter Export/Backup: ${lastAuditExport}.` : 'Noch kein auditierter Export- oder Backupvorgang gefunden.',
        lastAuditExport ? undefined : 'Backup-/Exportstrategie vor produktiver Nutzung prüfen.',
      ),
    ];

    const status = deriveOverall(items);
    return {
      generatedAt: nowIso(),
      score: score(items),
      status,
      items,
      nextActions: items.flatMap((entry) => entry.action ? [entry.action] : []),
    };
  }
}
