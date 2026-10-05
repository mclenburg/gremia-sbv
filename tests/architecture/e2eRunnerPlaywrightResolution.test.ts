import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const requireFromTest = createRequire(import.meta.url);
const runner = requireFromTest('../../scripts/run-e2e.cjs') as {
  buildPlaywrightArgs(args: string[]): { keep: boolean; playwrightArgs: string[] };
  isSafeE2eDir(value: string): boolean;
  normalizeSpecPathArg(arg: string): string;
  resolvePlaywrightRunner(root: string): { kind: string; command: string; argsPrefix: string[] } | null;
};

function withTempProject(testBody: (root: string) => void) {
  const root = join(tmpdir(), `gremia-sbv-e2e-runner-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"name":"runner-test"}\n');
    testBody(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('E2E runner Playwright instance resolution', () => {
  it('prefers the project-resolved Playwright CLI when specs would resolve @playwright/test from the project', () => {
    withTempProject((root) => {
      const packageRoot = join(root, 'node_modules', '@playwright', 'test');
      mkdirSync(packageRoot, { recursive: true });
      writeFileSync(join(packageRoot, 'package.json'), '{"name":"@playwright/test"}\n');
      writeFileSync(join(packageRoot, 'cli.js'), 'process.exit(0);\n');

      const resolved = runner.resolvePlaywrightRunner(root);

      expect(resolved?.kind).toBe('project-cli');
      expect(resolved?.command).toBe(process.execPath);
      expect(resolved?.argsPrefix[0]).toBe(resolve(packageRoot, 'cli.js'));
    });
  });

  it('normalizes spec path arguments but keeps flags untouched', () => {
    const args = runner.buildPlaywrightArgs(['--headed', 'e2e\\deadlines-ical.spec.ts', '--grep', 'iCal']);

    expect(args.keep).toBe(false);
    expect(args.playwrightArgs).toEqual(['test', join('e2e', 'deadlines-ical.spec.ts'), '--grep', 'iCal', '--headed']);
  });

  it('keeps the temporary data directory guard strict and platform-independent', () => {
    const safePath = join(tmpdir(), 'gremia-sbv-e2e-runner-safe');

    expect(runner.isSafeE2eDir(safePath)).toBe(true);
    expect(runner.isSafeE2eDir(join(tmpdir(), 'not-gremia-sbv'))).toBe(false);
    expect(runner.isSafeE2eDir('')).toBe(false);
  });
});

function invokeRunner(root: string, args: string[]) {
  const packageRoot = join(root, 'node_modules', '@playwright', 'test');
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(join(packageRoot, 'package.json'), '{"name":"@playwright/test"}\n');
  writeFileSync(join(packageRoot, 'cli.js'), 'console.log(JSON.stringify(process.argv.slice(2)));\n');
  return spawnSync(process.execPath, [resolve('scripts/run-e2e.cjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, GREMIA_SBV_E2E_DATA_DIR: '' },
  });
}

describe('explicit E2E spec selection', () => {
  it('rejects a missing spec even when another requested spec exists', () => {
    withTempProject((root) => {
      mkdirSync(join(root, 'e2e'));
      writeFileSync(join(root, 'e2e', 'existing.spec.ts'), '');
      const result = invokeRunner(root, ['e2e/existing.spec.ts', 'e2e/missing.spec.ts']);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('e2e/missing.spec.ts');
      expect(result.stdout).toBe('');
    });
  });

  it('rejects a directory masquerading as a spec file', () => {
    withTempProject((root) => {
      mkdirSync(join(root, 'e2e', 'directory.spec.ts'), { recursive: true });
      const result = invokeRunner(root, ['e2e/directory.spec.ts']);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(2);
      expect(result.stderr).toContain('e2e/directory.spec.ts');
      expect(result.stdout).toBe('');
    });
  });

  it('accepts existing Windows-style paths and preserves grep values that resemble paths', () => {
    withTempProject((root) => {
      mkdirSync(join(root, 'e2e'));
      writeFileSync(join(root, 'e2e', 'existing.spec.ts'), '');
      const result = invokeRunner(root, ['e2e\\existing.spec.ts', '--grep', 'e2e/missing.spec.ts']);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const cliArgs = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '[]');
      expect(cliArgs).toEqual(['test', join('e2e', 'existing.spec.ts'), '--grep', 'e2e/missing.spec.ts']);
    });
  });

  it.each([
    { args: [] },
    { args: ['e2e/.*.spec.ts'] },
    { args: ['--grep-invert', 'e2e/missing.spec.ts', '--project=ui-flows'] },
  ])('preserves full-suite and pattern selections: $args', ({ args }) => {
    withTempProject((root) => {
      const result = invokeRunner(root, args);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(0);
      const cliArgs = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '[]');
      expect(cliArgs).toEqual(['test', ...args]);
    });
  });

});
