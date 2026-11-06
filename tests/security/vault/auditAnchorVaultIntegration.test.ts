import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SecurityService } from '../../../services/securityService.js';
import { PersonalDataAuditLogService } from '../../../services/auditLogService.js';

const PASSWORD = 'AuditTestPasswort!2026';

describe('Audit-Anker im echten Tresor', () => {
  it('verweigert das Öffnen, wenn die Ankerdatei nach der Einrichtung entfernt wurde', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gsbv-audit-anchor-missing-'));
    const service = new SecurityService(root);
    try {
      expect((await service.setupInitialPassword(PASSWORD)).ok).toBe(true);
      service.lock();
      rmSync(path.join(root, 'audit-integrity.anchor'));
      const result = await service.unlock(PASSWORD);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Audit');
    } finally {
      service.lock();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('erkennt nach Sperren eine absichtliche Kürzung der Datenbank beim nächsten Öffnen', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gsbv-audit-vault-'));
    const service = new SecurityService(root);
    try {
      const setup = await service.setupInitialPassword(PASSWORD);
      expect(setup.ok).toBe(true);
      const audit = new PersonalDataAuditLogService(service.getActiveDatabase());
      audit.append({ action: 'create', subjectType: 'case', purpose: 'SBV-Datenschutzereignis' });
      service.lock();
      expect(existsSync(path.join(root, 'audit-integrity.anchor'))).toBe(true);

      const fullChainScan = vi.spyOn(PersonalDataAuditLogService.prototype, 'verifyChain');
      const reopened = await service.unlock(PASSWORD);
      expect(reopened.ok).toBe(true);
      expect(fullChainScan).not.toHaveBeenCalled();
      fullChainScan.mockRestore();
      const db = service.getActiveDatabase();
      db.exec('DROP TRIGGER personal_data_audit_no_delete');
      db.exec('DELETE FROM personal_data_audit_log WHERE sequence = 1');
      service.lock();
      const result = await service.unlock(PASSWORD);
      expect(result.ok).toBe(true);
      expect(service.status().auditIntegrityState).toBe('checking');
      expect(service.getActiveDatabase()).toBeTruthy();
      expect(() => service.checkpointAuditIntegrityForBackup()).toThrow('noch nicht erfolgreich');
      await vi.waitFor(() => expect(service.status().auditIntegrityState).toBe('failed'), { timeout: 10_000 });
      expect(service.status().unlocked).toBe(false);
      expect(() => service.getActiveDatabase()).toThrow('gesperrt');
    } finally {
      service.lock();
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('meldet eine Kürzung nach der Hintergrundprüfung beim Sperren', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'gsbv-audit-tail-'));
    const service = new SecurityService(root);
    try {
      expect((await service.setupInitialPassword(PASSWORD)).ok).toBe(true);
      service.lock();
      expect((await service.unlock(PASSWORD)).ok).toBe(true);
      await vi.waitFor(() => expect(service.status().auditIntegrityState).toBe('verified'), { timeout: 10_000 });
      const db = service.getActiveDatabase();
      const added = new PersonalDataAuditLogService(db).append({ action: 'create', subjectType: 'case', purpose: 'SBV-Datenschutzereignis' });
      db.exec('DROP TRIGGER personal_data_audit_no_delete');
      db.prepare('DELETE FROM personal_data_audit_log WHERE sequence = ?').run(added.sequence);
      service.lock();
      expect(service.status()).toMatchObject({ unlocked: false, auditIntegrityState: 'failed' });
      expect(service.status().error).toContain('Integritätsprüfung');
    } finally {
      service.lock();
      rmSync(root, { recursive: true, force: true });
    }
  });
});
