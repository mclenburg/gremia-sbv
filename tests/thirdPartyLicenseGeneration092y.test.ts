import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

function readText(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Third-Party-Lizenzprüfung 0.9.2y', () => {
  it('prüft im normalen Testlauf nur vorhandene Lizenzartefakte und startet keine Online-Generierung', () => {
    const packageJson = JSON.parse(readText('package.json')) as { scripts: Record<string, string> };

    expect(packageJson.scripts['licenses:generate']).toBe('node scripts/generate-third-party-licenses.cjs');
    expect(packageJson.scripts['licenses:check']).toBe('node scripts/check-third-party-licenses.cjs');
    expect(packageJson.scripts.test).toBe('vitest run');
    expect(packageJson.scripts.pretest).not.toContain('licenses:generate');
    expect(packageJson.scripts.build).not.toContain('licenses:generate');
  });

  it('stellt sicher, dass die statische Lizenzprüfung vorhandene Release-Artefakte kurz validieren kann', () => {
    expect(existsSync(path.join(process.cwd(), 'THIRD_PARTY_LICENSES.txt'))).toBe(true);
    expect(existsSync(path.join(process.cwd(), 'scripts', 'check-third-party-licenses.cjs'))).toBe(true);

    const inventory = readText('THIRD_PARTY_LICENSES.txt');
    expect(inventory).toContain('THIRD-PARTY LICENSE INVENTORY');
    expect(inventory).not.toContain('UNKNOWN - bitte upstream package.json prüfen');
  });

  it('verwendet gemeinsame Lizenztextdateien statt dependency-spezifischer LICENSES-Unterordner', () => {
    const licensesPath = path.join(process.cwd(), 'LICENSES');
    if (!existsSync(licensesPath)) return;

    const mitLicense = path.join(licensesPath, 'MIT.txt');
    expect(existsSync(mitLicense)).toBe(true);
    expect(statSync(mitLicense).isFile()).toBe(true);
  });
});
