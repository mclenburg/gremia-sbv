import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function collectFiles(directory: string, predicate: (path: string) => boolean): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry).replaceAll('\\', '/');
    const stat = statSync(fullPath);
    if (stat.isDirectory()) result.push(...collectFiles(fullPath, predicate));
    else if (predicate(fullPath)) result.push(fullPath);
  }
  return result;
}

describe('RC platform stability contracts', () => {
  it('keeps npm test scripts pointed at existing test files', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> };
    const missing: string[] = [];
    for (const [name, command] of Object.entries(pkg.scripts ?? {})) {
      const refs = [...command.matchAll(/tests\/[A-Za-z0-9_.-]+\.test\.ts/g)].map((match) => match[0]);
      for (const ref of refs) if (!existsSync(ref)) missing.push(`${name} -> ${ref}`);
    }
    expect(missing).toEqual([]);
  });

  it('keeps core build contracts platform neutral', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string>; build?: { win?: { signAndEditExecutable?: boolean } } };
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
    expect(pkg.scripts.postinstall).not.toContain('npx');
    expect(pkg.scripts.prebuild).toBe('npm run version:generate && npm run source:cleanup && npm run build:readiness');
    expect(pkg.scripts.build).toContain('npm run test');
    expect(pkg.build?.win?.signAndEditExecutable).toBe(false);
  });

  it('does not introduce absolute local paths into tests or build scripts', () => {
    const files = [
      ...collectFiles('tests', (file) => file.endsWith('.test.ts')),
      ...collectFiles('scripts', (file) => file.endsWith('.cjs')),
    ];
    const offenders = files.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return /C:\\Users\\|C:\\dev\\|\/home\/[^/'"`\s]+\//.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
