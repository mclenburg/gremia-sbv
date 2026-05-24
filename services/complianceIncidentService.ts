import { randomUUID } from 'node:crypto';
import type {
  ComplianceIncidentCategory,
  ComplianceIncidentRecord,
  ComplianceIncidentRiskLevel,
  ComplianceIncidentStatus,
  CreateComplianceIncidentInput,
  UpdateComplianceIncidentInput,
} from '../src/app/core/models/compliance.model.js';
import type { DatabaseAdapter } from './databaseService.js';
import { PersonalDataAuditLogService } from './auditLogService.js';
import { auditComplianceIncidentCreated, auditComplianceIncidentUpdated } from './auditEventBuilders.js';

interface ComplianceIncidentRow {
  id: string;
  occurred_at: string;
  discovered_at: string;
  category: string;
  risk_level: string;
  status: string;
  summary: string;
  affected_data_categories: string;
  immediate_measures: string;
  dsb_notified_at?: string | null;
  authority_notification_checked: number;
  data_subjects_informed_at?: string | null;
  closed_at?: string | null;
  lessons_learned?: string | null;
  created_at: string;
  updated_at: string;
}

const INCIDENT_CATEGORIES: readonly ComplianceIncidentCategory[] = [
  'wrong_export',
  'lost_backup',
  'unauthorized_access_suspected',
  'wrong_recipient',
  'vault_integrity',
  'temporary_file',
  'other',
];

const RISK_LEVELS: readonly ComplianceIncidentRiskLevel[] = ['low', 'medium', 'high'];
const STATUSES: readonly ComplianceIncidentStatus[] = ['open', 'in_review', 'reported', 'closed'];

function nowIso(): string {
  return new Date().toISOString();
}

function requireEnum<T extends string>(value: string | undefined, allowed: readonly T[], field: string): T {
  if (allowed.includes(value as T)) return value as T;
  throw new Error(`${field} ist ungültig.`);
}

function requireText(value: string | undefined, field: string): string {
  const text = (value ?? '').trim();
  if (!text) throw new Error(`${field} ist erforderlich.`);
  return text;
}

function optionalText(value: string | undefined): string | undefined {
  const text = (value ?? '').trim();
  return text || undefined;
}

