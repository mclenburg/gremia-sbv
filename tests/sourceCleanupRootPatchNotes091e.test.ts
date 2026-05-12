import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('root patch note cleanup', () => {
  it('removes explicitly whitelisted transient root patch notes through the cleanup helper', () => {
    const targetPath = 'PATCH_NOTES_0.9.1_MEASURE_NOTES.md';
    writeFileSync(targetPath, 'temporary patch note', 'utf8');

    const result = spawnSync('node', ['scripts/cleanup-obsolete-files.cjs', 'maintenance/source-cleanup/obsolete-root-patch-notes-0.9.1-measure-notes.json'], {
      encoding: 'utf8',
    });

    try {
      expect(result.status).toBe(0);
      expect(result.stderr).not.toContain('Cleanup-Pfad muss in einem bekannten Source-/Projektbereich liegen');
      expect(existsSync(targetPath)).toBe(false);
    } finally {
      if (existsSync(targetPath)) rmSync(targetPath, { force: true });
    }
  });
});
