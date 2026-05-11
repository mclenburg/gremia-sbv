import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeAuditMetadata } from '../services/auditHashChain';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
const securityService = readFileSync('services/securityService.ts', 'utf8');
const backupService = readFileSync('services/backupService.ts', 'utf8');
const runE2e = readFileSync('scripts/run-e2e.cjs', 'utf8');

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

  it('keeps E2E runs isolated and audit metadata datensparsam', () => {
    expect(runE2e).toContain('GREMIA_SBV_E2E_DATA_DIR');
    expect(runE2e).toContain('gremia-sbv-e2e-');
    expect(runE2e).toContain('GREMIA_SBV_DATA_DIR');

    const metadataJson = normalizeAuditMetadata({
      subjectId: 'case-note-link-uuid',
      caseId: 'case-uuid',
      action: 'create',
      purpose: 'case_note_link',
      timestamp: '2026-05-11T09:45:00.000Z',
      content: 'Max Mustermann Diagnose Burnout',
      targetType: 'bem',
      targetId: 'bem-uuid',
      email: 'max.mustermann@example.invalid',
    });

    expect(metadataJson).toContain('case-note-link-uuid');
    expect(metadataJson).toContain('case-uuid');
    expect(metadataJson).not.toContain('Max Mustermann');
    expect(metadataJson).not.toContain('Burnout');
    expect(metadataJson).not.toContain('targetType');
    expect(metadataJson).not.toContain('bem-uuid');
    expect(metadataJson).not.toContain('max.mustermann@example.invalid');
  });
});
