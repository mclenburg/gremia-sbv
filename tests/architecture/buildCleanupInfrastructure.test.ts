import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function fixture(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  fixtures.push(root);
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'maintenance', 'source-cleanup'), { recursive: true });
  return root;
}

function run(root: string, script: string, args: string[] = []) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function pathSegments(portablePath: string): string[] {
  return portablePath.match(/[^/]+/g) ?? [];
}

describe('Patch 2 build artifact state', () => {
  it('accepts unchanged compiled artifacts and rejects stale source state', () => {
    const root = fixture('gremia-build-state-');
    copyFileSync('scripts/build-artifact-state.cjs', join(root, 'scripts', 'build-artifact-state.cjs'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.1.0' }), 'utf8');
    writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ version: '0.1.0' }), 'utf8');
    writeFileSync(join(root, 'tsconfig.json'), '{}', 'utf8');
    writeFileSync(join(root, 'tsconfig.electron.json'), '{}', 'utf8');
    writeFileSync(join(root, 'vite.config.ts'), 'export default {};', 'utf8');
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'dist'), { recursive: true });
    mkdirSync(join(root, 'dist-electron'), { recursive: true });
    writeFileSync(join(root, 'src', 'main.ts'), 'export const value = 1;', 'utf8');
    writeFileSync(join(root, 'dist', 'index.js'), 'compiled', 'utf8');
    writeFileSync(join(root, 'dist-electron', 'main.js'), 'electron', 'utf8');

    const write = run(root, 'scripts/build-artifact-state.cjs', ['write']);
    const check = run(root, 'scripts/build-artifact-state.cjs', ['check']);
    writeFileSync(join(root, 'src', 'main.ts'), 'export const value = 2;', 'utf8');
    const stale = run(root, 'scripts/build-artifact-state.cjs', ['check']);

    expect(write.status).toBe(0);
    expect(check.status).toBe(0);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toMatch(/erneut npm run build:compile/i);
  });

  it('rejects modified compiled output after state creation', () => {
    const root = fixture('gremia-build-artifact-tamper-');
    copyFileSync('scripts/build-artifact-state.cjs', join(root, 'scripts', 'build-artifact-state.cjs'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '0.1.0' }), 'utf8');
    writeFileSync(join(root, 'package-lock.json'), '{}', 'utf8');
    writeFileSync(join(root, 'tsconfig.json'), '{}', 'utf8');
    writeFileSync(join(root, 'tsconfig.electron.json'), '{}', 'utf8');
    writeFileSync(join(root, 'vite.config.ts'), '', 'utf8');
    mkdirSync(join(root, 'dist'), { recursive: true });
    mkdirSync(join(root, 'dist-electron'), { recursive: true });
    writeFileSync(join(root, 'dist', 'index.js'), 'compiled', 'utf8');
    writeFileSync(join(root, 'dist-electron', 'main.js'), 'electron', 'utf8');
    expect(run(root, 'scripts/build-artifact-state.cjs', ['write']).status).toBe(0);

    writeFileSync(join(root, 'dist', 'index.js'), 'tampered', 'utf8');
    const result = run(root, 'scripts/build-artifact-state.cjs', ['check']);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Kompilierte Artefakte');
  });
});

