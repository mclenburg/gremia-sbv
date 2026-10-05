import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecurityService } from '../../../services/securityService';

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

describe('unlock delay behavior', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of createdDirs.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  it('setzt eine begrenzte Verzögerung ohne permanenten Lockout durch', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.UTC(2026, 0, 1));
    await service.unlock('wrong-1');
    await service.unlock('wrong-2');
    await service.unlock('wrong-3');
    const blocked = await service.unlock(PASSWORD);

    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain('Zu viele falsche Entsperrversuche');
    expect(blocked.unlockDelaySeconds).toBeGreaterThan(0);
    expect(blocked.unlockDelaySeconds).toBeLessThanOrEqual(5 * 60);
    expect(service.isUnlocked()).toBe(false);
    expect(blocked.unlockAvailableAt).toBeDefined();

    const availableAt = Date.parse(blocked.unlockAvailableAt!);
    clock.mockReturnValue(availableAt - 1);
    expect((await service.unlock(PASSWORD)).ok).toBe(false);
    expect(service.status().unlockDelaySeconds).toBe(1);
    expect(service.isUnlocked()).toBe(false);

    clock.mockReturnValue(availableAt);
    expect(service.status().unlockDelaySeconds).toBeUndefined();
    expect(await service.unlock(PASSWORD)).toMatchObject({ ok: true, unlocked: true });
    expect(service.isUnlocked()).toBe(true);

    service.lock();
    const nextFailedAttempt = await service.unlock('wrong-after-success');
    expect(nextFailedAttempt.ok).toBe(false);
    expect(nextFailedAttempt.unlockDelaySeconds).toBeUndefined();
    expect(await service.unlock(PASSWORD)).toMatchObject({ ok: true, unlocked: true });
  });
});
