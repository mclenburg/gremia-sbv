import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const cleanupScript = readFileSync('scripts/cleanup-obsolete-files.cjs', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string;
  scripts: Record<string, string>;
};

describe('0.8.8-h.4 Windows source cleanup hardening', () => {
  it('keeps cleanup in the build chain without making Windows delete failures fatal by default', () => {
    expect(packageJson.version).toBe('0.8.8-h.4');
    expect(packageJson.scripts.prebuild).toContain('source:cleanup');
    expect(cleanupScript).toContain('strictDelete');
    expect(cleanupScript).toContain('Build läuft weiter');
    expect(cleanupScript).toContain('maxRetries: 3');
  });

  it('still fails hard for unsafe cleanup paths', () => {
    expect(cleanupScript).toContain('Absolute Pfade sind nicht erlaubt');
    expect(cleanupScript).toContain('Pfade außerhalb des Projekt-Roots sind nicht erlaubt');
    expect(cleanupScript).toContain('Geschützter Pfad darf nicht per Cleanup entfernt werden');
    expect(cleanupScript).toContain('node_modules');
  });

  it('allows e2e cleanup manifests while keeping product build artifacts protected', () => {
    expect(cleanupScript).toContain("'e2e'");
    expect(cleanupScript).toContain("'dist'");
    expect(cleanupScript).toContain("'release'");
  });
});
