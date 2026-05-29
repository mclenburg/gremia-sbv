import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = (path: string) => readFileSync(path, 'utf8');

describe('Public-Release-Review P15l', () => {
  it('beschreibt den Demo-Modus zuerst aus Sicht fertiger Artefakte statt entwicklerlastig', () => {
    const readme = text('README.md');
    expect(readme).toContain('Gremia.SBV gefahrlos ausprobieren: Demo-Modus');
    expect(readme).toContain('./Gremia.SBV-linux-x86_64.AppImage --demo');
    expect(readme).toContain('.\\Gremia.SBV-win-x64.exe --demo');
    expect(readme).toContain('"Gremia.SBV.exe" --demo');
    expect(readme).toContain('gremia.sbv-demo');

    const artifactExample = readme.indexOf('AppImage --demo');
    const developerExample = readme.indexOf('npm run dev:demo');
    expect(artifactExample).toBeGreaterThan(0);
    expect(developerExample).toBeGreaterThan(artifactExample);
  });

  it('adressiert die drei Bereitstellungs-Blocker aus dem Architekturreview', () => {
    const workflow = text('.github/workflows/build-release.yml');
    const packageJson = text('package.json');
    const notice = text('NOTICE');

    expect(packageJson).toContain('"security:audit": "npm audit --audit-level=high"');
    expect(workflow).toContain('npm run security:audit');

    expect(existsSync('THIRD_PARTY_LICENSES.txt')).toBe(true);
    expect(packageJson).toContain('"licenses:generate"');
    expect(packageJson).toContain('"licenses:check"');
    expect(workflow).toContain('npm run licenses:generate');
    expect(workflow).toContain('npm run licenses:check');
    expect(notice).toContain('THIRD_PARTY_LICENSES.txt');
    expect(notice).not.toContain('should be produced as part of a later release');

    expect(existsSync('docs/CODE_SIGNING.md')).toBe(true);
    expect(text('docs/CODE_SIGNING.md')).toContain('Zielbild für signierte Artefakte');
    expect(text('README.md')).toContain('Hinweise zu Signaturen und Sicherheitswarnungen');
  });

  it('ergänzt Public-Repository-Hygiene für Security und Dependency-Updates', () => {
    expect(existsSync('SECURITY.md')).toBe(true);
    expect(text('SECURITY.md')).toContain('Sicherheitslücken melden');
    expect(existsSync('.github/dependabot.yml')).toBe(true);
    expect(text('.github/dependabot.yml')).toContain('package-ecosystem: "npm"');
  });

  it('nimmt Public-Gates in die Qualitätsfreigabe auf', () => {
    const qualityGate = text('docs/QUALITY_GATE.md');
    expect(qualityGate).toContain('npm run security:audit');
    expect(qualityGate).toContain('npm run licenses:check');
    expect(qualityGate).toMatch(/Öffentliche Qualitätsgates|Qualitätsfreigabe/);
    expect(qualityGate).toContain('Demo-Start für fertige AppImage-/EXE-Artefakte');
  });
});
