import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService';
import { ParticipationService } from '../../../services/participationService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('SBV-Beteiligung nach Aussetzungsverlangen', () => {
  it('speichert Status und siebentägige Wiedervorlage im selben Fall', async () => {
    const db = await openTestDatabase();
    try {
      new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
      const now = '2026-10-04T09:00:00.000Z';
      db.prepare(`INSERT INTO cases (
        id, case_number, display_name, category, status, priority, opened_at,
        is_pseudonymized, is_locked, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run('case-suspension', 'SBV-SUSP-001', 'Beteiligungstest', 'sonstiges', 'offen', 'normal', now, 1, 0, now, now);

      const service = new ParticipationService(db);
      const created = service.create({ caseId: 'case-suspension', title: 'Arbeitsplatzwechsel', createDefaultDeadlines: false });
      const updated = service.update(created.id, { suspensionRequestedAt: now });

      expect(updated.status).toBe('aussetzung_verlangt');
      expect(updated.suspensionDueAt).toBe('2026-10-11T09:00:00.000Z');
      expect(db.prepare<{ case_id: string; due_at: string; source_event: string }>(
        'SELECT case_id, due_at, source_event FROM deadlines WHERE process_id = ?',
      ).get(created.id)).toEqual({
        case_id: 'case-suspension',
        due_at: '2026-10-11T09:00:00.000Z',
        source_event: 'case_measure_participation_suspension_requested',
      });
    } finally {
      db.close();
    }
  });
});
