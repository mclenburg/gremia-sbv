#!/usr/bin/env node
/*
 * Gremia.SBV build readiness guard.
 *
 * Lightweight dependency-free checks that run after version generation and
 * source cleanup. The guard intentionally checks only stable release-safety
 * contracts that do not require node_modules.
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function fail(message) {
  throw new Error(message);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractVersionFromGenerated(relativePath) {
  const match = read(relativePath).match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : null;
}

function extractSchemaVersion() {
  const match = read('services/appSchema.ts').match(/APP_SCHEMA_VERSION\s*=\s*["'](\d{4})["']/);
  return match ? match[1] : null;
}

function highestMigrationVersion() {
  const migrationDir = path.join(root, 'database', 'migrations');
  const versions = fs.readdirSync(migrationDir)
    .map((entry) => entry.match(/^(\d{4})_/))
    .filter(Boolean)
    .map((match) => match[1])
    .sort();
  return versions.at(-1) ?? null;
}

function validatePostinstall(pkg) {
  expect(pkg.scripts, 'package.json enthält keine scripts.');
  expect(
    pkg.scripts.postinstall === 'node scripts/install-electron-app-deps.cjs',
    'package.json muss postinstall über scripts/install-electron-app-deps.cjs ausführen, damit npm-Workspace-Flags vor electron-builder bereinigt werden.'
  );
  expect(
    pkg.scripts['native:install-app-deps'] === 'node scripts/install-electron-app-deps.cjs',
    'package.json muss native:install-app-deps als expliziten wiederverwendbaren Alias auf scripts/install-electron-app-deps.cjs enthalten.'
  );
}


function parseMajorVersion(versionRange) {
  if (typeof versionRange !== 'string') return null;
  const match = versionRange.match(/^(?:[~^>=<\s]*)(\d+)\./);
  return match ? Number(match[1]) : null;
}

function validateElectronSqlcipherCompatibility(pkg) {
  const electronRange = pkg.devDependencies?.electron;
  const sqlcipherRange = pkg.dependencies?.['better-sqlite3-multiple-ciphers'] || pkg.devDependencies?.['better-sqlite3-multiple-ciphers'];
  if (!sqlcipherRange) return;

  const electronMajor = parseMajorVersion(electronRange);
  expect(electronMajor !== null, 'electron-Version konnte nicht aus package.json gelesen werden.');
  expect(
    electronMajor <= 39,
    'better-sqlite3-multiple-ciphers wird in Gremia.SBV derzeit bis zur Electron-39-Linie freigegeben. ' +
      `Gefunden wurde ${electronRange}. Bitte Electron nicht höher ziehen, bis die native SQLCipher-Abhängigkeit neuere Electron/V8-ABIs unterstützt.`
  );

  const lock = readJson('package-lock.json');
  const lockedElectronMajor = parseMajorVersion(lock.packages?.['node_modules/electron']?.version);
  expect(lockedElectronMajor !== null, 'package-lock.json enthält keinen auflösbaren Electron-Eintrag.');
  expect(
    lockedElectronMajor <= 39,
    'package-lock.json enthält eine Electron-Version oberhalb der mit better-sqlite3-multiple-ciphers kompatiblen 39er Linie.'
  );
}

function validateVersions(pkg) {
  const rendererVersion = extractVersionFromGenerated('src/app/generated/appVersion.ts');
  const serviceVersion = extractVersionFromGenerated('services/generated/appMetadata.ts');
  expect(rendererVersion === pkg.version, `Renderer-Version ${rendererVersion} passt nicht zu package.json ${pkg.version}.`);
  expect(serviceVersion === pkg.version, `Service-Version ${serviceVersion} passt nicht zu package.json ${pkg.version}.`);
}

function validateSchemaVersion() {
  const schemaVersion = extractSchemaVersion();
  const latestMigration = highestMigrationVersion();
  expect(schemaVersion !== null, 'services/appSchema.ts enthält keine APP_SCHEMA_VERSION.');
  expect(latestMigration !== null, 'database/migrations enthält keine Migrationen.');
  expect(
    schemaVersion === latestMigration,
    `APP_SCHEMA_VERSION ${schemaVersion} passt nicht zur letzten Migration ${latestMigration}.`
  );
}


function validateInstalledBuildDependencies(pkg) {
  const requiredDevDependencies = [
    '@tailwindcss/postcss',
  ];

  for (const dependencyName of requiredDevDependencies) {
    expect(
      pkg.devDependencies?.[dependencyName] || pkg.dependencies?.[dependencyName],
      `package.json enthält ${dependencyName} nicht. Bitte den Dependency-Patch erneut anwenden.`
    );
  }

  const postcssConfig = read('postcss.config.js');
  if (!postcssConfig.includes("'@tailwindcss/postcss'") && !postcssConfig.includes('"@tailwindcss/postcss"')) {
    return;
  }

  for (const dependencyName of requiredDevDependencies) {
    try {
      require.resolve(dependencyName, { paths: [root] });
    } catch (error) {
      fail(
        `${dependencyName} ist in package.json/Lockfile eingetragen, aber nicht in node_modules installiert. ` +
        'Bitte nach dem Patch einmal "npm install" oder sauber "rm -rf node_modules && npm install" ausführen, bevor npm run build:linux gestartet wird.'
      );
    }
  }
}


function validateElectronBuilderConfiguration(pkg) {
  const winConfig = pkg.build?.win;
  expect(
    !Object.prototype.hasOwnProperty.call(winConfig || {}, 'publisherName'),
    'package.json build.win.publisherName wird von electron-builder 26 nicht mehr akzeptiert. Bitte entfernen; Signatur-/Publisher-Informationen gehören nicht in build.win.publisherName.'
  );
}

function validateCleanup(pkg) {
  expect(pkg.scripts['source:cleanup'] === 'node scripts/cleanup-obsolete-files.cjs', 'source:cleanup Script fehlt oder ist verändert.');
  expect(pkg.scripts['source:cleanup:dry-run'] === 'node scripts/cleanup-obsolete-files.cjs --dry-run', 'source:cleanup:dry-run Script fehlt oder ist verändert.');
  expect(
    pkg.scripts.prebuild === 'npm run version:generate && npm run source:cleanup && npm run build:readiness',
    'prebuild muss Versionserzeugung, Source-Cleanup und Build-Readiness-Guard in dieser Reihenfolge ausführen.'
  );
}

function validateCleanupManifests() {
  const manifestDir = path.join(root, 'maintenance', 'source-cleanup');
  if (!fs.existsSync(manifestDir)) return;
  const manifests = fs.readdirSync(manifestDir).filter((entry) => entry.endsWith('.json'));
  for (const entry of manifests) {
    const manifest = readJson(path.join('maintenance', 'source-cleanup', entry));
    expect(typeof manifest.version === 'string' && manifest.version.length > 0, `${entry}: version fehlt.`);
    expect(Array.isArray(manifest.files), `${entry}: files muss ein Array sein.`);
    expect(Array.isArray(manifest.directories), `${entry}: directories muss ein Array sein.`);
  }
}

function validateStrictBuildArtifacts() {
  if (!strict) return;
  const required = [
    'scripts/build-linux-appimage.sh',
    'scripts/write-electron-cjs-package.cjs',
    'electron/main.ts',
    'electron/preload.ts',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.electron.json',
  ];
  for (const relativePath of required) {
    expect(fs.existsSync(path.join(root, relativePath)), `Build-Artefakt fehlt: ${relativePath}`);
  }
}

function main() {
  const pkg = readJson('package.json');
  validatePostinstall(pkg);
  validateElectronSqlcipherCompatibility(pkg);
  validateInstalledBuildDependencies(pkg);
  validateElectronBuilderConfiguration(pkg);
  validateVersions(pkg);
  validateSchemaVersion();
  validateCleanup(pkg);
  validateCleanupManifests();
  validateStrictBuildArtifacts();
  console.log(`Build-Readiness OK: ${pkg.name}@${pkg.version}, Schema ${extractSchemaVersion()}.`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
