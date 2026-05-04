import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), 'utf8');

describe('0.8.5 SBV-Beteiligungsmonitor', () => {
  it('registriert das Modul in Navigation, App und Preload-Bridge', () => {
    expect(read('src/app/core/navigation/modules.ts')).toContain("id: 'participation'");
    expect(read('src/app/App.tsx')).toContain('currentView === "participation"');
    expect(read('electron/preload.ts')).toContain('participation:create');
    expect(read('electron/main.ts')).toContain('registerParticipationIpc');
  });

  it('führt das Datenbankschema als Migration 0019 und im Basisschema', () => {
    expect(read('services/appSchema.ts')).toContain("APP_SCHEMA_VERSION = '0019'");
    expect(read('database/migrations/0019_sbv_participation_monitor.sql')).toContain('CREATE TABLE IF NOT EXISTS sbv_participations');
    expect(read('database/schema.sql')).toContain('CREATE TABLE IF NOT EXISTS sbv_participations');
    expect(read('services/migrationService.ts')).toContain("case '0019'");
  });

  it('macht die §178 Abs. 2 SGB IX Prüfpunkte fachlich sichtbar', () => {
    const view = read('src/app/features/participation/ParticipationView.tsx');
    expect(view).toContain('Unterrichtung vollständig');
    expect(view).toContain('Anhörung vor Entscheidung');
    expect(view).toContain('Entscheidung mitgeteilt');
    expect(view).toContain('§ 178 Abs. 2 Satz 2 SGB IX');
  });
});
