import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import type { DatabaseAdapter } from '../../../services/databaseService';
import { MigrationService } from '../../../services/migrationService';
import { EmployerQuotaSettingsService } from '../../../services/employerQuotaSettingsService';
import { openTestDatabase } from '../../helpers/openTestDatabase';

let db: DatabaseAdapter;

beforeEach(async () => {
  db = await openTestDatabase();
  new MigrationService(db, path.resolve('database/schema.sql'), path.resolve('database/migrations')).migrate();
});

afterEach(() => db.close());

describe('maßgebliche Arbeitsplätze in den verschlüsselten Einstellungen', () => {
  it('speichert und liest die Zahl über einen neuen Service und blendet sie nach dem Entfernen wieder aus', () => {
    const settings = new EmployerQuotaSettingsService(db);
    expect(settings.get()).toEqual({ chargeableWorkplaces: null });
    expect(settings.save({ chargeableWorkplaces: 70 })).toEqual({ chargeableWorkplaces: 70 });
    expect(new EmployerQuotaSettingsService(db).get()).toEqual({ chargeableWorkplaces: 70 });
    expect(settings.save({ chargeableWorkplaces: null })).toEqual({ chargeableWorkplaces: null });
    expect(new EmployerQuotaSettingsService(db).get()).toEqual({ chargeableWorkplaces: null });
  });

  it.each([-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY, '40'])('verwirft ungültige Arbeitsplatzwerte %s', (value) => {
    expect(() => new EmployerQuotaSettingsService(db).save({ chargeableWorkplaces: value as number })).toThrow(/Arbeitsplätze/);
  });
});
