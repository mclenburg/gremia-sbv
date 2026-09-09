import { describe, expect, it } from 'vitest';
import { DsarPrefillService } from '../../services/dsarPrefillService';
import type { DatabaseAdapter } from '../../services/databaseService';
import { defaultDsarInput } from '../../services/complianceCenterService';

const tables = new Set([
  'protected_persons',
  'persons',
  'cases',
  'case_notes',
  'deadlines',
  'case_measures',
  'sbv_participation_violations',
  'generated_documents',
  'activity_journal_entries',
  'privacy_review_items',
  'person_import_run_items',
  'person_import_runs',
  'personal_data_audit_log',
]);

class FakeStatement {
  constructor(protected readonly sql: string) {}

  protected applySqlLimit<T>(rows: T[]): T[] {
    const limit = this.sql.match(/\bLIMIT\s+(\d+)\b/i)?.[1];
    return limit ? rows.slice(0, Number(limit)) : rows;
  }

  get(...params: unknown[]) {
    if (this.sql.includes('sqlite_master')) {
      const table = String(params[0] ?? '');
      return tables.has(table) ? { name: table } : undefined;
    }
    return undefined;
  }

  all() {
    if (this.sql.includes('FROM protected_persons')) return this.applySqlLimit([{ id: 'person-1', record_kind: 'identified_person', first_name: 'Max', last_name: 'Muster', organizational_unit: 'IT', protection_status: 'severely_disabled', employment_state: 'active_employee', lifecycle_state: 'active', created_at: '2026-05-01', notes: 'Kollege Max Muster ist direkt verknüpft.' }]);
    if (this.sql.includes('FROM persons')) return this.applySqlLimit([{ id: 'legacy-person-1', first_name: 'Max', last_name: 'Muster', display_name: 'Max Muster', department: 'IT', email: 'max.muster@example.invalid', sb_status: 'schwerbehindert', updated_at: '2026-05-01' }]);
    if (this.sql.includes('FROM cases')) return this.applySqlLimit([{ id: 'case-1', case_number: 'SBV-2026-001', display_name: 'Arbeitsplatzgestaltung', category: 'arbeitsplatzgestaltung', status: 'offen', priority: 'normal', opened_at: '2026-05-02', privacy_review_required: 0, summary: 'Max benötigt eine Anpassung.' }]);
    if (this.sql.includes('FROM case_notes')) return this.applySqlLimit([{ id: 'note-1', __case_id: 'case-1', __case_number: 'SBV-2026-001', __title: 'Gesprächsnotiz', __occurred_at: '2026-05-06', title: 'Gesprächsnotiz', participants: 'Max', content: 'Max beschreibt Barrieren am Arbeitsplatz.', next_steps: 'Muster prüft Unterlagen.' }]);
    if (this.sql.includes('FROM case_measures')) return this.applySqlLimit([{ id: 'measure-1', case_id: 'case-1', type: 'workplace_accommodation', title: 'Hilfsmittel prüfen', status: 'open', risk_level: 'normal', opened_at: '2026-05-03', requires_follow_up: 1, summary: 'Anpassung für Max', next_step: 'Rücksprache' }]);
    if (this.sql.includes('FROM sbv_participation_violations')) return this.applySqlLimit([{ id: 'vio-1', __case_id: 'case-1', __case_number: 'SBV-2026-001', __title: 'Beteiligung übergangen', __occurred_at: '2026-05-07', subject: 'Arbeitgeberverstoß zu Max Muster', measure_description: 'Maßnahme', wrong_behavior: 'Anhörung unterblieb', required_behavior: 'SBV vorher beteiligen', consequence_warning: '', legal_basis: '§ 178 Abs. 2 SGB IX' }]);
    if (this.sql.includes('FROM generated_documents')) return this.applySqlLimit([{ id: 'doc-1', __case_id: 'case-1', __case_number: 'SBV-2026-001', __title: 'Schreiben an Arbeitgeber', __occurred_at: '2026-05-08', title: 'Schreiben an Max Muster', filename: 'schreiben.pdf', document_kind: 'generic', template_version: 'v1' }]);
    if (this.sql.includes('FROM activity_journal_entries')) return this.applySqlLimit([{ id: 'journal-1', __case_id: 'case-1', __case_number: 'SBV-2026-001', __title: 'Beratung Max', __occurred_at: '2026-05-09', title: 'Beratung Max Muster', description: 'Rücksprache geführt', result_note: 'Nächster Termin', category: 'consultation', status: 'final' }]);
    if (this.sql.includes('FROM privacy_review_items')) return this.applySqlLimit([{ id: 'review-1', __case_id: 'case-1', __case_number: 'SBV-2026-001', __title: 'Fall prüfen', __occurred_at: '2026-06-01', reason: 'Löschfrist prüfen Max Muster', priority: 'normal', context_json: '{}', status: 'open' }]);
    if (this.sql.includes('FROM deadlines')) return this.applySqlLimit([{ id: 'deadline-1', title: 'Nachfassen', process_type: 'case', deadline_type: 'follow_up', status: 'open', severity: 'important', due_at: '2026-05-30', case_id: 'case-1' }]);
    if (this.sql.includes('FROM person_import_run_items')) return this.applySqlLimit([{ id: 'import-1', source_file_name: 'arbeitgeberliste.csv', imported_at: '2026-05-04', action: 'updated', changed_fields_json: '["protectionStatus"]' }]);
    if (this.sql.includes('FROM personal_data_audit_log')) return this.applySqlLimit([{ id: 'audit-1', occurred_at: '2026-05-05', action: 'update', subject_type: 'protected_person', subject_id: 'person-1', purpose: 'Personenverzeichnis geändert' }]);
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

function manyRows<T>(count: number, build: (index: number) => T): T[] {
  return Array.from({ length: count }, (_, index) => build(index + 1));
}

class LargeDsarStatement extends FakeStatement {
  all() {
    if (this.sql.includes('FROM protected_persons')) return this.applySqlLimit([{ id: 'person-1', record_kind: 'identified_person', first_name: 'Max', last_name: 'Muster', organizational_unit: 'IT', protection_status: 'severely_disabled', employment_state: 'active_employee', lifecycle_state: 'active', created_at: '2026-05-01', notes: 'Max Muster' }]);
    if (this.sql.includes('FROM persons')) return [];
    if (this.sql.includes('FROM cases')) {
      return this.applySqlLimit(manyRows(125, (index) => ({ id: `case-${index}`, case_number: `SBV-2026-${String(index).padStart(3, '0')}`, display_name: `Fall ${index}`, category: 'beratung', status: 'offen', priority: 'normal', opened_at: `2026-05-${String(index % 28 + 1).padStart(2, '0')}`, privacy_review_required: 0, summary: `Fallakte zu Max Muster Nummer ${index}`, __case_id: `case-${index}`, __case_number: `SBV-2026-${String(index).padStart(3, '0')}`, __title: `Fall ${index}`, __occurred_at: `2026-05-${String(index % 28 + 1).padStart(2, '0')}` })));
    }
    if (this.sql.includes('FROM case_notes')) {
      return this.applySqlLimit(manyRows(145, (index) => ({ id: `note-${index}`, case_id: `case-${index % 125 + 1}`, __case_id: `case-${index % 125 + 1}`, __case_number: `SBV-2026-${String(index % 125 + 1).padStart(3, '0')}`, __title: `Gesprächsnotiz ${index}`, __occurred_at: `2026-06-${String(index % 28 + 1).padStart(2, '0')}`, title: `Gesprächsnotiz ${index}`, participants: 'Max Muster', content: `Besprechung mit Max Muster zu Vorgang ${index}`, next_steps: 'Nachverfolgung' })));
    }
    if (this.sql.includes('FROM case_measures')) {
      return this.applySqlLimit(manyRows(130, (index) => ({ id: `measure-${index}`, case_id: `case-${index % 125 + 1}`, type: 'participation', title: `Maßnahme ${index}`, status: 'open', risk_level: 'normal', opened_at: '2026-05-03', requires_follow_up: 1, summary: `Maßnahme für Max Muster ${index}`, next_step: 'Rücksprache', __case_id: `case-${index % 125 + 1}`, __case_number: `SBV-2026-${String(index % 125 + 1).padStart(3, '0')}`, __title: `Maßnahme ${index}`, __occurred_at: '2026-05-03' })));
    }
    if (this.sql.includes('FROM deadlines')) {
      return this.applySqlLimit(manyRows(130, (index) => ({ id: `deadline-${index}`, title: `Frist ${index}`, process_type: 'case', deadline_type: 'follow_up', status: 'open', severity: 'important', due_at: `2026-07-${String(index % 28 + 1).padStart(2, '0')}`, case_id: `case-${index % 125 + 1}` })));
    }
    if (this.sql.includes('FROM person_import_run_items')) {
      return this.applySqlLimit(manyRows(90, (index) => ({ id: `import-${index}`, source_file_name: `arbeitgeberliste-${index}.csv`, imported_at: '2026-05-04', action: 'updated', changed_fields_json: '["protectionStatus"]' })));
    }
    if (this.sql.includes('FROM personal_data_audit_log')) {
      return this.applySqlLimit(manyRows(130, (index) => ({ id: `audit-${index}`, occurred_at: '2026-05-05', action: 'update', subject_type: 'protected_person', subject_id: 'person-1', case_id: `case-${index % 125 + 1}`, purpose: `Personenverzeichnis geändert ${index}` })));
    }
    return [];
  }
}

class LargeDsarDb extends FakeDb {
  prepare<T = unknown>(sql: string): { all(...params: unknown[]): T[]; get(...params: unknown[]): T | undefined; run(...params: unknown[]): unknown } {
    return new LargeDsarStatement(sql) as unknown as { all(...params: unknown[]): T[]; get(...params: unknown[]): T | undefined; run(...params: unknown[]): unknown };
  }
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
    expect(result.sourceInventory.find((source) => source.id === 'participation_violations')?.foundCount).toBeGreaterThanOrEqual(1);
    expect(result.sourceInventory.find((source) => source.id === 'generated_documents')?.releaseMode).toBe('metadata_only');
    expect(result.reviewItems.some((item) => item.sourceId === 'privacy_reviews')).toBe(true);
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

  it('liefert Art.-15-Auskunftsdaten vollständig ohne stille Obergrenzen', () => {
    const result = new DsarPrefillService(new LargeDsarDb()).buildPrefill({
      ...defaultDsarInput(),
      requesterName: 'Max Muster',
      caseReference: 'SBV-2026',
    });

    expect(result.cases).toHaveLength(125);
    expect(result.measures).toHaveLength(130);
    expect(result.deadlines).toHaveLength(130);
    expect(result.importRuns).toHaveLength(90);
    expect(result.lifecycleEvents).toHaveLength(130);
    expect(result.freeTextMatches.filter((match) => match.sourceType === 'case_note')).toHaveLength(145);
    expect(result.freeTextMatches.length).toBeGreaterThan(160);
    expect(result.reviewItems).toHaveLength(result.freeTextMatches.length);
  });
});