describe('Patch 2 source cleanup safety', () => {
  function prepareCleanupRoot(): string {
    const root = fixture('gremia-cleanup-hardening-');
    copyFileSync('scripts/cleanup-obsolete-files.cjs', join(root, 'scripts', 'cleanup-obsolete-files.cjs'));
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });
    mkdirSync(join(root, '.github'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{}', 'utf8');
    return root;
  }

  it('dry-run reports but does not delete a validated target', () => {
    const root = prepareCleanupRoot();
    const content = 'obsolete';
    writeFileSync(join(root, 'src', 'obsolete.ts'), content, 'utf8');
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [{ path: 'src/obsolete.ts', type: 'file', sha256: sha256(content) }],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs', ['--plan']);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('WOULD DELETE src/obsolete.ts');
    expect(existsSync(join(root, 'src', 'obsolete.ts'))).toBe(true);
  });

  it('aborts on hash mismatch without deleting the target', () => {
    const root = prepareCleanupRoot();
    writeFileSync(join(root, 'src', 'obsolete.ts'), 'changed', 'utf8');
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [{ path: 'src/obsolete.ts', type: 'file', sha256: sha256('expected') }],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('SHA-256 weicht ab');
    expect(existsSync(join(root, 'src', 'obsolete.ts'))).toBe(true);
  });

  it('aborts when package, scripts, workflows or tests still reference the target', () => {
    const root = prepareCleanupRoot();
    writeFileSync(join(root, 'src', 'obsolete.ts'), 'obsolete', 'utf8');
    writeFileSync(join(root, 'tests', 'reference.test.ts'), "import '../src/obsolete';", 'utf8');
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [{ path: 'src/obsolete.ts', type: 'file' }],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('wird noch referenziert');
    expect(result.stderr).toContain('tests/reference.test.ts');
  });

  it('allows cleanup after a file was relocated and only the basename is reused', () => {
    const root = prepareCleanupRoot();
    const oldRootTestPath = ['tests', 'appVersion.test.ts'].join('/');
    const relocatedTestPath = ['tests', 'architecture', 'appVersion.test.ts'].join('/');
    mkdirSync(join(root, 'tests', 'architecture'), { recursive: true });
    writeFileSync(join(root, ...pathSegments(oldRootTestPath)), 'obsolete', 'utf8');
    writeFileSync(join(root, ...pathSegments(relocatedTestPath)), 'current', 'utf8');
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ scripts: { version: `vitest run ${relocatedTestPath}` } }),
      'utf8',
    );
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [{ path: oldRootTestPath, type: 'file' }],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(0);
    expect(existsSync(join(root, ...pathSegments(oldRootTestPath)))).toBe(false);
    expect(existsSync(join(root, ...pathSegments(relocatedTestPath)))).toBe(true);
  });

  it('ignores references between targets that are deleted in the same cleanup transaction', () => {
    const root = prepareCleanupRoot();
    const first = ['tests', 'obsolete-a.test.ts'].join('/');
    const second = ['tests', 'obsolete-b.test.ts'].join('/');
    writeFileSync(join(root, ...pathSegments(first)), `const peer = '${second}';`, 'utf8');
    writeFileSync(join(root, ...pathSegments(second)), `const peer = '${first}';`, 'utf8');
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [
        { path: first, type: 'file' },
        { path: second, type: 'file' },
      ],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(0);
    expect(existsSync(join(root, ...pathSegments(first)))).toBe(false);
    expect(existsSync(join(root, ...pathSegments(second)))).toBe(false);
  });

  it('still rejects an obsolete target referenced by a retained file', () => {
    const root = prepareCleanupRoot();
    const obsolete = ['tests', 'obsolete.test.ts'].join('/');
    const retained = ['tests', 'architecture', 'retained.test.ts'].join('/');
    mkdirSync(join(root, 'tests', 'architecture'), { recursive: true });
    writeFileSync(join(root, ...pathSegments(obsolete)), 'obsolete', 'utf8');
    writeFileSync(join(root, ...pathSegments(retained)), `const oldPath = '${obsolete}';`, 'utf8');
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [{ path: obsolete, type: 'file' }],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('wird noch referenziert');
    expect(result.stderr).toContain(retained);
    expect(existsSync(join(root, ...pathSegments(obsolete)))).toBe(true);
  });

  it('preflights every target before deleting any of them', () => {
    const root = prepareCleanupRoot();
    const first = ['tests', 'first-obsolete.test.ts'].join('/');
    const second = ['tests', 'second-obsolete.test.ts'].join('/');
    const retained = ['tests', 'reference.test.ts'].join('/');
    writeFileSync(join(root, ...pathSegments(first)), 'first', 'utf8');
    writeFileSync(join(root, ...pathSegments(second)), 'second', 'utf8');
    writeFileSync(join(root, ...pathSegments(retained)), `const oldPath = '${second}';`, 'utf8');
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [
        { path: first, type: 'file' },
        { path: second, type: 'file' },
      ],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(1);
    expect(existsSync(join(root, ...pathSegments(first)))).toBe(true);
    expect(existsSync(join(root, ...pathSegments(second)))).toBe(true);
  });

  it('refuses to follow or delete symlink targets', () => {
    const root = prepareCleanupRoot();
    writeFileSync(join(root, 'src', 'real.ts'), 'keep', 'utf8');
    symlinkSync(join(root, 'src', 'real.ts'), join(root, 'src', 'obsolete.ts'));
    writeFileSync(join(root, 'maintenance', 'source-cleanup', 'cleanup-manifest.json'), JSON.stringify({
      version: 'test',
      entries: [{ path: 'src/obsolete.ts', type: 'file' }],
    }), 'utf8');

    const result = run(root, 'scripts/cleanup-obsolete-files.cjs');

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Symlink wird nicht gelöscht');
    expect(readFileSync(join(root, 'src', 'real.ts'), 'utf8')).toBe('keep');
  });
});
