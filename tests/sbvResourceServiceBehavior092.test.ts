import { describe, expect, it } from 'vitest';
import { SbvResourceService } from '../services/sbvResourceService';
import type { DatabaseAdapter } from '../services/databaseService';

class ResourceDb implements DatabaseAdapter {
  resources: any[] = [];
  audit: any[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      all(..._params: unknown[]): T[] {
        if (sql.includes('FROM sbv_resource_records')) {
          return [...self.resources].sort((a, b) => String(b.started_at ?? b.created_at).localeCompare(String(a.started_at ?? a.created_at))) as T[];
        }
        return [] as T[];
      },
      get(id?: string): T | undefined {
        if (sql.includes('FROM sbv_resource_records WHERE id = ?')) {
          return self.resources.find((row) => row.id === id) as T | undefined;
        }
        if (sql.includes('personal_data_audit_log') && sql.includes('ORDER BY sequence DESC')) {
          return self.audit.at(-1) as T | undefined;
        }
        return undefined;
      },
      run(...params: unknown[]) {
        if (sql.includes('INSERT INTO sbv_resource_records')) {
          self.resources.push({
            id: params[0],
            kind: params[1],
            title: params[2],
            legal_basis: params[3],
            started_at: params[4],
            ended_at: params[5],
            provider: params[6],
            participants: params[7],
            task_context: params[8],
            necessity_reason: params[9],
            employer_reaction: params[10],
            cost_note: params[11],
            status: params[12],
            notes: params[13],
            created_at: params[14],
            updated_at: params[15],
          });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE sbv_resource_records')) {
          const id = params.at(-1);
          const row = self.resources.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          Object.assign(row, {
            kind: params[0],
            title: params[1],
            legal_basis: params[2],
            started_at: params[3],
            ended_at: params[4],
            provider: params[5],
            participants: params[6],
            task_context: params[7],
            necessity_reason: params[8],
            employer_reaction: params[9],
            cost_note: params[10],
            status: params[11],
            notes: params[12],
            updated_at: params[13],
          });
          return { changes: 1 };
        }
        if (sql.includes('DELETE FROM sbv_resource_records')) {
          const before = self.resources.length;
          self.resources = self.resources.filter((entry) => entry.id !== params[0]);
          return { changes: before - self.resources.length };
        }
        if (sql.includes('INSERT INTO personal_data_audit_log')) {
          self.audit.push({
            action: params[4],
            subject_type: params[5],
            subject_id: params[6],
            purpose: params[8],
            metadata_json: params[9],
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

describe('SBV-Ressourcen- und Heranziehungsnachweise', () => {
  it('protokolliert Schulungen mit Erforderlichkeit und auditierter Anlage', () => {
    const db = new ResourceDb();
    const service = new SbvResourceService(db as unknown as DatabaseAdapter);

    const record = service.create({
      kind: 'training',
      title: 'SBV-Grundlagenschulung I',
      startedAt: '2026-06-10',
      provider: 'Gewerkschaftliches Bildungswerk',
      participants: 'Vertrauensperson',
      taskContext: 'Onboarding in die neue SBV-Rolle',
      necessityReason: 'Grundkenntnisse sind für die Amtsführung erforderlich.',
      status: 'requested',
    });

    expect(record.legalBasis).toBe('§ 179 Abs. 4 Satz 3 SGB IX');
    expect(record.necessityReason).toContain('Grundkenntnisse');
    expect(service.dashboardSummary().openRequests).toBe(1);
    expect(db.audit.some((entry) => entry.action === 'create' && entry.subject_type === 'sbv_resource_record')).toBe(true);
  });

  it('protokolliert Heranziehungen als eigenständigen Nachweis statt als Fallabschluss-Checkliste', () => {
    const db = new ResourceDb();
    const service = new SbvResourceService(db as unknown as DatabaseAdapter);

    const record = service.create({
      kind: 'deputy_involvement',
      title: 'Heranziehung zur BEM-Vorbereitung',
      participants: '1. Stellvertretung',
      taskContext: 'Vertretungsvorbereitung während Urlaub',
      status: 'documented',
    });

    expect(record.kind).toBe('deputy_involvement');
    expect(record.legalBasis).toContain('§ 178 Abs. 1 Satz 4 SGB IX');
    expect(service.dashboardSummary().deputyInvolvements).toBe(1);
  });

  it('verhindert Nachweise ohne Titel', () => {
    const service = new SbvResourceService(new ResourceDb() as unknown as DatabaseAdapter);

    expect(() => service.create({ kind: 'training', title: '   ' })).toThrow(/Titel/);
  });
});
