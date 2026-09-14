import {
  appendFileSync,
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

function createWindowsReleaseFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-release-receipt-'));
  const releaseDir = path.join(root, 'release');
  const unpackedDir = path.join(releaseDir, 'win-unpacked');
  mkdirSync(unpackedDir, { recursive: true });
  const since = Date.now() - 1_000;
  const portable = path.join(releaseDir, 'Gremia.SBV-test-win-x64-portable.exe');
  const msi = path.join(releaseDir, 'Gremia.SBV-test-win-x64.msi');
  createSparseArtifact(portable, PE_MAGIC);
  createSparseArtifact(msi, MSI_MAGIC);
  createSparseArtifact(path.join(unpackedDir, 'Gremia.SBV.exe'), PE_MAGIC);
  return { root, since, portable, msi };
}

function runVerifier(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [verifier, 'win', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('Windows Release-Buildbeleg', () => {
  it('schreibt für portable EXE und MSI einen Buildbeleg und kann ihn erneut verifizieren', () => {
    const { root, since } = createWindowsReleaseFixture();
    try {
      const initial = runVerifier(root, '--since', String(since), '--write-receipt');
      expect(initial.status).toBe(0);
      expect(initial.stderr).toBe('');

      const repeated = runVerifier(root);
      expect(repeated.status).toBe(0);
      expect(repeated.stderr).toBe('');
      expect(repeated.stdout).toContain('Release-Artefakt OK');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignoriert interne win-unpacked-EXEs bei der Endanwenderprüfung', () => {
    const { root, since } = createWindowsReleaseFixture();
    try {
      const result = runVerifier(root, '--since', String(since));

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('erkennt eine nachträgliche Veränderung der MSI nach Ausstellung des Buildbelegs', () => {
    const { root, since, msi } = createWindowsReleaseFixture();
    try {
      const initial = runVerifier(root, '--since', String(since), '--write-receipt');
      expect(initial.status).toBe(0);

      appendFileSync(msi, Buffer.from([0x00]));
      const repeated = runVerifier(root);

      expect(repeated.status).not.toBe(0);
      expect(repeated.stderr).toContain('Artefakte stimmen nicht mehr mit dem Buildbeleg überein');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
