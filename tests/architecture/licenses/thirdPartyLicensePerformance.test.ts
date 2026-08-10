import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('Drittlizenz-Erzeugung – inkrementeller Schnellpfad', () => {
  it('überspringt unveränderte Lockfile- und Lizenzartefakte ohne Registry- oder Tarballarbeit', () => {
    const startedAt = performance.now();
    const result = spawnSync(process.execPath, ['scripts/generate-third-party-licenses-fast.cjs'], {
      cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NPM_REGISTRY_URL: 'http://127.0.0.1:1' },
    });
    const elapsedMs = performance.now() - startedAt;

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('generation skipped');
    expect(elapsedMs).toBeLessThan(2_000);
  });
});
