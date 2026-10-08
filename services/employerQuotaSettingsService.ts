import type { DatabaseAdapter } from './databaseService.js';
import type { EmployerQuotaSettings } from '../src/domain/models/employer-quota.model.js';

const SETTINGS_KEY = 'employer.chargeable_workplaces.v1';

function validateWorkplaces(value: unknown): asserts value is number | null {
  if (value !== null && (!Number.isSafeInteger(value) || (value as number) < 0)) {
    throw new Error('Maßgebliche Arbeitsplätze müssen als ganze, nicht negative Zahl angegeben werden.');
  }
}

export class EmployerQuotaSettingsService {
  constructor(private readonly database: DatabaseAdapter) {}

  get(): EmployerQuotaSettings {
    const row = this.database.prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?').get(SETTINGS_KEY);
    if (!row) return { chargeableWorkplaces: null };
    if (!/^(0|[1-9]\d*)$/.test(row.value)) throw new Error('Gespeicherte Zahl maßgeblicher Arbeitsplätze ist ungültig.');
    const chargeableWorkplaces = Number(row.value);
    validateWorkplaces(chargeableWorkplaces);
    return { chargeableWorkplaces };
  }

  save(input: EmployerQuotaSettings): EmployerQuotaSettings {
    validateWorkplaces(input.chargeableWorkplaces);
    if (input.chargeableWorkplaces === null) {
      this.database.prepare('DELETE FROM settings WHERE key = ?').run(SETTINGS_KEY);
      return { chargeableWorkplaces: null };
    }
    this.database.prepare(`
      INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(SETTINGS_KEY, String(input.chargeableWorkplaces), new Date().toISOString());
    return { chargeableWorkplaces: input.chargeableWorkplaces };
  }
}
