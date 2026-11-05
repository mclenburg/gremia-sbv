import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { KnowledgeService, ensureKnowledgeSchema } from '../../../services/knowledgeService';
import { DEFAULT_LEGAL_NORMS } from '../../../services/knowledgePolicy';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

describe('knowledgeService schema', () => {
  it('legt die Tabellen für Normen, Fallbezüge, Kommentare, Rechtsprechung und Checklisten an', () => {
    const statements: string[] = [];
    const fakeDb: DatabaseAdapter = {
      exec(sql: string) { statements.push(sql); },
      prepare() { throw new Error('prepare not needed in this test'); },
      pragma() { return undefined; },
      close() {}
    };

    ensureKnowledgeSchema(fakeDb);
    const sql = statements.join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS legal_norms');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS case_legal_references');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS norm_comments');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS norm_case_law');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS norm_checklist_items');
  });

  it('hinterlässt bei einem Seed-Fehler keine teilweise eingefügten Rechtsnormen', async () => {
    const db = await openTestDatabase();
    try {
      db.exec(readFileSync('database/schema.sql', 'utf8'));
      db.exec(`CREATE TRIGGER reject_second_seed_norm BEFORE INSERT ON legal_norms
        WHEN NEW.id = '${DEFAULT_LEGAL_NORMS[1].id}'
        BEGIN SELECT RAISE(ABORT, 'seed rejected'); END`);
      expect(() => new KnowledgeService(db).seedReferenceData()).toThrow('seed rejected');
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM legal_norms').get()?.count).toBe(0);
      expect(db.prepare<{ count: number }>('SELECT COUNT(*) AS count FROM norm_checklist_items').get()?.count).toBe(0);
    } finally {
      db.close();
    }
  });
});
