import { describe, expect, it } from 'vitest';
import { ensureKnowledgeSchema } from '../services/knowledgeService';
import type { DatabaseAdapter } from '../services/databaseService';

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
});
