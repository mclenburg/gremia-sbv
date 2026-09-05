import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { APP_SCHEMA_VERSION } from '../../../services/appSchema.js';

const migration = readFileSync('database/migrations/0048_measure_lifecycle_audit.sql', 'utf8');

describe('Schema 0048', () => {
  it('führt den Zeitraumindex für Lifecycle-Auswertungen ein', () => {
    expect(APP_SCHEMA_VERSION).toBe('0055');
    expect(migration).toContain('idx_personal_data_audit_lifecycle_period');
  });
});
