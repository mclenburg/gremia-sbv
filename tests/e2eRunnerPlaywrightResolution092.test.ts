import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireFromTest = createRequire(import.meta.url);
const runner = requireFromTest('../scripts/run-e2e.cjs') as {
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
