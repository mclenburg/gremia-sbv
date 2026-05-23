import { describe, expect, it } from 'vitest';
import { DsarPrefillService } from '../services/dsarPrefillService';
import type { DatabaseAdapter } from '../services/databaseService';
import { defaultDsarInput } from '../services/complianceCenterService';

const tables = new Set([
  'protected_persons',
  'persons',
  'cases',
  'case_notes',
  'deadlines',
  'case_measures',
  'person_import_run_items',
  'person_import_runs',
  'personal_data_audit_log',
]);

class FakeStatement {
  constructor(private readonly sql: string) {}

  get(...params: unknown[]) {
    if (this.sql.includes('sqlite_master')) {
      const table = String(params[0] ?? '');
      return tables.has(table) ? { name: table } : undefined;
    }
    return undefined;
  }

  all() {
    if (this.sql.includes('FROM protected_persons')) return [{ id: 'person-1', record_kind: 'identified_person', first_name: 'Max', last_name: 'Muster', organizational_unit: 'IT', protection_status: 'severely_disabled', employment_state: 'active_employee', lifecycle_state: 'active', created_at: '2026-05-01', notes: 'Kollege Max Muster ist direkt verknüpft.' }];
    if (this.sql.includes('FROM persons')) return [{ id: 'legacy-person-1', first_name: 'Max', last_name: 'Muster', display_name: 'Max Muster', department: 'IT', email: 'max.muster@example.invalid', sb_status: 'schwerbehindert', updated_at: '2026-05-01' }];
    if (this.sql.includes('FROM cases')) return [{ id: 'case-1', case_number: 'SBV-2026-001', display_name: 'Arbeitsplatzgestaltung', category: 'arbeitsplatzgestaltung', status: 'offen', priority: 'normal', opened_at: '2026-05-02', privacy_review_required: 0, summary: 'Max benötigt eine Anpassung.' }];
    if (this.sql.includes('FROM case_notes')) return [{ id: 'note-1', __case_id: 'case-1', __case_number: 'SBV-2026-001', __title: 'Gesprächsnotiz', __occurred_at: '2026-05-06', title: 'Gesprächsnotiz', participants: 'Max', content: 'Max beschreibt Barrieren am Arbeitsplatz.', next_steps: 'Muster prüft Unterlagen.' }];
    if (this.sql.includes('FROM case_measures')) return [{ id: 'measure-1', case_id: 'case-1', type: 'workplace_accommodation', title: 'Hilfsmittel prüfen', status: 'open', risk_level: 'normal', opened_at: '2026-05-03', requires_follow_up: 1, summary: 'Anpassung für Max', next_step: 'Rücksprache' }];
    if (this.sql.includes('FROM deadlines')) return [{ id: 'deadline-1', title: 'Nachfassen', process_type: 'case', deadline_type: 'follow_up', status: 'open', severity: 'important', due_at: '2026-05-30', case_id: 'case-1' }];
    if (this.sql.includes('FROM person_import_run_items')) return [{ id: 'import-1', source_file_name: 'arbeitgeberliste.csv', imported_at: '2026-05-04', action: 'updated', changed_fields_json: '["protectionStatus"]' }];
    if (this.sql.includes('FROM personal_data_audit_log')) return [{ id: 'audit-1', occurred_at: '2026-05-05', action: 'update', subject_type: 'protected_person', subject_id: 'person-1', purpose: 'Personenverzeichnis geändert' }];
    return [];
  }

  run() { return undefined; }
}

class FakeDb implements DatabaseAdapter {
  prepare<T = unknown>(sql: string): { all(...params: unknown[]): T[]; get(...params: unknown[]): T | undefined; run(...params: unknown[]): unknown } {
    return new FakeStatement(sql) as unknown as { all(...params: unknown[]): T[]; get(...params: unknown[]): T | undefined; run(...params: unknown[]): unknown };
  }
  exec() { return undefined; }
  pragma() { return undefined; }
  close() { return undefined; }
}

describe('DsarPrefillService 0.9.2', () => {
  it('sammelt strukturierte Auskunftsdaten aus Personen, Fallakten, Fristen, Maßnahmen, Importen, Lifecycle und Freitexten', () => {
    const result = new DsarPrefillService(new FakeDb()).buildPrefill({
      ...defaultDsarInput(),
      requesterName: 'Max Muster',
      caseReference: 'SBV-2026-001',
    });

    expect(result.persons.length).toBeGreaterThanOrEqual(1);
    expect(result.cases).toHaveLength(1);
    expect(result.deadlines).toHaveLength(1);
    expect(result.measures).toHaveLength(1);
    expect(result.importRuns).toHaveLength(1);
    expect(result.lifecycleEvents).toHaveLength(1);
    expect(result.freeTextMatches.some((match) => match.sourceType === 'case_note')).toBe(true);
  });

  it('sucht Namen auch als nur Vorname und nur Nachname in Freitexten', () => {
    const result = new DsarPrefillService(new FakeDb()).buildPrefill({
      ...defaultDsarInput(),
      requesterName: 'Max Muster',
    });

    const terms = result.freeTextMatches.flatMap((match) => match.matchedTerms);
    expect(terms).toContain('Max');
    expect(terms).toContain('Muster');
    expect(result.matchReason).toContain('Vorname-/Nachname-Einzelsuche');
  });

  it('erzeugt ohne Suchangaben keine zufällige Vollauskunft', () => {
    const result = new DsarPrefillService(new FakeDb()).buildPrefill(defaultDsarInput());

    expect(result.persons).toEqual([]);
    expect(result.cases).toEqual([]);
    expect(result.freeTextMatches).toEqual([]);
    expect(result.matchReason).toContain('Keine Suchangaben vorhanden');
  });
});