function mapIncident(row: ComplianceIncidentRow): ComplianceIncidentRecord {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    discoveredAt: row.discovered_at,
    category: requireEnum(row.category, INCIDENT_CATEGORIES, 'Vorfallart'),
    riskLevel: requireEnum(row.risk_level, RISK_LEVELS, 'Risikostufe'),
    status: requireEnum(row.status, STATUSES, 'Status'),
    summary: row.summary,
    affectedDataCategories: row.affected_data_categories,
    immediateMeasures: row.immediate_measures,
    dsbNotifiedAt: row.dsb_notified_at ?? undefined,
    authorityNotificationChecked: Number(row.authority_notification_checked) === 1,
    dataSubjectsInformedAt: row.data_subjects_informed_at ?? undefined,
    closedAt: row.closed_at ?? undefined,
    lessonsLearned: row.lessons_learned ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ensureComplianceIncidentSchema(db: DatabaseAdapter): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS compliance_incidents (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      discovered_at TEXT NOT NULL,
      category TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      status TEXT NOT NULL,
      summary TEXT NOT NULL,
      affected_data_categories TEXT NOT NULL DEFAULT '',
      immediate_measures TEXT NOT NULL DEFAULT '',
      dsb_notified_at TEXT,
      authority_notification_checked INTEGER NOT NULL DEFAULT 0,
      data_subjects_informed_at TEXT,
      closed_at TEXT,
      lessons_learned TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_compliance_incidents_status ON compliance_incidents(status, discovered_at);
    CREATE INDEX IF NOT EXISTS idx_compliance_incidents_risk ON compliance_incidents(risk_level, discovered_at);
  `);
}

export class ComplianceIncidentService {
  private readonly audit: PersonalDataAuditLogService;

  constructor(private readonly db: DatabaseAdapter) {
    ensureComplianceIncidentSchema(db);
    this.audit = new PersonalDataAuditLogService(db);
  }

  list(): ComplianceIncidentRecord[] {
    return this.db.prepare<ComplianceIncidentRow>(`
      SELECT * FROM compliance_incidents
      ORDER BY discovered_at DESC, created_at DESC
    `).all().map(mapIncident);
  }

  create(input: CreateComplianceIncidentInput): ComplianceIncidentRecord {
    const id = randomUUID();
    const createdAt = nowIso();
    const category = requireEnum(input.category, INCIDENT_CATEGORIES, 'Vorfallart');
    const riskLevel = requireEnum(input.riskLevel, RISK_LEVELS, 'Risikostufe');
    const summary = requireText(input.summary, 'Kurzbeschreibung');
    const occurredAt = requireText(input.occurredAt, 'Zeitpunkt des Vorfalls');
    const discoveredAt = requireText(input.discoveredAt, 'Zeitpunkt der Kenntnis');

    this.db.prepare(`
      INSERT INTO compliance_incidents (
        id, occurred_at, discovered_at, category, risk_level, status, summary,
        affected_data_categories, immediate_measures, authority_notification_checked,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      occurredAt,
      discoveredAt,
      category,
      riskLevel,
      'open',
      summary,
      optionalText(input.affectedDataCategories) ?? '',
      optionalText(input.immediateMeasures) ?? '',
      0,
      createdAt,
      createdAt,
    );

    this.audit.append(auditComplianceIncidentCreated({
      incidentId: id,
      category,
      riskLevel,
      status: 'open',
    }));

    return this.getRequired(id);
  }

  update(id: string, input: UpdateComplianceIncidentInput): ComplianceIncidentRecord {
    const current = this.getRequired(id);
    const updatedAt = nowIso();
    const status = input.status ? requireEnum(input.status, STATUSES, 'Status') : current.status;
    const riskLevel = input.riskLevel ? requireEnum(input.riskLevel, RISK_LEVELS, 'Risikostufe') : current.riskLevel;

    this.db.prepare(`
      UPDATE compliance_incidents SET
        status = ?,
        risk_level = ?,
        summary = ?,
        affected_data_categories = ?,
        immediate_measures = ?,
        dsb_notified_at = ?,
        authority_notification_checked = ?,
        data_subjects_informed_at = ?,
        closed_at = ?,
        lessons_learned = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      status,
      riskLevel,
      input.summary !== undefined ? requireText(input.summary, 'Kurzbeschreibung') : current.summary,
      input.affectedDataCategories !== undefined ? optionalText(input.affectedDataCategories) ?? '' : current.affectedDataCategories,
      input.immediateMeasures !== undefined ? optionalText(input.immediateMeasures) ?? '' : current.immediateMeasures,
      input.dsbNotifiedAt !== undefined ? optionalText(input.dsbNotifiedAt) ?? null : current.dsbNotifiedAt ?? null,
      input.authorityNotificationChecked !== undefined ? (input.authorityNotificationChecked ? 1 : 0) : current.authorityNotificationChecked ? 1 : 0,
      input.dataSubjectsInformedAt !== undefined ? optionalText(input.dataSubjectsInformedAt) ?? null : current.dataSubjectsInformedAt ?? null,
      input.closedAt !== undefined ? optionalText(input.closedAt) ?? null : current.closedAt ?? null,
      input.lessonsLearned !== undefined ? optionalText(input.lessonsLearned) ?? null : current.lessonsLearned ?? null,
      updatedAt,
      id,
    );

    this.audit.append(auditComplianceIncidentUpdated({
      incidentId: id,
      riskLevel,
      status,
      authorityNotificationChecked: input.authorityNotificationChecked ?? current.authorityNotificationChecked,
    }));

    return this.getRequired(id);
  }

  private getRequired(id: string): ComplianceIncidentRecord {
    const row = this.db.prepare<ComplianceIncidentRow>('SELECT * FROM compliance_incidents WHERE id = ?').get(id);
    if (!row) throw new Error('Datenschutzvorfall wurde nicht gefunden.');
    return mapIncident(row);
  }
}
