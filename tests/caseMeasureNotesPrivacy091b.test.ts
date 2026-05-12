import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RetentionService } from '../services/retentionService';
import { MeasureNoteFields } from '../src/app/features/cases/measures/MeasureNotesPanel';

class RetentionMemoryDb {
  rows: Record<string, any[]> = {
    cases: [{ id: 'case-1', case_number: 'SBV-2026-001', display_name: 'Max Muster', summary: 'personenbezogen' }],
    case_notes: [{ id: 'note-1', case_id: 'case-1', participants: 'Max, HR', content: 'Diagnosebezug', next_steps: 'Attest nachreichen', contains_health_data: 1 }],
    case_measure_notes: [{ id: 'measure-note-1', case_id: 'case-1', measure_type: 'participation', measure_id: 'measure-1', title: 'BEM-Termin Max', note_at: '2026-05-12T10:30:00.000Z', participants: 'Max, SBV', content: 'Arbeitsplatzbezogene Einschränkung besprochen.', next_steps: 'HR fragt Hilfsmittel an', contains_health_data: 1, confidential_level: 'sensibel' }],
    case_documents: [{ id: 'doc-1', case_id: 'case-1', extracted_text: 'personenbezogener Volltext', display_title: 'Attest Max' }],
    retention_actions: [] as any[],
  };

  prepare(sql: string) {
    const self = this;
    return {
      get(...params: any[]) {
        if (sql.includes('sqlite_master')) {
          const table = String(params[0] ?? '');
          return table in self.rows ? { name: table } : undefined;
        }
        if (sql.includes('SELECT id, case_number FROM cases WHERE id = ?')) {
          return self.rows.cases.find((row) => row.id === params[0]);
        }
        return undefined;
      },
      all(...params: any[]) {
        if (sql.includes('SELECT id, storage_path FROM case_documents WHERE case_id = ?')) {
          return self.rows.case_documents.filter((row) => row.case_id === params[0]).map((row) => ({ id: row.id, storage_path: undefined }));
        }
        if (sql.includes('SELECT id FROM case_notes WHERE case_id = ?')) {
          return self.rows.case_notes.filter((row) => row.case_id === params[0]).map((row) => ({ id: row.id }));
        }
        return [];
      },
      run(...params: any[]) {
        if (sql.includes('UPDATE cases SET display_name')) {
          const row = self.rows.cases.find((entry) => entry.id === params[2]);
          if (!row) return { changes: 0 };
          row.display_name = '[Fall anonymisiert]';
          row.summary = params[0];
          return { changes: 1 };
        }
        if (sql.includes('UPDATE case_notes SET participants')) {
          let changes = 0;
          for (const row of self.rows.case_notes.filter((entry) => entry.case_id === params[2])) {
            row.participants = '[anonymisiert]';
            row.content = params[0];
            row.next_steps = null;
            row.contains_health_data = 0;
            changes += 1;
          }
          return { changes };
        }
        if (sql.includes('UPDATE case_measure_notes SET title')) {
          let changes = 0;
          for (const row of self.rows.case_measure_notes.filter((entry) => entry.case_id === params[2])) {
            row.title = '[Maßnahmennotiz anonymisiert]';
            row.participants = '[anonymisiert]';
            row.content = params[0];
            row.next_steps = null;
            row.contains_health_data = 0;
            row.confidential_level = 'normal';
            changes += 1;
          }
          return { changes };
        }
        if (sql.includes('UPDATE case_documents SET extracted_text')) {
          let changes = 0;
          for (const row of self.rows.case_documents.filter((entry) => entry.case_id === params[0])) {
            row.extracted_text = null;
            row.display_title = '[Dokument anonymisiert]';
            changes += 1;
          }
          return { changes };
        }
        if (sql.includes('INSERT INTO retention_actions')) {
          self.rows.retention_actions.push({ action_type: params[1], entity_id: params[3] });
          return { changes: 1 };
        }
        return { changes: 0 };
      },
    };
  }

  exec() {}
  pragma() { return []; }
  close() {}
}

describe('case measure note privacy behavior', () => {
  it('anonymizes measure notes together with the case retention action', () => {
    const db = new RetentionMemoryDb();
    const service = new RetentionService(() => db as any, () => '/tmp/gremia-sbv-retention-test');

    const result = service.anonymizeCase('case-1', 'Regelfrist erreicht', 'FALL ANONYMISIEREN');

    expect(result.ok).toBe(true);
    expect(db.rows.case_measure_notes[0]).toMatchObject({
      title: '[Maßnahmennotiz anonymisiert]',
      participants: '[anonymisiert]',
      next_steps: null,
      contains_health_data: 0,
      confidential_level: 'normal',
    });
    expect(db.rows.case_measure_notes[0].content).toMatch(/^Anonymisiert am /);
  });

  it('keeps inline command support on protocol and next-step note fields', () => {
    const markup = renderToStaticMarkup(
      React.createElement(MeasureNoteFields, {
        fieldPrefix: 'measure-note-test',
        form: { title: 'Terminnotiz', noteAt: '2026-05-12T10:30', participants: '', content: '', nextSteps: '' },
        onChange: () => undefined,
      }),
    );

    expect(markup.match(/data-text-command-enabled="true"/g)).toHaveLength(2);
    expect(markup).toContain('data-text-command-field="measure-note-test-content"');
    expect(markup).toContain('data-text-command-field="measure-note-test-next"');
  });
});
