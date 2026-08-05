import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('AST-basierte Clean-Code-Grenze für explizites TypeScript-any', () => {
  it('hält den aktuellen Bestand exakt auf der versionierten Baseline', () => {
    const output = execFileSync(process.execPath, ['scripts/report-explicit-any.cjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(output).toContain('Explicit-any-Ratchet: Baseline exakt eingehalten.');
  });
});
