import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecurityService } from '../services/securityService';

type VaultDatabaseOpener = {
  openAndInitializeVaultDatabase(databaseKey: Buffer): Promise<void>;
};

const PASSWORD = 'SehrSicheresPasswort!2026';

function tempDataDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'gremia-sbv-unlock-delay-'));
}

function createService(dataDir: string): SecurityService {
  const service = new SecurityService(dataDir);
  vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockResolvedValue(undefined);
  return service;
}

describe('0.8.9 unlock delay', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of createdDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  it('hält fehlgeschlagene Entsperrversuche nur im Arbeitsspeicher', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    await service.unlock('wrong-1');
    await service.unlock('wrong-2');
    const delayed = await service.unlock('wrong-3');

    expect(delayed.ok).toBe(false);
    expect(delayed.unlockDelaySeconds).toBeGreaterThan(0);
    expect(readFileSync(path.join(dataDir, 'security.json'), 'utf8')).not.toContain('failedUnlockAttempts');

    const restarted = createService(dataDir);
    expect(restarted.status().unlockDelaySeconds).toBeUndefined();
  });

  it('setzt eine begrenzte Verzögerung ohne permanenten Lockout durch', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    await service.unlock('wrong-1');
    await service.unlock('wrong-2');
    await service.unlock('wrong-3');
    const blocked = await service.unlock(PASSWORD);

    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain('Zu viele falsche Entsperrversuche');
    expect(blocked.unlockDelaySeconds).toBeGreaterThan(0);
    expect(blocked.unlockDelaySeconds).toBeLessThanOrEqual(5 * 60);
  });

  it('setzt die Verzögerung nach erfolgreicher Entsperrung zurück', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    await service.unlock('wrong-1');
    const unlocked = await service.unlock(PASSWORD);

    expect(unlocked).toMatchObject({ ok: true, initialized: true, unlocked: true });
    expect(service.status().unlockDelaySeconds).toBeUndefined();
  });
});
