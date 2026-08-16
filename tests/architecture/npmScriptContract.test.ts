import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  missingOrOutOfOrderSteps,
  splitNpmScript,
  unexpectedSteps,
} = require('../../scripts/lib/npm-script-contract.cjs') as {
  splitNpmScript(command: unknown): string[];
  missingOrOutOfOrderSteps(command: unknown, requiredSteps: string[]): string[];
  unexpectedSteps(command: unknown, forbiddenSteps: string[]): string[];
};

const pkg = require('../../package.json') as {
  scripts?: Record<string, string>;
};

describe('npm script contract', () => {

  it('trennt persistente Browser-E2E von zwingend isolierten Browserprüfungen, während Full-Product separat bleibt', () => {
    expect(pkg.scripts?.['test:e2e:ui-flows']).toBe('node scripts/run-e2e.cjs --project=ui-flows');
    expect(pkg.scripts?.['test:e2e:visual-a11y']).toBe('node scripts/run-e2e.cjs --project=visual-a11y');
    expect(pkg.scripts?.['test:e2e:isolated']).toBe('node scripts/run-e2e.cjs --project=isolated-browser --no-deps');
    expect(pkg.scripts?.['test:e2e:full-product']).toBe('node scripts/run-full-product-e2e.cjs');
  });

  it('führt die vollständige TypeScript-Prüfung vor dem teuren Coverage-Lauf aus', () => {
    expect(missingOrOutOfOrderSteps(pkg.scripts?.['build:verify'], [
      'npm run lint',
      'npm run typecheck',
      'npm run test:coverage',
    ])).toEqual([]);
  });

  it('normalisiert verkettete npm-Schritte deterministisch', () => {
    expect(splitNpmScript(' npm run first && npm run second  &&  node task.cjs ')).toEqual([
      'npm run first',
      'npm run second',
      'node task.cjs',
    ]);
    expect(splitNpmScript(undefined)).toEqual([]);
  });

  it('erkennt fehlende und falsch angeordnete Quality Gates', () => {
    const command = 'npm run lint && npm run rc:check && npm run build:app';
    expect(missingOrOutOfOrderSteps(command, [
      'npm run rc:check',
      'npm run lint',
      'npm run test:coverage',
      'npm run build:app',
    ])).toEqual([
      'falsche Reihenfolge: npm run lint',
      'fehlt: npm run test:coverage',
    ]);
  });

  it('erkennt verbotene vollständige Buildschritte ohne Teilstring-Fehlalarm', () => {
    const command = 'npm run lint && npm run test:coverage-report && vite build';
    expect(unexpectedSteps(command, ['npm run test:coverage', 'vitest run'])).toEqual([]);
    expect(unexpectedSteps(`${command} && vitest run`, ['npm run test:coverage', 'vitest run'])).toEqual(['vitest run']);
  });
});
