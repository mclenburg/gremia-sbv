import { describe, expect, it } from 'vitest';
import { CaseMeasureService } from '../services/caseMeasureService';

class MemoryDb {
  rows: Record<string, any[]> = {
    case_measures: [{ id: 'measure-1', case_id: 'case-1', type: 'sbv_participation', title: 'Beteiligung', status: 'open', risk_level: 'normal', created_from: 'manual', opened_at: '2026-05-12T10:00:00.000Z', requires_follow_up: 0, created_at: '2026-05-12T10:00:00.000Z', updated_at: '2026-05-12T10:00:00.000Z' }],
    case_measure_notes: [],
    personal_data_audit_log: []
  };

  prepare(sql: string) {
    const self = this;
    return {
      run(...params: any[]) {
        if (sql.includes('INSERT INTO case_measure_notes')) {
          self.rows.case_measure_notes.push({
            id: params[0], case_id: params[1], measure_type: params[2], measure_id: params[3], title: params[4], note_at: params[5], participants: params[6], content: params[7], next_steps: params[8], contains_health_data: params[9], confidential_level: params[10], created_at: params[11], updated_at: params[12]
          });
          return { changes: 1 };
        }
        if (sql.includes('UPDATE case_measure_notes')) {
          const id = params.at(-1);
          const row = self.rows.case_measure_notes.find((entry) => entry.id === id);
          if (!row) return { changes: 0 };
          [row.title, row.note_at, row.participants, row.content, row.next_steps, row.contains_health_data, row.confidential_level, row.updated_at] = params.slice(0, 8);
          return { changes: 1 };
        }
        if (sql.includes('DELETE FROM case_measure_notes')) {
          const before = self.rows.case_measure_notes.length;
          self.rows.case_measure_notes = self.rows.case_measure_notes.filter((row) => row.id !== params[0]);
          return { changes: before - self.rows.case_measure_notes.length };
        }
        if (sql.includes('INSERT INTO personal_data_audit_log')) {
          self.rows.personal_data_audit_log.push({ id: params[0] });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
      get(...params: any[]) {
        if (sql.includes('SELECT id AS id FROM case_measures')) return self.rows.case_measures.find((row) => row.id === params[0] && row.case_id === params[1] && (!sql.includes('AND type = ?') || row.type === params[2]));
        if (sql.includes('SELECT * FROM case_measure_notes WHERE id = ?')) return self.rows.case_measure_notes.find((row) => row.id === params[0]);
        if (sql.includes('personal_data_audit_log')) return undefined;
        return undefined;
      },
      all(...params: any[]) {
        if (sql.includes('case_measure_notes WHERE case_id = ? AND measure_type = ? AND measure_id = ?')) {
          return self.rows.case_measure_notes
            .filter((row) => row.case_id === params[0] && row.measure_type === params[1] && row.measure_id === params[2])
            .sort((a, b) => String(b.note_at).localeCompare(String(a.note_at)));
        }
        if (sql.includes('case_measure_notes WHERE case_id = ?')) return self.rows.case_measure_notes.filter((row) => row.case_id === params[0]);
        return [];
      }
    };
  }

  exec() {}
  pragma() { return []; }
  close() {}
}

describe('case measure notes', () => {
  it('creates and lists multiple notes for one measure', () => {
    const service = new CaseMeasureService(new MemoryDb() as any);
    service.createNote({ caseId: 'case-1', measureType: 'participation', measureId: 'measure-1', title: 'Ersttermin', noteAt: '2026-05-12T10:00:00.000Z', content: 'Unterrichtung geprüft.' });
    service.createNote({ caseId: 'case-1', measureType: 'participation', measureId: 'measure-1', title: 'Folgetermin', noteAt: '2026-05-13T10:00:00.000Z', content: 'Anhörung nachgefasst.' });

    const notes = service.listNotes('case-1', 'participation', 'measure-1');
    expect(notes).toHaveLength(2);
    expect(notes[0].title).toBe('Folgetermin');
    expect(notes[1].title).toBe('Ersttermin');
  });

  it('rejects notes for measures outside the case', () => {
    const service = new CaseMeasureService(new MemoryDb() as any);
    expect(() => service.createNote({ caseId: 'case-2', measureType: 'participation', measureId: 'measure-1', title: 'Falscher Fall', content: 'Darf nicht gespeichert werden.' })).toThrow(/gehört nicht/);
  });
});
