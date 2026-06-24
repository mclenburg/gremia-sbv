import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { APP_SCHEMA_VERSION } from '../services/appSchema';

function latestMigrationVersion(): string {
  const migrationsDir = path.join(process.cwd(), 'database', 'migrations');
  const versions = fs.readdirSync(migrationsDir)
    .map((file) => file.match(/^(\d{4})[_-].+\.sql$/i)?.[1] ?? null)
    .filter((version): version is string => Boolean(version))
    .sort();
  const latest = versions.at(-1);
  if (!latest) throw new Error('Keine Migration gefunden.');
  return latest;
}

describe('APP_SCHEMA_VERSION', () => {
  it('entspricht der neuesten Migration und verhindert Build-Readiness-Drift', () => {
    expect(APP_SCHEMA_VERSION).toBe(latestMigrationVersion());
  });
});
