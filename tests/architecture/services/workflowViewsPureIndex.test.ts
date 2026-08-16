import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('workflowViews pure index', () => {
  it('besteht die AST-basierte Architekturgrenze für reine Re-Exports', () => {
    const result = spawnSync(process.execPath, ['scripts/check-workflow-view-index.cjs'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain('workflowViews-Architektur OK:');
  });
});
