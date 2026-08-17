import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { MigrationService } from '../../../services/migrationService';
import { CaseService } from '../../../services/caseService';
import type { CaseNoteInlineActionInput } from '../../../src/domain/models/case-note.model';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let db: DatabaseAdapter;
let legalNormId: string;

beforeEach(async () => {
  db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
  const now = new Date('2026-08-14T12:00:00.000Z').toISOString();
  db.prepare(`INSERT INTO cases (
    id, case_number, display_name, category, status, priority, opened_at,
    is_pseudonymized, is_locked, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run('case-inline', 'SBV-INLINE-001', 'Inline-Testfall', 'sonstiges', 'offen', 'normal', now, 1, 0, now, now);
  const existingNorm = db.prepare<{ id: string }>(
    'SELECT id FROM legal_norms WHERE source = ? AND paragraph = ?',
  ).get('SGB IX', '§ 178 Abs. 2 SGB IX');
  if (existingNorm?.id) {
    legalNormId = existingNorm.id;
  } else {
    legalNormId = 'norm-inline';
    db.prepare(`INSERT INTO legal_norms (id, source, paragraph, title, short_text, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '[]', ?, ?)`)
      .run(legalNormId, 'SGB IX', '§ 178 Abs. 2 SGB IX', 'SBV-Beteiligung', 'Unterrichtung und Anhörung', now, now);
  }
});

afterEach(() => db.close());

function scalar(table: string): number {
  return db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count ?? -1;
}

function allActionKinds(): CaseNoteInlineActionInput[] {
  return [
    { kind: 'contact', input: { firstName: 'Ina', lastName: 'Kontakt', category: 'sonstiges' } },
    { kind: 'legal_norm_case_link', input: { caseId: 'case-inline', legalNormId, note: 'Aus Inline-Befehl' }, displayLabel: '§ 178 Abs. 2 SGB IX · SBV-Beteiligung' },
    { kind: 'deadline', input: {
      caseId: 'case-inline', processType: 'case', deadlineType: 'follow_up', title: 'Inline-Frist',
      dueAt: '2026-08-20T10:30:00.000Z', calculationMode: 'manual', isLegalDeadline: false, isUserEditable: true,
    }, linkLabel: 'Frist bis 20.08.2026: Inline-Frist', accessibleLabel: 'Frist öffnen: Inline-Frist' },
    { kind: 'bem', input: { caseId: 'case-inline', title: 'Inline-BEM', createDefaultDeadlines: false },
      linkLabel: 'BEM-Vorgang: Inline-BEM', accessibleLabel: 'BEM-Vorgang öffnen: Inline-BEM' },
    { kind: 'prevention', input: { caseId: 'case-inline', hazardDescription: 'Inline-Prävention', createDefaultDeadlines: false },
      linkLabel: 'Präventionsverfahren: Inline-Prävention', accessibleLabel: 'Präventionsverfahren öffnen: Inline-Prävention' },
    { kind: 'participation', input: { caseId: 'case-inline', title: 'Inline-Beteiligung', createDefaultDeadlines: false },
      linkLabel: 'SBV-Beteiligung: Inline-Beteiligung', accessibleLabel: 'SBV-Beteiligung öffnen: Inline-Beteiligung' },
    { kind: 'equalization', input: { caseId: 'case-inline', applicationStatus: 'beratung', createDefaultDeadline: false },
      linkLabel: 'Gleichstellung/GdB: Inline-Gleichstellung', accessibleLabel: 'Gleichstellung/GdB öffnen: Inline-Gleichstellung' },
    { kind: 'workplace_accommodation', input: { caseId: 'case-inline', title: 'Inline-Arbeitsplatz', createDefaultDeadlines: false },
      linkLabel: 'Arbeitsplatzgestaltung: Inline-Arbeitsplatz', accessibleLabel: 'Arbeitsplatzanpassung öffnen: Inline-Arbeitsplatz' },
    { kind: 'termination_hearing', input: { caseId: 'case-inline', employerReason: 'Inline-Kündigung' },
      linkLabel: 'Kündigungsanhörung: Inline-Kündigung', accessibleLabel: 'Kündigungsanhörung öffnen: Inline-Kündigung' },
  ];
}

describe('Fallnotiz-Inline-Aktionen – gemeinsame Persistenzgrenze', () => {
  it('materialisiert alle strukturierenden Inline-Aktionen erst beim Speichern der Notiz', async () => {
    const service = new CaseService(() => db);

    expect(scalar('deadlines')).toBe(0);
    expect(scalar('case_legal_references')).toBe(0);
    expect(scalar('contacts')).toBe(0);
    expect(scalar('bem_processes')).toBe(0);
    expect(scalar('prevention_processes')).toBe(0);
    expect(scalar('equalization_processes')).toBe(0);
    expect(scalar('termination_hearings')).toBe(0);
    expect(scalar('case_measure_participation')).toBe(0);
    expect(scalar('case_measure_workplace_accommodation')).toBe(0);

    const note = await service.createNote({
      caseId: 'case-inline',
      title: 'Gespräch mit Inline-Aktionen',
      noteType: 'gespraech',
      content: 'Alle strukturierten Aktionen wurden im Gespräch vorgemerkt.',
      containsHealthData: false,
      confidentialLevel: 'normal',
      inlineActions: allActionKinds(),
    });

    expect(note.id).toBeTruthy();
    expect(scalar('contacts')).toBe(1);
    expect(scalar('deadlines')).toBe(1);
    expect(scalar('case_legal_references')).toBe(1);
    expect(scalar('bem_processes')).toBe(1);
    expect(scalar('prevention_processes')).toBe(1);
    expect(scalar('equalization_processes')).toBe(1);
    expect(scalar('termination_hearings')).toBe(1);
    expect(scalar('case_measure_participation')).toBe(1);
    expect(scalar('case_measure_workplace_accommodation')).toBe(1);
    expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM case_note_links WHERE case_note_id = ?').get(note.id)?.count).toBe(7);
  });

  it('rollt Notiz und bereits materialisierte Inline-Aktionen vollständig zurück, wenn eine spätere Aktion scheitert', async () => {
    const service = new CaseService(() => db);
    const actions: CaseNoteInlineActionInput[] = [
      { kind: 'contact', input: { firstName: 'Rollback', lastName: 'Kontakt', category: 'sonstiges' } },
      { kind: 'deadline', input: {
        caseId: 'case-inline', processType: 'case', deadlineType: 'follow_up', title: 'Rollback-Frist',
        dueAt: '2026-08-21T09:00:00.000Z', calculationMode: 'manual', isLegalDeadline: false, isUserEditable: true,
      } },
      { kind: 'bem', input: { caseId: 'anderer-fall', title: 'Darf nicht gespeichert werden', createDefaultDeadlines: false },
        linkLabel: 'BEM-Vorgang', accessibleLabel: 'BEM-Vorgang öffnen' },
    ];

    await expect(service.createNote({
      caseId: 'case-inline', title: 'Rollback-Notiz', noteType: 'gespraech', content: 'Darf nicht bestehen bleiben.',
      containsHealthData: false, confidentialLevel: 'normal', inlineActions: actions,
    })).rejects.toThrow(/gehört nicht zur aktuell gespeicherten Fallakte/);

    expect(scalar('case_notes')).toBe(0);
    expect(scalar('contacts')).toBe(0);
    expect(scalar('deadlines')).toBe(0);
    expect(scalar('case_legal_references')).toBe(0);
    expect(scalar('bem_processes')).toBe(0);
    expect(scalar('case_note_links')).toBe(0);
  });
});
