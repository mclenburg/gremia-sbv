import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('Gremia.BR-Altbestand', () => {
  it('entfernt persistierte Remote-Inhalte ohne lokale Einstellungen zu verändern', async () => {
    const db = await openTestDatabase();
    try {
      db.exec('CREATE TABLE gremia_br_cache_entries (cache_key TEXT PRIMARY KEY, payload_json TEXT NOT NULL)');
      db.exec('CREATE TABLE gremia_br_settings (id TEXT PRIMARY KEY, enabled INTEGER NOT NULL)');
      db.prepare('INSERT INTO gremia_br_cache_entries VALUES (?, ?)').run('meeting', '{"title":"vertraulich"}');
      db.prepare('INSERT INTO gremia_br_settings VALUES (?, ?)').run('main', 1);

      const migration = readFileSync('database/migrations/0059_gremia_br_remote_cache_purge.sql', 'utf8');
      db.exec(migration);
      db.exec(migration);

      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM gremia_br_cache_entries').get()?.count).toBe(0);
      expect(db.prepare<{ enabled: number }>('SELECT enabled FROM gremia_br_settings WHERE id = ?').get('main')?.enabled).toBe(1);
    } finally {
      db.close();
    }
  });
});
