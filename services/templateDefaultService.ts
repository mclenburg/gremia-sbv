import type { DatabaseAdapter } from './databaseService.js';
import {
  normalizeTemplateDefaultValues,
  type TemplateDefaultValues,
} from '../src/app/core/models/template-default.model.js';

const TEMPLATE_DEFAULTS_SETTINGS_KEY = 'template.defaults.v1';

function nowIso(): string {
  return new Date().toISOString();
}

function readStoredDefaults(db: DatabaseAdapter): TemplateDefaultValues {
  try {
    const row = db
      .prepare<{ value: string }>('SELECT value FROM settings WHERE key = ?')
      .get(TEMPLATE_DEFAULTS_SETTINGS_KEY);
    if (!row?.value) return normalizeTemplateDefaultValues(null);
    return normalizeTemplateDefaultValues(JSON.parse(row.value) as Record<string, unknown>);
  } catch {
    return normalizeTemplateDefaultValues(null);
  }
}

function writeStoredDefaults(db: DatabaseAdapter, values: TemplateDefaultValues): void {
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(TEMPLATE_DEFAULTS_SETTINGS_KEY, JSON.stringify(values), nowIso());
}

export class TemplateDefaultService {
  constructor(private readonly getDb: () => DatabaseAdapter) {}

  list(): TemplateDefaultValues {
    return readStoredDefaults(this.getDb());
  }

  save(input: Partial<Record<string, unknown>>): TemplateDefaultValues {
    const normalized = normalizeTemplateDefaultValues(input);
    writeStoredDefaults(this.getDb(), normalized);
    return normalized;
  }
}
