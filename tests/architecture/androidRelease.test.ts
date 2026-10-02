import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const release = require('../../scripts/build-android-release.cjs') as {
  withSigningEnvironment<T>(env: NodeJS.ProcessEnv, action: (env: NodeJS.ProcessEnv) => T): T;
  verifyApkIdentity(badging: string, version: string): void;
};
const secrets = {
  KEYSTORE_BASE64: Buffer.from('synthetic-keystore').toString('base64'),
  KEYSTORE_PASSWORD: 'test-store-password',
  KEY_ALIAS: 'test-key',
};

describe('Android Release-Signierung', () => {
  it.each([undefined, ''])('nutzt ohne eigenes Key-Passwort das Store-Passwort (%s)', (keyPassword) => {
    let keyPath = '';
    release.withSigningEnvironment({ ...secrets, KEY_PASSWORD: keyPassword }, (env) => {
      expect(env.GREMIA_ANDROID_KEY_PASSWORD).toBe(secrets.KEYSTORE_PASSWORD);
      expect(env.GREMIA_ANDROID_KEY_ALIAS).toBe(secrets.KEY_ALIAS);
      keyPath = env.GREMIA_ANDROID_STORE_FILE!;
      expect(readFileSync(keyPath, 'utf8')).toBe('synthetic-keystore');
      if (process.platform !== 'win32') {
        expect(statSync(keyPath).mode & 0o777).toBe(0o600);
        expect(statSync(path.dirname(keyPath)).mode & 0o777).toBe(0o700);
      }
      expect(env.KEYSTORE_BASE64).toBeUndefined();
    });
    expect(() => statSync(keyPath)).toThrow();
  });

  it('erhält ein abweichendes Key-Passwort und bereinigt auch bei Buildfehlern', () => {
    let keyPath = '';
    expect(() => release.withSigningEnvironment({ ...secrets, KEY_PASSWORD: 'different' }, (env) => {
      keyPath = env.GREMIA_ANDROID_STORE_FILE!;
      expect(env.GREMIA_ANDROID_KEY_PASSWORD).toBe('different');
      throw new Error('Build fehlgeschlagen');
    })).toThrow('Build fehlgeschlagen');
    expect(() => statSync(keyPath)).toThrow();
  });

  it.each(['KEYSTORE_BASE64', 'KEYSTORE_PASSWORD', 'KEY_ALIAS'])('startet ohne %s keinen Build', (missing) => {
    let called = false;
    expect(() => release.withSigningEnvironment({ ...secrets, [missing]: '' }, () => {
      called = true;
    })).toThrow(missing);
    expect(called).toBe(false);
  });

  it('verwirft ungültiges Base64 vor dem Build', () => {
    expect(() => release.withSigningEnvironment({ ...secrets, KEYSTORE_BASE64: '!!!' }, () => {
      throw new Error('Darf nicht erreicht werden');
    })).toThrow('Base64');
  });
});

describe('Identität der tatsächlich gebauten Release-APK', () => {
  const badging = "package: name='de.gremia.sbv.companion' versionCode='1' versionName='0.9.8' platformBuildVersionName='15'\n";
  it('akzeptiert ausschließlich die nicht-debuggable Release-App mit passender Version', () => {
    expect(() => release.verifyApkIdentity(badging, '0.9.8')).not.toThrow();
    expect(() => release.verifyApkIdentity(badging, '0.9.9')).toThrow();
    expect(() => release.verifyApkIdentity(badging.replace('companion', 'companion.debug'), '0.9.8')).toThrow();
    expect(() => release.verifyApkIdentity(`${badging}application-debuggable\n`, '0.9.8')).toThrow();
    expect(() => release.verifyApkIdentity('', '0.9.8')).toThrow();
  });
});
