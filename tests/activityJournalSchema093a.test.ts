import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS,
  ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS,
  ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS,
  APP_SCHEMA_VERSION,
} from '../services/appSchema';
import { createSqlSchemaSnapshot } from '../services/schemaSnapshotPolicy';
import { ACTIVITY_JOURNAL_CATEGORIES, ACTIVITY_JOURNAL_TARGET_TYPES } from '../src/app/core/models/activity-journal.model';

describe('activity journal schema 0.9.3-a', () => {
  it('setzt Schema 0041 mit Journal-Kernstrukturen', () => {
    const schema = createSqlSchemaSnapshot(readFileSync('database/schema.sql', 'utf8'));

    expect(APP_SCHEMA_VERSION).toBe('0044');
    expect(schema.tables.activity_journal_entries.columns).toEqual(expect.arrayContaining([...ACTIVITY_JOURNAL_ENTRIES_REQUIRED_COLUMNS]));
    expect(schema.tables.activity_journal_links.columns).toEqual(expect.arrayContaining([...ACTIVITY_JOURNAL_LINKS_REQUIRED_COLUMNS]));
    expect(schema.tables.activity_journal_category_preferences.columns).toEqual(expect.arrayContaining([...ACTIVITY_JOURNAL_CATEGORY_PREFERENCES_REQUIRED_COLUMNS]));
    expect(schema.indexes.idx_activity_journal_entries_follow_up).toBeDefined();
    expect(schema.indexes.idx_activity_journal_links_target).toBeDefined();
  });

  it('bleibt bei Hard-Delete und schließt Gremia.BR-Persistenz als Linkziel aus', () => {
    const migration = readFileSync('database/migrations/0041_activity_journal.sql', 'utf8');

    expect(migration).not.toContain('deleted_at');
    expect(migration).not.toContain('archived');
    expect(([...ACTIVITY_JOURNAL_TARGET_TYPES] as readonly string[]).includes('gremia_br_reference')).toBe(false);
    expect(migration).not.toContain('gremia_br_reference');
  });

  it('führt nur konkret auswertbare Journal-Kategorien ohne Sonstiges-Sammelbecken', () => {
    expect(ACTIVITY_JOURNAL_CATEGORIES).toContain('sbv_self_organization');
    expect(([...ACTIVITY_JOURNAL_CATEGORIES] as readonly string[]).includes('other')).toBe(false);
    expect(([...ACTIVITY_JOURNAL_CATEGORIES] as readonly string[]).includes('office_admin')).toBe(false);
  });
});
