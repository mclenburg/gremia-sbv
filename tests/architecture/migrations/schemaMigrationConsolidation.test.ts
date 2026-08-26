import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { DatabaseRuntimeInitializer } from '../../../services/databaseRuntimeInitializer';
import { getSchemaMigrationHook } from '../../../services/schemaMigrationHooks';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { RetentionService } from '../../../services/retentionService';

function dataOnlyDb(): DatabaseAdapter {
  return new Proxy({} as DatabaseAdapter, {
    get(_target, property) {
      if (property === 'exec') {
        return (sql: string) => {
          if (/\b(?:CREATE|ALTER|DROP)\b/i.test(sql)) {
            throw new Error(`Strukturelles SQL im Runtime-Initializer: ${sql}`);
          }
        };
      }
      if (property === 'prepare') {
        return (sql: string) => {
          if (/\b(?:CREATE|ALTER|DROP)\b/i.test(sql)) {
            throw new Error(`Strukturelles SQL im Runtime-Initializer: ${sql}`);
          }
          return { all: () => [], get: () => undefined, run: vi.fn() };
        };
      }
      return undefined;
    },
  });
}

describe('Schema-Migrationskonsolidierung 0049', () => {
  it('registriert sämtliche Kompatibilitätsschemata in genau einem versionierten Hook', () => {
    const hook = getSchemaMigrationHook('0049');
    expect(hook).toBeDefined();
    expect(new Set(hook?.components).size).toBe(hook?.components.length);
    expect(hook?.components).toEqual(expect.arrayContaining([
      'cases_and_fts',
      'search_index',
      'privacy_review',
      'document_ocr',
      'reports',
      'templates',
    ]));
  });

  it('instanziiert im Migrationshook keine Fachservices als zweite Schemaquelle', () => {
    const source = readFileSync('services/schemaMigrationHooks.ts', 'utf8');

    expect(source).not.toMatch(/new\s+\w+Service\s*\(/);
    expect(source).not.toContain('.ensureSchema(');
  });

  it('hält die nachgelagerte Runtime-Initialisierung frei von strukturellem SQL', () => {
    expect(() => new DatabaseRuntimeInitializer(dataOnlyDb()).initialize()).not.toThrow(/Strukturelles SQL/);
  });

  it('führt auch während fachlicher Retention-Abfragen kein strukturelles SQL aus', () => {
    const service = new RetentionService(dataOnlyDb(), () => '');

    expect(() => service.getSettings()).not.toThrow(/Strukturelles SQL/);
  });
});
