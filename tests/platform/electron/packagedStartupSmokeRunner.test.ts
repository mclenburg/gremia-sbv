import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const runner = path.resolve('scripts/run-packaged-startup-smoke.cjs');

function runFixture(artifactBody: string, timeoutMs: number) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gremia-startup-runner-test-'));
  const releaseDir = path.join(root, 'release');
  const artifactName = 'Gremia.SBV-test-win-x64-portable.exe';
  mkdirSync(releaseDir);
  const artifact = path.join(releaseDir, artifactName);
  writeFileSync(artifact, `#!${process.execPath}\n${artifactBody}\n`);
  chmodSync(artifact, 0o755);
  writeFileSync(path.join(releaseDir, '.gremia-sbv-win-artifact.json'), JSON.stringify({
    version: 2,
    target: 'win',
    artifacts: [{ artifact: artifactName }],
  }));

  try {
    return spawnSync(process.execPath, [runner, 'win'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, GREMIA_SBV_STARTUP_SMOKE_TIMEOUT_MS: String(timeoutMs) },
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe.skipIf(process.platform === 'win32')('Packaged-Startup-Smoke-Runner', () => {
  it('akzeptiert den Startmarker und den vom Artefakt bestätigten Datenpfad', () => {
    const result = runFixture(`
const fs = require('node:fs');
fs.writeFileSync(process.env.GREMIA_SBV_STARTUP_SMOKE_MARKER, JSON.stringify({
  ok: true,
  dataDirectory: process.env.GREMIA_SBV_DATA_DIR,
}));
`, 5_000);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Startup-Smoke-Test OK');
  });

  it('meldet einen Timeout einmalig und unterscheidet einen fehlenden Marker vom Exitcode', () => {
    const result = runFixture('setTimeout(() => {}, 10_000);', 200);

    expect(result.status).toBe(4);
    expect(result.stderr).toContain('Startup-Smoke-Test überschritt 0.2 Sekunden (Marker: fehlt');
    expect(result.stderr).not.toContain('Artefakt endete mit Exitcode');
  });

  it('zeigt bei einem hängenden Launcher, dass die App ihren Start bereits bestätigt hat', () => {
    const result = runFixture(`
const fs = require('node:fs');
fs.writeFileSync(process.env.GREMIA_SBV_STARTUP_SMOKE_MARKER, JSON.stringify({
  ok: true,
  dataDirectory: process.env.GREMIA_SBV_DATA_DIR,
}));
setTimeout(() => {}, 10_000);
`, 200);

    expect(result.status).toBe(4);
    expect(result.stderr).toContain('Marker: vorhanden');
  });
});
