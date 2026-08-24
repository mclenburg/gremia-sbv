import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createCipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SecurityService, type SecurityFileOperations } from '../../../services/securityService';
import { atomicWriteFileSync } from '../../../services/secureFileOperations';
import { decryptReportArchive } from '../../../services/reports/reportArchiveCrypto';
import { ApplicationError } from '../../../src/domain/models/application-error.model';

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

type SecurityRuntimeInternals = {
  tempFiles: { cleanup(): unknown };
};

function tempDataDir(): string {
  return mkdtempSync(path.join(tmpdir(), 'gremia-sbv-security-'));
}

function createService(dataDir: string): SecurityService {
  const service = new SecurityService(dataDir);
  vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockResolvedValue(undefined);
  return service;
}

function expectLockedSecurityBoundary(action: () => unknown): void {
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(ApplicationError);
  expect(thrown).toMatchObject({ code: 'SECURITY_OPERATION_FAILED' });
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

  it('bereinigt alte Klartext-PDF-Exporte bei erfolgreichem Passwort-Unlock mit dem aktiven Tresorschlüssel', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    const source = path.join(dataDir, 'exports', 'alter-tätigkeitsbericht.pdf');
    const target = `${source}.gsbvpdf`;
    const pdf = Buffer.from('%PDF-1.7\nGremia.SBV Tätigkeitsbericht mit ÄÖÜ äöü ß\n%%EOF', 'utf8');
    writeFileSync(source, pdf);
    service.lock();

    const result = await service.unlock(PASSWORD);

    expect(result).toMatchObject({ ok: true, unlocked: true });
    expect(result.warning).toBeUndefined();
    expect(existsSync(source)).toBe(false);
    const key = service.getActiveDatabaseKey();
    const verified = decryptReportArchive(readFileSync(target, 'utf8'), key);
    expect(verified.originalFileName).toBe('alter-tätigkeitsbericht.pdf');
    expect(verified.pdf).toEqual(pdf);
    verified.pdf.fill(0);
    key.fill(0);
  });

  it('entsperrt trotz nicht sicher überführbarer Datei ehrlich und lässt das Original zur Datenschutzprüfung bestehen', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    const source = path.join(dataDir, 'exports', 'unbekannter-altbestand.pdf');
    const unknownContent = Buffer.from('Dateiendung behauptet PDF, Inhalt ist aber unbekannt.');
    writeFileSync(source, unknownContent);
    service.lock();

    const result = await service.unlock(PASSWORD);

    expect(result).toMatchObject({ ok: true, unlocked: true });
    expect(result.warning).toMatch(/1 Datei.*Originaldatei.*Datenschutzprüfung.*nächsten Entsperren/i);
    expect(readFileSync(source)).toEqual(unknownContent);
    expect(existsSync(`${source}.gsbvpdf`)).toBe(false);
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

    const source = path.join(dataDir, 'exports', 'recovery-altbestand.pdf');
    const target = `${source}.gsbvpdf`;
    writeFileSync(source, Buffer.from('%PDF-1.7\nRecovery-Altbestand\n%%EOF'));
    service.lock();
    rmSync(path.join(dataDir, 'security.json'), { force: true });
    const recovery = await service.resetPasswordWithRecoveryKey(setup.recoveryKey!, NEXT_PASSWORD);

    expect(recovery).toMatchObject({ ok: true, initialized: true, unlocked: true });
    expect(existsSync(source)).toBe(false);
    expect(existsSync(target)).toBe(true);
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

    const storeBeforeFailedChange = readFileSync(path.join(dataDir, 'security.json'), 'utf8');
    const failed = await service.changePassword('falsch', NEXT_PASSWORD);
    expect(failed.ok).toBe(false);
    expect(readFileSync(path.join(dataDir, 'security.json'), 'utf8')).toBe(storeBeforeFailedChange);

    const changed = await service.changePassword(PASSWORD, NEXT_PASSWORD);
    expect(changed.ok).toBe(true);
    expect(readFileSync(path.join(dataDir, 'security.json'), 'utf8')).not.toBe(storeBeforeFailedChange);
    service.lock();

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
      version: number;
      salt: string;
      passwordVerifier: string;
      kdfParams?: { N: number; r: number; p: number; maxmem?: number };
      databaseKeyWrap: Record<string, unknown>;
    };
    const legacySalt = randomBytes(16).toString('hex');
    const legacyWrapSalt = randomBytes(16).toString('hex');
    store.version = 3;
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

  it('macht Lock zur technischen Zugriffsgrenze und entfernt temporäre Klartextdateien', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);

    const temporary = service.writeTemporaryFile('document-preview', 'vertraulich.txt', Buffer.from('vertraulicher Inhalt'));
    expect(existsSync(temporary)).toBe(true);
    const activeKeyCopy = service.getActiveDatabaseKey();
    expect(activeKeyCopy).toHaveLength(32);

    service.lock('manual');

    expect(service.isUnlocked()).toBe(false);
    expect(existsSync(temporary)).toBe(false);
    expectLockedSecurityBoundary(() => service.getActiveDatabaseKey());
    expectLockedSecurityBoundary(() => service.getActiveDatabase());

    // Eine vor dem Lock bewusst angeforderte Kopie bleibt Eigentum des Aufrufers; der Service darf sie nicht heimlich verändern.
    expect(activeKeyCopy).not.toEqual(Buffer.alloc(32));
    activeKeyCopy.fill(0);
  });

  it('bleibt auch bei fehlgeschlagener Klartextbereinigung sicher gesperrt', async () => {
    const dataDir = tempDataDir();
    createdDirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    vi.spyOn(
      (service as unknown as SecurityRuntimeInternals).tempFiles,
      'cleanup',
    ).mockImplementation(() => { throw new Error('Dateisystem nicht verfügbar'); });

    expect(() => service.lock('manual')).not.toThrow();
    expect(service.isUnlocked()).toBe(false);
    expectLockedSecurityBoundary(() => service.getActiveDatabaseKey());
    expectLockedSecurityBoundary(() => service.getActiveDatabase());
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

describe('security service malformed artifact hardening', () => {
  const dirs: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of dirs.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  async function expectMalformedArtifactRejectedBeforeDatabaseAccess(
    mutate: (store: Record<string, unknown>) => string,
  ): Promise<void> {
    const dataDir = tempDataDir();
    dirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    const opener = vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase');
    opener.mockClear();
    const storePath = path.join(dataDir, 'security.json');
    const original = JSON.parse(readFileSync(storePath, 'utf8')) as Record<string, unknown>;
    writeFileSync(storePath, mutate(original), 'utf8');

    const result = await service.unlock(PASSWORD);

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/beschädigt|Version|KDF/i);
    expect(opener).not.toHaveBeenCalled();
  }

  it('rejects invalid security JSON before database access', async () => {
    await expectMalformedArtifactRejectedBeforeDatabaseAccess(() => '{broken');
  });

  it('rejects a security artifact without vault id before database access', async () => {
    await expectMalformedArtifactRejectedBeforeDatabaseAccess(
      (store) => JSON.stringify({ ...store, vaultId: undefined }),
    );
  });

  it('rejects a future security artifact version before database access', async () => {
    await expectMalformedArtifactRejectedBeforeDatabaseAccess(
      (store) => JSON.stringify({ ...store, version: 99 }),
    );
  });

  it('rejects abusive security KDF parameters before database access', async () => {
    await expectMalformedArtifactRejectedBeforeDatabaseAccess(
      (store) => JSON.stringify({
        ...store,
        kdfParams: { N: 1073741824, r: 8, p: 1, maxmem: 2147483648 },
      }),
    );
  });

  it('serializes concurrent unlock attempts and keeps the second attempt outside database initialization', async () => {
    const dataDir = tempDataDir();
    dirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();

    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const opener = vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockReturnValue(pending);
    opener.mockClear();
    const first = service.unlock(PASSWORD);
    await Promise.resolve();
    const second = await service.unlock(PASSWORD);
    expect(second).toMatchObject({ ok: false, unlocked: false });
    expect(second.error).toContain('läuft bereits');
    expect(opener).toHaveBeenCalledTimes(1);
    release?.();
    expect((await first).ok).toBe(true);
  });
});


describe('security persistence rollback completion', () => {
  const dirs: string[] = [];
  afterEach(() => {
    vi.restoreAllMocks();
    for (const directory of dirs.splice(0)) rmSync(directory, { recursive: true, force: true });
  });

  it('rolls back password store and manifest when the second security artifact write fails', async () => {
    const dataDir = tempDataDir();
    dirs.push(dataDir);
    const initial = createService(dataDir);
    expect((await initial.setupInitialPassword(PASSWORD)).ok).toBe(true);
    initial.lock();
    const originalStore = readFileSync(path.join(dataDir, 'security.json'));
    const originalManifest = readFileSync(path.join(dataDir, 'vault-manifest.json'));
    let writes = 0;
    const operations: SecurityFileOperations = {
      atomicWriteFileSync: (filePath, content, mode) => {
        writes += 1;
        if (writes === 2) throw new Error('injected manifest persistence failure');
        atomicWriteFileSync(filePath, content, mode);
      },
    };
    const service = new SecurityService(dataDir, operations);
    vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockResolvedValue(undefined);

    const changed = await service.changePassword(PASSWORD, NEXT_PASSWORD);
    expect(changed).toMatchObject({ ok: false, initialized: true });
    expect(readFileSync(path.join(dataDir, 'security.json'))).toEqual(originalStore);
    expect(readFileSync(path.join(dataDir, 'vault-manifest.json'))).toEqual(originalManifest);

    const verification = createService(dataDir);
    expect((await verification.unlock(PASSWORD)).ok).toBe(true);
  });

  it('rejects truncated ciphertext and manipulated authentication tags before database access', async () => {
    for (const field of ['ciphertext', 'tag'] as const) {
      const dataDir = tempDataDir();
      dirs.push(dataDir);
      const service = createService(dataDir);
      await service.setupInitialPassword(PASSWORD);
      service.lock();
      const storePath = path.join(dataDir, 'security.json');
      const store = JSON.parse(readFileSync(storePath, 'utf8')) as { databaseKeyWrap: Record<string, string> };
      store.databaseKeyWrap[field] = field === 'ciphertext' ? 'aa' : '00'.repeat(16);
      writeFileSync(storePath, JSON.stringify(store));
      const opener = vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase');
      opener.mockClear();
      const result = await service.unlock(PASSWORD);
      expect(result.ok).toBe(false);
      if (field === 'ciphertext') expect(result.error).toMatch(/Länge|beschädigt/i);
      else expect(result.error).toMatch(/Datenbank|beschädigt|Passwort/i);
      expect(opener).not.toHaveBeenCalled();
    }
  });

  it('rolls back recovery persistence and leaves recovery available when the manifest write fails', async () => {
    const dataDir = tempDataDir();
    dirs.push(dataDir);
    const initial = createService(dataDir);
    const setup = await initial.setupInitialPassword(PASSWORD);
    expect(setup.recoveryKey).toBeTruthy();
    initial.lock();
    rmSync(path.join(dataDir, 'security.json'), { force: true });
    const originalManifest = readFileSync(path.join(dataDir, 'vault-manifest.json'));
    let writes = 0;
    const operations: SecurityFileOperations = {
      atomicWriteFileSync: (filePath, content, mode) => {
        writes += 1;
        if (writes === 2) throw new Error('injected recovery manifest failure');
        atomicWriteFileSync(filePath, content, mode);
      },
    };
    const service = new SecurityService(dataDir, operations);
    vi.spyOn(service as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockResolvedValue(undefined);

    const result = await service.resetPasswordWithRecoveryKey(setup.recoveryKey!, NEXT_PASSWORD);
    expect(result.ok).toBe(false);
    expect(service.status().recoveryRequired).toBe(true);
    expect(() => readFileSync(path.join(dataDir, 'security.json'))).toThrow();
    expect(readFileSync(path.join(dataDir, 'vault-manifest.json'))).toEqual(originalManifest);
  });

  it('rolls back a legacy KDF migration when persistence fails and permits a later retry', async () => {
    const dataDir = tempDataDir();
    dirs.push(dataDir);
    const initial = createService(dataDir);
    await initial.setupInitialPassword(PASSWORD);
    const databaseKey = initial.getActiveDatabaseKey();
    initial.lock();
    const storePath = path.join(dataDir, 'security.json');
    const legacyStore = JSON.parse(readFileSync(storePath, 'utf8')) as {
      version: number;
      salt: string;
      passwordVerifier: string;
      kdfParams?: unknown;
      databaseKeyWrap: Record<string, unknown>;
    };
    const legacySalt = randomBytes(16).toString('hex');
    legacyStore.version = 3;
    legacyStore.salt = legacySalt;
    legacyStore.passwordVerifier = deriveLegacyPasswordVerifier(PASSWORD, legacySalt);
    legacyStore.databaseKeyWrap = wrapLegacyDatabaseKey(databaseKey, PASSWORD, randomBytes(16).toString('hex'));
    delete legacyStore.kdfParams;
    writeFileSync(storePath, `${JSON.stringify(legacyStore, null, 2)}\n`);
    databaseKey.fill(0);
    const originalStore = readFileSync(storePath);
    const originalManifest = readFileSync(path.join(dataDir, 'vault-manifest.json'));
    let writes = 0;
    const operations: SecurityFileOperations = {
      atomicWriteFileSync: (filePath, content, mode) => {
        writes += 1;
        if (writes === 2) throw new Error('injected KDF manifest failure');
        atomicWriteFileSync(filePath, content, mode);
      },
    };
    const failing = new SecurityService(dataDir, operations);
    vi.spyOn(failing as unknown as VaultDatabaseOpener, 'openAndInitializeVaultDatabase').mockResolvedValue(undefined);
    expect((await failing.unlock(PASSWORD)).ok).toBe(false);
    expect(readFileSync(storePath)).toEqual(originalStore);
    expect(readFileSync(path.join(dataDir, 'vault-manifest.json'))).toEqual(originalManifest);

    const retry = createService(dataDir);
    expect((await retry.unlock(PASSWORD)).ok).toBe(true);
    expect(readSecurityStore(dataDir).kdfParams?.N).toBeGreaterThanOrEqual(131072);
  });

  it('cleans temporary cleartext files after a failed authenticated unlock', async () => {
    const dataDir = tempDataDir();
    dirs.push(dataDir);
    const service = createService(dataDir);
    await service.setupInitialPassword(PASSWORD);
    service.lock();
    const leakedTemp = path.join(dataDir, 'tmp', 'failed-unlock-cleartext.txt');
    writeFileSync(leakedTemp, 'sensitive');
    const storePath = path.join(dataDir, 'security.json');
    const store = JSON.parse(readFileSync(storePath, 'utf8')) as { databaseKeyWrap: { tag: string } };
    store.databaseKeyWrap.tag = '00'.repeat(16);
    writeFileSync(storePath, JSON.stringify(store));

    expect((await service.unlock(PASSWORD)).ok).toBe(false);
    expect(() => readFileSync(leakedTemp)).toThrow();
  });

});
