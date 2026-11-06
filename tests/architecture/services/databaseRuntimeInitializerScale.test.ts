import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DatabaseRuntimeInitializer } from '../../../services/databaseRuntimeInitializer.js';
import type { DatabaseAdapter } from '../../../services/databaseService.js';
import { openTestDatabase } from '../../helpers/openTestDatabase.js';

describe('Dateninitialisierung bei erneutem Entsperren', () => {
  it('prüft die Maßnahmen-Baselines nur einmal je Schemastand', async () => {
    const db = await openTestDatabase();
    db.exec(readFileSync(path.resolve('database/schema.sql'), 'utf8'));
    let baselineScans = 0;
    const monitored = new Proxy(db, {
      get(target, property) {
        if (property === 'prepare') return (sql: string) => {
          if (sql.includes('FROM case_measures AS measure')) baselineScans += 1;
          return target.prepare(sql);
        };
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as DatabaseAdapter;
    try {
      new DatabaseRuntimeInitializer(monitored).initialize({ deferAggregateIntegrity: true });
      expect(baselineScans).toBe(1);
      new DatabaseRuntimeInitializer(monitored).initialize({ deferAggregateIntegrity: true });
      expect(baselineScans).toBe(1);
    } finally {
      db.close();
    }
  });
});
