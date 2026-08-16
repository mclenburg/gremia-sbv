import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('sandboxed preload architecture', () => {
  it('besteht die transitive Preload-Quellgrenzenprüfung', () => {
    const result = spawnSync(process.execPath, ['scripts/check-preload-source-boundary.cjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('Preload-Quellgrenzen OK:');
  });
});
