import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MigrationService } from '../../../services/migrationService.js';
import type { DatabaseAdapter } from '../../../services/databaseService.js';
import { openTestDatabase } from '../../helpers/openTestDatabase.js';

describe('Migrationsprüfung beim wiederholten Entsperren', () => {
  it('überspringt umfassende Schema-Reparatur, wenn der dokumentierte Stand unverändert ist', async () => {
    const db = await openTestDatabase();
    const schema = path.resolve('database/schema.sql');
    const migrations = path.resolve('database/migrations');
    try {
      new MigrationService(db, schema, migrations).migrate();
      let tableScans = 0;
      const monitored = new Proxy(db, {
        get(target, property) {
          if (property === 'prepare') return (sql: string) => {
            if (/PRAGMA\s+table_info/i.test(sql)) tableScans += 1;
            return target.prepare(sql);
          };
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as DatabaseAdapter;
      const result = new MigrationService(monitored, schema, migrations).migrate();
      expect(result.applied).toEqual([]);
      expect(tableScans).toBe(0);
    } finally {
      db.close();
    }
  });
});
