import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('dependency registry readiness', () => {
  it('does not leak internal registry URLs into the npm lockfile', () => {
    const lock = read('package-lock.json');

    expect(lock).not.toContain('packages.applied-caas-gateway');
    expect(lock).not.toContain('internal.api.openai.org');
    expect(lock).not.toContain('artifactory/api/npm/npm-public');
  });

  it('pins the project registry to the public npm registry', () => {
    const npmrc = read('.npmrc');

    expect(npmrc).toContain('registry=https://registry.npmjs.org/');
    expect(npmrc).not.toContain('always-auth');
    expect(npmrc).not.toContain('email=');
  });

  it('documents and enforces Node 20.19 or newer as the RC build baseline', () => {
    const pkg = JSON.parse(read('package.json')) as { engines?: Record<string, string> };
    const buildDoc = read('docs/BUILD.md');

    expect(pkg.engines?.node).toBe('>=20.19.0 <25');
    expect(pkg.engines?.npm).toBe('>=10');
    expect(read('.nvmrc').trim()).toBe('20.19.0');
    expect(read('.node-version').trim()).toBe('20.19.0');
    expect(buildDoc).toContain('Node.js 20.19.0');
  });
});
