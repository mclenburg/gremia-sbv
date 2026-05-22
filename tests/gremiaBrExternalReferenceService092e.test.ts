import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../services/databaseService';
import { GremiaBrExternalReferenceService } from '../services/gremiaBr/gremiaBrExternalReferenceService';
import type { GremiaBrReadAdapter } from '../services/gremiaBr/gremiaBrTypes';

interface ReferenceRow {
  id: string;
  case_id: string;
  source_system: 'gremia_br';
  source_type: 'beschluss' | 'sitzung' | 'agenda' | 'protokoll';
  source_id: string;
  title: string;
  description?: string | null;
  source_url?: string | null;
  fetched_at: string;
  snapshot_json?: string | null;
  created_at: string;
  updated_at: string;
}

class ReferenceDb implements DatabaseAdapter {
  rows: ReferenceRow[] = [];

  prepare<T = unknown>(sql: string) {
    const self = this;
    return {
      get(...params: unknown[]): T | undefined {
        if (/FROM case_external_references/i.test(sql) && /WHERE case_id = \?/i.test(sql) && /source_type = \?/i.test(sql)) {
          const [caseId, sourceType, sourceId] = params.map(String);
          return self.rows.find((row) => row.case_id === caseId && row.source_type === sourceType && row.source_id === sourceId) as T | undefined;
        }
        return undefined;
      },
      all(...params: unknown[]): T[] {
        if (/FROM case_external_references/i.test(sql) && /WHERE case_id = \?/i.test(sql)) {
          const caseId = String(params[0]);
          return self.rows.filter((row) => row.case_id === caseId) as T[];
        }
        return [];
      },
      run(...params: unknown[]) {
        if (/INSERT INTO case_external_references/i.test(sql)) {
          const [id, caseId, sourceType, sourceId, title, description, sourceUrl, fetchedAt, snapshotJson, createdAt, updatedAt] = params;
          const existing = self.rows.find((row) => row.case_id === caseId && row.source_type === sourceType && row.source_id === sourceId);
          if (existing) {
            Object.assign(existing, { title, description, source_url: sourceUrl, fetched_at: fetchedAt, snapshot_json: snapshotJson, updated_at: updatedAt });
          } else {
            self.rows.push({
              id: String(id),
              case_id: String(caseId),
              source_system: 'gremia_br',
              source_type: sourceType as ReferenceRow['source_type'],
              source_id: String(sourceId),
              title: String(title),
              description: description == null ? null : String(description),
              source_url: sourceUrl == null ? null : String(sourceUrl),
              fetched_at: String(fetchedAt),
              snapshot_json: snapshotJson == null ? null : String(snapshotJson),
              created_at: String(createdAt),
              updated_at: String(updatedAt),
            });
          }
          return { changes: 1 };
        }
        if (/DELETE FROM case_external_references/i.test(sql)) {
          const before = self.rows.length;
          const id = String(params[0]);
          self.rows = self.rows.filter((row) => row.id !== id);
          return { changes: before - self.rows.length };
        }
        return { changes: 0 };
      },
    };
  }

  exec(): void {}
  pragma(): unknown { return undefined; }
  close(): void {}
}

class SuggestAdapter implements GremiaBrReadAdapter {
  requestedQueries: string[] = [];
  async listWorksAgreements(): Promise<unknown[]> { return []; }
  async listRelevantMeetings(): Promise<unknown[]> { return []; }
  async getReferenceById(): Promise<unknown | null> { return null; }
  async getNextMeeting(): Promise<unknown | null> { return null; }
  async getUpcomingMeetings(): Promise<unknown[]> { return []; }
  async getMeetingAgenda(): Promise<unknown[]> { return []; }
  async listRelevantDecisions(): Promise<unknown[]> { return []; }
  async getDueDecisions(): Promise<unknown[]> { return []; }
  async getOverdueDecisions(): Promise<unknown[]> { return []; }
  async searchDecisions(): Promise<unknown[]> { return []; }
  async suggestForInlineCommand(q: string): Promise<unknown[]> {
    this.requestedQueries.push(q);
    return [
      { id: 'BR-B-2026-012', titel: 'Betriebsvereinbarung Homeoffice', datum: '2026-05-20', beschreibung: 'SBV-relevanter Beschluss' },
      { id: '', titel: 'ohne ID' },
    ];
  }
}

describe('Gremia.BR externe Referenzen 0.9.2-E', () => {
  it('speichert BR-Beschlüsse als Fallaktenreferenz ohne SBV-Daten an Gremia.BR zurückzuschreiben', () => {
    const db = new ReferenceDb();
    const service = new GremiaBrExternalReferenceService(() => db);

    const saved = service.createOrUpdate({
      caseId: 'case-1',
      sourceType: 'beschluss',
      sourceId: 'BR-B-2026-012',
      title: 'Betriebsvereinbarung Homeoffice',
      description: 'Nur Referenzmetadaten',
    });

    expect(saved.caseId).toBe('case-1');
    expect(saved.sourceSystem).toBe('gremia_br');
    expect(saved.sourceType).toBe('beschluss');
    expect(saved.title).toBe('Betriebsvereinbarung Homeoffice');
    expect(JSON.stringify(saved.snapshot)).not.toContain('Gesundheitsdaten');
    expect(service.listForCase('case-1')).toHaveLength(1);
  });

  it('aktualisiert bestehende Referenzen idempotent und löscht nur die konkrete Referenz', () => {
    const db = new ReferenceDb();
    const service = new GremiaBrExternalReferenceService(() => db);

    const first = service.createOrUpdate({ caseId: 'case-1', sourceType: 'beschluss', sourceId: 'B1', title: 'Alt' });
    const second = service.createOrUpdate({ caseId: 'case-1', sourceType: 'beschluss', sourceId: 'B1', title: 'Neu' });

    expect(service.listForCase('case-1')).toHaveLength(1);
    expect(second.title).toBe('Neu');
    expect(service.delete(first.id)).toEqual({ deleted: true });
    expect(service.listForCase('case-1')).toEqual([]);
  });

  it('liefert ##-Vorschläge für BR-Beschlüsse über den ReadAdapter ohne generischen HTTP-Zugriff', async () => {
    const db = new ReferenceDb();
    const service = new GremiaBrExternalReferenceService(() => db);
    const adapter = new SuggestAdapter();

    const suggestions = await service.suggestBrDecisions(adapter, 'homeoffice');

    expect(adapter.requestedQueries).toEqual(['homeoffice']);
    expect(suggestions).toEqual([
      {
        sourceSystem: 'gremia_br',
        sourceType: 'beschluss',
        sourceId: 'BR-B-2026-012',
        title: 'Betriebsvereinbarung Homeoffice',
        description: 'SBV-relevanter Beschluss',
        date: '2026-05-20',
        label: 'BR-Beschluss · 2026-05-20 · Betriebsvereinbarung Homeoffice',
      },
    ]);
  });
});
