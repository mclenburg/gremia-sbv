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

function createReleaseDirectory(): { root: string; releaseDir: string; since: number } {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-msi-artifact-'));
  const releaseDir = path.join(root, 'release');
  mkdirSync(releaseDir, { recursive: true });
  return { root, releaseDir, since: Date.now() - 1_000 };
}

function createPortable(releaseDir: string): string {
  const artifact = path.join(releaseDir, 'Gremia.SBV-test-win-x64-portable.exe');
  createSparseArtifact(artifact, PE_MAGIC);
  return artifact;
}

function createMsi(releaseDir: string, magic = MSI_MAGIC): string {
  const artifact = path.join(releaseDir, 'Gremia.SBV-test-win-x64.msi');
  createSparseArtifact(artifact, magic);
  return artifact;
}

function runVerifier(root: string, since: number) {
  return spawnSync(process.execPath, [verifier, 'win', '--since', String(since)], {
    cwd: root,
    encoding: 'utf8',
  });
}

describe('Windows Release-Artefakte', () => {
  it('akzeptiert genau eine portable EXE und eine gültige MSI', () => {
    const { root, releaseDir, since } = createReleaseDirectory();
    try {
      createPortable(releaseDir);
      createMsi(releaseDir);

      const result = runVerifier(root, since);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Gremia.SBV-test-win-x64-portable.exe');
      expect(result.stdout).toContain('Gremia.SBV-test-win-x64.msi');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('verweigert den Release, wenn die MSI fehlt', () => {
    const { root, releaseDir, since } = createReleaseDirectory();
    try {
      createPortable(releaseDir);

      const result = runVerifier(root, since);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('msi-Artefakt erwartet');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('verweigert eine Datei mit MSI-Endung aber falscher Binärsignatur', () => {
    const { root, releaseDir, since } = createReleaseDirectory();
    try {
      createPortable(releaseDir);
      createMsi(releaseDir, Buffer.from('NOT-MSI!'));

      const result = runVerifier(root, since);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Dateisignatur passt nicht zu .msi');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('verweigert eine zusätzliche alte Setup-EXE als Release-Artefakt', () => {
    const { root, releaseDir, since } = createReleaseDirectory();
    try {
      createPortable(releaseDir);
      createMsi(releaseDir);
      createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64-setup.exe'), PE_MAGIC);

      const result = runVerifier(root, since);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('unerwartete aktuelle Endanwenderartefakte');
      expect(result.stderr).toContain('Gremia.SBV-test-win-x64-setup.exe');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
