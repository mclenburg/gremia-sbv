import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

describe('documentation readiness 0.8.8-d', () => {
  it('turns README into a real project entry point', () => {
    const readme = read('README.md');
    expect(readme).toContain('Stand: **0.8.8-d**');
    expect(readme).toContain('## Zweck');
    expect(readme).toContain('## Datenschutz und Sicherheitsmodell');
    expect(readme).toContain('## Entwicklung');
    expect(readme).toContain('## Build');
    expect(readme).toContain('## Release-Vorbereitung');
    expect(readme).not.toContain('## Stand 0.5.0');
  });

  it('keeps durable documentation entry points', () => {
    expect(read('docs/README.md')).toContain('Zentrale Dokumente');
    expect(read('docs/ARCHITECTURE.md')).toContain('Maßnahmenarchitektur');
    expect(read('docs/DEVELOPMENT.md')).toContain('Source-Cleanup');
    expect(read('docs/RELEASE_CHECKLIST.md')).toContain('0.9.0-rc.1');
    expect(read('docs/CHANGELOG.md')).toContain('0.8.8-d');
  });

  it('uses cleanup wording for already applied manifest entries', () => {
    const script = read('scripts/cleanup-obsolete-files.cjs');
    expect(script).toContain('bereits bereinigt');
    expect(script).not.toContain('nicht vorhanden');
  });
});
