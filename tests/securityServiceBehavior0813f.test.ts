import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecurityService } from '../services/securityService';

const PASSWORD = 'SehrSicheresPasswort!2026';
const NEXT_PASSWORD = 'NochSichereresPasswort!2026';
const LEGACY_TEST_SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function deriveLegacyTestKey(secret: string, saltHex: string, context: string): Buffer {
  return scryptSync(`${context}:${secret}`, Buffer.from(saltHex, 'hex'), 32, LEGACY_TEST_SCRYPT_PARAMS);
}

function deriveLegacyPasswordVerifier(password: string, saltHex: string): string {
  const context = 'gremia-sbv-auth-v3';
  const key = deriveLegacyTestKey(password, saltHex, context);
  try {
    return createHash('sha256').update(context).update(':').update(key).digest('hex');
  } finally {
    key.fill(0);
  }
}

function wrapLegacyDatabaseKey(databaseKey: Buffer, password: string, saltHex: string) {
  const kek = deriveLegacyTestKey(password, saltHex, 'gremia-sbv-dbkey-password-v1');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', kek, iv);
  const ciphertext = Buffer.concat([cipher.update(databaseKey), cipher.final()]);
  try {
    return {
      version: 1,
      algorithm: 'aes-256-gcm',
      kdf: 'scrypt',
      salt: saltHex,
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex'),
      ciphertext: ciphertext.toString('hex'),
    };
  } finally {
    kek.fill(0);
    iv.fill(0);
  }
}

type VaultDatabaseOpener = {
  openAndInitializeVaultDatabase(databaseKey: Buffer): Promise<void>;
};

function tempDataDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'gremia-sbv-security-'));
}

function createService(dataDir: string): SecurityService {
  const service = new SecurityService(dataDir);
  vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockResolvedValue(undefined);
  return service;
}

function readSecurityStore(dataDir: string): { passwordVerifier: string; kdfParams?: { N: number; r: number; p: number }; databaseKeyWrap?: { kdfParams?: { N: number; r: number; p: number } } } {
  return JSON.parse(readFileSync(path.join(dataDir, 'security.json'), 'utf8'));
}

describe('security service behavior', () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of createdDirs.splice(0)) {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('unlocks with the correct password and resets failed-attempt delay state', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);

    const setup = await service.setupInitialPassword(PASSWORD);
    expect(setup.ok).toBe(true);

    service.lock();
    const wrong = await service.unlock('falsches-passwort');
    expect(wrong.ok).toBe(false);
    expect(wrong.error).toContain('Passwort');

    const correct = await service.unlock(PASSWORD);
    expect(correct).toMatchObject({ ok: true, initialized: true, unlocked: true });
    expect(service.status().unlockDelaySeconds).toBeUndefined();
    expect(service.isUnlocked()).toBe(true);
  });

  it('blocks unlock temporarily after repeated wrong passwords and does not persist the attempt counter', async () => {
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
    expect(delayed.unlockAvailableAt).toBeTruthy();
    expect(readFileSync(path.join(dataDir, 'security.json'), 'utf8')).not.toContain('failedUnlockAttempts');

    const freshService = createService(dataDir);
    const freshStatus = freshService.status();
    expect(freshStatus.unlockDelaySeconds).toBeUndefined();
  });

  it('rejects an unlock attempt while the delay window is active', async () => {
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
  });

  it('resets the password with a recovery key and allows unlock with the new password', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    const setup = await service.setupInitialPassword(PASSWORD);
    expect(setup.recoveryKey).toBeTruthy();

    service.lock();
    rmSync(path.join(dataDir, 'security.json'), { force: true });
    const recovery = await service.resetPasswordWithRecoveryKey(setup.recoveryKey!, NEXT_PASSWORD);

    expect(recovery).toMatchObject({ ok: true, initialized: true, unlocked: true });
    service.lock();
    const unlock = await service.unlock(NEXT_PASSWORD);
    expect(unlock.ok).toBe(true);
  });

  it('rejects a wrong recovery key without creating a password store', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);

    service.lock();
    rmSync(path.join(dataDir, 'security.json'), { force: true });
    const recovery = await service.resetPasswordWithRecoveryKey('AAAA-BBBB-CCCC-DDDD', NEXT_PASSWORD);

    expect(recovery.ok).toBe(false);
    expect(recovery.error).toContain('Recovery-Key');
  });

  it('changes the password only after verifying the current password', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    const failed = await service.changePassword('falsch', NEXT_PASSWORD);
    expect(failed.ok).toBe(false);

    const changed = await service.changePassword(PASSWORD, NEXT_PASSWORD);
    expect(changed.ok).toBe(true);
    service.lock();

    expect((await service.unlock(PASSWORD)).ok).toBe(false);
    expect((await service.unlock(NEXT_PASSWORD)).ok).toBe(true);
    expect(readSecurityStore(dataDir).kdfParams?.N).toBeGreaterThanOrEqual(131072);
  });


  it('migriert schwächere KDF-Parameter beim erfolgreichen Entsperren automatisch', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    const databaseKey = service.getActiveDatabaseKey();
    service.lock();
    const storePath = path.join(dataDir, 'security.json');
    const store = JSON.parse(readFileSync(storePath, 'utf8')) as {
      salt: string;
      passwordVerifier: string;
      kdfParams?: { N: number; r: number; p: number; maxmem?: number };
      databaseKeyWrap: Record<string, unknown>;
    };
    const legacySalt = randomBytes(16).toString('hex');
    const legacyWrapSalt = randomBytes(16).toString('hex');
    store.salt = legacySalt;
    store.passwordVerifier = deriveLegacyPasswordVerifier(PASSWORD, legacySalt);
    store.databaseKeyWrap = wrapLegacyDatabaseKey(databaseKey, PASSWORD, legacyWrapSalt);
    delete store.kdfParams;
    writeFileSync(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
    databaseKey.fill(0);

    const unlock = await service.unlock(PASSWORD);
    expect(unlock.ok).toBe(true);
    const migrated = readSecurityStore(dataDir);
    expect(migrated.kdfParams?.N).toBeGreaterThanOrEqual(131072);
    expect(migrated.databaseKeyWrap?.kdfParams?.N).toBeGreaterThanOrEqual(131072);
  });

  it('destroys the local vault only with the exact confirmation phrase', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);

    const rejected = service.destroyLocalVault('bitte löschen');
    expect(rejected.ok).toBe(false);
    expect(service.status().initialized).toBe(true);

    const destroyed = service.destroyLocalVault('DATENBESTAND LÖSCHEN');
    expect(destroyed).toMatchObject({ ok: true, initialized: false, unlocked: false });
    expect(service.status().setupRequired).toBe(true);
  });
});
