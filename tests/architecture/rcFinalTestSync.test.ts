import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';

describe('Release-Testreferenzen bleiben ausführbar', () => {
  it('besteht den produktiven Readiness-Check ohne verwaiste Testskripte', () => {
    const result = spawnSync(process.execPath, ['scripts/check-release-candidate-readiness.cjs'], {
      cwd: process.cwd(), encoding: 'utf8', env: process.env,
    });
    expect({ status: result.status, stderr: result.stderr, stdout: result.stdout }).toEqual(expect.objectContaining({ status: 0, stderr: '' }));
    expect(result.stdout).toContain('RC-Readiness OK');
  });
});
