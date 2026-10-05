import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { ActivityJournalService } from '../../../services/activityJournalService';
import { ActivityJournalPreferenceService } from '../../../services/activityJournalPreferenceService';
import type { ActivityJournalCategory, ActivityJournalLinkTarget } from '../../../src/domain/models/activity-journal.model';
import { openTestDatabase } from '../../helpers/openTestDatabase';

const timestamp = '2026-07-01T08:00:00.000Z';

for (const mode of ['fresh', 'migration'] as const) {
  describe(`Tätigkeitsjournal mit realer Persistenz: ${mode}`, () => {
    let db: DatabaseAdapter;
    let journal: ActivityJournalService;
    let preferences: ActivityJournalPreferenceService;

    beforeEach(async () => {
      db = await openTestDatabase();
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      if (mode === 'migration') {
        db.exec(`
          DROP TABLE activity_journal_links;
          DROP TABLE activity_journal_category_preferences;
          DROP TABLE activity_journal_entries;
        `);
        db.exec(readFileSync('database/migrations/0041_activity_journal.sql', 'utf8'));
      }
      journal = new ActivityJournalService(db);
      preferences = new ActivityJournalPreferenceService(db);
      db.prepare(`INSERT INTO cases
        (id, case_number, display_name, category, opened_at, created_at, updated_at)
        VALUES ('case-1', 'TEST-001', 'Anonyme Anfrage', 'beratung', ?, ?, ?)`)
        .run(timestamp, timestamp, timestamp);
    });

    afterEach(() => db.close());

    it('liest Eintrag, Arbeitszeit und Fallbezug unverändert zurück und merkt die Kategorie', () => {
      const entry = journal.createEntry({
        entryDate: '2026-07-01', title: 'Unterrichtung geprüft', description: 'Vollständigkeit der Unterlagen geprüft.',
        category: 'documentation', timeMode: 'duration', durationMinutes: 35,
        confidentialityLevel: 'confidential', links: [{ targetType: 'case', targetId: 'case-1' }],
      });
      expect(journal.getEntry(entry.id)).toMatchObject({
        entryDate: '2026-07-01', title: 'Unterrichtung geprüft', description: 'Vollständigkeit der Unterlagen geprüft.',
        category: 'documentation', timeMode: 'duration', durationMinutes: 35, confidentialityLevel: 'confidential',
        links: [expect.objectContaining({ targetType: 'case', targetId: 'case-1' })],
      });
      expect(preferences.getPreferredCategory('case')).toBe('documentation');
    });

    it('entfernt Eintrag und Bezüge vollständig und erhält die verknüpfte Fallakte', () => {
      const entry = journal.createEntry({
        entryDate: '2026-07-01', title: 'Unterrichtung geprüft',
        links: [{ targetType: 'case', targetId: 'case-1' }],
      });
      expect(journal.deleteEntry(entry.id)).toEqual({ deleted: true });
      expect(journal.getEntry(entry.id)).toBeUndefined();
      expect(journal.listLinks(entry.id)).toEqual([]);
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM activity_journal_entries').get()).toEqual({ count: 0 });
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM cases').get()).toEqual({ count: 1 });
      expect(journal.deleteEntry(entry.id)).toEqual({ deleted: false });
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    });

    it('weist einen externen Gremia.BR-Bezug zurück und rollt die gesamte Anlage zurück', () => {
      const invalidLink = { targetType: 'gremia_br_reference', targetId: 'external-1' } as unknown as ActivityJournalLinkTarget;
      expect(() => journal.createEntry({
        entryDate: '2026-07-01', title: 'Externer Kontext', links: [invalidLink],
      })).toThrow();
      for (const table of ['activity_journal_entries', 'activity_journal_links', 'activity_journal_category_preferences', 'personal_data_audit_log']) {
        expect(db.prepare<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 0 });
      }
    });

    it('weist externe Linkziele auch an der Datenbankgrenze zurück', () => {
      const entry = journal.createEntry({ entryDate: '2026-07-01', title: 'Unterrichtung geprüft' });
      expect(() => db.prepare(`INSERT INTO activity_journal_links
        (id, entry_id, target_type, target_id, created_at) VALUES ('invalid-link', ?, 'gremia_br_reference', 'external-1', ?)`)
        .run(entry.id, timestamp)).toThrow();
      expect(journal.listLinks(entry.id)).toEqual([]);
      expect(journal.getEntry(entry.id)?.title).toBe('Unterrichtung geprüft');
    });

    it('speichert SBV-Selbstorganisation nur mit konkreter Tätigkeitsbeschreibung', () => {
      expect(() => journal.createEntry({
        entryDate: '2026-07-01', title: 'Organisation', category: 'sbv_self_organization',
      })).toThrow();
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM activity_journal_entries').get()).toEqual({ count: 0 });
      const entry = journal.createEntry({
        entryDate: '2026-07-01', title: 'Organisation', category: 'sbv_self_organization',
        description: 'Fristenübersicht geprüft und Ablagestruktur angepasst.',
      });
      expect(journal.getEntry(entry.id)).toMatchObject({
        category: 'sbv_self_organization', description: 'Fristenübersicht geprüft und Ablagestruktur angepasst.',
      });
    });

    it.each(['other', 'office_admin'])('weist die unspezifische Kategorie %s in Präferenzen und Einträgen zurück', (invalid) => {
      expect(() => preferences.rememberCategory('journal', invalid as ActivityJournalCategory)).toThrow();
      expect(preferences.getPreferredCategory('journal')).toBeUndefined();
      const entry = journal.createEntry({ entryDate: '2026-07-01', title: 'Unterrichtung geprüft', category: 'documentation' });
      expect(() => db.prepare('UPDATE activity_journal_entries SET category = ? WHERE id = ?').run(invalid, entry.id)).toThrow();
      expect(journal.getEntry(entry.id)?.category).toBe('documentation');
    });

    it('ersetzt eine Kategoriepräferenz für denselben Kontext ohne doppelte Datensätze', () => {
      preferences.rememberCategory('journal', 'documentation');
      preferences.rememberCategory('journal', 'qualification');
      expect(preferences.getPreferredCategory('journal')).toBe('qualification');
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM activity_journal_category_preferences').get()).toEqual({ count: 1 });
    });
  });
}
