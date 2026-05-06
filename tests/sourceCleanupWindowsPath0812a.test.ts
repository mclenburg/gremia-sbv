import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('0.8.12-a Windows source cleanup path handling', () => {
  it('accepts Windows-style manifest paths in known project areas', () => {
    const targetPath = 'tests/source-cleanup-windows-path-0812a.tmp';
    const manifestDir = mkdtempSync(join(tmpdir(), 'gremia-sbv-cleanup-'));
    const manifestPath = join(manifestDir, 'manifest.json');

    writeFileSync(targetPath, 'temporary cleanup guard file', 'utf8');
    writeFileSync(
      manifestPath,
      JSON.stringify({ version: '0.8.12-a', files: ['tests\\source-cleanup-windows-path-0812a.tmp'] }),
      'utf8',
    );

    const result = spawnSync('node', ['scripts/cleanup-obsolete-files.cjs', manifestPath], {
      encoding: 'utf8',
    });

    try {
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('Cleanup-Pfad muss in einem bekannten Source-/Projektbereich liegen');
      expect(existsSync(targetPath)).toBe(false);
    } finally {
      if (existsSync(targetPath)) rmSync(targetPath, { force: true });
      rmSync(manifestDir, { recursive: true, force: true });
    }
  });
});
