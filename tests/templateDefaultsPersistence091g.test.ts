import { describe, expect, it } from 'vitest';
import { TemplateDefaultService } from '../services/templateDefaultService';
import { EMPTY_TEMPLATE_DEFAULT_VALUES } from '../src/app/core/models/template-default.model';
import type { DatabaseAdapter } from '../services/databaseService';

function createSettingsDb(initial?: Record<string, string>): DatabaseAdapter {
  const settings = new Map(Object.entries(initial ?? {}));
  const db = {
    prepare(sql: string) {
      return {
        get(key: string) {
          if (!/SELECT value FROM settings WHERE key = \?/i.test(sql)) return undefined;
          const value = settings.get(key);
          return value === undefined ? undefined : { value };
        },
        all() {
          return [];
        },
        run(key: string, value: string) {
          if (!/INSERT INTO settings/i.test(sql)) return { changes: 0 };
          settings.set(key, value);
          return { changes: 1 };
        },
      };
    },
    exec() {
      return undefined;
    },
    pragma() {
      return undefined;
    },
    close() {
      return undefined;
    },
  };
  return db as unknown as DatabaseAdapter;
}

describe('Vorlagen-Standardwerte im verschlüsselten Tresor', () => {
  it('normalisiert fehlende Werte und speichert sie in der settings-Tabelle', () => {
    const db = createSettingsDb();
    const service = new TemplateDefaultService(() => db);

    const saved = service.save({
      'sbv.name': 'SBV Muster',
      'arbeitgeber.name': 'Arbeitgeber GmbH',
      unbekannt: 'wird ignoriert',
    });

    expect(saved['sbv.name']).toBe('SBV Muster');
    expect(saved['arbeitgeber.name']).toBe('Arbeitgeber GmbH');
    expect(saved['sbv.signatur']).toBe(EMPTY_TEMPLATE_DEFAULT_VALUES['sbv.signatur']);
    expect(service.list()).toEqual(saved);
  });

  it('fällt bei ungültigen gespeicherten Daten auf sichere Standardwerte zurück', () => {
    const db = createSettingsDb({ 'template.defaults.v1': '{kaputt' });
    const service = new TemplateDefaultService(() => db);

    expect(service.list()).toEqual(EMPTY_TEMPLATE_DEFAULT_VALUES);
  });
});
