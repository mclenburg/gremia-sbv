import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { CaseMeasureService } from '../../../services/caseMeasureService';
import type { PersonalDataAuditLogService } from '../../../services/auditLogService';
import type { MeasureLifecycleAuditService } from '../../../services/measureLifecycleAuditService';
import type { SearchIndexService } from '../../../services/search/searchIndexService';

class LifecycleDeleteDb implements DatabaseAdapter {
  readonly statements: Array<{ sql: string; params: unknown[] }> = [];
  constructor(private readonly kind: 'prevention' | 'bem' | 'equalization' | 'termination_hearing' | 'participation' | 'workplace_accommodation' | 'none') {}

  exec(sql: string): void { this.statements.push({ sql, params: [] }); }
  pragma(): unknown { return []; }
  close(): void {}

  prepare<T = unknown>(sql: string) {
    const db = this;
    return {
      get(...params: unknown[]): T | undefined {
        db.statements.push({ sql, params });
        const tableByKind = {
          prevention: 'prevention_processes',
          bem: 'bem_processes',
          equalization: 'equalization_processes',
          termination_hearing: 'termination_hearings',
        } as const;
        if (db.kind in tableByKind && sql.includes(`FROM ${tableByKind[db.kind as keyof typeof tableByKind]}`)) {
          return { id: `${db.kind}-1`, case_id: 'case-1', status: 'abgeschlossen' } as T;
        }
        if ((db.kind === 'participation' || db.kind === 'workplace_accommodation') && sql.includes('FROM case_measures') && sql.includes('type = ?')) {
          return { id: `${db.kind}-1`, case_id: 'case-1', status: 'abgeschlossen' } as T;
        }
        return undefined;
      },
      all(...params: unknown[]): T[] {
        db.statements.push({ sql, params });
        return [];
      },
      run(...params: unknown[]) {
        db.statements.push({ sql, params });
        if (sql.includes('DELETE FROM case_measure_notes')) return { changes: 2 };
        if (sql.includes('DELETE FROM deadlines')) return { changes: 3 };
        if (sql.includes('UPDATE case_documents')) return { changes: 1 };
        return { changes: 1 };
      },
    };
  }
}

function serviceFor(db: DatabaseAdapter, events: string[]) {
  const audit = { append: () => events.push('audit') } as unknown as PersonalDataAuditLogService;
  const lifecycle = { deleted: () => events.push('lifecycle') } as unknown as MeasureLifecycleAuditService;
  const search = { reindexCase: (caseId: string) => { events.push(`reindex:${caseId}`); return 0; } } as unknown as SearchIndexService;
  return new CaseMeasureService(db, audit, lifecycle, search);
}

describe('Löschen einzelner Fallmaßnahmen', () => {
  it('löscht ein BEM samt Maßnahmennotizen und Fristen, erhält Dokumente aber ohne Maßnahmenbezug', () => {
    const db = new LifecycleDeleteDb('bem');
    const events: string[] = [];
    const result = serviceFor(db, events).deleteProcess({ caseId: 'case-1', processType: 'bem', processId: 'bem-1', reasonCode: 'created_by_mistake' });
    const sql = db.statements.map((entry) => entry.sql).join('\n');

    expect(result).toMatchObject({ deleted: true, deletedNotes: 2, deletedDeadlines: 3, detachedDocuments: 1 });
    expect(sql).toContain('DELETE FROM case_measure_notes');
    expect(sql).toContain('DELETE FROM deadlines');
    expect(sql).toContain('UPDATE case_documents SET measure_id = NULL');
    expect(sql).toContain('DELETE FROM bem_processes');
    expect(events).toEqual(['lifecycle', 'audit', 'reindex:case-1']);
  });

  it('löscht eine SBV-Beteiligung über die zentrale case_measures-Aggregatwurzel', () => {
    const db = new LifecycleDeleteDb('participation');
    const events: string[] = [];
    const result = serviceFor(db, events).deleteProcess({ caseId: 'case-1', processType: 'participation', processId: 'participation-1', reasonCode: 'duplicate' });
    const deleteMeasure = db.statements.find((entry) => entry.sql.includes('DELETE FROM case_measures WHERE id = ? AND case_id = ?'));

    expect(result.deleted).toBe(true);
    expect(deleteMeasure?.params).toEqual(['participation-1', 'case-1']);
    expect(events.at(-1)).toBe('reindex:case-1');
  });


  it.each([
    ['prevention', 'prevention_processes'],
    ['bem', 'bem_processes'],
    ['equalization', 'equalization_processes'],
    ['termination_hearing', 'termination_hearings'],
    ['participation', 'case_measures'],
    ['workplace_accommodation', 'case_measures'],
  ] as const)('unterstützt den Löschpfad für %s', (processType, expectedTable) => {
    const db = new LifecycleDeleteDb(processType);
    const result = serviceFor(db, []).deleteProcess({ caseId: 'case-1', processType, processId: `${processType}-1`, reasonCode: 'no_longer_required' });
    const sql = db.statements.map((entry) => entry.sql).join('\n');

    expect(result.deleted).toBe(true);
    expect(sql).toContain(`DELETE FROM ${expectedTable}`);
  });

  it('verweigert die Löschung, wenn Maßnahme und Fall nicht zusammengehören', () => {
    const db = new LifecycleDeleteDb('none');
    expect(() => serviceFor(db, []).deleteProcess({ caseId: 'other-case', processType: 'bem', processId: 'bem-1', reasonCode: 'created_by_mistake' })).toThrow('gehört nicht');
  });
});
