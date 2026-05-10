import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

const activeDocs = [
  'README.md',
  'docs/README.md',
  'docs/ARCHITECTURE.md',
  'docs/BUILD.md',
  'docs/ROADMAP.md',
  'docs/RELEASE_CHECKLIST.md',
  'docs/SECURITY.md',
  'docs/DATENSCHUTZKONZEPT.md',
  'docs/DSFA_SBV_TEMPLATE.md',
  'docs/VERARBEITUNGSVERZEICHNIS_SBV.md',
  'docs/LOESCHKONZEPT_SBV.md'
];

describe('0.9.1 aktive Markdown-Dokumentation', () => {
  it('führt nur dauerhafte Projekt- und Betriebsdokumentation als aktive Kernunterlagen', () => {
    for (const file of activeDocs) {
      expect(existsSync(file), `${file} fehlt`).toBe(true);
      expect(readNormalizedSourceText(file), `${file} ohne Versionsstand`).toContain('Stand: **0.9.1**');
    }
  });

  it('entfernt vor Veröffentlichung Release Notes und Changelog aus dem aktiven Bestand', () => {
    expect(existsSync('docs/RELEASE_NOTES_0.9.1.md')).toBe(false);
    expect(existsSync('docs/CHANGELOG.md')).toBe(false);

    const docsReadme = readNormalizedSourceText('docs/README.md');
    expect(docsReadme).not.toContain('RELEASE_NOTES_0.9.1.md');
    expect(docsReadme).not.toContain('CHANGELOG.md');
    expect(docsReadme).toContain('Release Notes, Change Logs');
  });
});
