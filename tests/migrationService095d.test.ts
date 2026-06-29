import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('MigrationService 0.9.5-d Härtung', () => {
  it('prüft 0047 über einen echten Recruiting-Kontext-Insert statt nur über die Spalte', () => {
    const service = readFileSync('services/migrationService.ts', 'utf8');

    expect(service).toContain('participationViolationRecruitingContextSupported');
    expect(service).toContain("case '0047':\n        return this.participationViolationRecruitingContextSupported();");
    expect(service).toContain("'recruiting_participation'");
    expect(service).toContain('INSERT INTO sbv_participation_violations');
    expect(service).not.toContain("case '0047':\n        return this.columnExists('sbv_participation_violations', 'related_recruiting_participation_id');");
  });

  it('hält activity_journal_links in Basisschema und ensureSchema konsistent eindeutig', () => {
    const schema = readFileSync('database/schema.sql', 'utf8');
    const service = readFileSync('services/activityJournalService.ts', 'utf8');

    expect(schema).toContain('UNIQUE(entry_id, target_type, target_id)');
    expect(service).toContain('UNIQUE(entry_id, target_type, target_id)');
  });

  it('dokumentiert die Grenzen des lokalen build:github-Befehls', () => {
    const script = readFileSync('scripts/run-github-build-current-os.cjs', 'utf8');

    expect(script).toContain('nur für das aktuelle Betriebssystem');
    expect(script).toContain('Cross-OS-Lauf');
    expect(script).toContain('libarchive-tools/bsdtar');
  });
});
