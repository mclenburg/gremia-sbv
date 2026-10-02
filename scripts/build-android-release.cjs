const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

function withSigningEnvironment(environment, action) {
  for (const name of ['KEYSTORE_BASE64', 'KEYSTORE_PASSWORD', 'KEY_ALIAS']) {
    if (!environment[name]?.trim()) throw new Error(`Android-Release: Secret ${name} fehlt.`);
  }
  const encoded = environment.KEYSTORE_BASE64.replace(/\s/g, '');
  const key = Buffer.from(encoded, 'base64');
  if (!key.length || key.toString('base64') !== encoded) {
    key.fill(0);
    throw new Error('Android-Release: KEYSTORE_BASE64 ist kein gültiges Base64.');
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'gremia-android-signing-'));
  try {
    const storeFile = path.join(directory, 'release.keystore');
    fs.writeFileSync(storeFile, key, { mode: 0o600, flag: 'wx' });
    const env = {
      ...environment,
      GREMIA_ANDROID_STORE_FILE: storeFile,
      GREMIA_ANDROID_STORE_PASSWORD: environment.KEYSTORE_PASSWORD,
      GREMIA_ANDROID_KEY_ALIAS: environment.KEY_ALIAS,
      GREMIA_ANDROID_KEY_PASSWORD: environment.KEY_PASSWORD || environment.KEYSTORE_PASSWORD,
    };
    for (const name of ['KEYSTORE_BASE64', 'KEYSTORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD']) delete env[name];
    return action(env);
  } finally {
    key.fill(0);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function verifyApkIdentity(badging, version) {
  const identity = /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(badging);
  if (!identity || identity[1] !== 'de.gremia.sbv.companion' || identity[3] !== version ||
      Number(identity[2]) < 1 || /^application-debuggable/m.test(badging)) {
    throw new Error('Android-Release: APK-Identität, Version oder Release-Modus ist ungültig.');
  }
}

function buildRelease(environment = process.env, outputDirectory) {
  const root = path.resolve(__dirname, '..');
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version) || environment.RELEASE_TAG !== `v${version}`) {
    throw new Error('Android-Release: RELEASE_TAG muss zur package.json-Version passen.');
  }
  const sdk = environment.ANDROID_HOME || environment.ANDROID_SDK_ROOT;
  if (!sdk) throw new Error('Android-Release: ANDROID_HOME fehlt.');
  const buildTools = path.join(sdk, 'build-tools', '34.0.0');
  const android = path.join(root, 'companion-app/android');
  const apk = path.join(android, 'app/build/outputs/apk/release/app-release.apk');
  // Use a non-daemon Gradle process: credentials must not outlive this build.
  withSigningEnvironment(environment, (env) => {
    execFileSync(path.join(android, 'gradlew'), [
      '-p', android, '--no-daemon', '--max-workers=2', 'testDebugUnitTest', 'lintRelease', 'releaseChecksum',
    ], { cwd: root, env, stdio: 'inherit' });
  });
  execFileSync(path.join(buildTools, 'apksigner'), ['verify', '--verbose', apk], { stdio: 'inherit' });
  const badging = execFileSync(path.join(buildTools, 'aapt'), ['dump', 'badging', apk], { encoding: 'utf8' });
  verifyApkIdentity(badging, version);
  const bytes = fs.readFileSync(apk);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const builtChecksum = fs.readFileSync(`${apk}.sha256`, 'utf8').trim().split(/\s+/)[0];
  if (hash !== builtChecksum) throw new Error('Android-Release: APK-Prüfsumme stimmt nicht mit dem Build überein.');
  const filename = `Gremia.SBV-${version}-android.apk`;
  const destination = path.join(outputDirectory || path.join(root, 'release'), filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
  fs.writeFileSync(`${destination}.sha256`, `${hash}  ${filename}\n`);
  console.log(`Android-Release geprüft: ${filename}`);
}

module.exports = { withSigningEnvironment, verifyApkIdentity, buildRelease };
if (require.main === module) {
  try {
    buildRelease();
  } catch (error) {
    // Child-process errors can contain their environment; never serialize them.
    console.error(error?.status !== undefined ? 'Android-Release: Build oder APK-Prüfung fehlgeschlagen.' : error.message);
    process.exitCode = 1;
  }
}
