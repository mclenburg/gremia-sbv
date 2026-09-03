import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { CaseMeasureService } from '../../../services/caseMeasureService';
import { PersonalDataAuditLogService } from '../../../services/auditLogService';
import { MeasureLifecycleAuditService } from '../../../services/measureLifecycleAuditService';
import { SearchIndexService } from '../../../services/search/searchIndexService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

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

function rowCount(db: DatabaseAdapter, sql: string, ...params: unknown[]): number {
  return Number(db.prepare<{ count: number }>(sql).get(...params)?.count ?? 0);
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

  it('anonymisiert ein BEM ohne den Prozessdatensatz hart zu löschen', () => {
    const db = new LifecycleDeleteDb('bem');
    const events: string[] = [];
    const result = serviceFor(db, events).deleteProcess({ caseId: 'case-1', processType: 'bem', processId: 'bem-1', reasonCode: 'no_longer_required', action: 'anonymize' });
    const sql = db.statements.map((entry) => entry.sql).join('\n');

    expect(result).toMatchObject({ deleted: false, anonymized: true, deletedNotes: 0, anonymizedNotes: 1, deletedDeadlines: 3, detachedDocuments: 1 });
    expect(sql).toContain('UPDATE bem_processes');
    expect(sql).toContain('UPDATE bem_process_events');
    expect(sql).toContain('DELETE FROM bem_process_contacts');
    expect(sql).toContain('UPDATE case_measure_notes');
    expect(sql).not.toContain('DELETE FROM bem_processes');
    expect(events).toEqual(['audit', 'reindex:case-1']);
  });

  it('anonymisiert ein BEM mit realem Schema ohne Prozess-Hartlöschung', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(fs.readFileSync('database/schema.sql', 'utf8'));
      const now = '2026-08-27T10:00:00.000Z';
      db.prepare(`
        INSERT INTO cases (id, case_number, display_name, category, opened_at, created_at, updated_at, person_binding_state)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('case-1', 'BEM-2026-001', 'BEM mit Personenbezug', 'bem', now, now, now, 'active');
      db.prepare(`
        INSERT INTO contacts (id, first_name, last_name, organization, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('contact-1', 'Anja', 'Mustermann', 'Betriebsarzt', 'arzt', now, now);
      db.prepare(`
        INSERT INTO bem_processes (
          id, case_id, status, title, trigger_type, trigger_description, consent_scope,
          participants, measures, measure_owners, result, completion_reason, confidential_notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'bem-1',
        'case-1',
        'abgeschlossen',
        'BEM Max Mustermann',
        'krankheitstage',
        'Max Mustermann war länger arbeitsunfähig.',
        'Gesundheitsdaten und Arbeitsplatzdaten',
        'Max Mustermann, Betriebsarzt',
        'Stufenweise Wiedereingliederung',
        'Personalabteilung',
        'Erfolgreich beendet',
        'Abschlussgespräch',
        'Diagnosehinweise',
        now,
        now,
      );
      db.prepare('INSERT INTO bem_process_contacts (process_id, contact_id, created_at) VALUES (?, ?, ?)').run('bem-1', 'contact-1', now);
      db.prepare('INSERT INTO bem_process_events (id, process_id, event_type, title, description, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        'event-1',
        'bem-1',
        'meeting',
        'Gespräch mit Max Mustermann',
        'Gesundheitsbezogene Gesprächsnotiz',
        now,
      );
      db.prepare(`
        INSERT INTO case_measures (id, case_id, type, title, status, risk_level, created_from, summary, next_step, opened_at, source_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('measure-1', 'case-1', 'bem', 'BEM-Maßnahme Max Mustermann', 'abgeschlossen', 'normal', 'system', 'Personenbezogene Zusammenfassung', 'Nachhalten', now, 'bem-1', now, now);
      db.prepare(`
        INSERT INTO case_measure_notes (id, case_id, measure_type, measure_id, title, note_at, participants, content, next_steps, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('note-1', 'case-1', 'bem', 'bem-1', 'BEM-Notiz Max Mustermann', now, 'Max Mustermann', 'Diagnose und Maßnahme', 'Nächster Termin', now, now);
      db.prepare(`
        INSERT INTO deadlines (id, case_id, process_id, process_type, deadline_type, title, due_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('deadline-1', 'case-1', 'bem-1', 'bem', 'follow_up', 'BEM-Wiedervorlage Max Mustermann', now, now, now);
      db.prepare(`
        INSERT INTO case_documents (id, case_id, measure_id, filename, storage_path, sha256, imported_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('doc-1', 'case-1', 'measure-1', 'bem.pdf', 'vault://bem.pdf', 'sha256', now, now);
      db.prepare(`
        INSERT INTO activity_journal_entries (
          id, entry_date, time_mode, category, title, confidentiality_level, status, created_from, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('journal-1', '2026-08-27', 'none', 'bem_preparation', 'BEM Max Mustermann', 'highly_confidential', 'final', 'manual', now, now);
      db.prepare('INSERT INTO activity_journal_links (id, entry_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?, ?)').run('journal-link-1', 'journal-1', 'bem_process', 'bem-1', now);
      db.prepare(`
        INSERT INTO case_notes (id, case_id, title, note_date, note_type, participants, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('case-note-1', 'case-1', 'Fallnotiz', '2026-08-27', 'gespraech', 'Max Mustermann', 'BEM-Link', now, now);
      db.prepare(`
        INSERT INTO case_note_links (id, case_note_id, target_type, target_id, case_id, label, accessible_label, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('case-note-link-1', 'case-note-1', 'bem', 'bem-1', 'case-1', 'BEM', 'BEM öffnen', now);

      const service = new CaseMeasureService(
        db,
        new PersonalDataAuditLogService(db),
        new MeasureLifecycleAuditService(db),
        new SearchIndexService(db),
      );
      const result = service.deleteProcess({ caseId: 'case-1', processType: 'bem', processId: 'bem-1', reasonCode: 'no_longer_required', action: 'anonymize' });

      expect(result).toMatchObject({ deleted: false, anonymized: true, deletedNotes: 0, anonymizedNotes: 1, deletedDeadlines: 1, detachedDocuments: 1 });
      expect(rowCount(db, 'SELECT COUNT(*) AS count FROM bem_processes WHERE id = ?', 'bem-1')).toBe(1);
      expect(db.prepare<{ title: string; trigger_description: string | null; participants: string | null; confidential_notes: string | null }>(`
        SELECT title, trigger_description, participants, confidential_notes FROM bem_processes WHERE id = ?
      `).get('bem-1')).toMatchObject({
        title: '[BEM-Verfahren anonymisiert]',
        trigger_description: null,
        participants: null,
        confidential_notes: null,
      });
      expect(rowCount(db, 'SELECT COUNT(*) AS count FROM bem_process_contacts WHERE process_id = ?', 'bem-1')).toBe(0);
      expect(db.prepare<{ title: string; description: string | null }>('SELECT title, description FROM bem_process_events WHERE process_id = ?').get('bem-1')).toMatchObject({
        title: '[BEM-Ereignis anonymisiert]',
        description: null,
      });
      expect(db.prepare<{ title: string; participants: string | null; content: string }>('SELECT title, participants, content FROM case_measure_notes WHERE measure_id = ?').get('bem-1')).toMatchObject({
        title: '[BEM-Maßnahmennotiz anonymisiert]',
        participants: null,
        content: '[BEM-Maßnahmennotiz anonymisiert]',
      });
      expect(rowCount(db, 'SELECT COUNT(*) AS count FROM deadlines WHERE process_id = ? OR measure_id = ?', 'bem-1', 'bem-1')).toBe(0);
      expect(db.prepare<{ measure_id: string | null }>('SELECT measure_id FROM case_documents WHERE id = ?').get('doc-1')?.measure_id).toBeNull();
      expect(rowCount(db, 'SELECT COUNT(*) AS count FROM activity_journal_links WHERE target_type = ? AND target_id = ?', 'bem_process', 'bem-1')).toBe(0);
      expect(rowCount(db, 'SELECT COUNT(*) AS count FROM case_note_links WHERE target_type = ? AND target_id = ?', 'bem', 'bem-1')).toBe(0);
      expect(rowCount(db, 'SELECT COUNT(*) AS count FROM personal_data_audit_log WHERE action = ? AND subject_id = ?', 'update', 'bem-1')).toBeGreaterThanOrEqual(1);
    } finally {
      db.close();
    }
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
