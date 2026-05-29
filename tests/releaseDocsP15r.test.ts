import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

function collectMarkdownFiles(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...collectMarkdownFiles(path));
    else if (entry.endsWith('.md')) result.push(path.replace(/\\/g, '/'));
  }
  return result.sort();
}

describe('P15r release-ready Markdown-Dokumentation', () => {
  it('haelt README-Beispiele versionsfrei und weiterhin SBV-orientiert', () => {
    const readme = read('README.md');
    expect(readme).toContain('Gremia.SBV gefahrlos ausprobieren: Demo-Modus');
    expect(readme).toContain('./Gremia.SBV-linux-x86_64.AppImage --demo');
    expect(readme).toContain('.\\Gremia.SBV-win-x64.exe --demo');
    expect(readme).toContain('gremia.sbv-demo');
    expect(readme).not.toMatch(/Gremia\.SBV-\d+\.\d+\.\d+/);
    expect(readme.indexOf('AppImage --demo')).toBeLessThan(readme.indexOf('npm run dev:demo'));
  });

  it('fuehrt aktive Markdown-Dateien ohne App-Versionsnummern', () => {
    const markdown = ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', ...collectMarkdownFiles('docs')]
      .filter((file) => !file.includes('QUALITY_GATE_1_0.md') && !file.includes('RELEASE_1_0_CHECKLIST.md'));
    const offending = markdown.filter((file) => /\b(?:0\.9\.\d+|1\.0(?:\.0)?|1\.x|v0\.9\.\d+)\b/.test(read(file)));
    expect(offending).toEqual([]);
  });

  it('legt DSB- und IT-Security-Freigabeunterlagen unter docs ab', () => {
    expect(existsSync('docs/FREIGABE_DSB_IT_SECURITY.md')).toBe(true);
    const freigabe = read('docs/FREIGABE_DSB_IT_SECURITY.md');
    for (const required of [
      'Datenschutzbeauftragte',
      'IT-Security',
      'DATENSCHUTZKONZEPT.md',
      'DSFA_SBV_TEMPLATE.md',
      'VERARBEITUNGSVERZEICHNIS_SBV.md',
      'LOESCHKONZEPT_SBV.md',
      'PRIVACY_AND_SECURITY.md',
      'SECURITY.md',
      'ARCHITECTURE.md',
      'DATABASE_ENCRYPTION.md',
      'CODE_SIGNING.md',
      'QUALITY_GATE.md',
    ]) {
      expect(freigabe).toContain(required);
    }
    expect(read('docs/README.md')).toContain('Freigabeunterlagen für Datenschutz und IT-Security');
  });
});
