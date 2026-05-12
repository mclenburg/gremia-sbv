import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function createCleanupFixture(prefix: string) {
  const projectRoot = mkdtempSync(join(tmpdir(), prefix));
  const scriptDir = join(projectRoot, 'scripts');
  mkdirSync(scriptDir, { recursive: true });
  copyFileSync('scripts/cleanup-obsolete-files.cjs', join(scriptDir, 'cleanup-obsolete-files.cjs'));
  return projectRoot;
}

describe('Windows source cleanup path handling', () => {
  it('accepts Windows-style manifest paths in known project areas without touching the real worktree', () => {
    const projectRoot = createCleanupFixture('gremia-sbv-cleanup-windows-');
    const targetPath = join(projectRoot, 'tests', 'source-cleanup-windows-path-0812a.tmp');
    const manifestDir = mkdtempSync(join(tmpdir(), 'gremia-sbv-cleanup-manifest-'));
    const manifestPath = join(manifestDir, 'manifest.json');

    mkdirSync(join(projectRoot, 'tests'), { recursive: true });
    writeFileSync(targetPath, 'temporary cleanup guard file', 'utf8');
    writeFileSync(
      manifestPath,
      JSON.stringify({ version: 'cleanup-fixture', files: ['tests\\source-cleanup-windows-path-0812a.tmp'] }),
      'utf8',
    );

    const result = spawnSync(process.execPath, ['scripts/cleanup-obsolete-files.cjs', manifestPath], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    try {
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('Cleanup-Pfad muss in einem bekannten Source-/Projektbereich liegen');
      expect(existsSync(targetPath)).toBe(false);
      expect(existsSync('tests/source-cleanup-windows-path-0812a.tmp')).toBe(false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
      rmSync(manifestDir, { recursive: true, force: true });
    }
  });
});
