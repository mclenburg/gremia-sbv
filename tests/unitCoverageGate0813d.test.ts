import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('RC unit coverage gate', () => {
  it('keeps a real Vitest coverage threshold at 70 percent for RC validation', () => {
    const config = readFileSync('vitest.config.ts', 'utf8');
    expect(config).toContain('coverage:');
    expect(config).toContain("provider: 'v8'");
    expect(config).toContain('lines: 70');
    expect(config).toContain('functions: 70');
    expect(config).toContain('branches: 70');
    expect(config).toContain('statements: 70');
  });

  it('offers an explicit coverage command without adding it to every local build', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['test:coverage']).toBe('vitest run --coverage');
    expect(pkg.scripts.build).toContain('npm run test');
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
  });
});
