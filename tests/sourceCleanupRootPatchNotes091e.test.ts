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

describe('root patch note cleanup', () => {
  it('removes explicitly whitelisted transient root patch notes through the cleanup helper in an isolated fixture', () => {
    const projectRoot = createCleanupFixture('gremia-sbv-cleanup-root-notes-');
    const targetPath = join(projectRoot, 'PATCH_NOTES_0.9.1_MEASURE_NOTES.md');
    const manifestDir = join(projectRoot, 'maintenance', 'source-cleanup');
    const manifestPath = join(manifestDir, 'obsolete-root-patch-notes-0.9.1-measure-notes.json');

    mkdirSync(manifestDir, { recursive: true });
    writeFileSync(targetPath, 'temporary patch note', 'utf8');
    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: '0.9.1-measure-notes-root-patch-note-cleanup',
        files: ['PATCH_NOTES_0.9.1_MEASURE_NOTES.md'],
      }),
      'utf8',
    );

    const result = spawnSync(process.execPath, ['scripts/cleanup-obsolete-files.cjs'], {
      cwd: projectRoot,
      encoding: 'utf8',
    });

    try {
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('Cleanup-Pfad muss in einem bekannten Source-/Projektbereich liegen');
      expect(existsSync(targetPath)).toBe(false);
      expect(existsSync('PATCH_NOTES_0.9.1_MEASURE_NOTES.md')).toBe(false);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
