import { describe, expect, it } from 'vitest';
import { ComplianceIncidentService } from '../services/complianceIncidentService';
import type { DatabaseAdapter } from '../services/databaseService';

type IncidentRow = {
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
};

type AuditRow = {
  sequence?: number;
  occurred_at?: string;
  actor?: string;
  action?: string;
  subject_type?: string;
  subject_id?: string | null;
  purpose?: string;
  metadata_json?: string;
  previous_hash?: string | null;
  entry_hash?: string;
};

class ComplianceIncidentDb implements DatabaseAdapter {
  readonly incidents: IncidentRow[] = [];
  readonly audit: AuditRow[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(): T[] {
        if (sql.includes('FROM compliance_incidents')) {
          return [...self.incidents].sort((left, right) => right.discovered_at.localeCompare(left.discovered_at)) as T[];
        }
        return [] as T[];
      },
      get(id?: string): T | undefined {
        if (sql.includes('FROM compliance_incidents WHERE id = ?')) {
          return self.incidents.find((row) => row.id === id) as T | undefined;
        }
        if (sql.includes('personal_data_audit_log') && sql.includes('ORDER BY sequence DESC')) {
          return self.audit.at(-1) as T | undefined;
        }
        return undefined;
      },
      run(...params: unknown[]) {
        if (sql.includes('INSERT INTO compliance_incidents')) {
          self.incidents.push({
            id: String(params[0]),
            occurred_at: String(params[1]),
            discovered_at: String(params[2]),
            category: String(params[3]),
            risk_level: String(params[4]),
            status: String(params[5]),
            summary: String(params[6]),
            affected_data_categories: String(params[7] ?? ''),
            immediate_measures: String(params[8] ?? ''),
            authority_notification_checked: Number(params[9] ?? 0),
            created_at: String(params[10]),
            updated_at: String(params[11]),
          });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE compliance_incidents')) {
          const id = String(params[11]);
          const row = self.incidents.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          Object.assign(row, {
            status: String(params[0]),
            risk_level: String(params[1]),
            summary: String(params[2]),
            affected_data_categories: String(params[3] ?? ''),
            immediate_measures: String(params[4] ?? ''),
            dsb_notified_at: params[5] === null ? null : String(params[5]),
            authority_notification_checked: Number(params[6] ?? 0),
            data_subjects_informed_at: params[7] === null ? null : String(params[7]),
            closed_at: params[8] === null ? null : String(params[8]),
            lessons_learned: params[9] === null ? null : String(params[9]),
            updated_at: String(params[10]),
          });
          return { changes: 1 };
        }
        if (sql.includes('INSERT INTO personal_data_audit_log')) {
          self.audit.push({
            sequence: Number(params[1]),
            occurred_at: String(params[2]),
            actor: String(params[3]),
            action: String(params[4]),
            subject_type: String(params[5]),
            subject_id: params[6] === null ? null : String(params[6]),
            purpose: String(params[8]),
            metadata_json: String(params[9] ?? '{}'),
            previous_hash: params[10] === null ? null : String(params[10]),
            entry_hash: String(params[11]),
          });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }

  exec(_sql: string): void {}
  pragma(_sql: string): unknown { return undefined; }
  close(): void {}
}

describe('ComplianceIncidentService', () => {
  it('speichert Datenschutzvorfälle und auditiert nur technische Metadaten', () => {
    const db = new ComplianceIncidentDb();
    const service = new ComplianceIncidentService(db);

    const record = service.create({
      occurredAt: '2026-05-23T08:00:00.000Z',
      discoveredAt: '2026-05-23T09:00:00.000Z',
      category: 'wrong_export',
      riskLevel: 'medium',
      summary: 'Export wurde an falschen Empfänger vorbereitet',
      affectedDataCategories: 'Fallnotizen',
      immediateMeasures: 'Versand gestoppt und Datei gelöscht',
    });

    expect(record.status).toBe('open');
    expect(record.authorityNotificationChecked).toBe(false);
    expect(service.list()).toHaveLength(1);
    expect(db.audit.at(-1)?.action).toBe('create');
    expect(db.audit.at(-1)?.metadata_json).toContain('wrong_export');
    expect(db.audit.at(-1)?.metadata_json).not.toContain('Fallnotizen');
  });

  it('aktualisiert Bewertung und Abschluss ohne Falldaten ins Audit zu schreiben', () => {
    const db = new ComplianceIncidentDb();
    const service = new ComplianceIncidentService(db);
    const record = service.create({ occurredAt: '2026-05-23', discoveredAt: '2026-05-23', category: 'lost_backup', riskLevel: 'high', summary: 'Backup-Datenträger vermisst' });

    const updated = service.update(record.id, {
      status: 'closed',
      riskLevel: 'low',
      authorityNotificationChecked: true,
      lessonsLearned: 'Backup künftig nur verschlüsselt und doppelt kontrolliert.',
      closedAt: '2026-05-24T10:00:00.000Z',
    });

    expect(updated.status).toBe('closed');
    expect(updated.riskLevel).toBe('low');
    expect(updated.authorityNotificationChecked).toBe(true);
    expect(db.audit.at(-1)?.action).toBe('update');
    expect(db.audit.at(-1)?.metadata_json).not.toContain('Backup künftig');
  });

  it('verhindert Vorfälle ohne Kurzbeschreibung', () => {
    const service = new ComplianceIncidentService(new ComplianceIncidentDb());

    expect(() => service.create({ occurredAt: '2026-05-23', discoveredAt: '2026-05-23', category: 'other', riskLevel: 'low', summary: '   ' })).toThrow(/Kurzbeschreibung/);
  });
});
