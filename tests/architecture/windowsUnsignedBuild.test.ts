import {
  closeSync,
  ftruncateSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  writeSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const verifier = path.resolve('scripts/verify-release-artifacts.cjs');
const PE_MAGIC = Buffer.from([0x4d, 0x5a]);
const MSI_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ARTIFACT_BYTES = 26 * 1024 * 1024;

function createSparseArtifact(pathname: string, magic: Buffer): void {
  const fd = openSync(pathname, 'w');
  try {
    writeSync(fd, magic, 0, magic.length, 0);
    ftruncateSync(fd, ARTIFACT_BYTES);
  } finally {
    closeSync(fd);
  }
}

function createFixture(): { root: string; releaseDir: string; since: number } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-windows-release-contract-'));
  const releaseDir = path.join(root, 'release');
  mkdirSync(releaseDir, { recursive: true });
  return { root, releaseDir, since: Date.now() - 1_000 };
}

function runVerifier(root: string, since: number) {
  return spawnSync(process.execPath, [verifier, 'win', '--since', String(since)], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('Windows Release-Vertrag', () => {
  it('akzeptiert portable EXE und MSI gemeinsam als Windows-Endanwenderartefakte', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64-portable.exe'), PE_MAGIC);
      createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64.msi'), MSI_MAGIC);

      const result = runVerifier(root, since);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lehnt den früheren NSIS-Setup-Pfad ohne MSI als unvollständigen Windows-Release ab', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64-portable.exe'), PE_MAGIC);
      createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64-setup.exe'), PE_MAGIC);

      const result = runVerifier(root, since);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('msi-Artefakt erwartet');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
