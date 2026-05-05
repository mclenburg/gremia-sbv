import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.6 Arbeitsplatzgestaltung als Fallmaßnahme', () => {
  it('registriert Schema 0021 und Arbeitsplatzgestaltungstabelle', () => {
    expect(readFileSync('services/appSchema.ts', 'utf8')).toContain("APP_SCHEMA_VERSION = '0021'");
    expect(readFileSync('database/migrations/0021_workplace_accommodation.sql', 'utf8')).toContain('case_measure_workplace_accommodation');
  });

  it('bindet Arbeitsplatzgestaltung an Fallakte und Inline-Befehl /anp', () => {
    expect(readFileSync('src/app/features/cases/CaseWorkbenchFooter.tsx', 'utf8')).toContain("onProcess('workplace_accommodation')");
    expect(readFileSync('services/textCommandPolicy.ts', 'utf8')).toContain("'/anp'");
    expect(readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8')).toContain('workplaceAccommodation.create');
  });
});
