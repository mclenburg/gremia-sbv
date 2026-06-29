import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('0.9.5-e local GitHub build command', () => {
  it('prints the GitHub-like quality-gate sequence in dry-run mode without executing it', () => {
    const result = spawnSync(process.execPath, ['scripts/run-github-build-current-os.cjs', '--dry-run'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    const output = `${result.stdout}\n${result.stderr}`;
    expect(output).toContain('Dry-Run: Befehle werden nur ausgegeben, nicht ausgeführt.');
    expect(output).toContain('▶ npm ci');
    expect(output).toContain('▶ npm run security:audit');
    expect(output).toContain('▶ npm run licenses:generate');
    expect(output).toContain('▶ npm run licenses:check');
    expect(output).toContain('▶ npm run release:check');
    expect(output).toMatch(/▶ npm run build:(linux|win|mac)/);
    expect(output).toContain('E2E-Tests laufen standardmäßig mit 2 Workern');
  });
});
