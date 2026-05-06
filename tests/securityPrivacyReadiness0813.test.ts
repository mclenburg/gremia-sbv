import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
const securityService = readFileSync('services/securityService.ts', 'utf8');
const backupService = readFileSync('services/backupService.ts', 'utf8');
const runE2e = readFileSync('scripts/run-e2e.cjs', 'utf8');
const noteLinkExportTest = readFileSync('tests/caseNoteLinkExportPrivacy0812.test.ts', 'utf8');

describe('RC security and privacy readiness', () => {
  it('keeps native dependency and unlock-delay security contracts in place', () => {
    expect(packageJson.scripts.postinstall).toBe('electron-builder install-app-deps');
    expect(securityService).toContain('MAX_UNLOCK_DELAY_MS');
    expect(securityService).toContain('failedUnlockAttempts');
    expect(securityService).not.toContain('localStorage');
  });

  it('keeps backup KDF and legacy restore contracts explicit', () => {
    expect(backupService).toContain('CURRENT_BACKUP_SCRYPT_PARAMS');
    expect(backupService).toContain('131072');
    expect(backupService).toContain('LEGACY_BACKUP_SCRYPT_PARAMS');
  });

  it('keeps E2E runs isolated and export privacy guarded', () => {
    expect(runE2e).toContain('GREMIA_SBV_E2E_DATA_DIR');
    expect(runE2e).toContain('gremia-sbv-e2e-');
    expect(runE2e).toContain('GREMIA_SBV_DATA_DIR');
    expect(noteLinkExportTest).toContain("subjectType: 'case_note_link'");
    expect(noteLinkExportTest).toContain('targetType: link.targetType');
    expect(noteLinkExportTest).toContain("not.toContain('metadata: { content");
  });
});
