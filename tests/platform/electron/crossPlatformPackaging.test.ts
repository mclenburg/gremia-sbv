import {
  closeSync,
  ftruncateSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
  utimesSync,
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
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-cross-platform-packaging-'));
  const releaseDir = path.join(root, 'release');
  mkdirSync(releaseDir, { recursive: true });
  return { root, releaseDir, since: Date.now() - 1_000 };
}

function createCurrentWindowsArtifacts(releaseDir: string): void {
  createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64-portable.exe'), PE_MAGIC);
  createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64.msi'), MSI_MAGIC);
}

function createCurrentWindowsPortableArtifact(releaseDir: string): void {
  createSparseArtifact(path.join(releaseDir, 'Gremia.SBV-test-win-x64-portable.exe'), PE_MAGIC);
}

function runVerifier(root: string, args: string[]) {
  return spawnSync(process.execPath, [verifier, ...args], { cwd: root, encoding: 'utf8' });
}

describe('Cross-Platform-Packaging-Verhalten', () => {
  it('ignoriert ein altes Windows-Endanwenderartefakt vor dem aktuellen Packaging-Start', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      const legacySetup = path.join(releaseDir, 'Gremia.SBV-alt-win-x64-setup.exe');
      createSparseArtifact(legacySetup, PE_MAGIC);
      const old = new Date(since - 60_000);
      utimesSync(legacySetup, old, old);
      createCurrentWindowsArtifacts(releaseDir);

      const result = runVerifier(root, ['win', '--since', String(since)]);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('ignoriert interne win-unpacked-EXEs bei der Endanwender-Artefaktprüfung', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      createCurrentWindowsArtifacts(releaseDir);
      const unpackedDir = path.join(releaseDir, 'win-unpacked');
      mkdirSync(unpackedDir, { recursive: true });
      createSparseArtifact(path.join(unpackedDir, 'Gremia.SBV.exe'), PE_MAGIC);

      const result = runVerifier(root, ['win', '--since', String(since)]);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('kann einen unveränderten Windows-Build über den geschriebenen Buildbeleg erneut verifizieren', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      createCurrentWindowsArtifacts(releaseDir);

      const initial = runVerifier(root, ['win', '--since', String(since), '--write-receipt']);
      expect(initial.status).toBe(0);

      const repeated = runVerifier(root, ['win']);
      expect(repeated.status).toBe(0);
      expect(repeated.stderr).toBe('');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('akzeptiert im PR-Vertrag eine portable Windows-EXE ohne MSI', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      createCurrentWindowsPortableArtifact(releaseDir);

      const result = runVerifier(root, ['win-portable', '--since', String(since), '--write-receipt']);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('Gremia.SBV-test-win-x64-portable.exe');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('lässt den vollständigen Windows-Release-Vertrag weiter an fehlender MSI scheitern', () => {
    const { root, releaseDir, since } = createFixture();
    try {
      createCurrentWindowsPortableArtifact(releaseDir);

      const result = runVerifier(root, ['win', '--since', String(since)]);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('msi-Artefakt erwartet');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
