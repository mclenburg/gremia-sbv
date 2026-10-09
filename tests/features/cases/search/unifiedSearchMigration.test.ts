import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getSchemaMigrationHook } from '../../../../services/schemaMigrationHooks.js';
import type { DatabaseAdapter } from '../../../../services/databaseService.js';
import { MigrationService } from '../../../../services/migrationService.js';
import { DatabaseService } from '../../../../services/databaseService.js';
import { UnifiedSearchIndexService } from '../../../../services/search/unifiedSearchIndexService.js';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3-multiple-ciphers') as new (path: string) => DatabaseAdapter;

const migration = readFileSync(new URL('../../../../database/migrations/0067_unified_search_index.sql', import.meta.url), 'utf8');
const snapshot = readFileSync(new URL('../../../../database/schema.sql', import.meta.url), 'utf8');

function clock(db: DatabaseAdapter): number {
  return Number(db.prepare<{ revision: number }>('SELECT revision FROM search_change_clock WHERE id = 1').get()?.revision);
}

describe('unified search migration', () => {
  it('preserves a populated legacy case index and tracks subsequent source changes transactionally', () => {
    const db = new Database(':memory:');
    try {
      db.exec(`PRAGMA foreign_keys = ON;
        CREATE TABLE cases (id TEXT PRIMARY KEY, display_name TEXT);
        CREATE TABLE contacts (id TEXT PRIMARY KEY, first_name TEXT);
        CREATE TABLE case_search_index (id TEXT PRIMARY KEY, content TEXT);
        INSERT INTO cases VALUES ('case-1', 'Altfall');
        INSERT INTO contacts VALUES ('contact-1', 'Alter Name');
        INSERT INTO case_search_index VALUES ('old-hit', 'Bestandstext');`);
      db.exec(migration);
      getSchemaMigrationHook('0067')?.apply(db);
      expect(db.prepare('SELECT content FROM case_search_index WHERE id = ?').get('old-hit')).toEqual({ content: 'Bestandstext' });
      expect(db.prepare<{ name: string; notnull: number }>('PRAGMA table_info(search_entries)').all().find((row) => row.name === 'case_id')).toMatchObject({ notnull: 0 });
      const before = clock(db);
      db.exec('BEGIN');
      db.prepare('UPDATE contacts SET first_name = ? WHERE id = ?').run('Neuer Name', 'contact-1');
      expect(clock(db)).toBe(before + 1);
      db.exec('ROLLBACK');
      expect(clock(db)).toBe(before);
      db.prepare('DELETE FROM contacts WHERE id = ?').run('contact-1');
      expect(clock(db)).toBe(before + 1);
    } finally {
      db.close();
    }
  });

  it('matches the fresh schema and removes FTS text with its entry', () => {
    const db = new Database(':memory:');
    try {
      db.exec(snapshot);
      getSchemaMigrationHook('0067')?.apply(db);
      db.prepare(`INSERT INTO search_entries
        (id, source_type, source_id, module, source_label, title, content, updated_at, navigation_kind, navigation_id, created_at)
        VALUES ('hit-1', 'contact', 'contact-1', 'Kontakte', 'Kontakt', 'Titel', 'Geheimwort', '2026-01-01', 'contact', 'contact-1', '2026-01-01')`).run();
      db.prepare("INSERT INTO search_entries_fts(entry_id, title, content, keywords, source_label) VALUES ('hit-1', 'Titel', 'Geheimwort', '', 'Kontakt')").run();
      expect(db.prepare("SELECT count(*) AS count FROM search_entries_fts WHERE search_entries_fts MATCH 'Geheimwort'").get()).toEqual({ count: 1 });
      db.prepare("DELETE FROM search_entries WHERE id = 'hit-1'").run();
      expect(db.prepare("SELECT count(*) AS count FROM search_entries_fts WHERE search_entries_fts MATCH 'Geheimwort'").get()).toEqual({ count: 0 });
    } finally {
      db.close();
    }
  });

  it('upgrades a populated 0066 vault through MigrationService without losing records', () => {
    const db = new Database(':memory:');
    try {
      db.exec(snapshot);
      db.exec(`DROP TRIGGER search_entries_fts_delete;
        DROP TABLE search_entry_cases;
        DROP TABLE search_entries_fts;
        DROP TABLE search_entries;
        DROP TABLE search_change_clock;
        DROP TABLE search_dirty_tables;
        DROP TABLE search_index_build_state;`);
      db.prepare("INSERT INTO cases(id, case_number, display_name, category, opened_at, created_at, updated_at) VALUES ('case-1', 'A-1', 'Bestand', 'beratung', '2026-01-01', '2026-01-01', '2026-01-01')").run();
      const migrationDir = new URL('../../../../database/migrations/', import.meta.url);
      for (const filename of readdirSync(migrationDir).filter((name) => /^\d{4}_.+\.sql$/.test(name) && !name.startsWith('0067_'))) {
        db.prepare(`INSERT OR IGNORE INTO schema_migrations(version, filename, checksum, applied_at, mode)
          VALUES (?, ?, 'fixture', '2026-01-01', 'sql')`).run(filename.slice(0, 4), filename);
      }
      const result = new MigrationService(db, new URL('../../../../database/schema.sql', import.meta.url).pathname, migrationDir.pathname).migrate();
      expect(result.currentSchemaVersion).toBe('0067');
      expect(db.prepare("SELECT display_name FROM cases WHERE id = 'case-1'").get()).toEqual({ display_name: 'Bestand' });
      expect(db.prepare("SELECT name FROM sqlite_master WHERE name = 'search_entries'").get()).toEqual({ name: 'search_entries' });
      const before = clock(db);
      db.prepare("UPDATE cases SET display_name = 'Geändert' WHERE id = 'case-1'").run();
      expect(clock(db)).toBe(before + 1);
    } finally {
      db.close();
    }
  });

  it('creates and reopens an encrypted vault with searchable migrated content', async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), 'gremia-unified-search-'));
    const file = path.join(directory, 'vault.db');
    const key = 'a'.repeat(64);
    const schemaPath = new URL('../../../../database/schema.sql', import.meta.url).pathname;
    const migrationDir = new URL('../../../../database/migrations/', import.meta.url).pathname;
    const first = new DatabaseService();
    const second = new DatabaseService();
    try {
      const db = await first.open(file, key);
      expect(new MigrationService(db, schemaPath, migrationDir).migrate().currentSchemaVersion).toBe('0067');
      db.prepare("INSERT INTO contacts(id, first_name, last_name, category, created_at, updated_at) VALUES ('contact-1', 'Lokaler', 'Tresortreffer', 'sonstiges', '2026-01-01', '2026-01-01')").run();
      expect(new UnifiedSearchIndexService(db).search({ query: 'Tresortreffer', area: 'all_data' }).total).toBe(1);
      first.close();
      const reopened = await second.open(file, key);
      expect(new UnifiedSearchIndexService(reopened).search({ query: 'Tresortreffer', area: 'all_data' }).total).toBe(1);
    } finally {
      first.close();
      second.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
