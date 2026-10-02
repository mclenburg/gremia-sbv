// Exercises the real Gradle/apksigner release path using an ephemeral test key.
// No production keystore, GitHub credentials, emulator or upload is involved.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash, randomBytes } = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');
const { buildRelease } = require('./build-android-release.cjs');

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-android-release-test-'));
try {
  const store = path.join(temporary, 'test.p12');
  const password = randomBytes(24).toString('hex');
  const keytool = path.join(process.env.JAVA_HOME, 'bin', 'keytool');
  execFileSync(keytool, [
    '-genkeypair', '-noprompt', '-storetype', 'PKCS12', '-keystore', store,
    '-storepass:env', 'TEST_STORE_PASSWORD', '-keypass:env', 'TEST_STORE_PASSWORD',
    '-alias', 'release-test', '-keyalg', 'RSA', '-keysize', '2048',
    '-validity', '2', '-dname', 'CN=Gremia Disposable Release Test',
  ], { env: { ...process.env, TEST_STORE_PASSWORD: password }, stdio: 'inherit' });
  const version = require('../package.json').version;
  const environment = {
    ...process.env,
    RELEASE_TAG: `v${version}`,
    KEYSTORE_BASE64: fs.readFileSync(store).toString('base64'),
    KEYSTORE_PASSWORD: password,
    KEY_ALIAS: 'release-test',
  };
  delete environment.KEY_PASSWORD;
  const output = path.join(temporary, 'artifacts');
  buildRelease(environment, output);
  const filename = `Gremia.SBV-${version}-android.apk`;
  const artifact = path.join(output, filename);
  const bytes = fs.readFileSync(artifact);
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.equal(fs.readFileSync(`${artifact}.sha256`, 'utf8'), `${hash}  ${filename}\n`);

  // A wrong alias must stop Gradle rather than silently using a debug key.
  const failedOutput = path.join(temporary, 'must-not-exist');
  assert.throws(() => buildRelease({ ...environment, KEY_ALIAS: 'missing-key' }, failedOutput));
  assert.equal(fs.existsSync(failedOutput), false);

  // Mutating the APK must invalidate its actual Android signature.
  bytes[50] ^= 0xff;
  fs.writeFileSync(artifact, bytes);
  const verifier = path.join(environment.ANDROID_HOME, 'build-tools/34.0.0/apksigner');
  const corrupted = spawnSync(verifier, ['verify', artifact], { encoding: 'utf8' });
  assert.equal(corrupted.error, undefined);
  assert.notEqual(corrupted.status, 0);
  console.log('Android release signing integration: PASS (password fallback, APK identity/checksum, wrong alias, tamper).');
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
